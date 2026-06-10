import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import * as Network from 'expo-network'
import * as Device from 'expo-device'
import * as FileSystem from 'expo-file-system/legacy'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { Alert, Platform } from 'react-native'

import {
  classifyModelError,
  modelBreadcrumb,
  reportModelFailure,
  resetModelFailureReporting,
  type ModelFailure,
  type ModelFailureType,
  type ModelPhase,
  type ModelTelemetryContext,
} from '../_services/modelTelemetry'

// Watchdog thresholds. A genuinely dead download (frozen bytes) and a slow
// load-into-RAM are the two failures executorch never reports as errors.
// STALL_MS is deliberately long: a brief blip the stream survives recovers well
// inside it, so only a TRULY dead download (no bytes for 90s) trips it.
const STALL_MS = 90_000 // no download progress for 90s while < 100% => dead
const LOAD_TIMEOUT_MS = 120_000 // bytes done but not ready after 2 min => load-timeout
const WATCHDOG_INTERVAL_MS = 5_000

// A `download-network` error is ambiguous: the stream may have survived the blip
// (progress keeps flowing) or truly died. We never restart on it — that collides
// with a still-live download ("Already downloading this file"). We show a soft
// "reconnecting" hint and trust PROGRESS: if bytes resume it was a blip; if not,
// the long-stall watchdog surfaces it as a real failure.
const TRANSIENT_FAILURES: ModelFailureType[] = ['download-network']

export const MODEL_OPT_IN_KEY = '@blueye_model_opted_in'

const GB = 1024 * 1024 * 1024
const totalRAM = Device.totalMemory ?? 0

const R2 = 'https://pub-c8297f0a04ba41a89d571ea9b4cd93d3.r2.dev'

// TEMPORARY (download-hardening): force the 1B model on EVERY device, regardless
// of RAM. The 1B (~1 GB) downloads and loads far faster than the 2.55 GB 3B, so it
// lets us reproduce and catch download failures in minutes, and removes the RAM/OOM
// risk of a 2.55 GB resident model on borderline (6–7 GB) devices while we make the
// download path reliable. Once the download is proven solid, RESTORE the RAM-based
// selection below (3B for >= 6 GB devices, 1B otherwise).
//
// PREVIOUS — RESTORE THIS LATER:
// export const MODEL = totalRAM >= 6 * GB
//   ? {
//       modelName: 'llama-3.2-3b-spinquant' as const,
//       modelSource: `${R2}/llama32_3b_instruct_spinquant.pte`,
//       tokenizerSource: `${R2}/tokenizer.json`,
//       tokenizerConfigSource: `${R2}/tokenizer_config.json`,
//       minFreeBytes: 2.5 * GB,
//     }
//   : {
//       modelName: 'llama-3.2-1b-spinquant' as const,
//       modelSource: `${R2}/llama32_1b_instruct_spinquant.pte`,
//       tokenizerSource: `${R2}/tokenizer.json`,
//       tokenizerConfigSource: `${R2}/tokenizer_config.json`,
//       minFreeBytes: 1 * GB,
//     }
export const MODEL = {
  modelName: 'llama-3.2-1b-spinquant' as const,
  modelSource: `${R2}/llama32_1b_instruct_spinquant.pte`,
  tokenizerSource: `${R2}/tokenizer.json`,
  tokenizerConfigSource: `${R2}/tokenizer_config.json`,
  minFreeBytes: 1 * GB,
}

type ModelMode = 'online' | 'offline' | null

/**
 * The single lifecycle status the whole UI renders from. Derived once from the
 * raw executorch signals + our failure/reconnect flags, so every screen reads
 * one source of truth instead of re-deriving the phase from scattered booleans.
 *   idle         → not opted in
 *   checking     → opted in, no bytes yet (precheck / connecting)
 *   downloading  → bytes flowing (0 < progress < 1)
 *   reconnecting → a network blip mid-download; bytes paused, stream may resume
 *   loading      → bytes done (progress ≥ 1), mapping the model into RAM
 *   ready        → model loaded and usable
 *   failed       → a real, surfaced failure (see modelFailure for the message)
 */
export type ModelStatus =
  | 'idle'
  | 'checking'
  | 'downloading'
  | 'reconnecting'
  | 'loading'
  | 'ready'
  | 'failed'

type BasicModelError = {
  message?: string
} | null

type BasicLLM = {
  isReady: boolean
  downloadProgress: number
  error: BasicModelError
  configure: (config: unknown) => void
}

