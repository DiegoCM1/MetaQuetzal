// Single source of truth for the offline chat feature.
//
// Why a provider and not a per-screen hook: the lobby and the per-person chat
// screen must share ONE live transport connection and ONE conversation store.
// Two screens each calling a hook would each spin up their own state. So the
// transport, identity, and persisted conversations live here, mounted once in
// `_layout.tsx`, and screens read from context.
//
// Identity model: `deviceId` is the stable, persisted key (survives nickname
// changes and reconnects); the ephemeral transport `endpointId` is only used
// to route a message right now. Conversations are keyed by `deviceId`.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { PermissionsAndroid, Platform } from "react-native";
import type { Permission } from "react-native";

import type {
  Conversation,
  DiscoveredPeer,
  LocalMessage,
  TransportState,
} from "../_types";
import { decode, encode, makeEnvelope, newId } from "../_services/protocol";
import { getTransport } from "../_services/transport";
import {
  decodeIdentity,
  encodeIdentity,
  newDeviceId,
} from "../_services/identity";
import {
  loadConversations,
  loadNickname,
  loadOrCreateDeviceId,
  saveConversations,
  saveNickname,
} from "../_services/storage";

/** BLE/emergency constraint: short messages only (MTU + readability). */
export const MAX_MESSAGE_LENGTH = 200;

