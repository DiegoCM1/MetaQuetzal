import * as Network from 'expo-network'                                                                                   
import * as FileSystem from 'expo-file-system'  
import { OnlineProvider } from './OnlineProvider'
import { OfflineProvider } from './OfflineProvider'


const MODEL_PATH = '/path/to/model.gguf'


// Logic for deciding which model to use. Router




export class AIService {
    private online = new OnlineProvider()
    private offline = new OfflineProvider()

    async sendMessage(text: string, onToken: (token: string) => void): Promise<void>{
        // Check if there is internet
        const status = await Network.getNetworkStateAsync()
        const hasInternet = status.isConnected && status.isInternetReachable

        if (hasInternet) { 
            await this.online.sendMessage(text, onToken)
        } else{
            const modelInfo = await FileSystem.getInfoAsync(MODEL_PATH)
            if (modelInfo.exists) {
                await this.offline.sendMessage(text, onToken)
            } else {
                onToken('Offline model not downloaded. Prepare for offline mode first.')        
            }
        }
    }
}
