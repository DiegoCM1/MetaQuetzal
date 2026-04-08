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

The user opts in via a **"Activar modo sin conexión" button** in Settings — ideally before a storm. This sets a flag in AsyncStorage. When opted in, ExecuTorch downloads the model in the background, showing progress directly in the Settings screen. This is intentional: offline preparedness is a conscious action, matching the nature of the app.

**Model format:** `.pte` (ExecuTorch) — pre-compiled for mobile hardware, enabling NPU/CPU acceleration on supported devices.

**Device-based model selection:** The app automatically selects the right model at runtime based on device RAM:
- `>= 6GB RAM` → Llama 3.2 3B SpinQuant (higher quality)
- `< 6GB RAM` → Llama 3.2 1B SpinQuant (lighter, faster)

**Model progression:**
1. **MVP ✅:** `Llama-3.2-1B-SpinQuant` — validated full offline stack end-to-end on Pixel 7.
2. **Phase 2 ✅:** Device-adaptive model selection:
   - **1B:** `executorch-community/Llama-3.2-1B-Instruct-SpinQuant_INT4_EO8-ET` — hosted on R2
   - **3B:** `software-mansion/react-native-executorch-llama-3.2` SpinQuant variant (2.55GB) — hosted on R2, compatible with `react-native-executorch 0.8.1`, tested on Pixel 7 (7.3GB RAM)
3. **Production:** Trained + quantized BluEye Instruct model converted to `.pte`, hosted on R2. Same code, different URL.

**Hardware targets:**
- Pixel 7 / general Android → CPU + NNAPI export
- Snapdragon devices → Qualcomm HTP backend (future)

---

## Why ExecuTorch over llama.rn

- llama.rn (llama.cpp) is CPU-only on Android — ignores the device NPU entirely
- ExecuTorch compiles the model for the target hardware at export time — can use ARM delegate, NNAPI, Qualcomm HTP
- Meta actively maintains ExecuTorch specifically for mobile inference
- `.pte` models are faster and more memory efficient on phone than GGUF through llama.cpp
- llama.rn RC version had a consistent non-std exception after warmup on Tensor G2 (Pixel 7) — root cause unresolved after deep investigation

---

## Decision Logic

```
sendMessage(userMessage):
    if hasInternet:
        → OnlineProvider     # route to Together AI via backend
    else:
        if modelReady:
            → llm.sendMessage()   # run inference locally via ExecuTorch
        else:
            → queue message       # send automatically once model finishes loading
```

---

## Frontend Architecture

```
  app/ai/
      _context/
          ModelContext.tsx      # owns useLLM, opt-in logic, download state, system prompt
                                # wraps entire app — any screen can read model state
      _services/
          AIProvider.ts         # interface — defines the contract both providers must follow
          OnlineProvider.ts     # calls Python backend → Together AI
      _hooks/
          useChat.ts            # owns messages, input, routing logic — consumes ModelContext
      _types.ts
      index.tsx                 # chat screen (UI only)
  app/
      SettingsScreen.jsx        # consumes ModelContext — shows download progress bar + opt-in UI
      _layout.jsx               # wraps app with <ModelProvider>
```

`ModelContext` is the single source of truth for all model state. It runs at app level so Settings and Chat always share the same download progress, opt-in flag, and model readiness. `useChat` only owns chat-specific state (messages, input, loading).

---

## Streaming
Interface for streaming from the start, even if the online provider fakes it initially (returns full response at once). That way ChatAIScreen is built to handle a stream, and swapping the online provider to real SSE later is just an internal change — the UI doesn't care.

---

## Pending Tasks

  Phase 2 ✅:
    - Request Meta HuggingFace access for Llama 3.2 Instruct weights ✅
    - 1B Instruct SpinQuant .pte sourced, hosted on R2 ✅
    - 3B SpinQuant .pte sourced from software-mansion, hosted on R2 ✅
    - Device-adaptive model selection (RAM-based) ✅
    - ModelContext — lifted model state to app level ✅
    - Download progress bar in Settings screen ✅
    - Model delete actually removes cached files from disk ✅
    - Download resume on retry ✅
    - Pending message queue (send when model ready) ✅
    - FlatList → FlashList for chat performance ✅
    - System prompt configured on model ready ✅
    - Model mode disclaimer in chat (online/offline) ✅

  Production (trained model):
    - Finish dataset
    - Train BluEye 1B and 3B Instruct models
    - Quantize + convert to .pte
    - Upload to R2, swap URL

  Future hardware:
    - Export Qualcomm HTP variants for Snapdragon devices

  Secondary (online):
    - Real streaming for online (SSE) — backend change required first
    - Switch /ask endpoint from current provider to Together AI
    - Add AI feature to backend-python (currently in separate Railway service)
