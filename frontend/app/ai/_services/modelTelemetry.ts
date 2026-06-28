import * as Sentry from '@sentry/react-native'

/**
 * Step 1 of AI-download hardening: OBSERVABILITY.
 *
 * The executorch `useLLM` hook gives us only three opaque signals — `isReady`,
 * `downloadProgress`, `error` — and an error object with little more than a
 * `message`. None of them tell you *where* in the pipeline a failure happened,
 * and the two most common failures (a frozen download and a slow load-into-RAM)
 * never fire `error` at all — progress just stops.
 *
 * This module gives every failure a NAME, derives the pipeline PHASE it happened
 * in, and reports it loudly (console for `adb logcat`, Sentry for production
 * telemetry) with enough context to debug from a dashboard. It does NOT recover
 * from failures — that's the later state-machine / imperative-control work.
 */

/** Where in the download pipeline we are. Derived from progress + isReady. */
export type ModelPhase = 'idle' | 'precheck' | 'downloading' | 'loading' | 'ready'

/** The named failure taxonomy. Every way the download can go wrong, named. */
export type ModelFailureType =
  | 'precheck-disk' // not enough free storage before we even start
  | 'precheck-cellular' // started on a metered connection (observed, not blocked)
  | 'download-stalled' // bytes froze mid-stream — never throws, watchdog-detected
  | 'download-network' // executorch threw while fetching bytes (progress < 1)
  | 'load-timeout' // bytes arrived (100%) but isReady never flipped — watchdog-detected
  | 'load-corrupt' // executorch threw while loading the file into RAM (progress >= 1)
  | 'oom' // out of memory mapping the model
  | 'unknown' // threw, but matched no known pattern

export interface ModelFailure {
  type: ModelFailureType
  message: string
  phase: ModelPhase
  progress: number
}

export interface ModelTelemetryContext {
  modelName: string
  totalRAMBytes?: number
  networkType?: string
  freeBytes?: number
}

/** Short, user-facing Spanish labels for the Settings card title. */
export const MODEL_FAILURE_LABEL: Record<ModelFailureType, string> = {
  'precheck-disk': 'Espacio insuficiente',
  'precheck-cellular': 'Descargando con datos móviles',
  'download-stalled': 'Descarga detenida — sin avance',
  'download-network': 'Error de red durante la descarga',
  'load-timeout': 'El modelo tardó demasiado en abrir',
  'load-corrupt': 'Archivo del modelo dañado',
  oom: 'Memoria insuficiente para el modelo',
  unknown: 'Error desconocido',
}

/**
 * Map an opaque executorch error to a named type. PHASE is our strongest signal
 * because the library gives us almost no structure: an error before bytes finish
 * (progress < 1) is a download problem; an error after they arrive is a load
 * problem. Message heuristics refine network-vs-OOM within that.
 */
export function classifyModelError(
  message: string | undefined,
  phase: ModelPhase,
  progress: number,
): ModelFailureType {
  const m = (message ?? '').toLowerCase()

  if (m.includes('memory') || m.includes('alloc') || m.includes('oom') || m.includes('mmap')) {
    return 'oom'
  }

  // Bytes already arrived — the failure is in the load/parse step, not the network.
  if (phase === 'loading' || progress >= 1) {
    return 'load-corrupt'
  }

  if (
    m.includes('network') ||
    m.includes('connection') ||
    m.includes('timeout') ||
    m.includes('fetch') ||
    m.includes('econn') ||
    m.includes('socket') ||
    m.includes('host') ||
    m.includes('ssl')
  ) {
    return 'download-network'
  }

  return 'unknown'
}

// De-dupe guard: React can re-render many times with the same `error`, and the
// watchdog ticks on an interval. We report each *distinct* failure exactly once
// so Sentry isn't flooded. Keyed by type + phase + message.
let lastReportedKey: string | null = null

/** Call when a fresh download attempt begins so the next failure re-reports. */
export function resetModelFailureReporting() {
  lastReportedKey = null
}

/** Loud, once-per-distinct-failure report: console (logcat) + Sentry. */
export function reportModelFailure(failure: ModelFailure, ctx: ModelTelemetryContext) {
  const key = `${failure.type}|${failure.phase}|${failure.message}`
  if (key === lastReportedKey) return
  lastReportedKey = key

  const pct = Math.round(failure.progress * 100)
  console.error(
    `[Model] FAILURE type=${failure.type} phase=${failure.phase} progress=${pct}% msg="${failure.message}"`,
  )

  // A synthetic Error whose message encodes the type gives Sentry a stable
  // grouping key per failure type, while tags/extra carry the debugging context.
  Sentry.captureException(new Error(`ai-model-download: ${failure.type}`), {
    tags: {
      feature: 'ai-offline-download',
      failureType: failure.type,
      phase: failure.phase,
    },
    extra: {
      message: failure.message,
      progressPct: pct,
      modelName: ctx.modelName,
      totalRAMBytes: ctx.totalRAMBytes,
      networkType: ctx.networkType,
      freeBytes: ctx.freeBytes,
    },
  })
}

/** A stage breadcrumb so a Sentry event shows the path that led to the failure. */
export function modelBreadcrumb(message: string, data?: Record<string, unknown>) {
  console.log(`[Model] ${message}`, data ?? '')
  Sentry.addBreadcrumb({
    category: 'ai-model',
    level: 'info',
    message,
    data,
  })
}
