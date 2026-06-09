// Shared types for the local (offline) peer-to-peer chat feature.
// Transport-agnostic on purpose: nothing here mentions "Nearby". An iOS
// MultipeerConnectivity implementation reuses these unchanged.

export type TransportState =
  | "idle"
  | "advertising"
  | "discovering"
  | "connecting"
  | "connected"
  | "error";

/**
 * A peer we can see or are connected to.
 * `endpointId` is the transport's ephemeral handle (changes per session);
 * `name` is the broadcast nickname shown to the user.
 */
export interface Peer {
  endpointId: string;
  name: string;
}

export type MessageAuthor = "self" | "remote" | "system";

export type MessageStatus = "sending" | "sent" | "failed" | "queued";

export interface LocalMessage {
  id: string;
  author: MessageAuthor;
  body: string;
  sentAt: string;
  /** Delivery state — only meaningful for `self` messages. */
  status?: MessageStatus;
  /** Which peer this message belongs to (mesh-ready; unused in 1-to-1 UI). */
  peerId?: string;
}

/**
 * Identity broadcast over the radio in the endpoint name (see identity.ts).
 * `deviceId` is the stable, persisted key; `nickname` is the mutable label.
 * Changing the nickname does NOT change the deviceId, so conversations stay
 * anchored to the same thread.
 */
export interface Identity {
  deviceId: string;
  nickname: string;
}

/** A peer currently in range — live transport handle + decoded identity. */
export interface DiscoveredPeer extends Identity {
  /** Ephemeral transport handle (changes per session); used to route now. */
  endpointId: string;
}

/**
 * A persisted conversation, keyed by the peer's stable `peerId` (= their
 * deviceId). Survives app restarts and the peer leaving range.
 */
export interface Conversation {
  peerId: string;
  /** Last-known nickname for this peer (updated whenever we see them). */
  peerNickname: string;
  /** Epoch ms we last saw / exchanged with this peer. */
  lastSeen: number;
  messages: LocalMessage[];
}
