import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import * as Network from 'expo-network'
import * as Device from 'expo-device'
import * as FileSystem from 'expo-file-system'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { Alert, Platform } from 'react-native'

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

  const llm = useNativeLLM(!modelOptedIn)

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
    if (llm.downloadProgress > 0) {
      console.log('[Model] download_progress:', Math.round(llm.downloadProgress * 100) + '%')
    }
  }, [llm.downloadProgress])

  useEffect(() => {
    if (llm.error) {
      console.error('[Model] error:', llm.error)
    }
  }, [llm.error])

  const optIn = async () => {
    try {
      const freeBytes = await FileSystem.getFreeDiskStorageAsync()
      if (freeBytes < MODEL.minFreeBytes) {
        const freeGB = (freeBytes / GB).toFixed(2)
        const requiredGB = (MODEL.minFreeBytes / GB).toFixed(1)
        console.log(`[Model] opt_in blocked: ${freeGB} GB free, need ${requiredGB} GB`)
        Alert.alert(
          'Espacio insuficiente',
          `Para descargar el modelo IA necesitas al menos ${requiredGB} GB libres. Tienes ${freeGB} GB disponibles. Libera espacio en tu dispositivo e intenta de nuevo.`,
          [{ text: 'OK' }]
        )
        return
      }
    } catch (e) {
      console.warn('[Model] could not check free disk space, proceeding anyway:', e)
    }

    await AsyncStorage.setItem(MODEL_OPT_IN_KEY, 'true')
    setModelOptedIn(true)
    console.log('[Model] opt_in -> true')
  }

  const retryDownload = async () => {
    console.log('[Model] retrying download — cleaning partial files first')
    setModelOptedIn(false)
    await new Promise(resolve => setTimeout(resolve, 100))

    if (Platform.OS !== 'web') {
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { ExpoResourceFetcher } = require('react-native-executorch-expo-resource-fetcher')
        await ExpoResourceFetcher.deleteResources(
          MODEL.modelSource,
          MODEL.tokenizerSource,
          MODEL.tokenizerConfigSource,
        )
        console.log('[Model] retry: cleaned partial files')
      } catch (e) {
        console.warn('[Model] retry: delete error (files may not exist):', e)
      }
    }

    setModelOptedIn(true)
    console.log('[Model] retry: restarted download')
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

  const value = useMemo<ModelContextValue>(() => ({
    llm,
    modelOptedIn,
    optIn,
    optOut,
    retryDownload,
    downloadProgress: llm.downloadProgress,
    modelReady: llm.isReady,
    modelError: llm.error,
    modelMode,
    setModelMode,
  }), [llm, modelOptedIn, modelMode])

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
