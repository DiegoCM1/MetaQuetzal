# BluEye

Hurricane alert and prevention platform. Mobile/web app built with React Native (Expo) and a FastAPI backend. Provides real-time weather alerts, AI-assisted emergency chat, and offline support.

## Tech Stack

- **Frontend** — React Native (Expo), Expo Router, Tamagui, NativeWind
- **Backend** — FastAPI, deployed on Railway
- **Database** — PostgreSQL on Neon
- **AI** — RAG-based chat, embedded in this repo

## Repo Structure

- `frontend/` — React Native app (mobile + web)
- `backend/` — FastAPI server (alerts, AI chat, feedback)

## Running Locally

### Frontend

```bash
cd frontend
npm install
cp .env.example .env
npx expo start
```

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload
```

## Environment Variables

### Backend (`backend/.env`)

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | Neon PostgreSQL connection string |
| `FIREBASE_PROJECT_ID` | Firebase project ID |
| `FIREBASE_CLIENT_EMAIL` | Firebase client email |
| `FIREBASE_PRIVATE_KEY` | Firebase private key |
| `NOTIF_API_KEY` | Push notifications API key |
| `OPENWEATHER_API_KEY` | OpenWeather API key |
| `LLM_API_KEY` | LLM provider API key |
| `LLM_BASE_URL` | LLM provider base URL |
| `LLM_MODEL` | LLM model name |

## Branching Strategy

- `main` — production, protected, no direct pushes
- `dev` — integration branch, protected, no direct pushes
- Feature branches — branch off `dev`, merge back via PR
