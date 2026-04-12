## Technologies to use.
Use MMKV instead of asyncStorage for local storage.
- Language: Python (FastAPI) for AI heavy lifting on offline models
- Arquitechture: Feature Based
- State: TanStack Query or Zustand
- Packages UI: Flash list (for rendering lists, of messages, for example, in an efficient/optimized way)
 - React Native Gesture Handler: Easily include gestures.
 - Expo vector icons
 - Uniwind (Faster), NativeWind
 - ReactNative Reusables (like shadcn). Expo UI 
- (Auth): Clerk
- Metrics:
- Payments: Revenue Cat (Used by Open AI), Stripe
- Alerts and hurricane tracking: Initially openweather one call (pay as you go) and NHC for hurricane tracking. Make architechture plug and play so if hurricane tracking is not enough, then we can switch to XWeather.
- AI Online: Model agnostic: Llama 4 Maverick with LoRA on Groq or together.ai as the primary, with Gemini Vertex AI as a possible alternative.
- AI offline Model agnostic: Llama 3.2 instruct-3b/1b quantized and fine tuned.
- AI Custom/Universal MCP Tools: Tool for grounding on google maps information. Tool for getting the last alert from Mexican sources?. Tool for getting weather data. All of them custom to avoid vendor lock-in and switch models easily.