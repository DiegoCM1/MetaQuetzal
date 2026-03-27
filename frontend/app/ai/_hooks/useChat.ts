// - input, messages, isLoading state                                                                                        
// - loadMessages, saveMessages — AsyncStorage logic
// - restartConversation — clears messages                                                                                   
// - handleSendMessage — calls AIService, manages state updates
import { useState, useEffect} from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { Message } from '../_types'
import { AIService } from '../_services/AIService'
import { Alert } from 'react-native'

const aiService = new AIService()


export function useChat() {
    // state here 
    const [messages, setMessages] = useState<Message[]>([])
    const [input, setInput] = useState('')
    const [isLoading, setIsLoading] = useState(false)


    // LOAD MESSAGES
    const loadMessages = async () => {
        try {
            const savedMessages = await AsyncStorage.getItem("chat messages");
            if (savedMessages) {
                setMessages(JSON.parse(savedMessages));
              }
        } catch (error) {
            console.error("Error loading messages:", error);
        }
    }

    // SAVE MESSAGES
    const saveMessages = async (messagesToSave) => {
        try {
            await AsyncStorage.setItem("chat messages", JSON.stringify(messagesToSave));
        } catch (error) {
            console.error("Error saving messages", error)
        }
    }

    // RESTART CONVERSATION
    const restartConversation = async () => {
        setMessages([]);
        saveMessages([]);
    }

    // HANDLE SEND MESSAGE
    const handleSendMessage = async () => {
        if (!input.trim()) return;

        const userMessage = {
          role: 'user' as const,
          text: input,
          timestamp: new Date().toISOString(),
        };
        
        // Add user message
        setMessages(prev => [...prev, userMessage])

        // Add empty bot message first                                                                                            
        setMessages(prev => [...prev, { role: 'bot', text: '', timestamp: new Date().toISOString() }])

        setInput("");
        setIsLoading(true);
        console.log("ai_message_send", { length: input.length })
    
        try {
            // Call AIService with onToken callback
            await aiService.sendMessage(input, (token) => {                                                                           
                setMessages(prev => {
                    const last = prev[prev.length - 1]                                                                                
                    return [...prev.slice(0, -1), { ...last, text: last.text + token }]
                })                                                                                                                    
            })       
            console.log("ai_response_received")

        } catch (error) {
          console.error("Error sending message:", error);
          const errorText =
            error.message === "NO_CONNECTION"
              ? "Sin conexión. Verifica tu conexión a Internet."
              : "Ocurrió un error con el asistente.";
          const errorMessage = {
            role: "bot" as const,
            text: errorText,
            timestamp: new Date().toISOString(),
            error: true
          };
          setMessages((prev) => [...prev, errorMessage]);
          Alert.alert("Error", errorText);
        } finally {
          setIsLoading(false);
        }
    }


      // Load messages when component mounts
  useEffect(() => {
    loadMessages();
  }, []);

  // Save messages whenever they change
  useEffect(() => {
    saveMessages(messages);
  }, [messages]);

    // return everything the screen needs
    return { messages, input, setInput, isLoading, restartConversation, handleSendMessage }
}