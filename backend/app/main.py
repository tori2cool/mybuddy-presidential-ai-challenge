# main.py
from __future__ import annotations
import httpx
from contextlib import asynccontextmanager
from fastapi import FastAPI
from sqlalchemy import text
from .logging_config import setup_logging
from .db import init_db
from .seed import seed
from .middleware import logging_middleware
from .utils.enable_pgcrypto import pgcrypto_enabled, verify_uuid_support
from .flashcard_seed import generate_all_easy_flashcards, insert_flashcards_from_seed_json

# Configure logging early (before FastAPI app is created)
setup_logging()

from .routers.core import router as core_router
from .routers.content import router as content_router
from .routers.ws import router as ws_router
from .routers.progress import router as progress_router
from fastapi.middleware.cors import CORSMiddleware

@asynccontextmanager
async def lifespan(app: FastAPI):
    if await pgcrypto_enabled() == True:
        await verify_uuid_support()
        await init_db()
        await seed()
        await generate_all_easy_flashcards(per_pair=5)
        await insert_flashcards_from_seed_json()
    else:
        await verify_uuid_support()
    yield

app = FastAPI(title="MyBuddy Backend", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://mybuddy-and-me.com",
        "http://localhost:3000",      # add this
        "http://127.0.0.1:3000",      # optional but safe
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