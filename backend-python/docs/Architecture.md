  Migration Plan (excluding /risk)                                                                                                               
                                                                                                                                                 
  Phase 1 — Foundation                                                                                                                           
  1. Create folder structure + virtual environment + requirements.txt                                                                            
  2. config.py — typed settings from .env via pydantic-settings
  3. database.py — async SQLAlchemy engine + session dependency
  4. main.py — FastAPI app, lifespan, register all routers

  Phase 2 — Features (one at a time)

  5. Alerts — GET /alerts + GET /alerts/:id
  6. Feedback — POST /feedback + GET /feedback
  7. Push Tokens — POST /api/push-token
  8. Notifications — POST /api/notifications/send-all (FCM + API key middleware)

  Phase 3 — Cross-cutting

  9. middleware/api_key_auth.py — API key validation (wired into notifications router)
  10. GET /health + GET /health-db — add to main.py

  Phase 4 — Deployment

  11. Dockerfile for Cloud Run
  12. .env.example



-----


- Feature Based

- Python FastAPI

- Copy all functionalities from Old backend except /risk endpoint and checkRisk worker.

-----

## Folder Structure

  backend-python/                                                                                                                                
  ├── app/                                                                                                                                       
  │   ├── main.py               # FastAPI app, lifespan, router registration                                                                     
  │   ├── config.py             # pydantic-settings (reads .env)                                                                                 
  │   ├── database.py           # async SQLAlchemy engine + session                                                                            
  │   ├── features/
  │   │   ├── alerts/
  │   │   │   ├── router.py     # GET /alerts, GET /alerts/:id
  │   │   │   ├── schemas.py    # Pydantic request/response models
  │   │   │   └── service.py    # DB queries
  │   │   ├── feedback/
  │   │   │   ├── router.py     # POST /feedback, GET /feedback
  │   │   │   ├── schemas.py
  │   │   │   └── service.py
  │   │   ├── notifications/
  │   │   │   ├── router.py     # POST /api/notifications/send-all
  │   │   │   ├── schemas.py
  │   │   │   └── service.py    # FCM multicast logic
  │   │   └── push_tokens/
  │   │       ├── router.py     # POST /api/push-token
  │   │       ├── schemas.py
  │   │       └── service.py    # token UPSERT
  │   └── middleware/
  │       └── api_key_auth.py   # x-api-key header validation
  ├── requirements.txt
  ├── Dockerfile
  └── .env.example