import * as Sentry from "@sentry/react-native";
import * as Device from "expo-device";
import { Platform } from "react-native";

/**
 * Step 0 of push-notification hardening: OBSERVABILITY.
 *
 * Push registration is a five-stage pipeline (channels → permissions → APNs →
 * token → backend) in which almost nothing throws where you can see it. The
 * backend answers a rejected token with a *status code*, not an exception; the
 * OS answers a missing entitlement with a token that looks fine and simply
 * never receives anything; and the whole chain hangs off a `.catch(console.error)`
 * at the call site, which on a user's phone is the same as nothing at all.
 *
 * The result today is that not one push-registration failure reaches Sentry, and
 * the single most likely failure — a 404 because the user profile hasn't been
 * created yet — is actively *suppressed* by a guard that reads "no error object"
 * as "nothing went wrong".
 *
 * This module gives every failure a NAME, records the PHASE it happened in, and
 * reports it loudly (console for `adb logcat`, Sentry for production telemetry)
 * with enough context to debug from a dashboard. It does NOT recover from
 * failures and it does not decide policy — callers still choose what to do.
 *
 * Mirrors `app/ai/_services/modelTelemetry.ts`, deliberately: same synthetic-Error
 * grouping, same tags/extra split, same de-dupe guard. Two telemetry modules that
 * behave identically are worth more than one abstraction that fits neither.
 */

/** Where in the registration pipeline we are. */
export type PushPhase =
  | "channels" // creating Android notification channels
  | "permissions" // asking the OS for notification permission
  | "apns-register" // iOS only: registering with APNs for remote messages
  | "token" // fetching the FCM registration token
  | "backend" // POSTing the token to /api/v1/push-token
  | "registered" // done — token accepted and persisted
  | "unknown"; // a backstop caught something that escaped every guarded stage

/** The named failure taxonomy. Every way registration can go wrong, named. */
export type PushFailureType =
  | "channel-setup-failed" // android — setNotificationChannelAsync threw
  | "permission-denied" // both — user declined the OS prompt
  | "apns-register-failed" // ios — registerDeviceForRemoteMessages threw
  | "apns-token-timeout" // ios — registration succeeded, APNs never delivered a token
  | "token-unavailable" // both — getToken / getDevicePushTokenAsync threw
  | "backend-no-profile" // both — 404: user row doesn't exist yet (auth race)
  | "backend-unauthorized" // both — 401: Firebase token missing or rejected
  | "backend-rejected" // both — other 4xx: malformed token, validation
  | "backend-unreachable" // both — network error or 5xx after retries exhausted
  | "unknown"; // threw, but matched no known pattern

export interface PushFailure {
  type: PushFailureType;
  message: string;
  phase: PushPhase;
}

/**
 * Per-attempt context. `platform` and `isDevice` are deliberately NOT here —
 * they're constant for the process and derived internally, so no call site can
 * forget them or get them wrong.
 */
export interface PushTelemetryContext {
  /** Firebase UID present at the time of the attempt. False ⇒ an auth race. */
  hasUid: boolean;
  /** 1-based retry attempt, for backend failures. */
  attempt?: number;
  /** HTTP status, for backend-* failures. */
  httpStatus?: number;
  /**
   * A short PREFIX of the push token — never the whole thing. A push token is a
   * sendable credential: anyone holding it can deliver notifications to that
   * device. `Sentry.init` runs with `sendDefaultPii: true`, so a full token in
   * `extra` would be a real leak. Use `redactToken()` to build this.
   */
  tokenPrefix?: string;
}

/** Spanish copy, plus whether this failure is worth interrupting the user over. */
export const PUSH_FAILURE_COPY: Record<
  PushFailureType,
  { title: string; description: string; notify: boolean }
