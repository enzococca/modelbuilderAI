"""Gennaro — AI Agent Orchestrator & Model Builder.

FastAPI entry point.
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import settings, ensure_dirs
from storage.database import init_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup / shutdown lifecycle."""
    ensure_dirs(settings)
    await init_db()
    # Start the scheduler background service
    from scheduler.scheduler import scheduler
    await scheduler.start()
    yield
    await scheduler.stop()


app = FastAPI(
    title="Gennaro",
    description="AI Agent Orchestrator & Model Builder",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── API routers ──────────────────────────────────────────────
from api.chat import router as chat_router
from api.agents import router as agents_router
from api.workflows import router as workflows_router
from api.projects import router as projects_router
from api.files import router as files_router
from api.analytics import router as analytics_router
from api.settings import router as settings_router
from api.scheduler import router as scheduler_router
from websocket.handlers import router as ws_router

app.include_router(chat_router, prefix="/api")
app.include_router(agents_router, prefix="/api")
app.include_router(workflows_router, prefix="/api")
app.include_router(projects_router, prefix="/api")
app.include_router(files_router, prefix="/api")
app.include_router(analytics_router, prefix="/api")
app.include_router(settings_router, prefix="/api")
app.include_router(scheduler_router, prefix="/api")
app.include_router(ws_router)


@app.get("/api/health")
async def health():
    return {"status": "ok", "service": "gennaro"}
