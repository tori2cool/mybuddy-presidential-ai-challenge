# main.py
from __future__ import annotations
from contextlib import asynccontextmanager
from fastapi import FastAPI

from .db import init_db
from .middleware import logging_middleware
from .routers.core import router as core_router
from .routers.content import router as content_router
from .routers.ws import router as ws_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield

app = FastAPI(title="MyBuddy Backend", lifespan=lifespan)
app.middleware("http")(logging_middleware)

# Public MyBuddy content API (no auth) - keep if you still use it
app.include_router(mybuddy_router)

# Standardized routers
app.include_router(core_router)
app.include_router(content_router)
app.include_router(ws_router)

@app.get("/health")
async def health():
    return {"status": "ok"}