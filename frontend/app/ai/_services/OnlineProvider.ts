import axios from 'axios'
import { AIProvider } from './AIProvider'


const API_URL = "https://ai-blueye-production.up.railway.app/ask";


export class OnlineProvider implements AIProvider {
    async sendMessage(text: string, onToken: (token: string) => void): Promise<void> {
        // Call backend
        const response = await axios.post(API_URL, { question: text });

        onToken(response.data.response) 
    }
}




