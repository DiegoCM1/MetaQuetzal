# AI Architecture

## Purpose

BluEye uses two AI modes serving two distinct user contexts:

- **Online (Prevention):** The user has internet. The AI assists with hurricane awareness, alerts, and preparation guidance. Powered by Together AI through the Python backend.
- **Offline (Emergency):** The user has no internet — likely mid-disaster. The AI runs entirely on the phone and answers emergency-related questions without any network dependency. Powered by a local Llama model via ExecuTorch, running directly on device hardware (NPU/CPU).

The frontend never knows which model responded. It always receives the same shape of response.

---

## Provider Comparison

| | Online | Offline |
|---|---|---|
| Context | Prevention, normal use | Active disaster, no internet |
| Model | Together AI | Llama 3.2 (on-device via ExecuTorch) |
| Called by | Python backend | React Native directly |
| Internet required | Yes | No |
| Scales to zero | Yes (Together AI billing) | N/A (runs on device) |

---

## Model File Strategy

The offline model is **not bundled** in the app (too large for app stores).

The user downloads it manually via a **"Prepare for Offline" button** — ideally before a storm. This is intentional: it makes offline preparedness a conscious action, matching the nature of the app.

**Model format:** `.pte` (ExecuTorch) — pre-compiled for mobile hardware, enabling NPU acceleration on supported devices. Pre-converted official models are published by Meta on Hugging Face.

**Model hosted on:** Cloudflare R2 — zero egress cost, global CDN, reliable for emergency use cases.

**Model progression:**
1. **Now (development):** Official Llama 3.2 `.pte` from Meta — used to build and validate the offline flow
2. **Later (production):** Trained + quantized Llama `.pte` — same code, different file

---

## Why ExecuTorch over llama.rn

- llama.rn (llama.cpp) is CPU-only on Android — ignores the device NPU entirely
- ExecuTorch compiles the model for the target hardware at export time — can use ARM delegate, NNAPI, Qualcomm HTP
- Meta actively maintains ExecuTorch specifically for mobile inference
- `.pte` models are faster and more memory efficient on phone than GGUF through llama.cpp
- llama.rn RC version had a consistent non-std exception after warmup on Tensor G2 (Pixel 7) — root cause unresolved after deep investigation

---

## Decision Logic (AIService)

```
sendMessage(userMessage):
    if hasInternet:
        → ai_online()        # route to Together AI via backend
    else:
        if modelExists:
            → ai_offline()   # run inference locally on device via ExecuTorch
        else:
            → return error: "Offline model not downloaded. Prepare for offline mode first."
```

---

## Frontend Architecture

```
  app/ai/                                                                                                        
      _services/                                                                                               
          AIProvider.ts         # interface — defines the contract both providers must follow                                                                               
          OnlineProvider.ts     # calls Python backend → Together AI
          OfflineProvider.ts    # loads local .pte via react-native-executorch → runs inference on device                                                                                
          AIService.ts          # connectivity check → routes to correct provider
      _hooks/                                                                                                    
          useChat.ts            # pulls all logic out of ChatAIScreen                                               
      _types.ts                                                                                                  
      index.tsx                 # the screen (lean, UI only)
```

The rest of the app only interacts with `AIService`. The provider swap is invisible to the UI.

---

## Streaming 
Interface for streaming from the start, even if the online provider fakes it initially (returns full
response at once). That way ChatAIScreen is built to handle a stream, and swapping the online provider to real
SSE later is just an internal change — the UI doesn't care.

---

## Pending Tasks

  Primordial:
    - "Prepare for Offline" download button — UI to download model file to device ✅
    - Model hosted on Cloudflare R2 ✅
    - Confirmation alert before removing offline model ✅
    - Upgrade Expo SDK 53 → 54
    - Switch from llama.rn to react-native-executorch
    - Get official Llama 3.2 .pte model from Meta, upload to R2
    - Rewrite OfflineProvider.ts for ExecuTorch API
    - Test offline path end-to-end on physical device
    - Finish dataset
    - Train AI model

  Secondary:
    - Real streaming for online (SSE) — backend change required first
    - Switch /ask endpoint from current provider to Together AI
    - Add AI feature to backend-python (currently in separate Railway service)
    - Later: swap for trained + quantized model
