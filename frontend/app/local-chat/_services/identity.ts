// Identity codec for the offline chat.
//
// With no backend, the only identity that exists between two phones is the one
// physically broadcast over the radio. Nearby gives us a single string we
// control at discovery time — the endpoint name — so we pack BOTH the stable
// device id and the mutable nickname into it: "<deviceId>|<nickname>".
//
// The discoverer splits it back apart: deviceId keys the conversation,
// nickname is just the display label.

import { randomUUID } from "expo-crypto";

import type { Identity } from "../_types";

const SEP = "|";

/**
 * Pack identity into the single string the radio advertises.
 * The nickname can't contain the separator, so we strip it defensively.
 */
export function encodeIdentity(identity: Identity): string {
  const safeNickname = identity.nickname.replace(/\|/g, " ").trim();
  return `${identity.deviceId}${SEP}${safeNickname}`;
}

/**
 * Parse a broadcast endpoint name back into identity. Tolerant of legacy /
 * non-encoded names (no separator): treats the whole string as both id and
 * nickname so an older build still shows up as *something*.
 */
export function decodeIdentity(endpointName: string): Identity {
  const idx = endpointName.indexOf(SEP);
  if (idx === -1) {
    return { deviceId: endpointName, nickname: endpointName };
  }
  const deviceId = endpointName.slice(0, idx);
  const nickname = endpointName.slice(idx + 1) || deviceId;
  return { deviceId, nickname };
}

/**
 * Mint a new stable device id. 12 hex chars (~48 bits) is collision-safe for
 * any realistic local radius and keeps the broadcast name well under Nearby's
 * endpoint-name length budget.
 */
export function newDeviceId(): string {
  return randomUUID().replace(/-/g, "").slice(0, 12);
}
