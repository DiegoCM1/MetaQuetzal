# BlueEye Backend

Simple Express backend serving hurricane risk data, alert history and feedback collection.

## Setup

1. Copy `.env.example` to `.env` and fill in your OpenWeather `OPENWEATHER_API_KEY`.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the server:
   ```bash
   npm start
   ```

The server listens on the port defined in `.env` (`PORT`, default `3002`).

## Endpoints

- `POST /risk` — Compute hurricane risk for given `lat`/`lon` (placeholder implementation).
- `GET /alerts` — List stored alerts.
- `GET /alerts/:id` — Get a single alert.
- `POST /feedback` — Submit user feedback (rating, email, message). Returns `201` with `{ success, id }`.

Feedback entries are stored in an SQLite database (path defined by `DB_PATH`, default `data.db`).
