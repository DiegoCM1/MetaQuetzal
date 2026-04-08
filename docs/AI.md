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

The user opts in via a **"Activar modo sin conexión" button** — ideally before a storm. This sets a flag in AsyncStorage. When the user opens the chat, ExecuTorch detects the flag and downloads the model automatically, showing progress in the chat screen. This is intentional: it makes offline preparedness a conscious action, matching the nature of the app.

**Model format:** `.pte` (ExecuTorch) — pre-compiled for mobile hardware, enabling NPU/CPU acceleration on supported devices.

**Model progression:**
1. **MVP (now):** `LLAMA3_2_1B_SPINQUANT` — built-in constant from `react-native-executorch`. Zero setup, library manages download and caching automatically. Used to validate the full offline stack works end-to-end.
2. **Phase 2:** Official Llama 3.2 Instruct `.pte` — requires Meta HuggingFace access approval + export. Two variants needed: CPU/NNAPI (Pixel/general Android) and Qualcomm HTP (Snapdragon devices). Hosted on Cloudflare R2.
3. **Production:** Trained + quantized BluEye Instruct model converted to `.pte`, hosted on R2. Same code, different URL.

**Hardware targets:**
- Pixel 7 / general Android → CPU + NNAPI export
- Snapdragon devices → Qualcomm HTP backend (significant performance boost)

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
      _hooks/                                                                                                    
          useChat.ts            # network check + routes online/offline, owns useLLM hook                                               
      _types.ts                                                                                                  
      index.tsx                 # the screen (lean, UI only) — shows download progress banner
```

`useChat` owns all routing logic. Online → `OnlineProvider`. Offline → `useLLM` from ExecuTorch directly. The screen only renders what `useChat` exposes.

---

## Streaming 
Interface for streaming from the start, even if the online provider fakes it initially (returns full
response at once). That way ChatAIScreen is built to handle a stream, and swapping the online provider to real
SSE later is just an internal change — the UI doesn't care.

---

## Pending Tasks

  MVP (offline stack validation):
    - Opt-in button in Settings (sets AsyncStorage flag) ✅
    - Confirmation alert before removing offline model ✅
    - Upgrade Expo SDK 53 → 54 ✅
    - Switch from llama.rn to react-native-executorch ✅
    - Rewrite offline logic into useChat.ts with useLLM hook ✅
    - Download progress banner in chat screen ✅
    - EAS build with executorch linked — install + test on Pixel 7 ✅
    - Validate end-to-end: opt-in → download → inference on device ✅

  Phase 2 (Instruct models):
    - Request Meta HuggingFace access for Llama 3.2 Instruct weights ✅
    - Export Llama 3.2 1B Instruct → .pte (CPU/NNAPI, for Pixel/general Android)
    - Export Llama 3.2 3B Instruct → .pte (CPU/NNAPI)
    - Upload both to Cloudflare R2
    - Export Qualcomm HTP variants for Snapdragon devices
    - Swap LLAMA3_2_1B_SPINQUANT constant for R2 URL in useChat.ts

  Production (trained model):
    - Finish dataset
    - Train BluEye 1B and 3B Instruct models
    - Quantize + convert to .pte
    - Upload to R2, swap URL

  Secondary (online):
    - Real streaming for online (SSE) — backend change required first
    - Switch /ask endpoint from current provider to Together AI
    - Add AI feature to backend-python (currently in separate Railway service)
