# main.py
from __future__ import annotations
from contextlib import asynccontextmanager
from fastapi import FastAPI

from .db import init_db
from .seed import seed
from .middleware import logging_middleware
from .routers.core import router as core_router
from .routers.content import router as content_router
from .routers.ws import router as ws_router
from .routers.progress import router as progress_router
from fastapi.middleware.cors import CORSMiddleware

@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield

app = FastAPI(title="MyBuddy Backend", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:8082",
        "http://localhost:8081",
        "http://localhost:19006",
        "http://localhost:19000",
        "exp://*",
        "mybuddy://*",
        "https://mybuddy-and-me.com",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.middleware("http")(logging_middleware)

# Standardized routers
app.include_router(core_router)
app.include_router(content_router)
app.include_router(progress_router)
app.include_router(ws_router)

@app.get("/health")
async def health():
    return {"status": "ok"}