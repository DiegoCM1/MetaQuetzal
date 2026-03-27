import { initLlama, LlamaContext } from 'llama.rn'
import { AIProvider } from './AIProvider'
import { MODEL_PATH } from '../_constants'

export class OfflineProvider implements AIProvider {
    private modelPath: string = MODEL_PATH
    private context: LlamaContext | null = null

    async sendMessage(text: string, onToken: (token: string) => void): Promise<void> {
        console.log('OfflineProvider: loading model from', this.modelPath)
        if (this.context === null) {
            this.context = await initLlama({ model: this.modelPath })
        }

        await this.context.completion(
            { prompt: text },
            (token) => onToken(token.token)
        )
    }
}
