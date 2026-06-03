// Contract for methods
import { Message } from "../_types"

export interface AIProvider {
    sendMessage(
        messages: Message[],
        location: string | null,
        latitude: number | null,
        longitude: number | null,
        onToken: (token: string) => void,
        signal?: AbortSignal,
    ): Promise<void>
}