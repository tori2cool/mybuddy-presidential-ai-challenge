# backend/app/tasks.py
import asyncio
import json
import logging
import os
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


@celery_app.task(name="app.tasks.review_flagged_flashcard")
def review_flagged_flashcard(flashcard_id: str, child_id: str, reason_code: str) -> dict:
    """Review a flagged flashcard and decide whether to replace it.

    Sync Celery entrypoint; runs async DB + network work via asyncio.run().
    """

    async def _run() -> dict:
        from datetime import datetime, timezone

        from sqlalchemy import select

        from .models import AgeRange, ChildActivityEvent, Flashcard, Subject
        from .services.content_expansion_queue import (
            create_content_expansion_request,
            enqueue_content_expansion_request_after_commit,
        )
        from .services.flashcard_checkers import review_flagged_flashcard_decision

        try:
            fc_uuid = UUID(str(flashcard_id))
            child_uuid = UUID(str(child_id))
        except Exception:
            return {"status": "invalid_args", "flashcard_id": flashcard_id, "child_id": child_id}

        AsyncSessionLocal = get_async_sessionmaker()
        async with AsyncSessionLocal() as session:
            fc = (await session.execute(select(Flashcard).where(Flashcard.id == fc_uuid))).scalar_one_or_none()
            if fc is None:
                return {"status": "missing_flashcard", "flashcard_id": flashcard_id}
            if fc.is_deleted:
                return {"status": "already_deleted", "flashcard_id": flashcard_id}

            subj = (await session.execute(select(Subject).where(Subject.id == fc.subject_id))).scalar_one_or_none()
            subject_name = subj.name if subj is not None else str(fc.subject_id)

            age_range_code = "all"
            if fc.age_range_id is not None:
                ar = (await session.execute(select(AgeRange).where(AgeRange.id == fc.age_range_id))).scalar_one_or_none()
                if ar is not None and ar.code:
                    age_range_code = ar.code

            decision = await review_flagged_flashcard_decision(
                flashcard_question=fc.question,
                choices=list(fc.choices or []),
                correct_index=int(fc.correct_index),
                explanations=list(fc.explanations or []),
                subject_name=subject_name,
                age_range_code=age_range_code,
                difficulty_code=fc.difficulty_code,
                reason_code=reason_code,
            )

            session.add(
                ChildActivityEvent(
                    child_id=child_uuid,
                    kind="flashcard_flag_reviewed",
                    flashcard_id=fc_uuid,
                    meta={
                        "reasonCode": reason_code,
                        "decision": decision.get("decision"),
                        "confidence": decision.get("confidence"),
                        "notes": decision.get("notes"),
                    },
                )
            )

            if decision.get("decision") == "replace":
                now = datetime.now(timezone.utc)
                fc.is_deleted = True
                fc.deleted_at = now
                session.add(fc)

                create_res = await create_content_expansion_request(
                    session,
                    child_id=child_uuid,
                    subject_id=fc.subject_id,
                    age_range_id=fc.age_range_id,
                    difficulty_code=fc.difficulty_code,
                    trigger="flagged_regen_ai",
                )

                await session.commit()

                if create_res.created:
                    enqueue_content_expansion_request_after_commit(create_res.request.id)

                return {
                    "status": "replaced",
                    "flashcard_id": flashcard_id,
                    "decision": decision,
                    "expansion_request_id": str(create_res.request.id),
                }

            await session.commit()
            return {"status": "kept", "flashcard_id": flashcard_id, "decision": decision}

    result = asyncio.run(_run())
    logger.info("review_flagged_flashcard completed: %s", result)
    return result