interface ModelContextValue {
  llm: BasicLLM
  modelOptedIn: boolean
  optIn: () => Promise<void>
  optOut: () => Promise<void>
  retryDownload: () => void
  downloadProgress: number
  modelReady: boolean
  modelError: BasicModelError
  /** Named, classified failure (incl. silent stalls). Drives the UI + telemetry. */
  modelFailure: ModelFailure | null
  /** True during a transient network blip — a soft "reconnecting" UI hint. */
  reconnecting: boolean
  /** Single derived lifecycle status — the UI renders one card per value. */
  modelStatus: ModelStatus
  modelMode: ModelMode
  setModelMode: (mode: 'online' | 'offline') => void
}

const noop = () => {}

const fallbackLLM: BasicLLM = {
  isReady: false,
  downloadProgress: 0,
  error: null,
  configure: noop,
}

const ModelContext = createContext<ModelContextValue | null>(null)

function useNativeLLM(preventLoad: boolean): BasicLLM {
  if (Platform.OS === 'web') {
    return fallbackLLM
  }

  // Keep the dependency out of the web bundle.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { useLLM } = require('react-native-executorch')
  return useLLM({
    model: MODEL,
    preventLoad,
  }) as BasicLLM
}

export function ModelProvider({ children }: { children: ReactNode }) {
  const [modelOptedIn, setModelOptedIn] = useState(false)
  const [modelMode, setModelMode] = useState<ModelMode>(Platform.OS === 'web' ? 'online' : null)
  const [modelFailure, setModelFailure] = useState<ModelFailure | null>(null)

  const llm = useNativeLLM(!modelOptedIn)

  // Mirror live values into refs so the error effect and watchdog interval read
  // the *current* progress/ready/opt-in without re-subscribing on every change.
  const progressRef = useRef(0)
  const readyRef = useRef(false)
  const optedInRef = useRef(false)
  progressRef.current = llm.downloadProgress
  readyRef.current = llm.isReady
  optedInRef.current = modelOptedIn

  // Watchdog bookkeeping for the two silent failures.
  const lastProgressValueRef = useRef(0)
  const lastProgressAtRef = useRef(Date.now())
  const reached100AtRef = useRef(0)
  // executorch fires sub-percent updates constantly; only log on a whole-% change
  // so the logs stay readable and the download *rate* is visible.
  const lastLoggedPctRef = useRef(-1)

  // The native fetcher self-heals network blips, so we don't restart on them —
  // we just flag "reconnecting" for a soft UI hint and let the download continue.
  // The progress effect clears it when bytes resume. (Ref mirrors it for effects.)
  const [reconnecting, setReconnecting] = useState(false)
  const reconnectingRef = useRef(false)
  reconnectingRef.current = reconnecting

  // Context attached to every failure report (captured at opt-in time).
  const telemetryCtxRef = useRef<ModelTelemetryContext>({
    modelName: MODEL.modelName,
    totalRAMBytes: totalRAM,
  })

  /** Current pipeline phase, derived from live refs. */
  const currentPhase = (): ModelPhase => {
    if (readyRef.current) return 'ready'
    if (!optedInRef.current) return 'idle'
    if (progressRef.current >= 1) return 'loading'
    return 'downloading'
  }

  /** Reset progress clocks. The partial file on disk is left untouched so the
   *  next fetch can resume from it. */
  const resetProgressTracking = () => {
    lastProgressValueRef.current = 0
    lastProgressAtRef.current = Date.now()
    reached100AtRef.current = 0
    lastLoggedPctRef.current = -1
  }

  /** Full reset before a brand-new download (fresh opt-in or manual retry). */
  const resetDownloadTracking = () => {
    resetModelFailureReporting()
    setModelFailure(null)
    setReconnecting(false)
    resetProgressTracking()
  }

  /** Forcefully restart the download — only called from a MANUAL retry, by which
   *  point the old task is genuinely dead (a 90s stall or a load failure), so
   *  cancelFetching won't collide. `deletePartial` wipes a corrupt file so the
   *  re-fetch starts clean; otherwise the partial is kept and the fetch resumes. */
  const restartDownload = async ({ deletePartial }: { deletePartial: boolean }) => {
    setModelOptedIn(false)

    if (Platform.OS !== 'web') {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { ExpoResourceFetcher } = require('react-native-executorch-expo-resource-fetcher')
      const sources = [MODEL.modelSource, MODEL.tokenizerSource, MODEL.tokenizerConfigSource]
      try {
        await ExpoResourceFetcher.cancelFetching(...sources)
        if (deletePartial) {
          await ExpoResourceFetcher.deleteResources(...sources)
          modelBreadcrumb('cancelled + cleared partial files for clean restart')
        } else {
          modelBreadcrumb('cancelled in-flight download before restart')
        }
      } catch (e) {
        modelBreadcrumb('cancel/delete failed (file may not exist)', { error: String(e) })
      }
    }

    // Let the native task fully settle before re-triggering.
    await new Promise(resolve => setTimeout(resolve, 400))
    resetProgressTracking()
    setModelFailure(null)
    setModelOptedIn(true)
  }

  /** Route a detected fault. A `download-network` blip is ambiguous — the stream
   *  often survives it — so we never restart on it (that collides with a live
   *  download). We show a soft "reconnecting" hint and let PROGRESS be the judge:
   *  if bytes resume it was a blip; if not, the long-stall watchdog escalates it.
   *  Everything else (long stall, corrupt, oom) is a real failure: report + surface. */
  const handleFault = (failure: ModelFailure) => {
    if (TRANSIENT_FAILURES.includes(failure.type)) {
      modelBreadcrumb('network blip — letting the download ride (trusting progress)', {
        type: failure.type,
        progressPct: Math.round(failure.progress * 100),
      })
      setReconnecting(true)
      return
    }

    setReconnecting(false)
    reportModelFailure(failure, telemetryCtxRef.current)
    setModelFailure(failure)
  }

  useEffect(() => {
    console.log('[Model] device_ram:', Math.round((totalRAM / GB) * 10) / 10, 'GB -> model:', MODEL.modelName)
    AsyncStorage.getItem(MODEL_OPT_IN_KEY).then(value => {
      const opted = value === 'true'
      console.log('[Model] opt_in_flag:', value, '-> preventLoad:', !opted)
      setModelOptedIn(opted)
    })
  }, [])

  useEffect(() => {
    Network.getNetworkStateAsync().then(status => {
      setModelMode(status.isConnected && status.isInternetReachable ? 'online' : 'offline')
    })
  }, [])

  useEffect(() => {
    if (Platform.OS === 'web') return
    if (llm.isReady) {
      setReconnecting(false)
      setModelFailure(null)
      modelBreadcrumb('model ready', { modelName: MODEL.modelName })
      console.log('[Model] ready -> configuring system prompt')
      console.log('[Model] loaded file:', MODEL.modelSource)
      llm.configure({
        chatConfig: {
          systemPrompt: 'You are Bluai, an offline hurricane survival assistant serving residents of Mexico. FORMAT: Maximum 80 words. Short sentences. Bullet points for steps. RULES: 1. Always respond in simple Spanish. No English. 2. Be calm and reassuring but never minimize real danger. 3. You are fully offline. Do not reference websites, phone numbers or live data. Never assume outcomes about people, locations, or safety status. If asked for real-time information, tell the user to check local radio or authorities. 4. Prioritize immediate safety first, then practical next steps.'
        }
      })
    }
  }, [llm.isReady])

  useEffect(() => {
    const progress = llm.downloadProgress
    if (progress > 0) {
      // Only a real advance resets the stall clock — a repeated value is a freeze.
      if (progress > lastProgressValueRef.current) {
        lastProgressAtRef.current = Date.now()
        // Bytes moving again after a blip = the stream survived; clear the hint.
        if (reconnectingRef.current) {
          modelBreadcrumb('download resumed after network blip', { progressPct: Math.round(progress * 100) })
          setReconnecting(false)
        }
      }
      if (progress >= 1 && reached100AtRef.current === 0) {
        reached100AtRef.current = Date.now()
        modelBreadcrumb('download complete, loading into RAM')
      }
      lastProgressValueRef.current = progress
      const pct = Math.round(progress * 100)
      if (pct !== lastLoggedPctRef.current) {
        lastLoggedPctRef.current = pct
        console.log('[Model] download_progress:', pct + '%')
      }
    }
  }, [llm.downloadProgress])

  // Classify thrown errors into a named failure and report loudly.
  useEffect(() => {
    if (!llm.error) return
    const phase = currentPhase()
    const progress = progressRef.current
    const type = classifyModelError(llm.error.message, phase, progress)
    const failure: ModelFailure = {
      type,
      message: llm.error.message ?? 'unknown error',
      phase,
      progress,
    }
    handleFault(failure)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [llm.error])

  // Watchdog for the two failures executorch never throws: a frozen download
  // and a download that completes but never becomes ready. Runs only while a
  // download is in flight and no failure has been recorded yet.
  useEffect(() => {
    if (Platform.OS === 'web') return
    if (!modelOptedIn || llm.isReady || modelFailure) return

    const id = setInterval(() => {
      const now = Date.now()
      const progress = progressRef.current

      if (progress >= 1) {
        const waited = now - reached100AtRef.current
        if (reached100AtRef.current > 0 && waited > LOAD_TIMEOUT_MS) {
          const failure: ModelFailure = {
            type: 'load-timeout',
            message: `bytes at 100% but isReady never flipped after ${Math.round(waited / 1000)}s`,
            phase: 'loading',
            progress,
          }
          handleFault(failure)
        }
      } else if (progress > 0) {
        const idle = now - lastProgressAtRef.current
        if (idle > STALL_MS) {
          const failure: ModelFailure = {
            type: 'download-stalled',
            message: `no progress for ${Math.round(idle / 1000)}s (frozen at ${Math.round(progress * 100)}%)`,
            phase: 'downloading',
            progress,
          }
          handleFault(failure)
        }
      }
    }, WATCHDOG_INTERVAL_MS)

    return () => clearInterval(id)
    // handleFault is stable via refs; re-subscribing each render would reset the timer.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modelOptedIn, llm.isReady, modelFailure])

  const optIn = async () => {
    resetDownloadTracking()

    let freeBytes: number | undefined
    try {
      freeBytes = await FileSystem.getFreeDiskStorageAsync()
      if (freeBytes < MODEL.minFreeBytes) {
        const freeGB = (freeBytes / GB).toFixed(2)
        const requiredGB = (MODEL.minFreeBytes / GB).toFixed(1)
        Alert.alert(
          'Espacio insuficiente',
          `Para descargar el modelo IA necesitas al menos ${requiredGB} GB libres. Tienes ${freeGB} GB disponibles. Libera espacio en tu dispositivo e intenta de nuevo.`,
          [{ text: 'OK' }]
        )
        const failure: ModelFailure = {
          type: 'precheck-disk',
          message: `${freeGB} GB free, need ${requiredGB} GB`,
          phase: 'precheck',
          progress: 0,
        }
        reportModelFailure(failure, { ...telemetryCtxRef.current, freeBytes })
        return
      }
    } catch (e) {
      modelBreadcrumb('disk-space check failed, proceeding anyway', { error: String(e) })
    }

    // Observe (don't block) the network type — a 2.5 GB pull over cellular is a
    // top cause of failures. Captured into telemetry context for every report.
    let networkType: string | undefined
    try {
      const net = await Network.getNetworkStateAsync()
      networkType = net.type
      if (net.type === Network.NetworkStateType.CELLULAR) {
        modelBreadcrumb('precheck: starting download over cellular', { networkType })
      }
    } catch {
      /* network type is best-effort context only */
    }

    telemetryCtxRef.current = {
      modelName: MODEL.modelName,
      totalRAMBytes: totalRAM,
      networkType,
      freeBytes,
    }
    modelBreadcrumb('opt-in: starting download', { modelName: MODEL.modelName, networkType, freeBytes })

    await AsyncStorage.setItem(MODEL_OPT_IN_KEY, 'true')
    setModelOptedIn(true)
    console.log('[Model] opt_in -> true')
  }

  const retryDownload = async () => {
    // A corrupt file must be wiped; anything else resumes from the partial.
    const needsClean = modelFailure?.type === 'load-corrupt'
    modelBreadcrumb(needsClean ? 'manual retry: clean restart' : 'manual retry: resume from partial')
    setReconnecting(false)
    resetModelFailureReporting()
    await restartDownload({ deletePartial: needsClean })
  }

  const optOut = async () => {
    if (Platform.OS !== 'web') {
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { ExpoResourceFetcher } = require('react-native-executorch-expo-resource-fetcher')
        await ExpoResourceFetcher.deleteResources(
          MODEL.modelSource,
          MODEL.tokenizerSource,
          MODEL.tokenizerConfigSource,
        )
        console.log('[Model] cached files deleted')
      } catch (e) {
        console.warn('[Model] delete error (files may not exist):', e)
      }
    }

    await AsyncStorage.setItem(MODEL_OPT_IN_KEY, 'false')
    setModelOptedIn(false)
    console.log('[Model] opt_in -> false')
  }

  // Derive the one lifecycle status from the raw signals. Order = priority:
  // terminal states (ready/failed) win, then the transient blip overlay, then
  // the byte-driven phases, falling back to "checking" once opted in.
  const modelStatus: ModelStatus = !modelOptedIn
    ? 'idle'
    : llm.isReady
      ? 'ready'
      : modelFailure
        ? 'failed'
        : reconnecting
          ? 'reconnecting'
          : llm.downloadProgress >= 1
            ? 'loading'
            : llm.downloadProgress > 0
              ? 'downloading'
              : 'checking'

  const value = useMemo<ModelContextValue>(() => ({
    llm,
    modelOptedIn,
    optIn,
    optOut,
    retryDownload,
    downloadProgress: llm.downloadProgress,
    modelReady: llm.isReady,
    modelError: llm.error,
    modelFailure,
    reconnecting,
    modelStatus,
    modelMode,
    setModelMode,
  }), [llm, modelOptedIn, modelMode, modelFailure, reconnecting, modelStatus])

  return (
    <ModelContext.Provider value={value}>
      {children}
    </ModelContext.Provider>
  )
}

export function useModel() {
  const ctx = useContext(ModelContext)
  if (!ctx) throw new Error('useModel must be used inside <ModelProvider>')
  return ctx
}
