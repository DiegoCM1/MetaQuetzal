import { useCallback, useEffect, useRef, useState } from "react";

type PeerMode = "host" | "guest";
type SessionStage =
  | "idle"
  | "preparing"
  | "offer-ready"
  | "answer-ready"
  | "connecting"
  | "connected"
  | "error";
type SessionKind = "offer" | "answer";

type SignalDescription = {
  sdp: string;
  type: SessionKind;
};

type SignalCandidate = {
  candidate: string;
  sdpMLineIndex?: number | null;
  sdpMid?: string | null;
  usernameFragment?: string | null;
};

type SignalEnvelope = {
  candidates: SignalCandidate[];
  createdAt: string;
  description: SignalDescription;
  kind: SessionKind;
};

type ChatWireMessage =
  | { type: "chat"; body: string; sentAt: string }
  | { type: "system"; body: string };

export type LocalChatMessage = {
  author: "self" | "remote" | "system";
  body: string;
  id: string;
  sentAt: string;
};

type WebRTCModule = {
  RTCPeerConnection: new (config?: unknown) => any;
  RTCSessionDescription: new (description: unknown) => any;
  registerGlobals?: () => void;
};

const PEER_CONFIG = {
  iceServers: [],
};

const ICE_TIMEOUT_MS = 4000;

let globalsRegistered = false;

function loadWebRTCModule(): WebRTCModule {
  try {
    const module = require("react-native-webrtc") as WebRTCModule;
    if (!globalsRegistered && typeof module.registerGlobals === "function") {
      module.registerGlobals();
      globalsRegistered = true;
    }
    return module;
  } catch {
    throw new Error(
      "Falta instalar react-native-webrtc en BluEye. Ejecuta npm install y reconstruye el dev client."
    );
  }
}

const normalizeCandidate = (candidate: any): SignalCandidate => {
  if (typeof candidate?.toJSON === "function") {
    return candidate.toJSON();
  }

  return {
    candidate: candidate?.candidate ?? "",
    sdpMLineIndex: candidate?.sdpMLineIndex ?? null,
    sdpMid: candidate?.sdpMid ?? null,
    usernameFragment: candidate?.usernameFragment ?? null,
  };
};

const normalizeDescription = (description: any): SignalDescription => ({
  sdp: description?.sdp ?? "",
  type: description?.type === "answer" ? "answer" : "offer",
});

const waitForIceGathering = async (peer: any) => {
  if (peer.iceGatheringState === "complete") {
    return;
  }

  await new Promise<void>((resolve) => {
    const interval = setInterval(() => {
      if (peer.iceGatheringState === "complete") {
        clearInterval(interval);
        clearTimeout(timeout);
        resolve();
      }
    }, 200);

    const timeout = setTimeout(() => {
      clearInterval(interval);
      resolve();
    }, ICE_TIMEOUT_MS);
  });
};

const stringifySignal = (payload: SignalEnvelope) =>
  JSON.stringify(payload, null, 2);

const parseSignal = (rawValue: string): SignalEnvelope => {
  const parsed = JSON.parse(rawValue) as Partial<SignalEnvelope>;

  if (!parsed.kind || !parsed.description) {
    throw new Error("El codigo no tiene la forma esperada.");
  }

  if (parsed.kind !== "offer" && parsed.kind !== "answer") {
    throw new Error("Solo se aceptan codigos de oferta o respuesta.");
  }

  return {
    candidates: Array.isArray(parsed.candidates) ? parsed.candidates : [],
    createdAt: parsed.createdAt ?? new Date().toISOString(),
    description: {
      sdp: parsed.description.sdp ?? "",
      type: parsed.description.type === "answer" ? "answer" : "offer",
    },
    kind: parsed.kind,
  };
};

const formatError = (error: unknown) => {
  if (error instanceof Error) {
    return error.message;
  }

  return "Ocurrio un error inesperado.";
};