@celery_app.task(name="app.tasks.process_content_expansion_request")
def process_content_expansion_request(request_id: str) -> dict:
    """Process a single ContentExpansionRequest.

    Celery tasks are sync entrypoints; we run async DB work via asyncio.run().
    """

    async def _run() -> dict:
        from datetime import datetime, timezone

        from sqlalchemy import func, select

        from .models import AgeRange, Child, ContentExpansionRequest, Flashcard, Subject
        from .services.ai_flashcard_generator import FlashcardGenerator
        from .services.content_expansion import check_auto_flashcard_limit
        from openai import AsyncOpenAI

        from .services.topic_catalog import get_or_create_topic_catalog, select_topics_for_batch

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

            # Keep a reference to child for logging/traceability.
            child = (await session.execute(select(Child).where(Child.id == req.child_id))).scalar_one_or_none()

            subj = (await session.execute(select(Subject).where(Subject.id == req.subject_id))).scalar_one_or_none()
            subject_name = subj.name if subj else str(req.subject_id)

            age_range_code = "all"
            ar = None
            if req.age_range_id:
                ar = (
                    await session.execute(select(AgeRange).where(AgeRange.id == req.age_range_id))
                ).scalar_one_or_none()
                age_range_code = ar.code if ar else str(req.age_range_id)

            generator = FlashcardGenerator()

            # Fetch up to 5 example flashcards to help the model match our existing style.
            # Fallback rule: if no examples exist for the requested difficulty, fall back to easier difficulties
            # (hard -> medium -> easy, medium -> easy). Subject + age range constraints remain the same.
            examples: list[dict] = []
            examples_difficulty_used: str | None = None

            requested_difficulty = req.difficulty_code
            difficulty_candidates: list[str] = [requested_difficulty]
            if requested_difficulty == "hard":
                difficulty_candidates = ["hard", "medium", "easy"]
            elif requested_difficulty == "medium":
                difficulty_candidates = ["medium", "easy"]

            for candidate_difficulty in difficulty_candidates:
                examples_stmt = (
                    select(
                        Flashcard.question,
                        Flashcard.choices,
                        Flashcard.correct_index,
                        Flashcard.explanations,
                        Flashcard.tags,
                    )
                    .where(
                        Flashcard.subject_id == req.subject_id,
                        Flashcard.difficulty_code == candidate_difficulty,
                    )
                )

                # Age range rule: if request has an age_range_id, match it; otherwise do not filter.
                if req.age_range_id is not None:
                    examples_stmt = examples_stmt.where(Flashcard.age_range_id == req.age_range_id)

                examples_stmt = examples_stmt.order_by(func.random())

                examples_rows = (await session.execute(examples_stmt.limit(1))).all()
                if examples_rows:
                    examples_difficulty_used = candidate_difficulty
                    examples = [
                        {
                            "question": q,
                            "choices": list(choices or []),
                            "correct_index": correct_index,
                            "explanations": list(explanations or []),
                            "tags": list(tags or []),
                        }
                        for (q, choices, correct_index, explanations, tags) in examples_rows
                    ]
                    break

            logger.info(
                "process_content_expansion_request: using examples request_id=%s requested_difficulty=%s examples_count=%s examples_difficulty_used=%s",
                request_id,
                requested_difficulty,
                len(examples),
                examples_difficulty_used,
            )

            # INFO logging to verify inputs passed to the AI generator (no prompt / secrets).
            example_tags: list[str] = []
            for ex in examples:
                for t in ex.get("tags") or []:
                    if t not in example_tags:
                        example_tags.append(t)

            # Build deterministic seed for topic selection.
            topic_seed = f"{req.child_id}:{req.subject_id}:{age_range_code}:{req.difficulty_code}:{request_uuid}"  # deterministic

            # Obtain topic catalog (cached in Redis) via topic helper model.
            topic_client: AsyncOpenAI | None = None
            try:
                topic_client = AsyncOpenAI(
                    api_key=settings.flashcard_api_key,
                    base_url=settings.flashcard_api_base,
                )

                helper_model = settings.topic_helper_model or generator.model

                # retry/backoff: 2 retries (3 total attempts)
                delays = [0.0, 0.5, 1.5]
                catalog = None
                last_exc: Exception | None = None
                for d in delays:
                    if d:
                        await asyncio.sleep(d)
                    try:
                        catalog = await get_or_create_topic_catalog(
                            redis_sync_client=redis_client,
                            openai_client=topic_client,
                            model=helper_model,
                            version=settings.topic_catalog_version,
                            subject=subject_name,
                            age_range_code=age_range_code,
                            difficulty=req.difficulty_code,
                            rotate=settings.topic_catalog_rotate,
                            count=settings.topic_catalog_count,
                            ttl_seconds=settings.topic_catalog_ttl_seconds,
                        )
                        if catalog:
                            break
                    except Exception as exc:
                        last_exc = exc
                        logger.warning(
                            "process_content_expansion_request: topic catalog attempt failed request_id=%s err=%s",
                            request_id,
                            exc,
                        )
                        catalog = None

                if not catalog:
                    raise RuntimeError("Failed to obtain non-empty topic catalog") from last_exc

                n_pool = min(settings.topic_pool_size, len(catalog))
                selected = select_topics_for_batch(catalog, count=n_pool, deterministic_seed=topic_seed)
                topic_tags = [t.topic for t in selected]
                # Build compact topic_pool in the NEW schema expected by the generator.
                # (The generator is also tolerant of legacy keys via aliases, but keep it consistent.)
                topic_pool: list[dict] = []
                for t in selected:
                    topic = getattr(t, "topic", None)
                    if not isinstance(topic, str) or not topic.strip():
                        continue

                    stem_templates = getattr(t, "stem_templates", None)
                    anchor_facts = getattr(t, "anchor_facts", None)
                    misconceptions = getattr(t, "misconceptions", None)
                    keywords = getattr(t, "keywords", None)

                    # Runtime guard: avoid crashing Celery task on unexpected topic item shape.
                    topic_pool.append(
                        {
                            "topic": topic.strip(),
                            "stem_templates": list(stem_templates or [])[:3],
                            "anchor_facts": list(anchor_facts or [])[:6],
                            "misconceptions": list(misconceptions or [])[:4],
                            "keywords": list(keywords or [])[:8],
                        }
                    )

            finally:
                if topic_client is not None:
                    close_fn = getattr(topic_client, "close", None) or getattr(topic_client, "aclose", None)
                    if close_fn is not None:
                        try:
                            res = close_fn()
                            if res is not None:
                                await res
                        except Exception:
                            logger.exception(
                                "process_content_expansion_request: failed to close topic helper client"
                            )

            logger.info(
                "process_content_expansion_request: AI input request_id=%s child_id=%s subject=%s difficulty=%s age_range_code=%s topic_tags=%s examples_count=%s example_tags=%s",
                request_id,
                (str(child.id) if child is not None else str(req.child_id)),
                subject_name,
                req.difficulty_code,
                age_range_code,
                topic_tags,
                len(examples),
                example_tags,
            )

            # Generator expects age_range_code (not label/min/max)
            # NOTE: this duplicates the earlier computed age_range_code, but keep explicit here for clarity.
            age_range_code = (ar.code if (req.age_range_id and ar is not None) else "all")

            flashcard_data = await generator.generate_flashcards(
                subject=subject_name,
                age_range_code=age_range_code,
                difficulty=req.difficulty_code,
                topic_tags=topic_tags,
                topic_pool=topic_pool,
                count=5,
                examples=examples,
                examples_difficulty_used=examples_difficulty_used,
                requested_difficulty=requested_difficulty,
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
                            "choices": card["choices"],
                            "correct_index": card["correct_index"],
                            "explanations": card["explanations"],
                            "difficulty_code": req.difficulty_code,
                            "age_range_id": req.age_range_id,
                            "tags": (card.get("tags") if isinstance(card.get("tags"), list) else []),
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
