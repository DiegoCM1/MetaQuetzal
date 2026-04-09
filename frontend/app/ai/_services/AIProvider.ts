// Contract for methods
import { Message } from "../_types"

export interface AIProvider {
    sendMessage(messages:Message[], onToken: (token: string) => void): Promise<void>
}