export function useLocalOfflineChat() {
  const peerRef = useRef<any>(null);
  const dataChannelRef = useRef<any>(null);
  const candidatesRef = useRef<SignalCandidate[]>([]);
  const roleRef = useRef<PeerMode | null>(null);
  const rtcModuleRef = useRef<WebRTCModule | null>(null);

  const [role, setRole] = useState<PeerMode | null>(null);
  const [stage, setStage] = useState<SessionStage>("idle");
  const [connectionState, setConnectionState] = useState("new");
  const [localSignal, setLocalSignal] = useState("");
  const [remoteSignal, setRemoteSignal] = useState("");
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<LocalChatMessage[]>([
    {
      author: "system",
      body: "Listo para enlazar dos telefonos en modo local.",
      id: "system-ready",
      sentAt: new Date().toISOString(),
    },
  ]);
  const [logs, setLogs] = useState<string[]>([
    "Listo para crear o responder un enlace local.",
  ]);

  const addLog = useCallback((message: string) => {
    setLogs((current) => [message, ...current].slice(0, 8));
  }, []);

  const addMessage = useCallback(
    (message: Omit<LocalChatMessage, "id">) => {
      setMessages((current) => [
        {
          ...message,
          id: `${message.author}-${message.sentAt}-${current.length}`,
        },
        ...current,
      ]);
    },
    []
  );

  const teardownResources = useCallback(() => {
    if (dataChannelRef.current) {
      try {
        dataChannelRef.current.close();
      } catch {}
    }

    if (peerRef.current) {
      try {
        peerRef.current.close();
      } catch {}
    }

    peerRef.current = null;
    dataChannelRef.current = null;
    candidatesRef.current = [];
    roleRef.current = null;
  }, []);

  const bindDataChannel = useCallback(
    (channel: any) => {
      dataChannelRef.current = channel;

      channel.onopen = () => {
        addLog("Canal local listo para mensajes.");
        addMessage({
          author: "system",
          body: "Canal enlazado. Ya pueden enviarse mensajes.",
          sentAt: new Date().toISOString(),
        });
      };

      channel.onclose = () => {
        addLog("Canal local cerrado.");
      };

      channel.onmessage = (event: { data?: string }) => {
        try {
          const parsed = JSON.parse(event.data ?? "") as ChatWireMessage;

          if (parsed.type === "chat") {
            addMessage({
              author: "remote",
              body: parsed.body,
              sentAt: parsed.sentAt,
            });
            return;
          }

          if (parsed.type === "system") {
            addLog(parsed.body);
          }
        } catch {
          addMessage({
            author: "remote",
            body: event.data ?? "",
            sentAt: new Date().toISOString(),
          });
        }
      };
    },
    [addLog, addMessage]
  );

  const buildPeer = useCallback(
    async (mode: PeerMode) => {
      const rtcModule = rtcModuleRef.current ?? loadWebRTCModule();
      rtcModuleRef.current = rtcModule;
      const peer = new rtcModule.RTCPeerConnection(PEER_CONFIG as any) as any;

      roleRef.current = mode;
      candidatesRef.current = [];

      peer.onicecandidate = (event: { candidate?: any }) => {
        if (event.candidate) {
          candidatesRef.current = [
            ...candidatesRef.current,
            normalizeCandidate(event.candidate),
          ];
        }
      };

      const updateConnectionState = () => {
        const nextState = String(
          peer.connectionState || peer.iceConnectionState || "new"
        );

        setConnectionState(nextState);

        if (nextState === "connected" || nextState === "completed") {
          setStage("connected");
        } else if (nextState === "connecting" || nextState === "checking") {
          setStage((previous) =>
            previous === "connected" ? previous : "connecting"
          );
        } else if (nextState === "failed") {
          setStage("error");
          setError(
            "La conexion fallo. Prueben otra vez en la misma red local o hotspot."
          );
        } else if (nextState === "disconnected" || nextState === "closed") {
          setStage("idle");
        }
      };

      peer.onconnectionstatechange = updateConnectionState;
      peer.oniceconnectionstatechange = updateConnectionState;
      peer.ondatachannel = (event: { channel: any }) => {
        bindDataChannel(event.channel);
      };

      if (mode === "host") {
        bindDataChannel(peer.createDataChannel("blueye-local-chat"));
      }

      peerRef.current = peer;
      setRole(mode);
      setConnectionState("new");

      return peer;
    },
    [bindDataChannel]
  );

  const createOffer = useCallback(async () => {
    try {
      teardownResources();
      setStage("preparing");
      setError(null);
      setLocalSignal("");
      addLog("Creando enlace local...");

      const peer = await buildPeer("host");
      const offer = await peer.createOffer();

      await peer.setLocalDescription(offer);
      await waitForIceGathering(peer);

      const payload: SignalEnvelope = {
        candidates: candidatesRef.current,
        createdAt: new Date().toISOString(),
        description: normalizeDescription(peer.localDescription ?? offer),
        kind: "offer",
      };

      setLocalSignal(stringifySignal(payload));
      setStage("offer-ready");
      addLog("Oferta lista. Compartela con el otro telefono.");
    } catch (caughtError) {
      setStage("error");
      setError(formatError(caughtError));
      addLog("No pude crear la oferta.");
    }
  }, [addLog, buildPeer, teardownResources]);

  const createAnswer = useCallback(async () => {
    try {
      const payload = parseSignal(remoteSignal.trim());

      if (payload.kind !== "offer") {
        throw new Error("Pega primero una oferta valida para responder.");
      }

      teardownResources();
      setStage("preparing");
      setError(null);
      setLocalSignal("");
      addLog("Procesando oferta remota...");

      const peer = await buildPeer("guest");
      const rtcModule = rtcModuleRef.current ?? loadWebRTCModule();
      rtcModuleRef.current = rtcModule;

      await peer.setRemoteDescription(
        new rtcModule.RTCSessionDescription(payload.description)
      );

      for (const candidate of payload.candidates) {
        await peer.addIceCandidate(candidate);
      }

      const answer = await peer.createAnswer();
      await peer.setLocalDescription(answer);
      await waitForIceGathering(peer);

      const response: SignalEnvelope = {
        candidates: candidatesRef.current,
        createdAt: new Date().toISOString(),
        description: normalizeDescription(peer.localDescription ?? answer),
        kind: "answer",
      };

      setLocalSignal(stringifySignal(response));
      setStage("answer-ready");
      addLog("Respuesta lista. Devuelvela al anfitrion.");
    } catch (caughtError) {
      setStage("error");
      setError(formatError(caughtError));
      addLog("No pude crear la respuesta.");
    }
  }, [addLog, buildPeer, remoteSignal, teardownResources]);

  const applyAnswer = useCallback(async () => {
    try {
      const peer = peerRef.current;

      if (!peer || roleRef.current !== "host") {
        throw new Error("Primero crea una oferta desde este telefono.");
      }

      const payload = parseSignal(remoteSignal.trim());

      if (payload.kind !== "answer") {
        throw new Error("Aqui solo puedes pegar una respuesta valida.");
      }

      const rtcModule = rtcModuleRef.current ?? loadWebRTCModule();
      rtcModuleRef.current = rtcModule;

      await peer.setRemoteDescription(
        new rtcModule.RTCSessionDescription(payload.description)
      );

      for (const candidate of payload.candidates) {
        await peer.addIceCandidate(candidate);
      }

      setStage("connecting");
      setError(null);
      addLog("Respuesta aplicada. Esperando enlace...");
    } catch (caughtError) {
      setStage("error");
      setError(formatError(caughtError));
      addLog("No pude aplicar la respuesta.");
    }
  }, [addLog, remoteSignal]);

  const sendMessage = useCallback(() => {
    const channel = dataChannelRef.current;
    const trimmedDraft = draft.trim();

    if (!trimmedDraft) {
      return;
    }

    if (!channel || channel.readyState !== "open") {
      setError("Todavia no hay un canal enlazado para enviar mensajes.");
      return;
    }

    const sentAt = new Date().toISOString();
    const payload: ChatWireMessage = {
      type: "chat",
      body: trimmedDraft,
      sentAt,
    };

    try {
      channel.send(JSON.stringify(payload));
      addMessage({
        author: "self",
        body: trimmedDraft,
        sentAt,
      });
      setDraft("");
      setError(null);
    } catch {
      setError("No pude enviar el mensaje. Intenta reconectar la sesion.");
    }
  }, [addMessage, draft]);

  const resetSession = useCallback(() => {
    teardownResources();
    setRole(null);
    setStage("idle");
    setConnectionState("new");
    setLocalSignal("");
    setRemoteSignal("");
    setDraft("");
    setError(null);
    setMessages([
      {
        author: "system",
        body: "Sesion reiniciada. Pueden crear un enlace nuevo.",
        id: "system-reset",
        sentAt: new Date().toISOString(),
      },
    ]);
    addLog("Sesion reiniciada.");
  }, [addLog, teardownResources]);

  useEffect(
    () => () => {
      teardownResources();
    },
    [teardownResources]
  );

  return {
    applyAnswer,
    canSend: stage === "connected",
    connectionState,
    createAnswer,
    createOffer,
    draft,
    error,
    localSignal,
    logs,
    messages,
    remoteSignal,
    resetSession,
    role,
    sendMessage,
    setDraft,
    setRemoteSignal,
    stage,
  };
}
