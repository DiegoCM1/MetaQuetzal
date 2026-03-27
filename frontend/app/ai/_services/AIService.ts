import * as Network from 'expo-network'                                                                                   
import * as FileSystem from 'expo-file-system'  
import { OnlineProvider } from './OnlineProvider'
import { OfflineProvider } from './OfflineProvider'
import { MODEL_PATH } from '../_constants'

// Logic for deciding which model to use. Router




export class AIService {
    private online = new OnlineProvider()
    private offline = new OfflineProvider()

    async sendMessage(text: string, onToken: (token: string) => void): Promise<void>{
        // Check if there is internet
        const FORCE_OFFLINE = true  // ← toggle for testing, set to false in production
        const status = await Network.getNetworkStateAsync()
        const hasInternet = FORCE_OFFLINE ? false : (status.isConnected && status.isInternetReachable)
        console.log('Has internet:', hasInternet, '| Force offline:', FORCE_OFFLINE)

        if (hasInternet) { 
            await this.online.sendMessage(text, onToken)
        } else{
            const modelInfo = await FileSystem.getInfoAsync(MODEL_PATH)
            console.log('Model exists:', modelInfo.exists, 'at path:', MODEL_PATH)
            if (modelInfo.exists) {
                await this.offline.sendMessage(text, onToken)
            } else {
                onToken('Offline model not downloaded. Prepare for offline mode first.')        
            }
        }
    }
}
