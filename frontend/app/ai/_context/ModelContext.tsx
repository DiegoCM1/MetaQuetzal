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

// Watchdog thresholds. A stall (frozen bytes) and a slow load-into-RAM are the
// two failures executorch never reports as errors — these turn them loud.
const STALL_MS = 30_000 // no download progress for 30s while < 100% => stalled
const LOAD_TIMEOUT_MS = 120_000 // bytes done but not ready after 2 min => load-timeout
const WATCHDOG_INTERVAL_MS = 5_000

// Transient download faults resume from the partial file on disk, so we absorb
// them with exponential-backoff auto-retry instead of surfacing a failure. Each
// backoff stays under STALL_MS so the watchdog can't double-fire mid-retry.
const TRANSIENT_FAILURES: ModelFailureType[] = ['download-network', 'download-stalled']
const MAX_AUTO_RETRIES = 4 // delays: 2s, 4s, 8s, 16s — all < STALL_MS
const RETRY_BASE_MS = 2_000

export const MODEL_OPT_IN_KEY = '@blueye_model_opted_in'

const GB = 1024 * 1024 * 1024
const totalRAM = Device.totalMemory ?? 0

const R2 = 'https://pub-c8297f0a04ba41a89d571ea9b4cd93d3.r2.dev'

export const MODEL = totalRAM >= 6 * GB
  ? {
      modelName: 'llama-3.2-3b-spinquant' as const,
      modelSource: `${R2}/llama32_3b_instruct_spinquant.pte`,
      tokenizerSource: `${R2}/tokenizer.json`,
      tokenizerConfigSource: `${R2}/tokenizer_config.json`,
      minFreeBytes: 2.5 * GB,
    }
  : {
      modelName: 'llama-3.2-1b-spinquant' as const,
      modelSource: `${R2}/llama32_1b_instruct_spinquant.pte`,
      tokenizerSource: `${R2}/tokenizer.json`,
      tokenizerConfigSource: `${R2}/tokenizer_config.json`,
      minFreeBytes: 1 * GB,
    }

type ModelMode = 'online' | 'offline' | null

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
  /** >0 while auto-retrying a transient download fault (drives a soft UI state). */
  retryAttempt: number
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

  // Auto-retry bookkeeping. retryAttempt drives the UI; the ref mirrors it so the
  // progress effect can read it; retryCount is the budget; the timer holds the
  // pending resume so we can cancel it on success/opt-out/unmount.
  const [retryAttempt, setRetryAttempt] = useState(0)
  const retryAttemptRef = useRef(0)
  retryAttemptRef.current = retryAttempt
  const retryCountRef = useRef(0)
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

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

  const clearRetryTimer = () => {
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current)
      retryTimerRef.current = null
    }
  }

  /** Reset progress clocks. The partial file on disk is left untouched so the
   *  next fetch can resume from it. */
  const resetProgressTracking = () => {
    lastProgressValueRef.current = 0
    lastProgressAtRef.current = Date.now()
    reached100AtRef.current = 0
    lastLoggedPctRef.current = -1
  }

  /** Full reset before a brand-new download (fresh opt-in): clears progress,
   *  the failure-report de-dupe, and the auto-retry budget. */
  const resetDownloadTracking = () => {
    clearRetryTimer()
    resetModelFailureReporting()
    setModelFailure(null)
    retryCountRef.current = 0
    setRetryAttempt(0)
    resetProgressTracking()
  }

  /** Re-trigger the executorch download by toggling preventLoad. The partial
   *  file is KEPT (so the fetch resumes) unless `deletePartial` — a corrupt
   *  file must be wiped, a dropped connection must not. */
  const restartDownload = async ({ deletePartial }: { deletePartial: boolean }) => {
    setModelOptedIn(false)
    await new Promise(resolve => setTimeout(resolve, 100))

    if (deletePartial && Platform.OS !== 'web') {
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { ExpoResourceFetcher } = require('react-native-executorch-expo-resource-fetcher')
        await ExpoResourceFetcher.deleteResources(
          MODEL.modelSource,
          MODEL.tokenizerSource,
          MODEL.tokenizerConfigSource,
        )
        modelBreadcrumb('cleared partial files for clean restart')
      } catch (e) {
        modelBreadcrumb('deleteResources failed (file may not exist)', { error: String(e) })
      }
    }

    resetProgressTracking()
    setModelFailure(null)
    setModelOptedIn(true)
  }

  /** Route a detected fault. Transient faults (network drop, stall) resume from
   *  the partial file, so we auto-retry them with backoff and never show an
   *  error. Anything else — or a transient fault that outlived the retry budget
   *  — is a real failure: report it to Sentry and surface it to the user. */
  const handleFault = (failure: ModelFailure) => {
    const transient = TRANSIENT_FAILURES.includes(failure.type)

    if (transient && retryCountRef.current < MAX_AUTO_RETRIES) {
      retryCountRef.current += 1
      const attempt = retryCountRef.current
      const delay = Math.min(RETRY_BASE_MS * 2 ** (attempt - 1), STALL_MS - 5_000)
      modelBreadcrumb('download fault — scheduling auto-retry (resume)', {
        type: failure.type,
        attempt,
        delayMs: delay,
        progressPct: Math.round(failure.progress * 100),
      })
      setModelFailure(null)
      setRetryAttempt(attempt)
      clearRetryTimer()
      retryTimerRef.current = setTimeout(() => {
        retryTimerRef.current = null
        restartDownload({ deletePartial: false })
      }, delay)
      return
    }

    // Non-transient, or out of auto-retries: a failure that survived recovery.
    setRetryAttempt(0)
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
      clearRetryTimer()
      retryCountRef.current = 0
      setRetryAttempt(0)
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
        // Bytes moving again after a scheduled retry = the fault healed.
        if (retryAttemptRef.current > 0) {
          modelBreadcrumb('download resumed after fault', { progressPct: Math.round(progress * 100) })
          setRetryAttempt(0)
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
    // A user-initiated retry earns a fresh auto-retry budget.
    clearRetryTimer()
    retryCountRef.current = 0
    setRetryAttempt(0)
    resetModelFailureReporting()
    await restartDownload({ deletePartial: needsClean })
  }

  const optOut = async () => {
    clearRetryTimer()
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

  // Cancel any pending resume if the provider unmounts.
  useEffect(() => clearRetryTimer, [])

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
    retryAttempt,
    modelMode,
    setModelMode,
  }), [llm, modelOptedIn, modelMode, modelFailure, retryAttempt])

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
