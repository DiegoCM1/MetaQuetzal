import { useState, useEffect } from 'react'
import * as Network from 'expo-network'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { Message } from '../_types'
import { OnlineProvider } from '../_services/OnlineProvider'
import { useModel } from '../_context/ModelContext'
import { Alert } from 'react-native'

const online = new OnlineProvider()

export function useChat() {
    const { llm, modelReady, setModelMode } = useModel()

    const [messages, setMessages] = useState<Message[]>([])
    const [input, setInput] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [pendingMessage, setPendingMessage] = useState<string | null>(null)

    // SEND PENDING MESSAGE ONCE MODEL IS READY
    useEffect(() => {
        if (modelReady && pendingMessage) {
            console.log('[useChat] model ready — sending pending message')
            llm.sendMessage(pendingMessage)
            setPendingMessage(null)
        }
    }, [modelReady, pendingMessage])

    // STREAM OFFLINE TOKENS
    useEffect(() => {
        if (llm.response) {
            setMessages(prev => {
                const last = prev[prev.length - 1]
                return [...prev.slice(0, -1), { ...last, text: llm.response }]
            })
        }
    }, [llm.response])

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
                setModelMode('offline')
                if (!modelReady) {
                    console.log('[useChat] model not ready — queuing message')
                    setPendingMessage(input)
                    return
                }
                console.log('[useChat] routing → offline')
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

    return { messages, input, setInput, isLoading, restartConversation, handleSendMessage }
}