> = {
  "channel-setup-failed": {
    title: "No se pudieron preparar las alertas",
    description: "Cierra y vuelve a abrir la app para reintentarlo.",
    notify: true,
  },
  // The permission flow already shows its own Alert — a toast on top would be
  // the same news twice.
  "permission-denied": {
    title: "Permiso denegado",
    description: "Sin permiso no se pueden recibir alertas de huracán.",
    notify: false,
  },
  "apns-register-failed": {
    title: "No se pudieron activar notificaciones",
    description: "Revisa tu conexión e intenta abrir la app de nuevo.",
    notify: true,
  },
  // Distinto de `apns-register-failed` a propósito: aquí el registro SÍ funcionó y
  // Apple nunca devolvió el token. Eso casi nunca es la red — es aprovisionamiento
  // (falta el entitlement `aps-environment`, o Push no está habilitado en el App ID).
  // Al usuario no le sirve "revisa tu conexión", así que el copy no lo dice.
  "apns-token-timeout": {
    title: "No se pudieron activar notificaciones",
    description: "Vuelve a abrir la app más tarde para reintentarlo.",
    notify: true,
  },
  "token-unavailable": {
    title: "No se pudieron activar notificaciones",
    description: "Revisa tu conexión e intenta abrir la app de nuevo.",
    notify: true,
  },
  // Self-healing: the profile is created moments later by upsertUserProfile, and
  // the next launch re-POSTs. Telling the user would be alarming and wrong.
  "backend-no-profile": {
    title: "Preparando notificaciones",
    description: "Se activarán en unos segundos.",
    notify: false,
  },
  // The auth layer surfaces its own errors; a second message here adds noise.
  "backend-unauthorized": {
    title: "Sesión no válida",
    description: "Vuelve a iniciar sesión para recibir alertas.",
    notify: false,
  },
  "backend-rejected": {
    title: "No se pudieron activar notificaciones",
    description: "Vuelve a abrir la app; si sigue igual, contáctanos.",
    notify: true,
  },
  "backend-unreachable": {
    title: "No se pudieron activar notificaciones",
    description: "Revisa tu conexión e intenta abrir la app de nuevo.",
    notify: true,
  },
  unknown: {
    title: "No se pudieron activar notificaciones",
    description: "Revisa tu conexión e intenta abrir la app de nuevo.",
    notify: true,
  },
};

/**
 * Map a backend HTTP status to a named failure.
 *
 * 404 is singled out because `POST /api/v1/push-token` returns it for exactly one
 * reason — "User profile not found. Call POST /api/v1/users/me first." — which is
 * a benign startup race, not a defect. Giving it its own name is what lets a
 * dashboard answer "is this the race, or something real?" without opening events.
 */
export function classifyBackendStatus(status: number): PushFailureType {
  if (status === 404) return "backend-no-profile";
  if (status === 401 || status === 403) return "backend-unauthorized";
  if (status >= 500) return "backend-unreachable";
  if (status >= 400) return "backend-rejected";
  return "unknown";
}

/**
 * Turn anything throwable into a usable message.
 *
 * Exists because `String(err)` on an `undefined` that was never assigned yields
 * the literal string "undefined" — which is how a real backend rejection ended up
 * recorded as `error: "undefined"` with no toast and no Sentry event. Never let a
 * missing error read as a successful one.
 */
export function toMessage(err: unknown): string {
  if (err === undefined || err === null) return "(no error object)";
  if (err instanceof Error) return err.message || err.name;
  if (typeof err === "string") return err;
  try {
    return JSON.stringify(err);
  } catch {
    return Object.prototype.toString.call(err);
  }
}

/** Safe prefix of a push token for telemetry. Tokens are credentials — never log one whole. */
export function redactToken(
  token: string | null | undefined,
): string | undefined {
  if (!token) return undefined;
  return `${token.slice(0, 12)}…(${token.length})`;
}

// De-dupe guard: registration runs on every sign-in and retries internally, so
// the same failure can surface several times per session. We report each
// *distinct* failure once so Sentry isn't flooded. Keyed by type + phase + message.
let lastReportedKey: string | null = null;

/** Call when a fresh registration attempt begins so the next failure re-reports. */
export function resetPushFailureReporting() {
  lastReportedKey = null;
}

/** Loud, once-per-distinct-failure report: console (logcat) + Sentry. */
export function reportPushFailure(
  failure: PushFailure,
  ctx: PushTelemetryContext,
) {
  const key = `${failure.type}|${failure.phase}|${failure.message}`;
  if (key === lastReportedKey) return;
  lastReportedKey = key;

  console.error(
    `[Push] FAILURE type=${failure.type} phase=${failure.phase} ` +
      `platform=${Platform.OS} status=${ctx.httpStatus ?? "n/a"} ` +
      `attempt=${ctx.attempt ?? "n/a"} msg="${failure.message}"`,
  );

  // Tags must be low-cardinality strings — they're what you filter a dashboard by.
  const tags: Record<string, string> = {
    feature: "push-registration",
    failureType: failure.type,
    phase: failure.phase,
    platform: Platform.OS,
  };
  if (ctx.httpStatus !== undefined) tags.httpStatus = String(ctx.httpStatus);

  // A synthetic Error whose message encodes the type gives Sentry a stable
  // grouping key per failure type, while tags/extra carry the debugging context.
  Sentry.captureException(new Error(`push-registration: ${failure.type}`), {
    tags,
    extra: {
      message: failure.message,
      isDevice: Device.isDevice,
      hasUid: ctx.hasUid,
      attempt: ctx.attempt,
      httpStatus: ctx.httpStatus,
      tokenPrefix: ctx.tokenPrefix,
    },
  });
}

/** A stage breadcrumb so a Sentry event shows the path that led to the failure. */
export function pushBreadcrumb(
  message: string,
  data?: Record<string, unknown>,
) {
  console.log(`[Push] ${message}`, data ?? "");
  Sentry.addBreadcrumb({
    category: "push",
    level: "info",
    message,
    data,
  });
}
