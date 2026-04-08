import { useState, useEffect } from 'react'
import * as Network from 'expo-network'
import * as Device from 'expo-device'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { Message } from '../_types'
import { OnlineProvider } from '../_services/OnlineProvider'
import { useLLM } from 'react-native-executorch'
import { Alert } from 'react-native'

const MODEL_OPT_IN_KEY = '@blueye_model_opted_in'
const online = new OnlineProvider()

const GB = 1024 * 1024 * 1024
const totalRAM = Device.totalMemory ?? 0
const useHighEnd = totalRAM >= 6 * GB

const R2 = 'https://pub-c8297f0a04ba41a89d571ea9b4cd93d3.r2.dev'

const MODEL = useHighEnd
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

export function useChat() {
    const [messages, setMessages] = useState<Message[]>([])
    const [input, setInput] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [modelOptedIn, setModelOptedIn] = useState(false)
    const [modelMode, setModelMode] = useState<'online' | 'offline' | null>(null)

    const llm = useLLM({
        model: MODEL,
        preventLoad: !modelOptedIn
    })

    // CHECK NETWORK STATE ON MOUNT
    useEffect(() => {
        Network.getNetworkStateAsync().then(status => {
            setModelMode(status.isConnected && status.isInternetReachable ? 'online' : 'offline')
        })
    }, [])

    // CHECK OPT-IN FLAG
    useEffect(() => {
        console.log('[useChat] device_ram:', Math.round(totalRAM / GB * 10) / 10, 'GB → model:', MODEL.modelName)
        AsyncStorage.getItem(MODEL_OPT_IN_KEY).then(value => {
            const opted = value === 'true'
            console.log('[useChat] model_opt_in_flag:', value, '→ preventLoad:', !opted)
            setModelOptedIn(opted)
        })
    }, [])

    // STREAM OFFLINE TOKENS
    useEffect(() => {
        if (llm.response) {
            setMessages(prev => {
                const last = prev[prev.length - 1]
                return [...prev.slice(0, -1), { ...last, text: llm.response }]
            })
        }
    }, [llm.response])

    // LOG DOWNLOAD PROGRESS
    useEffect(() => {
        if (llm.downloadProgress > 0) {
            console.log('[useChat] model_download_progress:', Math.round(llm.downloadProgress * 100) + '%')
        }
    }, [llm.downloadProgress])

    // LOG MODEL ERRORS
    useEffect(() => {
        if (llm.error) {
            console.error('[useChat] model_error:', llm.error)
        }
    }, [llm.error])

    // SET SYSTEM PROMPT WHEN MODEL IS READY
    useEffect(() => {
        if (llm.isReady) {
            console.log('[useChat] model_ready — configuring system prompt')
            llm.configure({
                chatConfig: {
                    systemPrompt: 'You are BluEye, an offline hurricane survival assistant serving residents of Mexico. FORMAT: Maximum 80 words. Short sentences. Bullet points for steps. RULES: 1. Always respond in simple Spanish. No English. 2. Be calm and reassuring but never minimize real danger. 3. You are fully offline. Do not reference websites, phone numbers or live data. Never assume outcomes about people, locations, or safety status. If asked for real-time information, tell the user to check local radio or authorities. 4. Prioritize immediate safety first, then practical next steps.'
                }
            })
        }
    }, [llm.isReady])

    // STOP LOADING WHEN OFFLINE INFERENCE FINISHES
    useEffect(() => {
        if (!llm.isGenerating && isLoading) {
            setIsLoading(false)
        }
    }, [llm.isGenerating, isLoading])

    // LOAD MESSAGES
    const loadMessages = async () => {
        try {
            const saved = await AsyncStorage.getItem('chat messages')
            if (saved) setMessages(JSON.parse(saved))
        } catch (error) {
            console.error('Error loading messages:', error)
        }
    }

    // SAVE MESSAGES
    const saveMessages = async (msgs: Message[]) => {
        try {
            await AsyncStorage.setItem('chat messages', JSON.stringify(msgs))
        } catch (error) {
            console.error('Error saving messages:', error)
        }
    }

    // RESTART CONVERSATION
    const restartConversation = async () => {
        setMessages([])
        saveMessages([])
    }

    // HANDLE SEND MESSAGE
    const handleSendMessage = async () => {
        if (!input.trim()) return

        const userMessage: Message = {
            role: 'user',
            text: input,
            timestamp: new Date().toISOString(),
        }

        setMessages(prev => [...prev, userMessage])
        setMessages(prev => [...prev, { role: 'bot', text: '', timestamp: new Date().toISOString() }])
        setInput('')
        setIsLoading(true)
        console.log('ai_message_send', { length: input.length })

        try {
            const status = await Network.getNetworkStateAsync()
            const hasInternet = status.isConnected && status.isInternetReachable

            if (!hasInternet) {
                console.log('[useChat] routing → offline', MODEL.modelName)
                setModelMode('offline')
                llm.sendMessage(input)
                // isLoading cleared by llm.isGenerating effect above
            } else {
                console.log('[useChat] routing → online (Together AI)')
                setModelMode('online')
                await online.sendMessage(input, (token) => {
                    setMessages(prev => {
                        const last = prev[prev.length - 1]
                        return [...prev.slice(0, -1), { ...last, text: last.text + token }]
                    })
                })
                console.log('ai_response_received')
                setIsLoading(false)
            }
        } catch (error) {
            console.error('Error sending message:', error)
            const errorText = 'Ocurrió un error con el asistente.'
            setMessages(prev => [...prev, {
                role: 'bot',
                text: errorText,
                timestamp: new Date().toISOString(),
                error: true
            }])
            Alert.alert('Error', errorText)
            setIsLoading(false)
        }
    }

    useEffect(() => { loadMessages() }, [])
    useEffect(() => { saveMessages(messages) }, [messages])

    return { messages, input, setInput, isLoading, restartConversation, handleSendMessage, modelDownloadProgress: llm.downloadProgress, modelReady: llm.isReady, modelMode }
}
