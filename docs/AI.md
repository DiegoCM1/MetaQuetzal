# AI Architecture

## Purpose

BluEye uses two AI modes serving two distinct user contexts:

- **Online (Prevention):** The user has internet. The AI assists with hurricane awareness, alerts, and preparation guidance. Powered by Together AI through the Python backend.
- **Offline (Emergency):** The user has no internet — likely mid-disaster. The AI runs entirely on the phone and answers emergency-related questions without any network dependency. Powered by a local Llama 1B model. Running directly on this repository (Not a separated one)

The frontend never knows which model responded. It always receives the same shape of response.

---

## Provider Comparison

| | Online | Offline |
|---|---|---|
| Context | Prevention, normal use | Active disaster, no internet |
| Model | Together AI | Llama 1B (on-device) |
| Called by | Python backend | React Native directly |
| Internet required | Yes | No |
| Scales to zero | Yes (Together AI billing) | N/A (runs on device) |

---

## Model File Strategy

The offline model is **not bundled** in the app (too large for app stores).

The user downloads it manually via a **"Prepare for Offline" button** — ideally before a storm. This is intentional: it makes offline preparedness a conscious action, matching the nature of the app.

**Model progression:**
1. **Now (development):** Unquantized Llama 1B `.gguf` — used to build and validate the offline flow
2. **Later (production):** Trained + quantized Llama 1B `.gguf` — same code, different file path

Switching to the final model requires no code changes. Only the model file changes.

---

## Decision Logic (AIService)

```
sendMessage(userMessage):
    if hasInternet:
        → ai_online()        # route to Together AI via backend
    else:
        if modelExists:
            → ai_offline()   # run inference locally on device
        else:
            → return error: "Offline model not downloaded. Prepare for offline mode first."
```

---

## Frontend Architecture Plan

```

  app/ai/                                                                                                        
      _services/                                                                                               
          AIProvider.ts         # interface — defines the contract both providers must follow                                                                               
          OnlineProvider.ts     # calls Python backend → Together AI
          OfflineProvider.ts    # loads local .gguf via llama.rn → runs inference on device                                                                                
          AIService.ts          # connectivity check → routes to correct provider
      _hooks/                                                                                                    
          useChat.ts       ← pulls all logic out of ChatAIScreen                                               
      _types.ts                                                                                                  
      index.tsx            ← the screen (lean, UI only)
```

The rest of the app only interacts with `AIService`. The provider swap is invisible to the UI.

---

## Streaming 
Interface for streaming from the start, even if the online provider fakes it initially (returns full
   response at once). That way ChatAIScreen is built to handle a stream, and swapping the online provider to real
   SSE later is just an internal change — the UI doesn't care.

---

