# backend/app/tasks.py
import asyncio
import json
import logging
import os
from time import sleep
from uuid import UUID

import redis

from .celery_app import celery_app
from .config import settings
from .db import get_async_sessionmaker
from .seed import seed

logger = logging.getLogger(__name__)

# Synchronous Redis client for publishing from Celery workers
redis_client = redis.Redis.from_url(settings.redis_url)

@celery_app.task(name="app.tasks.seed_content")
def seed_content() -> dict:
    """Seed core content tables idempotently.

    Runs in a Celery worker (sync context), so we spin up an event loop to
    perform async DB calls.
    """

    async def _run() -> dict:
        AsyncSessionLocal = get_async_sessionmaker()
        async with AsyncSessionLocal() as session:
            # Run the new seed function
            await seed()
            return {"seeded": True}

    result = asyncio.run(_run())
    logger.info("seed_content completed: %s", result)
    return result

@celery_app.task(name="app.tasks.heartbeat")
def heartbeat() -> str:
    msg = "Heartbeat task ran"
    logger.info(msg)
    return msg


@celery_app.task(name="app.tasks.process_content_expansion_request")
def process_content_expansion_request(request_id: str) -> dict:
    """Process a single ContentExpansionRequest.

    Celery tasks are sync entrypoints; we run async DB work via asyncio.run().
    """

    async def _run() -> dict:
        from datetime import datetime, timezone

        from sqlalchemy import case, func, select, text

        from .models import AgeRange, Child, ContentExpansionRequest, Flashcard, Subject
        from .services.ai_flashcard_generator import FlashcardGenerator
        from .services.content_expansion import check_auto_flashcard_limit

        # Debug: helps diagnose cross-process / cross-loop issues in Celery prefork
        loop = asyncio.get_running_loop()
        logger.debug(
            "process_content_expansion_request: pid=%s loop_id=%s request_id=%s",
            os.getpid(),
            hex(id(loop)),
            request_id,
        )

        # Ensure request_id is a UUID for DB comparisons
        try:
            request_uuid = UUID(str(request_id))
        except Exception:
            return {"status": "invalid", "request_id": request_id}

        AsyncSessionLocal = get_async_sessionmaker()
        async with AsyncSessionLocal() as session:
            req = (
                await session.execute(
                    select(ContentExpansionRequest).where(ContentExpansionRequest.id == request_uuid)
                )
            ).scalar_one_or_none()

            if req is None:
                return {"status": "missing", "request_id": request_id}

            if req.status != "pending":
                return {"status": "ignored", "request_id": request_id, "current_status": req.status}

            # Mark running (+attempt)
            req.status = "running"
            req.attempts = int(req.attempts or 0) + 1
            await session.commit()

            auto_count, should_expand = await check_auto_flashcard_limit(
                session,
                subject_id=str(req.subject_id),
                age_range_id=str(req.age_range_id) if req.age_range_id else None,
                difficulty_code=req.difficulty_code,
            )
            if not should_expand:
                req.status = "skipped"
                req.completed_at = datetime.now(timezone.utc)
                await session.commit()
                return {
                    "status": "skipped",
                    "request_id": request_id,
                    "auto_count": auto_count,
                    "max": settings.max_auto_flashcards,
                }

            child = (await session.execute(select(Child).where(Child.id == req.child_id))).scalar_one_or_none()
            interests = child.interests if (child and child.interests) else []

            subj = (await session.execute(select(Subject).where(Subject.id == req.subject_id))).scalar_one_or_none()
            subject_name = subj.name if subj else str(req.subject_id)

            age_name = "all"
            if req.age_range_id:
                ar = (
                    await session.execute(select(AgeRange).where(AgeRange.id == req.age_range_id))
                ).scalar_one_or_none()
                age_name = ar.name if ar else str(req.age_range_id)

            generator = FlashcardGenerator()

            # Fetch 5 example flashcards to help the model match our existing style.
            examples_stmt = select(
                Flashcard.question,
                Flashcard.answer,
                Flashcard.acceptable_answers,
                Flashcard.tags,
            ).where(
                Flashcard.subject_id == req.subject_id,
                Flashcard.difficulty_code == req.difficulty_code,
            )

            # Age range rule: if request has an age_range_id, match it; otherwise do not filter.
            if req.age_range_id is not None:
                examples_stmt = examples_stmt.where(Flashcard.age_range_id == req.age_range_id)

            # Prefer flashcards whose tags match child interests (JSONB '?' operator)
            interest_order = None
            if interests:
                when_clauses = []
                for interest in interests:
                    when_clauses.append(
                        (func.coalesce(Flashcard.tags, text("'[]'::jsonb")).op("?")(str(interest)), 0)
                    )
                when_clauses.append((True, 1))
                interest_order = case(*when_clauses)

            if interest_order is not None:
                examples_stmt = examples_stmt.order_by(interest_order, func.random())
            else:
                examples_stmt = examples_stmt.order_by(func.random())

            examples_rows = (await session.execute(examples_stmt.limit(5))).all()
            examples = [
                {
                    "question": q,
                    "answer": a,
                    "acceptable_answers": list(acc or []),
                    "tags": list(tags or []),
                }
                for (q, a, acc, tags) in examples_rows
            ]
            logger.info(
                "process_content_expansion_request: using examples count=%s request_id=%s",
                len(examples),
                request_id,
            )

            flashcard_data = await generator.generate_flashcards(
                subject=subject_name,
                age_range=age_name,
                difficulty=req.difficulty_code,
                interests=interests,
                count=5,
                examples=examples,
            )

            inserted = 0
            try:
                # Insert idempotently to avoid UniqueViolation on uq_flashcard_subject_q
                # (subject_id, question, difficulty_code, age_range_id).
                from sqlalchemy.dialects.postgresql import insert as pg_insert

                rows = []
                for card in flashcard_data or []:
                    rows.append(
                        {
                            "subject_id": req.subject_id,
                            "question": card["question"],
                            "answer": card["answer"],
                            "acceptable_answers": card.get("acceptable_answers"),
                            "difficulty_code": req.difficulty_code,
                            "age_range_id": req.age_range_id,
                            "tags": (
                                card.get("tags")
                                if isinstance(card.get("tags"), list) and len(card.get("tags") or []) > 0
                                else ["auto"]
                            ),
                        }
                    )

                if rows:
                    stmt = (
                        pg_insert(Flashcard)
                        .values(rows)
                        .on_conflict_do_nothing(
                            index_elements=[
                                Flashcard.subject_id,
                                Flashcard.question,
                                Flashcard.difficulty_code,
                                Flashcard.age_range_id,
                            ]
                        )
                        .returning(Flashcard.id)
                    )
                    result = await session.execute(stmt)
                    inserted = len(result.scalars().all())

                await session.commit()

                # Mark completed even if all were duplicates (inserted=0)
                req.status = "completed"
                req.completed_at = datetime.now(timezone.utc)
                await session.commit()

                return {
                    "status": "completed",
                    "request_id": request_id,
                    "inserted": inserted,
                    "auto_count": auto_count,
                }

            except Exception as e:
                await session.rollback()
                req.status = "failed"
                req.error = str(e)[:2000]
                req.completed_at = datetime.now(timezone.utc)
                await session.commit()
                return {"status": "failed", "request_id": request_id, "error": req.error}

    result = asyncio.run(_run())
    logger.info("process_content_expansion_request completed: %s", result)
    return result
