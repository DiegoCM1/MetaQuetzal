export type Message = {
    role: 'user' | 'bot'
    text: string
    timestamp: string
    error?: boolean
}

export type AIMode = 'online' | 'offline'

