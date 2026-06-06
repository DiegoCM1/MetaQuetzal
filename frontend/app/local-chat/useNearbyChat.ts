import { useEffect, useMemo, useState } from "react";
import {
  DeviceEventEmitter,
  NativeModules,
  PermissionsAndroid,
  Platform,
} from "react-native";

type NearbyModule = {
  disconnect: () => Promise<boolean>;
  requestConnection: (endpointId: string) => Promise<boolean>;
  sendMessage: (message: string) => Promise<boolean>;
  startAdvertising: (displayName?: string) => Promise<boolean>;
  startDiscovery: () => Promise<boolean>;
  stopAll: () => Promise<boolean>;
};

type Endpoint = {
  endpointId: string;
  endpointName: string;
};

export type NearbyChatMessage = {
  author: "self" | "remote" | "system";
  body: string;
  id: string;
  sentAt: string;
};

const nearbyModule = NativeModules.NearbyConnections as NearbyModule | undefined;

async function requestNearbyPermissions() {
  if (Platform.OS !== "android") {
    return true;
  }

  const permissions: string[] = [];

  if (Platform.Version >= 32) {
    permissions.push(PermissionsAndroid.PERMISSIONS.NEARBY_WIFI_DEVICES);
  }

  if (Platform.Version >= 31) {
    permissions.push(
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_ADVERTISE,
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN
    );
  } else {
    permissions.push(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
  }

  const result = await PermissionsAndroid.requestMultiple(permissions);
  return permissions.every(
    (permission) => result[permission] === PermissionsAndroid.RESULTS.GRANTED
  );
}

export function useNearbyChat() {
  const [available, setAvailable] = useState(Boolean(nearbyModule));
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [state, setState] = useState("idle");
  const [endpoints, setEndpoints] = useState<Endpoint[]>([]);
  const [connectedEndpoint, setConnectedEndpoint] = useState<Endpoint | null>(null);
  const [messages, setMessages] = useState<NearbyChatMessage[]>([
    {
      author: "system",
      body: "Busca un dispositivo cercano o anuncia este teléfono para conectarte.",
      id: "nearby-system-ready",
      sentAt: new Date().toISOString(),
    },
  ]);
  const [logs, setLogs] = useState<string[]>(["Nearby listo para Android."]);

  useEffect(() => {
    if (!nearbyModule) {
      setAvailable(false);
      setError("Nearby solo está disponible en Android nativo.");
      return;
    }

    const addLog = (message: string) =>
      setLogs((current) => [message, ...current].slice(0, 8));

    const pushMessage = (message: Omit<NearbyChatMessage, "id">) => {
      setMessages((current) => [
        { ...message, id: `${message.author}-${message.sentAt}-${current.length}` },
        ...current,
      ]);
    };

    const subscriptions = [
      DeviceEventEmitter.addListener("NearbyStateChanged", (event) => {
        setState(event.state);
        addLog(`Estado: ${event.state}`);
      }),
      DeviceEventEmitter.addListener("NearbyEndpointFound", (event) => {
        setEndpoints((current) => {
          if (current.some((item) => item.endpointId === event.endpointId)) {
            return current;
          }
          return [...current, { endpointId: event.endpointId, endpointName: event.endpointName }];
        });
        addLog(`Dispositivo encontrado: ${event.endpointName}`);
      }),
      DeviceEventEmitter.addListener("NearbyEndpointLost", (event) => {
        setEndpoints((current) => current.filter((item) => item.endpointId !== event.endpointId));
        addLog("Dispositivo perdido.");
      }),
      DeviceEventEmitter.addListener("NearbyConnectionInitiated", (event) => {
        addLog(`Solicitud recibida: ${event.endpointName}`);
      }),
      DeviceEventEmitter.addListener("NearbyConnectionConnected", (event) => {
        setConnectedEndpoint({
          endpointId: event.endpointId,
          endpointName: event.endpointName,
        });
        pushMessage({
          author: "system",
          body: `Conectado con ${event.endpointName}.`,
          sentAt: new Date().toISOString(),
        });
      }),
      DeviceEventEmitter.addListener("NearbyConnectionFailed", () => {
        setError("No se pudo completar la conexión Nearby.");
      }),
      DeviceEventEmitter.addListener("NearbyDisconnected", () => {
        setConnectedEndpoint(null);
        pushMessage({
          author: "system",
          body: "La conexión se cerró.",
          sentAt: new Date().toISOString(),
        });
      }),
      DeviceEventEmitter.addListener("NearbyMessageReceived", (event) => {
        pushMessage({
          author: "remote",
          body: event.message,
          sentAt: new Date().toISOString(),
        });
      }),
    ];

    return () => {
      subscriptions.forEach((subscription) => subscription.remove());
    };
  }, []);

  const canSend = Boolean(connectedEndpoint);

  const ensurePermissions = async () => {
    const granted = await requestNearbyPermissions();
    if (!granted) {
      setError("Faltan permisos para usar Nearby.");
      return false;
    }
    setError(null);
    return true;
  };

  const startAdvertising = async () => {
    if (!nearbyModule) return;
    if (!(await ensurePermissions())) return;
    await nearbyModule.startAdvertising("BluEye");
  };

  const startDiscovery = async () => {
    if (!nearbyModule) return;
    if (!(await ensurePermissions())) return;
    setEndpoints([]);
    await nearbyModule.startDiscovery();
  };

  const connectToEndpoint = async (endpointId: string) => {
    if (!nearbyModule) return;
    setError(null);
    await nearbyModule.requestConnection(endpointId);
  };

  const sendMessage = async () => {
    if (!nearbyModule || !draft.trim() || !connectedEndpoint) return;
    const body = draft.trim();
    await nearbyModule.sendMessage(body);
    setMessages((current) => [
      {
        author: "self",
        body,
        id: `self-${Date.now()}`,
        sentAt: new Date().toISOString(),
      },
      ...current,
    ]);
    setDraft("");
  };

  const resetSession = async () => {
    if (!nearbyModule) return;
    await nearbyModule.stopAll();
    setEndpoints([]);
    setConnectedEndpoint(null);
    setState("idle");
  };

  const disconnect = async () => {
    if (!nearbyModule) return;
    await nearbyModule.disconnect();
    setConnectedEndpoint(null);
  };

  return useMemo(
    () => ({
      available,
      canSend,
      connectedEndpoint,
      connectToEndpoint,
      disconnect,
      draft,
      endpoints,
      error,
      logs,
      messages,
      resetSession,
      sendMessage,
      setDraft,
      startAdvertising,
      startDiscovery,
      state,
    }),
    [available, canSend, connectedEndpoint, draft, endpoints, error, logs, messages, state]
  );
}
