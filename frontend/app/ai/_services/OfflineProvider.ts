import { initLlama, LlamaContext } from 'llama.rn'
import { AIProvider } from './AIProvider'

export class OfflineProvider implements AIProvider {
    private modelPath: string = '/path/to/model.gguf'
    private context: LlamaContext | null = null

    async sendMessage(text: string, onToken: (token: string) => void): Promise<void> {
        if (this.context === null) {
            this.context = await initLlama({ model: this.modelPath })
        }

        await this.context.completion(
            { prompt: text },
            (token) => onToken(token)
        )
    }
}
