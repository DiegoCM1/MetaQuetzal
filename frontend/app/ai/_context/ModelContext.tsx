import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import * as Network from 'expo-network'
import * as Device from 'expo-device'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useLLM, LLMType, RnExecutorchError } from 'react-native-executorch'
import { ExpoResourceFetcher } from 'react-native-executorch-expo-resource-fetcher'

export const MODEL_OPT_IN_KEY = '@blueye_model_opted_in'

const GB = 1024 * 1024 * 1024
const totalRAM = Device.totalMemory ?? 0

const R2 = 'https://pub-c8297f0a04ba41a89d571ea9b4cd93d3.r2.dev'

export const MODEL = totalRAM >= 6 * GB
    ? {
        modelName: 'llama-3.2-3b-spinquant' as const,
        // TODO: replace with 3B URL once uploaded to R2
        modelSource: `${R2}/llama32_1b_instruct_spinquant.pte`,
        tokenizerSource: `${R2}/tokenizer.json`,
        tokenizerConfigSource: `${R2}/tokenizer_config.json`,
    }
    : {
        modelName: 'llama-3.2-1b-spinquant' as const,
        modelSource: `${R2}/llama32_1b_instruct_spinquant.pte`,
        tokenizerSource: `${R2}/tokenizer.json`,
        tokenizerConfigSource: `${R2}/tokenizer_config.json`,
    }

interface ModelContextValue {
    llm: LLMType
    modelOptedIn: boolean
    optIn: () => Promise<void>
    optOut: () => Promise<void>
    retryDownload: () => void
    downloadProgress: number
    modelReady: boolean
    modelError: RnExecutorchError | null
    modelMode: 'online' | 'offline' | null
    setModelMode: (mode: 'online' | 'offline') => void
}

const ModelContext = createContext<ModelContextValue | null>(null)

export function ModelProvider({ children }: { children: ReactNode }) {
    const [modelOptedIn, setModelOptedIn] = useState(false)
    const [modelMode, setModelMode] = useState<'online' | 'offline' | null>(null)

    const llm = useLLM({
        model: MODEL,
        preventLoad: !modelOptedIn,
    })

    // CHECK OPT-IN ON MOUNT
    useEffect(() => {
        console.log('[Model] device_ram:', Math.round(totalRAM / GB * 10) / 10, 'GB → model:', MODEL.modelName)
        AsyncStorage.getItem(MODEL_OPT_IN_KEY).then(value => {
            const opted = value === 'true'
            console.log('[Model] opt_in_flag:', value, '→ preventLoad:', !opted)
            setModelOptedIn(opted)
        })
    }, [])

    // CHECK NETWORK ON MOUNT
    useEffect(() => {
        Network.getNetworkStateAsync().then(status => {
            setModelMode(status.isConnected && status.isInternetReachable ? 'online' : 'offline')
        })
    }, [])

    // SET SYSTEM PROMPT WHEN MODEL IS READY
    useEffect(() => {
        if (llm.isReady) {
            console.log('[Model] ready — configuring system prompt')
            llm.configure({
                chatConfig: {
                    systemPrompt: 'You are BluEye, an offline hurricane survival assistant serving residents of Mexico. FORMAT: Maximum 80 words. Short sentences. Bullet points for steps. RULES: 1. Always respond in simple Spanish. No English. 2. Be calm and reassuring but never minimize real danger. 3. You are fully offline. Do not reference websites, phone numbers or live data. Never assume outcomes about people, locations, or safety status. If asked for real-time information, tell the user to check local radio or authorities. 4. Prioritize immediate safety first, then practical next steps.'
                }
            })
        }
    }, [llm.isReady])

    // LOG DOWNLOAD PROGRESS
    useEffect(() => {
        if (llm.downloadProgress > 0) {
            console.log('[Model] download_progress:', Math.round(llm.downloadProgress * 100) + '%')
        }
    }, [llm.downloadProgress])

    // LOG ERRORS
    useEffect(() => {
        if (llm.error) {
            console.error('[Model] error:', llm.error)
        }
    }, [llm.error])

    const optIn = async () => {
        await AsyncStorage.setItem(MODEL_OPT_IN_KEY, 'true')
        setModelOptedIn(true)
        console.log('[Model] opt_in → true')
    }

    const retryDownload = () => {
        // Toggle preventLoad off → on to re-trigger useLLM's load effect
        // The fetcher will resume from the partial file automatically
        setModelOptedIn(false)
        setTimeout(() => setModelOptedIn(true), 100)
        console.log('[Model] retrying download')
    }

    const optOut = async () => {
        try {
            await ExpoResourceFetcher.deleteResources(
                MODEL.modelSource,
                MODEL.tokenizerSource,
                MODEL.tokenizerConfigSource,
            )
            console.log('[Model] cached files deleted')
        } catch (e) {
            console.warn('[Model] delete error (files may not exist):', e)
        }
        await AsyncStorage.setItem(MODEL_OPT_IN_KEY, 'false')
        setModelOptedIn(false)
        console.log('[Model] opt_in → false')
    }

    return (
        <ModelContext.Provider value={{
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
        }}>
            {children}
        </ModelContext.Provider>
    )
}

export function useModel() {
    const ctx = useContext(ModelContext)
    if (!ctx) throw new Error('useModel must be used inside <ModelProvider>')
    return ctx
}
