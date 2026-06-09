import { DeviceEventEmitter, NativeModules } from "react-native";

import type { TransportState } from "../_types";
import type { LocalTransport, TransportHandlers } from "./transport";

/** Bridge surface exposed by the generated native module (see
 * `plugins/with-nearby-connections.js`). */
type NativeNearby = {
  startAdvertising: (displayName?: string) => Promise<boolean>;
  startDiscovery: () => Promise<boolean>;
  requestConnection: (endpointId: string) => Promise<boolean>;
  sendMessage: (message: string) => Promise<boolean>;
  disconnect: () => Promise<boolean>;
  stopAll: () => Promise<boolean>;
};

const native = NativeModules.NearbyConnections as NativeNearby | undefined;

/** Translate the native DeviceEventEmitter events into our handler shape. */
function bind(handlers: Partial<TransportHandlers>): () => void {
  const subs = [
    DeviceEventEmitter.addListener(
      "NearbyStateChanged",
      (e: { state?: string }) => {
        if (e.state) handlers.onStateChange?.(e.state as TransportState);
      },
    ),
    DeviceEventEmitter.addListener(
      "NearbyEndpointFound",
      (e: { endpointId?: string; endpointName?: string }) => {
        if (e.endpointId && e.endpointName) {
          handlers.onPeerFound?.({
            endpointId: e.endpointId,
            name: e.endpointName,
          });
        }
      },
    ),
    DeviceEventEmitter.addListener(
      "NearbyEndpointLost",
      (e: { endpointId?: string }) => {
        if (e.endpointId) handlers.onPeerLost?.(e.endpointId);
      },
    ),
    DeviceEventEmitter.addListener(
      "NearbyConnectionInitiated",
      (e: { endpointId?: string; endpointName?: string }) => {
        if (e.endpointId) {
          handlers.onConnectionInitiated?.({
            endpointId: e.endpointId,
            name: e.endpointName ?? e.endpointId,
          });
        }
      },
    ),
    DeviceEventEmitter.addListener(
      "NearbyConnectionConnected",
      (e: { endpointId?: string; endpointName?: string }) => {
        if (e.endpointId) {
          handlers.onConnected?.({
            endpointId: e.endpointId,
            name: e.endpointName ?? e.endpointId,
          });
        }
      },
    ),
    DeviceEventEmitter.addListener(
      "NearbyConnectionFailed",
      (e: { endpointId?: string }) => {
        handlers.onConnectionFailed?.(e.endpointId ?? "");
      },
    ),
    DeviceEventEmitter.addListener(
      "NearbyDisconnected",
      (e: { endpointId?: string }) => {
        handlers.onDisconnected?.(e.endpointId ?? "");
      },
    ),
    DeviceEventEmitter.addListener(
      "NearbyMessageReceived",
      (e: { endpointId?: string; message?: string }) => {
        if (e.message) handlers.onPayload?.(e.endpointId ?? "", e.message);
      },
    ),
  ];

  return () => subs.forEach((s) => s.remove());
}

export function createNearbyTransport(): LocalTransport {
  return {
    isAvailable: Boolean(native),

    async startAdvertising(displayName: string) {
      await native?.startAdvertising(displayName);
    },

    async startDiscovery() {
      await native?.startDiscovery();
    },

    async requestConnection(endpointId: string) {
      await native?.requestConnection(endpointId);
    },

    async send(_endpointId: string, raw: string) {
      // The current native module tracks a single connection, so the target
      // endpointId is implicit. When the Kotlin gains a peer map (mesh prep),
      // forward `_endpointId` here — nothing above this line changes.
      await native?.sendMessage(raw);
    },

    async disconnect() {
      await native?.disconnect();
    },

    async stopAll() {
      await native?.stopAll();
    },

    subscribe(handlers) {
      return bind(handlers);
    },
  };
}
