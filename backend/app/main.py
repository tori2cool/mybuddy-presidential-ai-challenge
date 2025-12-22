# main.py
from __future__ import annotations
from contextlib import asynccontextmanager
from fastapi import FastAPI

from .db import init_db
from .middleware import logging_middleware
from .routers.core import router as core_router
from .routers.content import router as content_router
from .routers.ws import router as ws_router
from .routers.progress import router as progress_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield

app = FastAPI(title="MyBuddy Backend", lifespan=lifespan)
app.middleware("http")(logging_middleware)

# Standardized routers
app.include_router(core_router)
app.include_router(content_router)
app.include_router(progress_router)
app.include_router(ws_router)

@app.get("/health")
async def health():
    return {"status": "ok"}