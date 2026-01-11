from __future__ import annotations

import logging
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Optional
from uuid import UUID, uuid4

from ..config import settings

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from ..models import ContentExpansionRequest

logger = logging.getLogger("mybuddy.api")


@dataclass
class CreateExpansionRequestResult:
    request: ContentExpansionRequest
    created: bool


def _utc_bucket_stamp(*, bucket_minutes: int, now: Optional[datetime] = None) -> str:
    """Return the UTC bucket start as an ISO-like stamp.

    If bucket_minutes > 0, rounds down `now` to the bucket start and returns
    YYYY-MM-DDTHH:MM (minute precision).

    If bucket_minutes <= 0, returns a high-resolution stamp with a random suffix
    so the caller can effectively disable dedupe while keeping the DB unique
    constraint intact.
    """
    now = now or datetime.now(timezone.utc)

    if bucket_minutes <= 0:
        # Disable time-bucket dedupe: include current time + random suffix
        # to ensure per-request uniqueness while preserving the unique constraint.
        return f"{now.strftime('%Y-%m-%dT%H:%M:%S')}:{uuid4().hex}"

    # Cap is enforced in settings; keep an extra guard anyway.
    bucket_minutes = min(max(bucket_minutes, 1), 24 * 60)

    # Floor to bucket boundary from epoch.
    epoch_seconds = int(now.timestamp())
    bucket_seconds = bucket_minutes * 60
    bucket_start_seconds = (epoch_seconds // bucket_seconds) * bucket_seconds
    bucket_start = datetime.fromtimestamp(bucket_start_seconds, tz=timezone.utc)
    return bucket_start.strftime('%Y-%m-%dT%H:%M')


def compute_dedupe_key(
    *,
    child_id: UUID,
    subject_id: UUID,
    age_range_id: Optional[UUID],
    difficulty_code: str,
    trigger: str,
    utc_bucket_stamp: Optional[str] = None,
) -> str:
    """Compute an idempotency key for content expansion requests.

    Goal: allow more than one content expansion request per (child, subject,
    age_range, difficulty, trigger) per day, while preventing unbounded
    duplicates if a client retries the same action repeatedly.

    Scheme: dedupe within a configurable UTC time bucket. Bucket size is
    `settings.content_expansion_dedupe_bucket_minutes` (minutes).

    - If bucket_minutes > 0: dedupe key includes the bucket *start* stamp
      (YYYY-MM-DDTHH:MM).
    - If bucket_minutes <= 0: bucket stamp includes a per-request random suffix
      so the dedupe_key is effectively unique each time (dedupe disabled).

    NOTE: The DB enforces uniqueness via uq_content_expansion_dedupe_key.
    """

    bucket_minutes = settings.content_expansion_dedupe_bucket_minutes
    bucket = utc_bucket_stamp or _utc_bucket_stamp(bucket_minutes=bucket_minutes)
    # Ensure stable string formatting (UUIDs in canonical form)
    return f"{bucket}:{child_id}:{subject_id}:{age_range_id or 'none'}:{difficulty_code}:{trigger}"


async def create_content_expansion_request(
    session: AsyncSession,
    *,
    child_id: UUID,
    subject_id: UUID,
    age_range_id: Optional[UUID],
    difficulty_code: str,
    trigger: str,
) -> CreateExpansionRequestResult:
    """Create a queued request row (idempotent by dedupe_key).

    IMPORTANT:
    - This function only creates/gets the DB row.
    - It intentionally does NOT enqueue Celery; enqueue only after the caller commits.
    - Uses a SAVEPOINT/nested transaction so unique violations do NOT roll back the
      caller's outer transaction.

    Returns:
      CreateExpansionRequestResult(request=<row>, created=<bool>)

    When a unique violation occurs, we load and return the existing row so callers
    have a stable request_id if they want to enqueue/log it.
    """

    dedupe_key = compute_dedupe_key(
        child_id=child_id,
        subject_id=subject_id,
        age_range_id=age_range_id,
        difficulty_code=difficulty_code,
        trigger=trigger,
    )

    req = ContentExpansionRequest(
        child_id=child_id,
        subject_id=subject_id,
        age_range_id=age_range_id,
        difficulty_code=difficulty_code,
        trigger=trigger,
        status="pending",
        dedupe_key=dedupe_key,
    )

    try:
        async with session.begin_nested():
            session.add(req)
            await session.flush()
    except IntegrityError as e:
        # Unique constraint on dedupe_key => already queued in this dedupe bucket.
        msg = str(e)
        orig = getattr(e, "orig", None)
        orig_cls_name = orig.__class__.__name__ if orig is not None else ""

        if ("uq_content_expansion_dedupe_key" in msg) or ("UniqueViolationError" in orig_cls_name):
            logger.info("content_expansion_request: deduped dedupe_key=%s", dedupe_key)
            existing = (
                await session.execute(
                    select(ContentExpansionRequest).where(ContentExpansionRequest.dedupe_key == dedupe_key)
                )
            ).scalar_one_or_none()
            if existing is None:
                # Extremely rare; fall back to returning transient.
                return CreateExpansionRequestResult(request=req, created=False)
            return CreateExpansionRequestResult(request=existing, created=False)
        raise

    logger.info(
        "content_expansion_request: created id=%s dedupe_key=%s",
        str(req.id),
        dedupe_key,
    )
    return CreateExpansionRequestResult(request=req, created=True)


def enqueue_content_expansion_request_after_commit(request_id: UUID) -> None:
    """Enqueue the Celery worker for this request.

    Caller MUST call this only after committing the transaction that created
    the ContentExpansionRequest row.
    """
    from ..tasks import process_content_expansion_request

    process_content_expansion_request.delay(str(request_id))
