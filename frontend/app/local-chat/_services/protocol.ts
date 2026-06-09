import { randomUUID } from "expo-crypto";

/**
 * Wire format for a single message. Designed for mesh from day one:
 * - 1-to-1 sets `to` = the peer and `ttl` = 1.
 * - Multi-hop (future) sets `to` = BROADCAST or a peerId and decrements
 *   `ttl` on each relay, using `id` for de-duplication.
 *
 * Keeping this envelope now means the mesh router is purely additive later —
 * the transport and UI never learn about hops.
 */
export interface Envelope {
  v: 1;
  id: string;
  from: string;
  to: string; // peerId | BROADCAST
  ttl: number;
  body: string;
  ts: number;
}

export const BROADCAST = "*";

export function newId(): string {
  return randomUUID();
}

export function makeEnvelope(params: {
  from: string;
  to: string;
  body: string;
  ttl?: number;
}): Envelope {
  return {
    v: 1,
    id: newId(),
    from: params.from,
    to: params.to,
    ttl: params.ttl ?? 1,
    body: params.body,
    ts: Date.now(),
  };
}

export function encode(envelope: Envelope): string {
  return JSON.stringify(envelope);
}

/**
 * Tolerant decode: accepts a JSON envelope, or falls back to treating the
 * raw string as a plain-text body (legacy / non-envelope sender). Returns
 * null only for empty payloads.
 */
export function decode(raw: string): Envelope | null {
  try {
    const parsed = JSON.parse(raw);
    if (parsed && parsed.v === 1 && typeof parsed.body === "string") {
      return parsed as Envelope;
    }
  } catch {
    // Not JSON — fall through and treat as plain text.
  }

  if (raw.length > 0) {
    return {
      v: 1,
      id: newId(),
      from: "unknown",
      to: BROADCAST,
      ttl: 0,
      body: raw,
      ts: Date.now(),
    };
  }

  return null;
}
