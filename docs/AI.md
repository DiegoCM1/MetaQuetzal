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

  Offline (ExecuTorch):                                             
  - Memory: managed by LLMController internally
  - Streaming: token-by-token via llm.response/llm.token            
  - System prompt: set via llm.configure()                          
                                                                    
  Online (OpenRouter):
  - Memory: frontend sends full messages[] with every request
  - Streaming: not implemented — returns full response at once
  - System prompt: injected server-side in service.py, never sent by client
  - Location: reverse geocoded once on mount (expo-location), stored in ref, sent with every request
  - Weather: OpenWeather One Call 3.0 fetched once on mount, stored in ref, injected into system prompt every request — no per-message API calls

---

RAG
  1. RAG approach — inject retrieved chunks into system prompt, LLM never touches the vector DB directly
  2. Why RAG — fixes hallucinations on factual data, training handles behavior
  3. Online vector DB — pgvector (existing Postgres on Railway, free, persistent)
  4. Offline vector DB — FAISS (only option that runs on Android)
  5. Embedding model — paraphrase-multilingual-MiniLM-L12-v2 over e5-small for both online and offline (same model, same vector space, consistent, simple and widely used)
  6. Offline embedding strategy — chunks pre-embedded server-side, FAISS index shipped to R2, downloaded with the model. paraphrase-multilingual-MiniLM-L12-v2 runs on
  device only for query-time embedding
  7. One-time embedding script — runs paraphrase-multilingual-MiniLM-L12-v2 once against all chunks, loads into pgvector + exports FAISS index
  8. Switching models later — one script re-run, 30 minutes, no other code changes
  9. Chunk format: JSON

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

  
  Phase 3 ✅:
    - OpenRouter as LLM provider (OpenAI-compatible, swappable via .env) ✅
    - POST /ai/chat endpoint on FastAPI backend ✅
    - Llama 3.3 70B Instruct via OpenRouter ✅
    - Conversation history — frontend sends full messages[] with every request ✅
    - System prompt injected server-side (never exposed to client) ✅
    - Backend deployed on Railway ✅
    - Restart conversation works for both online and offline ✅
    - set streaming for online model (deferred — 80 word responses make this low priority)

  Phase 4 (AI enrichment): ✅
    - Inject user location into system prompt ✅
    - Inject live weather + alerts from OpenWeather One Call 3.0 into system prompt (Frontend sends lat/lng → backend fetches weather → injects into system prompt → calls LLM) ✅
        1. Embedding script: loads 8 JSON files, embeds each chunk's text field with paraphrase-multilingual-MiniLM-L12-v2, inserts into pgvector, exports FAISS index ✅                                             
        2. RAG Online — before the LLM call in service.py, embed the user query, query pgvector, inject top-k chunks into system prompt  ✅
    
  Deadline: April 25, 2026 — Play Store submission. iOS after.
  Nota: cada feature debe tener al menos un test de integración que pruebe el happy path del endpoint antes de hacer push.

  Phase 5 (Must ship — blocking store submission)
    0. Remove tamagui ✅
    1. Fix OOM crash (tracksViewChanges on map markers) ✅
    2. Clean app logs, fix mixpanel token, fix vulnerabilities ✅
    2.1 Review Edgar's branch — manually extracted siat/ + alerts additions, stripped auth (DEV-DIEGO) ✅
    2.2 Assign tasks to team with dates based on April 25 deadline (DEV-DIEGO) ✅
    2.3 Register Google Play developer account — 48h verification (DEV-DIEGO) — Apr 17 ✅
    3. Login system — backend: core/.authpy Firebase JWT + get_current_user. Frontend: pantalla de login, persistencia de sesión, token en cada request, rutas protegidas (DEV-DIEGO) — Apr 17–18
      3.1 - Button for logging out (DEV-DIEGO)
      3.2 - Eliminación de cuenta — DELETE /users/me endpoint + botón en Settings. Depende del login (DEV-VAL) — Apr 20–21
    4. Google Play Billing — integración de pagos in-app + features premium detrás de paywall. Stripe NO permitido para bienes digitales en Android (DEV-VAL) — Apr 18–21
    5. Finalizar y probar el sistema de alertas (DEV-EDGAR) — Apr 17–20
       - Asegurarse de que el backend de alertas esté funcionando end-to-end
       - Confirmar endpoints vía Postman antes de hacer handoff a Diego
       - Una vez que el login esté listo, agregar GET /api/v1/alerts/active — Apr 21
       - Integración en frontend la hace Diego en tarea 7
    6. Materiales Play Store (IVAN) — Apr 17–23
       - Texto del listing — nombre, descripción corta, descripción completa (español)
       - Screenshots — mínimo 5, tomados en dispositivo real
       - Feature graphic — banner 1024x500px
       - Categoría de la app + cuestionario de clasificación de contenido
       - Política de privacidad — URL real y pública (puede ser página simple)
       - Formulario de seguridad de datos — declarar qué datos recopila la app y por qué (obligatorio, bloquea el envío si falta)
    7. Pulir frontend — UX, edge cases, limpieza visual, integración alertas (DEV-DIEGO) — Apr 22–23
    8. Package + submit Play Store (DEV-DIEGO) — Apr 24–25
       - Generar y respaldar keystore (si se pierde, la app nunca se puede actualizar)
       - Configurar perfil de producción en eas.json
       - Build, firmar y subir APK
       - Enviar — Apr 25

  iOS (after Play Store submitted):
    - Register Apple Developer account ($99/year) (DEV-DIEGO)
    - First iOS build setup (Xcode, provisioning profiles, certificates) (DEV-DIEGO)
    - Apple In-App Purchase (separate integration from Google Play Billing) (DEV-DIEGO)
    - Submit via App Store Connect (DEV-DIEGO)

    ---

    Phase 6 (Ship if time allows before sending to playstore)

    1. Improve telemetry — replace print() with structured logging — backend gets loguru or Python logging,
    frontend gets Sentry
    2. Improve telemetry to use login — once login exists, tie events to real users

    ---

    Phase 7 (Post launch)

    0. Backend migration from Railway to Cloud Run
    1. Architectural cleanup — move feature code out of app/ into src/features/
    2. Define tool schemas and usage
    3. Add tool examples to dataset
    4. Create dataset v2 multiturn and tool examples
    5. Train 1b, 3b, Llama Model (If permitted by provider) V2
    ---
