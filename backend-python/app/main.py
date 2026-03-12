from fastapi import FastAPI
from contextlib import asynccontextmanager
from fastapi.middleware.cors import CORSMiddleware
from app.core.database import engine
from app.features.alerts.router import router as alerts_router
from app.features.feedback.router import router as feedback_router
from app.features.notifications.router import router as notifications_router
import app.core.firebase  


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield
    await engine.dispose()

app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(alerts_router)
app.include_router(feedback_router)
app.include_router(notifications_router)