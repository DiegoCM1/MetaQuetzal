import axios from 'axios'
import { AIProvider } from './AIProvider'
import { Message } from "../_types"
import { getAuthToken } from '../../../utils/api'
import { API_BASE_URL } from '../../../utils/config'


export class OnlineProvider implements AIProvider {
    async sendMessage(messages: Message[], location:string | null, latitude:number | null, longitude: number | null, onToken: (token: string) => void): Promise<void> {

        const payload = messages.map(m => ({                              
            role: m.role === 'bot' ? 'assistant' : m.role,
            content: m.text                                                
        }))

        const token = await getAuthToken()
        const response = await axios.post(`${API_BASE_URL}/ai/chat`, { messages: payload, location, latitude, longitude }, {
            headers: { Authorization: `Bearer ${token}` }
        });

        onToken(response.data.reply) 
    }
}




