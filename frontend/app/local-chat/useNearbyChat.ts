import { useEffect, useState } from "react";
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

type NearbyEvent = {
  endpointId?: string;
  endpointName?: string;
  message?: string;
  state?: string;
};

export type NearbyChatMessage = {
  author: "self" | "remote" | "system";
  body: string;
  id: string;
  sentAt: string;
};

const nearbyModule = NativeModules.NearbyConnections as
  | NearbyModule
  | undefined;

async function requestNearbyPermissions() {
  if (Platform.OS !== "android") {
    return false;
  }

  const permissions: string[] = [];

  if (Platform.Version >= 33) {
    permissions.push(PermissionsAndroid.PERMISSIONS.NEARBY_WIFI_DEVICES);
  }

  if (Platform.Version >= 31) {
    permissions.push(
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_ADVERTISE,
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
    );
  } else {
    permissions.push(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
  }

  const result = await PermissionsAndroid.requestMultiple(permissions);
  return permissions.every(
    (permission) => result[permission] === PermissionsAndroid.RESULTS.GRANTED,
  );
}

export function useNearbyChat() {
  const supported = Platform.OS === "android";
  const [available] = useState(Boolean(nearbyModule));
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(
    supported && !nearbyModule
      ? "El módulo nativo NearbyConnections no está cargado todavía."
      : !supported
        ? "Nearby solo está soportado en Android."
        : null,
  );
  const [state, setState] = useState("idle");
  const [endpoints, setEndpoints] = useState<Endpoint[]>([]);
  const [connectedEndpoint, setConnectedEndpoint] = useState<Endpoint | null>(
    null,
  );
  const [messages, setMessages] = useState<NearbyChatMessage[]>([
    {
      author: "system",
      body: "Busca un dispositivo cercano o anuncia este teléfono para conectarte.",
      id: "nearby-system-ready",
      sentAt: new Date().toISOString(),
    },
  ]);
  const [logs, setLogs] = useState<string[]>([
    supported
      ? "Nearby listo para Android."
      : "Nearby no aplica en esta plataforma.",
  ]);

  useEffect(() => {
    if (!nearbyModule) {
      return;
    }

    const addLog = (message: string) =>
      setLogs((current) => [message, ...current].slice(0, 12));

    const pushMessage = (message: Omit<NearbyChatMessage, "id">) => {
      setMessages((current) => [
        {
          ...message,
          id: `${message.author}-${message.sentAt}-${current.length}`,
        },
        ...current,
      ]);
    };

    const subscriptions = [
      DeviceEventEmitter.addListener(
        "NearbyStateChanged",
        (event: NearbyEvent) => {
          if (event.state) {
            setState(event.state);
            addLog(`Estado: ${event.state}`);
          }
        },
      ),
      DeviceEventEmitter.addListener(
        "NearbyEndpointFound",
        (event: NearbyEvent) => {
          if (!event.endpointId || !event.endpointName) return;
          setEndpoints((current) => {
            if (current.some((item) => item.endpointId === event.endpointId)) {
              return current;
            }
            return [
              ...current,
              {
                endpointId: event.endpointId,
                endpointName: event.endpointName,
              },
            ];
          });
          addLog(`Dispositivo encontrado: ${event.endpointName}`);
        },
      ),
      DeviceEventEmitter.addListener(
        "NearbyEndpointLost",
        (event: NearbyEvent) => {
          if (!event.endpointId) return;
          setEndpoints((current) =>
            current.filter((item) => item.endpointId !== event.endpointId),
          );
          addLog(
            `Dispositivo fuera de rango: ${event.endpointName ?? event.endpointId}`,
          );
        },
      ),
      DeviceEventEmitter.addListener(
        "NearbyConnectionInitiated",
        (event: NearbyEvent) => {
          addLog(
            `Solicitud recibida: ${event.endpointName ?? event.endpointId ?? "Desconocido"}`,
          );
        },
      ),
      DeviceEventEmitter.addListener(
        "NearbyConnectionConnected",
        (event: NearbyEvent) => {
          if (!event.endpointId || !event.endpointName) return;
          setConnectedEndpoint({
            endpointId: event.endpointId,
            endpointName: event.endpointName,
          });
          setError(null);
          pushMessage({
            author: "system",
            body: `Conectado con ${event.endpointName}.`,
            sentAt: new Date().toISOString(),
          });
        },
      ),
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
      DeviceEventEmitter.addListener(
        "NearbyMessageReceived",
        (event: NearbyEvent) => {
          if (!event.message) return;
          pushMessage({
            author: "remote",
            body: event.message,
            sentAt: new Date().toISOString(),
          });
        },
      ),
    ];

    return () => {
      subscriptions.forEach((subscription) => subscription.remove());
      nearbyModule.stopAll().catch(() => null);
    };
  }, []);

  const canSend = Boolean(connectedEndpoint);

  const ensurePermissions = async () => {
    if (!supported) {
      setError("Nearby solo está soportado en Android.");
      return false;
    }

    if (!nearbyModule) {
      setError(
        "Falta cargar NearbyConnections. Rebuild del dev client con `npx expo run:android`.",
      );
      return false;
    }

    const granted = await requestNearbyPermissions();
    if (!granted) {
      setError("Faltan permisos para usar Nearby.");
      return false;
    }

    setError(null);
    return true;
  };

  const startAdvertising = async () => {
    if (!(await ensurePermissions()) || !nearbyModule) return;
    await nearbyModule.startAdvertising("BluEye");
  };

  const startDiscovery = async () => {
    if (!(await ensurePermissions()) || !nearbyModule) return;
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
    setError(null);
  };

  const disconnect = async () => {
    if (!nearbyModule) return;
    await nearbyModule.disconnect();
    setConnectedEndpoint(null);
  };

  return {
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
    supported,
  };
}
