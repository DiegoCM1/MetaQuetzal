from fastapi import FastAPI, Depends, HTTPException
from contextlib import asynccontextmanager
from fastapi.middleware.cors import CORSMiddleware
from app.core.database import engine, get_db, AsyncSessionLocal
from sqlalchemy.ext.asyncio import AsyncSession, AsyncEngine
from sqlalchemy import text
from app.features.alerts.router import router as alerts_router
from app.features.feedback.router import router as feedback_router
from app.features.notifications.router import router as notifications_router
from app.features.ai.router import router as ai_router
from app.features.siat.router import router as siat_router
from app.features.users.router import router as users_router
from app.features.siat.service import ensure_siat_tables, run_cycle
import app.core.firebase
import asyncio
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

SIAT_CYCLE_INTERVAL_SECONDS = 30 * 60  # 30 minutes


async def ensure_core_tables(engine: AsyncEngine) -> None:
    async with engine.begin() as conn:
        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS users (
                id          BIGSERIAL PRIMARY KEY,
                firebase_uid TEXT UNIQUE NOT NULL,
                lat         DOUBLE PRECISION,
                lon         DOUBLE PRECISION,
                created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
        """))
        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS alerts (
                id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                timestamp       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                level           INT NOT NULL,
                score           INT NOT NULL DEFAULT 0,
                title           VARCHAR(255) NOT NULL,
                short           VARCHAR(500) NOT NULL,
                lat             DOUBLE PRECISION,
                lon             DOUBLE PRECISION,
                factors         JSONB NOT NULL DEFAULT '[]',
                recommendations JSONB NOT NULL DEFAULT '[]'
            )
        """))
        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS device_tokens (
                id          SERIAL PRIMARY KEY,
                token       TEXT UNIQUE NOT NULL,
                user_id     BIGINT REFERENCES users(id) ON DELETE CASCADE,
                updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
        """))


async def _siat_background_loop():
    """Runs SIAT evaluation cycle every SIAT_CYCLE_INTERVAL_SECONDS."""
    while True:
        try:
            async with AsyncSessionLocal() as db:
                result = await run_cycle(db)
                logger.info(
                    "SIAT background cycle: cyclones=%d users=%d notif=%d",
                    result["cyclones_found"],
                    result["users_evaluated"],
                    result["notifications_sent"],
                )
        except Exception:
            logger.exception("SIAT background cycle failed")
        await asyncio.sleep(SIAT_CYCLE_INTERVAL_SECONDS)


@asynccontextmanager
async def lifespan(app: FastAPI):
    await ensure_core_tables(engine)
    await ensure_siat_tables(engine)
    siat_task = asyncio.create_task(_siat_background_loop())
    yield
    siat_task.cancel()
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
    return {
        "status": "OK",
        "timestamp": datetime.now(),
        "message": "Backend running",
    }

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
app.include_router(siat_router)
app.include_router(users_router)
