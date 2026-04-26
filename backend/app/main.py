from fastapi import FastAPI, Depends, HTTPException
from contextlib import asynccontextmanager
from fastapi.middleware.cors import CORSMiddleware
from app.core.database import engine, get_db
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from app.features.alerts.router import router as alerts_router
from app.features.feedback.router import router as feedback_router
from app.features.notifications.router import router as notifications_router
from app.features.ai.router import router as ai_router
from app.features.users.router import router as user_router
# from app.features.siat.router import router as siat_router
# from app.features.siat.service import ensure_siat_tables
import app.core.firebase
from datetime import datetime


@asynccontextmanager
async def lifespan(app: FastAPI):
    # await ensure_siat_tables(engine)
    yield
    await engine.dispose()

app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Health of the app
@app.get("/health")
def get_health():
    health_status = {
        "status": "OK",
        "timestamp": datetime.now(),
        "message": "Backend running",
    }
    return health_status

# Health of db
@app.get("/health-db")
async def get_db_health(db: AsyncSession = Depends(get_db)):
    try:
        await db.execute(text("SELECT 1"))
        return {"status": "OK", "db": "reachable"}
    except Exception:
        raise HTTPException(status_code=500, detail="Database unreachable")




app.include_router(alerts_router)
app.include_router(feedback_router)
app.include_router(notifications_router)
app.include_router(ai_router)
app.include_router(user_router)
# app.include_router(siat_router)