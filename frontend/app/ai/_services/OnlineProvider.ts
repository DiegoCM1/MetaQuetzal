import EventSource from 'react-native-sse'
import { AIProvider } from './AIProvider'
import { Message } from "../_types"
import { getAuthToken } from '../../../utils/api'
import { API_BASE_URL } from '../../../utils/config'


export class OnlineProvider implements AIProvider {
    async sendMessage(
        messages: Message[],
        location: string | null,
        latitude: number | null,
        longitude: number | null,
        onToken: (token: string) => void,
        signal?: AbortSignal,
    ): Promise<void> {
        const payload = messages.map(m => ({
            role: m.role === 'bot' ? 'assistant' : m.role,
            content: m.text,
        }))

        const token = await getAuthToken()

        return new Promise<void>((resolve, reject) => {
            const es = new EventSource(`${API_BASE_URL}/ai/chat`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ messages: payload, location, latitude, longitude }),
                pollingInterval: 0,
            })

            let settled = false
            const finish = (err?: Error) => {
                if (settled) return
                settled = true
                es.removeAllEventListeners()
                es.close()
                if (err) reject(err)
                else resolve()
            }

            if (signal) {
                if (signal.aborted) {
                    finish()
                    return
                }
                signal.addEventListener('abort', () => finish())
            }

            es.addEventListener('message', (event: any) => {
                const raw = event?.data
                if (raw == null) return
                if (raw === '[DONE]') {
                    finish()
                    return
                }
                try {
                    const parsed = JSON.parse(raw)
                    if (parsed?.error) {
                        finish(new Error(`stream_interrupted: ${parsed.error}`))
                        return
                    }
                    const delta = parsed?.choices?.[0]?.delta?.content
                    if (delta) onToken(delta)
                } catch (e) {
                    console.warn('[OnlineProvider] failed to parse chunk:', raw, e)
                }
            })

            es.addEventListener('error', (event: any) => {
                console.error('[OnlineProvider] SSE error:', event)
                finish(new Error(event?.message ?? 'SSE connection error'))
            })
        })
    }
}




