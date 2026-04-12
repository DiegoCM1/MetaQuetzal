import axios from 'axios'
import { AIProvider } from './AIProvider'
import { Message } from "../_types"



const API_URL = "https://backend-blueye-production.up.railway.app/ai/chat";


export class OnlineProvider implements AIProvider {
    async sendMessage(messages: Message[], location:string | null, latitude:number | null, longitude: number | null, onToken: (token: string) => void): Promise<void> {

        const payload = messages.map(m => ({                              
            role: m.role === 'bot' ? 'assistant' : m.role,
            content: m.text                                                
        }))

        // Call backend
        const response = await axios.post(API_URL, { messages: payload, location, latitude, longitude });

        onToken(response.data.reply) 
    }
}




