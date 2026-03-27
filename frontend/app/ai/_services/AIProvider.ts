// Contract for methods

export interface AIProvider {
    sendMessage(text:string, onToken: (token: string) => void): Promise<void>
}