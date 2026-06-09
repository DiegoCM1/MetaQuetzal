import { useEffect, useMemo, useRef, useState } from "react";
import { PermissionsAndroid, Platform } from "react-native";
import type { Permission } from "react-native";

import type { LocalMessage, Peer, TransportState } from "../_types";
import { decode, encode, makeEnvelope, newId } from "../_services/protocol";
import { getTransport } from "../_services/transport";

/** Re-export so screens can import the message type from the hook. */
export type { LocalMessage } from "../_types";

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

export function useLocalChat() {
  const transport = useMemo(() => getTransport(), []);
  const supported = Platform.OS === "android";
  const available = transport.isAvailable;

  // Stable identity for routing/mesh. TODO(spec): persist so it survives
  // app restarts (AsyncStorage) — kept in-memory during the refactor phase.
  const selfId = useRef<string>(newId()).current;

  const [state, setState] = useState<TransportState>("idle");
  const [draft, setDraft] = useState("");
  const [endpoints, setEndpoints] = useState<Peer[]>([]);
  const [connectedPeers, setConnectedPeers] = useState<Peer[]>([]);
  const [messages, setMessages] = useState<LocalMessage[]>([
    {
      author: "system",
      body: "Busca un dispositivo cercano o anúnciate para conectarte.",
      id: "system-ready",
      sentAt: new Date().toISOString(),
    },
  ]);
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

  const addLog = (m: string) => setLogs((c) => [m, ...c].slice(0, 12));
  const pushMessage = (m: Omit<LocalMessage, "id">) =>
    setMessages((c) => [{ ...m, id: `${m.author}-${newId()}` }, ...c]);
  /** Surface a failure in both the hero (state) and the technical log. */
  const reportError = (message: string) => {
    setError(message);
    addLog(`⚠️ ${message}`);
  };

  useEffect(() => {
    if (!available) return;

    const unsubscribe = transport.subscribe({
      onStateChange: (s) => {
        setState(s);
        addLog(`Estado: ${s}`);
      },
      onPeerFound: (peer) => {
        setEndpoints((c) =>
          c.some((p) => p.endpointId === peer.endpointId) ? c : [...c, peer],
        );
        addLog(`Encontrado: ${peer.name}`);
      },
      onPeerLost: (endpointId) => {
        setEndpoints((c) => c.filter((p) => p.endpointId !== endpointId));
        addLog(`Fuera de rango: ${endpointId}`);
      },
      onConnectionInitiated: (peer) => addLog(`Solicitud: ${peer.name}`),
      onConnected: (peer) => {
        setConnectedPeers((c) =>
          c.some((p) => p.endpointId === peer.endpointId) ? c : [...c, peer],
        );
        setError(null);
        pushMessage({
          author: "system",
          body: `Conectado con ${peer.name}.`,
          sentAt: new Date().toISOString(),
        });
      },
      onConnectionFailed: () =>
        reportError("No se pudo completar la conexión."),
      onDisconnected: (endpointId) => {
        setConnectedPeers((c) => c.filter((p) => p.endpointId !== endpointId));
        pushMessage({
          author: "system",
          body: "La conexión se cerró.",
          sentAt: new Date().toISOString(),
        });
      },
      onPayload: (endpointId, raw) => {
        const env = decode(raw);
        if (!env) return;
        pushMessage({
          author: "remote",
          body: env.body,
          sentAt: new Date().toISOString(),
          peerId: endpointId,
        });
      },
    });

    return () => {
      unsubscribe();
      transport.stopAll().catch(() => null);
    };
  }, [available, transport]);

  // First connected peer — convenience for the current 1-to-1 screen.
  const connectedEndpoint = connectedPeers[0] ?? null;
  const canSend = connectedPeers.length > 0;

  const ensureReady = async () => {
    if (!supported) {
      setError("El chat local solo está disponible en Android por ahora.");
      return false;
    }
    if (!available) {
      setError("Falta el módulo nativo. Reconstruye con expo run:android.");
      return false;
    }
    const granted = await requestNearbyPermissions();
    if (!granted) {
      setError("Faltan permisos de Bluetooth / ubicación.");
      return false;
    }
    setError(null);
    return true;
  };

  const startAdvertising = async () => {
    if (!(await ensureReady())) return;
    try {
      await transport.startAdvertising("BluEye");
    } catch (e: any) {
      reportError(`No se pudo anunciar: ${e?.message ?? e}`);
    }
  };

  const startDiscovery = async () => {
    if (!(await ensureReady())) return;
    setEndpoints([]);
    try {
      await transport.startDiscovery();
    } catch (e: any) {
      reportError(`No se pudo buscar: ${e?.message ?? e}`);
    }
  };

  const connectToEndpoint = async (endpointId: string) => {
    setError(null);
    try {
      await transport.requestConnection(endpointId);
    } catch (e: any) {
      reportError(`No se pudo conectar: ${e?.message ?? e}`);
    }
  };

  const sendMessage = async () => {
    const body = draft.trim();
    const target = connectedPeers[0];
    if (!body || !target) return;

    const envelope = makeEnvelope({
      from: selfId,
      to: target.endpointId,
      body,
    });
    const localId = `self-${envelope.id}`;

    setMessages((c) => [
      {
        author: "self",
        body,
        id: localId,
        sentAt: new Date().toISOString(),
        status: "sending",
        peerId: target.endpointId,
      },
      ...c,
    ]);
    setDraft("");

    try {
      await transport.send(target.endpointId, encode(envelope));
      setMessages((c) =>
        c.map((m) => (m.id === localId ? { ...m, status: "sent" } : m)),
      );
    } catch {
      setMessages((c) =>
        c.map((m) => (m.id === localId ? { ...m, status: "failed" } : m)),
      );
    }
  };

  const disconnect = async () => {
    await transport.disconnect().catch(() => null);
    setConnectedPeers([]);
  };

  const resetSession = async () => {
    await transport.stopAll().catch(() => null);
    setEndpoints([]);
    setConnectedPeers([]);
    setState("idle");
    setError(null);
  };

  return {
    available,
    canSend,
    connectedEndpoint,
    connectedPeers,
    connectToEndpoint,
    disconnect,
    draft,
    endpoints,
    error,
    logs,
    messages,
    resetSession,
    selfId,
    sendMessage,
    setDraft,
    startAdvertising,
    startDiscovery,
    state,
    supported,
  };
}
