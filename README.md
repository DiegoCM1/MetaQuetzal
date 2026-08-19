# Bluai

Hurricane early-warning **mobile** app for the Mexican Pacific coast. Real-time weather alerts, AI-assisted emergency chat (on-device + online), geolocation, and offline support. Built with React Native (Expo) and a FastAPI backend.

## Features

- Real-time hurricane alerts (SIAT-CT levels + SMN/CONAGUA + OpenWeather)
- AI emergency chat — on-device LLaMA (offline) and an online provider
- Map with geolocated events and weather layers
- Push notifications with per-user preferences and quiet hours

## Tech Stack

- **Frontend** — React Native (Expo), Expo Router, NativeWind. iOS + Android (mobile only).
- **Backend** — FastAPI on Railway
- **Database** — PostgreSQL (Neon)
- **AI** — RAG-based chat embedded in the backend; on-device inference via ExecuTorch

## Repo Structure

- `frontend/` — Expo app (mobile)
- `backend/` — FastAPI server (alerts, AI chat, notifications, map events)
- `docs/` — specs, sprint plans, brand

> Operational guidance for AI agents (Claude Code) lives in `CLAUDE.md` (root) and per-package `CLAUDE.md` files.

## Running Locally

### Frontend

```bash
cd frontend
npm install
cp .env.example .env
npx expo run:android   # or: npx expo run:ios  — builds the dev client onto a connected device
```

Once the dev client is installed, the daily loop is `npx expo start`.

### Backend

**Python 3.12 is required** — it's what Railway runs, it's pinned in `backend/.python-version`,
and CI reads that same file.

```bash
cd backend
python3.12 -m venv venv        # not `python` / `python3` — pin the version explicitly
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload
```

> **Already have a venv from before?** Recreate it — an in-place `pip install` keeps you on the
> old interpreter:
> ```bash
> cd backend && rm -rf venv && python3.12 -m venv venv
> source venv/bin/activate && pip install -r requirements.txt
> ```

## Environment Variables

Backend secrets live in `backend/.env` (see `backend/.env.example`). Frontend has no secrets — `EXPO_PUBLIC_*` values are public client config set per build profile in `frontend/eas.json`.

| Backend variable | Description |
|----------|-------------|
| `DATABASE_URL` | Neon PostgreSQL connection string |
| `FIREBASE_PROJECT_ID` | Firebase project ID |
| `FIREBASE_CLIENT_EMAIL` | Firebase client email |
| `FIREBASE_PRIVATE_KEY` | Firebase private key |
| `NOTIF_API_KEY` | Internal API key for notification endpoints |
| `OPENWEATHER_API_KEY` | OpenWeather API key |
| `LLM_API_KEY` / `LLM_BASE_URL` / `LLM_MODEL` | Online LLM provider config |

## Branching

- `main` — production, protected, no direct pushes
- `dev` — integration branch, protected, no direct pushes
- Feature branches off `dev`, merged back via PR (≤ 400 lines, reviewed)