async function requestNearbyPermissions(): Promise<boolean> {
  if (Platform.OS !== "android") return false;

  const perms: Permission[] = [];
  if (Number(Platform.Version) >= 33) {
    perms.push(PermissionsAndroid.PERMISSIONS.NEARBY_WIFI_DEVICES);
  }
  if (Number(Platform.Version) >= 31) {
    perms.push(
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_ADVERTISE,
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
    );
  } else {
    perms.push(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
  }

  const result = await PermissionsAndroid.requestMultiple(perms);
  return perms.every((p) => result[p] === PermissionsAndroid.RESULTS.GRANTED);
}

interface LocalChatValue {
  supported: boolean;
  available: boolean;
  hydrated: boolean;

  // identity
  deviceId: string;
  nickname: string;
  needsNickname: boolean;
  setNickname: (nickname: string) => Promise<void>;

  // transport status
  state: TransportState;
  error: string | null;
  logs: string[];

  // lobby
  peers: DiscoveredPeer[];
  connectedPeerId: string | null;
  isPeerInRange: (peerId: string) => boolean;
  conversations: Conversation[];
  getConversation: (peerId: string) => Conversation | undefined;

  // actions
  startAdvertising: () => Promise<void>;
  startDiscovery: () => Promise<void>;
  resetSession: () => Promise<void>;
  connectToPeer: (endpointId: string) => Promise<void>;
  disconnect: () => Promise<void>;
  sendMessage: (peerId: string, body: string) => Promise<void>;
}

const LocalChatContext = createContext<LocalChatValue | null>(null);

export function LocalChatProvider({ children }: { children: React.ReactNode }) {
  const transport = useMemo(() => getTransport(), []);
  const supported = Platform.OS === "android";
  const available = transport.isAvailable;

  const [hydrated, setHydrated] = useState(false);
  const [deviceId, setDeviceId] = useState("");
  const [nickname, setNicknameState] = useState("");
  const [conversations, setConversations] = useState<
    Record<string, Conversation>
  >({});

  const [state, setState] = useState<TransportState>("idle");
  const [peers, setPeers] = useState<DiscoveredPeer[]>([]);
  const [connected, setConnected] = useState<DiscoveredPeer | null>(null);
  const [logs, setLogs] = useState<string[]>([
    supported ? "Listo para Android." : "No disponible en esta plataforma.",
  ]);
  const [error, setError] = useState<string | null>(
    !supported
      ? "El chat local solo está disponible en Android por ahora."
      : !available
        ? "El módulo nativo no está cargado. Reconstruye con expo run:android."
        : null,
  );

  // Refs mirror state so the transport event handlers (bound once) can resolve
  // a live endpointId → stable deviceId without capturing stale closures.
  const peersRef = useRef<DiscoveredPeer[]>([]);
  const connectedRef = useRef<DiscoveredPeer | null>(null);
  const conversationsRef = useRef<Record<string, Conversation>>({});
  peersRef.current = peers;
  connectedRef.current = connected;
  conversationsRef.current = conversations;

  const addLog = useCallback(
    (m: string) => setLogs((c) => [m, ...c].slice(0, 12)),
    [],
  );
  const reportError = useCallback(
    (message: string) => {
      setError(message);
      addLog(`⚠️ ${message}`);
    },
    [addLog],
  );

  // --- persistence: hydrate once on mount ------------------------------------
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [id, nick, convos] = await Promise.all([
          loadOrCreateDeviceId(newDeviceId),
          loadNickname(),
          loadConversations(),
        ]);
        if (cancelled) return;
        setDeviceId(id);
        setNicknameState(nick ?? "");
        setConversations(convos);
      } catch (e: any) {
        if (!cancelled)
          reportError(`No se pudo cargar el historial: ${e?.message ?? e}`);
      } finally {
        if (!cancelled) setHydrated(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reportError]);

  // Persist conversations whenever they change (after hydration).
  useEffect(() => {
    if (!hydrated) return;
    saveConversations(conversations).catch((e) =>
      console.warn("[local-chat] saveConversations falló:", e),
    );
  }, [conversations, hydrated]);

  // --- conversation mutation helper ------------------------------------------
  const upsertMessage = useCallback(
    (peerId: string, peerNickname: string, message: LocalMessage) => {
      setConversations((prev) => {
        const existing = prev[peerId];
        const messages = existing ? [message, ...existing.messages] : [message];
        return {
          ...prev,
          [peerId]: {
            peerId,
            peerNickname: peerNickname || existing?.peerNickname || peerId,
            lastSeen: Date.now(),
            messages,
          },
        };
      });
    },
    [],
  );

  const patchMessageStatus = useCallback(
    (peerId: string, messageId: string, status: LocalMessage["status"]) => {
      setConversations((prev) => {
        const convo = prev[peerId];
        if (!convo) return prev;
        return {
          ...prev,
          [peerId]: {
            ...convo,
            messages: convo.messages.map((m) =>
              m.id === messageId ? { ...m, status } : m,
            ),
          },
        };
      });
    },
    [],
  );

  /** Apply a peer's new nickname everywhere it's shown (live rename). */
  const updatePeerNickname = useCallback(
    (peerDeviceId: string, nickname: string) => {
      setPeers((c) =>
        c.map((p) => (p.deviceId === peerDeviceId ? { ...p, nickname } : p)),
      );
      setConnected((c) =>
        c?.deviceId === peerDeviceId ? { ...c, nickname } : c,
      );
      setConversations((prev) => {
        const convo = prev[peerDeviceId];
        if (!convo) return prev;
        return {
          ...prev,
          [peerDeviceId]: {
            ...convo,
            peerNickname: nickname,
            lastSeen: Date.now(),
          },
        };
      });
    },
    [],
  );

  // --- transport subscription ------------------------------------------------
  useEffect(() => {
    if (!available) return;

    const unsubscribe = transport.subscribe({
      onStateChange: (s) => {
        setState(s);
        addLog(`Estado: ${s}`);
      },
      onPeerFound: (peer) => {
        const id = decodeIdentity(peer.name);
        const discovered: DiscoveredPeer = {
          endpointId: peer.endpointId,
          deviceId: id.deviceId,
          nickname: id.nickname,
        };
        setPeers((c) =>
          c.some((p) => p.deviceId === discovered.deviceId)
            ? c.map((p) =>
                p.deviceId === discovered.deviceId ? discovered : p,
              )
            : [...c, discovered],
        );
        addLog(`Encontrado: ${id.nickname}`);
      },
      onPeerLost: (endpointId) => {
        setPeers((c) => c.filter((p) => p.endpointId !== endpointId));
        addLog(`Fuera de rango: ${endpointId}`);
      },
      onConnectionInitiated: (peer) =>
        addLog(`Solicitud: ${decodeIdentity(peer.name).nickname}`),
      onConnected: (peer) => {
        const id = decodeIdentity(peer.name);
        const link: DiscoveredPeer = {
          endpointId: peer.endpointId,
          deviceId: id.deviceId,
          nickname: id.nickname,
        };
        setConnected(link);
        setError(null);
        // Touch the conversation so it appears in "previas" even before any
        // message, and its nickname stays current.
        setConversations((prev) => {
          const existing = prev[id.deviceId];
          return {
            ...prev,
            [id.deviceId]: {
              peerId: id.deviceId,
              peerNickname: id.nickname,
              lastSeen: Date.now(),
              messages: existing?.messages ?? [],
            },
          };
        });
        addLog(`Conectado con ${id.nickname}`);
      },
      onConnectionFailed: () =>
        reportError("No se pudo completar la conexión."),
      onDisconnected: (endpointId) => {
        setConnected((c) => (c?.endpointId === endpointId ? null : c));
        addLog("La conexión se cerró.");
      },
      onPayload: (endpointId, raw) => {
        const env = decode(raw);
        if (!env) {
          addLog(
            `⚠️ Payload descartado: vacío o no decodificable (${raw.length} bytes)`,
          );
          return;
        }
        // Resolve the stable deviceId: prefer the live connection, fall back to
        // a known peer by endpointId, finally to the envelope's claimed sender.
        const link =
          connectedRef.current?.endpointId === endpointId
            ? connectedRef.current
            : peersRef.current.find((p) => p.endpointId === endpointId);
        const peerId = link?.deviceId ?? env.from;

        // Control message: a live rename — apply it, don't show a bubble.
        if (env.kind === "identity") {
          updatePeerNickname(peerId, env.body);
          addLog(`Nombre actualizado: ${env.body}`);
          return;
        }

        const peerNickname = link?.nickname ?? env.from;
        upsertMessage(peerId, peerNickname, {
          id: `remote-${env.id}`,
          author: "remote",
          body: env.body,
          sentAt: new Date().toISOString(),
          peerId,
        });
      },
    });

    return () => {
      unsubscribe();
      transport
        .stopAll()
        .catch((e) =>
          console.warn("[local-chat] stopAll en cleanup falló:", e),
        );
    };
  }, [
    available,
    transport,
    addLog,
    reportError,
    upsertMessage,
    updatePeerNickname,
  ]);

  // --- identity --------------------------------------------------------------
  const needsNickname = hydrated && nickname.trim().length === 0;

  const setNickname = useCallback(
    async (next: string) => {
      const trimmed = next.trim();
      if (trimmed.length < 2 || trimmed.length > 20) {
        reportError("El nombre debe tener entre 2 y 20 caracteres.");
        return;
      }
      setNicknameState(trimmed);
      try {
        await saveNickname(trimmed);
      } catch (e: any) {
        reportError(`No se pudo guardar el nombre: ${e?.message ?? e}`);
      }
      // Live-push the rename to a currently-connected peer so their view
      // updates without waiting for a fresh discovery. New discoverers still
      // get the latest name via the broadcast on the next advertise.
      const link = connectedRef.current;
      if (link) {
        const env = makeEnvelope({
          from: deviceId,
          to: link.deviceId,
          body: trimmed,
          kind: "identity",
        });
        transport
          .send(link.endpointId, encode(env))
          .catch((e) =>
            addLog(
              `No se pudo actualizar el nombre en vivo: ${e?.message ?? e}`,
            ),
          );
      }
    },
    [reportError, deviceId, transport, addLog],
  );

  // --- gating ----------------------------------------------------------------
  const ensureReady = useCallback(async () => {
    if (!supported) {
      setError("El chat local solo está disponible en Android por ahora.");
      return false;
    }
    if (!available) {
      setError("Falta el módulo nativo. Reconstruye con expo run:android.");
      return false;
    }
    if (nickname.trim().length === 0) {
      setError("Primero define tu nombre.");
      return false;
    }
    const granted = await requestNearbyPermissions();
    if (!granted) {
      setError("Faltan permisos de Bluetooth / ubicación.");
      return false;
    }
    setError(null);
    return true;
  }, [supported, available, nickname]);

  // --- actions ---------------------------------------------------------------
  const startAdvertising = useCallback(async () => {
    if (!(await ensureReady())) return;
    try {
      await transport.startAdvertising(encodeIdentity({ deviceId, nickname }));
    } catch (e: any) {
      reportError(`No se pudo anunciar: ${e?.message ?? e}`);
    }
  }, [ensureReady, transport, deviceId, nickname, reportError]);

  const startDiscovery = useCallback(async () => {
    if (!(await ensureReady())) return;
    setPeers([]);
    try {
      await transport.startDiscovery();
    } catch (e: any) {
      reportError(`No se pudo buscar: ${e?.message ?? e}`);
    }
  }, [ensureReady, transport, reportError]);

  const connectToPeer = useCallback(
    async (endpointId: string) => {
      setError(null);
      try {
        await transport.requestConnection(endpointId);
      } catch (e: any) {
        reportError(`No se pudo conectar: ${e?.message ?? e}`);
      }
    },
    [transport, reportError],
  );

  const disconnect = useCallback(async () => {
    try {
      await transport.disconnect();
    } catch (e: any) {
      reportError(`No se pudo desconectar: ${e?.message ?? e}`);
    }
    setConnected(null);
  }, [transport, reportError]);

  const resetSession = useCallback(async () => {
    setPeers([]);
    setConnected(null);
    setState("idle");
    setError(null);
    try {
      await transport.stopAll();
    } catch (e: any) {
      reportError(`No se pudo detener todo: ${e?.message ?? e}`);
    }
  }, [transport, reportError]);

  /**
   * Transmit one already-stored self-message over the live connection.
   * Returns whether it left the device. Used by both a fresh send and the
   * reconnect flush, so the wire path has a single implementation.
   */
  const transmit = useCallback(
    async (peerId: string, localId: string, body: string): Promise<boolean> => {
      const link = connectedRef.current;
      if (link?.deviceId !== peerId) return false; // not the live peer
      const envelope = makeEnvelope({ from: deviceId, to: peerId, body });
      patchMessageStatus(peerId, localId, "sending");
      try {
        await transport.send(link.endpointId, encode(envelope));
        patchMessageStatus(peerId, localId, "sent");
        return true;
      } catch (e: any) {
        addLog(`⚠️ Mensaje no enviado: ${e?.message ?? e}`);
        patchMessageStatus(peerId, localId, "failed");
        return false;
      }
    },
    [deviceId, transport, patchMessageStatus, addLog],
  );

  const sendMessage = useCallback(
    async (peerId: string, body: string) => {
      const text = body.trim().slice(0, MAX_MESSAGE_LENGTH);
      if (!text) return;

      const link = connectedRef.current;
      const live = link?.deviceId === peerId;
      const localId = `self-${newId()}`;

      // Optimistic insert. If the peer isn't the live connection, it queues
      // and the flush-on-reconnect effect will pick it up.
      upsertMessage(peerId, link?.nickname ?? peerId, {
        id: localId,
        author: "self",
        body: text,
        sentAt: new Date().toISOString(),
        status: live ? "sending" : "queued",
        peerId,
      });

      if (live) {
        await transmit(peerId, localId, text);
      } else {
        addLog(`Mensaje en cola (sin conexión): ${peerId}`);
      }
    },
    [upsertMessage, transmit, addLog],
  );

  // Drain the queue when a peer (re)connects: replay every still-queued
  // self-message for that peer, oldest first. Without this, queued messages
  // would sit forever — the "se enviará al reconectar" promise would be empty.
  useEffect(() => {
    if (!connected) return;
    const convo = conversationsRef.current[connected.deviceId];
    if (!convo) return;
    const queued = convo.messages
      .filter((m) => m.author === "self" && m.status === "queued")
      .reverse(); // store is newest-first → send oldest first
    if (queued.length === 0) return;

    const peerId = connected.deviceId;
    (async () => {
      addLog(`Reenviando ${queued.length} en cola a ${connected.nickname}`);
      for (const m of queued) {
        await transmit(peerId, m.id, m.body);
      }
    })();
  }, [connected, transmit, addLog]);

  // --- selectors -------------------------------------------------------------
  const conversationList = useMemo(
    () => Object.values(conversations).sort((a, b) => b.lastSeen - a.lastSeen),
    [conversations],
  );
  const getConversation = useCallback(
    (peerId: string) => conversations[peerId],
    [conversations],
  );
  const isPeerInRange = useCallback(
    (peerId: string) => peers.some((p) => p.deviceId === peerId),
    [peers],
  );

  const value: LocalChatValue = {
    supported,
    available,
    hydrated,
    deviceId,
    nickname,
    needsNickname,
    setNickname,
    state,
    error,
    logs,
    peers,
    connectedPeerId: connected?.deviceId ?? null,
    isPeerInRange,
    conversations: conversationList,
    getConversation,
    startAdvertising,
    startDiscovery,
    resetSession,
    connectToPeer,
    disconnect,
    sendMessage,
  };

  return (
    <LocalChatContext.Provider value={value}>
      {children}
    </LocalChatContext.Provider>
  );
}

export function useLocalChatContext(): LocalChatValue {
  const ctx = useContext(LocalChatContext);
  if (!ctx) {
    throw new Error(
      "useLocalChatContext must be used within LocalChatProvider",
    );
  }
  return ctx;
}
