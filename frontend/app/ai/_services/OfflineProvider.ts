import { initLlama, LlamaContext, toggleNativeLog, addNativeLogListener } from 'llama.rn'
import { AIProvider } from './AIProvider'
import { MODEL_PATH } from '../_constants'

export class OfflineProvider implements AIProvider {
    private modelPath: string = MODEL_PATH
    private context: LlamaContext | null = null

    async sendMessage(text: string, onToken: (token: string) => void): Promise<void> {
        console.log('OfflineProvider: loading model from', this.modelPath)
        if (this.context === null) {
            try {
                await toggleNativeLog(true)
                const logSub = addNativeLogListener((level, msg) => {
                    console.log(`[llama.cpp ${level}]`, msg.trim())
                })

                const path = this.modelPath.replace('file://', '')
                this.context = await initLlama(
                    { model: path, n_ctx: 2048, use_mmap: false, chat_template: "{% for message in messages %}{{message['content']}}{% endfor %}"},
                    (progress) => console.log('Model load progress:', progress)
                )
                logSub.remove()
                console.log('OfflineProvider: model loaded successfully')
            } catch (e) {
                console.log('OfflineProvider: initLlama failed:', JSON.stringify(e), e?.message, e?.stack)
                throw e
            }
        }

        await this.context.completion(
            { prompt: text },
            (token) => onToken(token.token)
        )
    }
}
