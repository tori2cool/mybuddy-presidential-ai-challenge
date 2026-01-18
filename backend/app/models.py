# app/models.py
from __future__ import annotations

from datetime import date, datetime
from typing import Optional
from uuid import UUID

from sqlalchemy import Column, DateTime, Index, Integer, UniqueConstraint, func, text
from sqlalchemy.dialects.postgresql import JSONB, UUID as PG_UUID
from sqlalchemy.sql import literal_column
from sqlmodel import Field, SQLModel

# ---------------------------------------------------------------------------
# Conventions
# ---------------------------------------------------------------------------
# - UUID primary keys (DB-generated) for all entity tables
# - Foreign keys reference UUID ids
# - Keep stable "code" where it acts like an enum identifier:
#   Subject.code, DifficultyThreshold.code, PointsValue.code, AgeRange.code, AchievementDefinition.code
# - Timestamps are UTC and DB-driven (server_default + onupdate)
# - JSONB used for tags + flexible fields
# - ChildActivityEvent now has typed columns (keep meta for extras)
# ---------------------------------------------------------------------------

UTC_NOW_SQL = text("timezone('utc', now())")
UUID_V4_SQL = text("gen_random_uuid()")  # requires pgcrypto extension


def uuid_pk() -> Column:
    return Column(
        PG_UUID(as_uuid=True),
        primary_key=True,
        nullable=False,
        server_default=UUID_V4_SQL,
    )


def created_at_field() -> Field:
    return Field(
        sa_column=Column(
            DateTime(timezone=True),
            nullable=False,
            index=True,
            server_default=UTC_NOW_SQL,
        )
    )


def updated_at_field() -> Field:
    return Field(
        sa_column=Column(
            DateTime(timezone=True),
            nullable=False,
            index=True,
            server_default=UTC_NOW_SQL,
            onupdate=func.timezone("utc", func.now()),
        )
    )


# ---------------------------------------------------------------------------
# MIXINS
# ---------------------------------------------------------------------------

class SoftDeleteMixin:
    is_deleted: bool = Field(default=False, index=True)
    deleted_at: Optional[datetime] = Field(
        default=None,
        sa_column=Column(DateTime(timezone=True), nullable=True),
    )


class TenantMixin:
    tenant_id: Optional[str] = Field(default=None, index=True, max_length=100)


class TimestampsMixin:
    created_at: datetime = Field(
        sa_column_kwargs={
            "nullable": False,
            "index": True,
            "server_default": UTC_NOW_SQL,
        }
    )
    updated_at: datetime = Field(
        sa_column_kwargs={
            "nullable": False,
            "index": True,
            "server_default": UTC_NOW_SQL,
            "onupdate": func.timezone("utc", func.now()),
        }
    )


# ---------------------------------------------------------------------------
# LOOKUP TABLES
# ---------------------------------------------------------------------------

class Avatar(SQLModel, table=True):
    __tablename__ = "avatars"

    id: UUID = Field(sa_column=uuid_pk())

    name: str = Field(nullable=False, max_length=50, unique=True)
    image_path: str = Field(nullable=False, max_length=500)
    is_active: bool = Field(default=True, nullable=False)


class Interest(SQLModel, table=True):
    __tablename__ = "interests"

    id: UUID = Field(sa_column=uuid_pk())

    name: str = Field(nullable=False, max_length=50, unique=True)
    label: str = Field(nullable=False, max_length=255)
    icon: str = Field(nullable=False, max_length=50)
    is_active: bool = Field(default=True, nullable=False)


# ---------------------------------------------------------------------------
# CORE DOMAIN
# ---------------------------------------------------------------------------

class Child(TimestampsMixin, SQLModel, table=True):
    __tablename__ = "children"

    id: UUID = Field(sa_column=uuid_pk())

    owner_sub: str = Field(nullable=False, index=True, max_length=255)

    name: str = Field(nullable=False, max_length=255)
    birthday: date = Field(nullable=False)

    # Stored as JSONB list of strings (UUIDs as strings).
    interests: Optional[list[str]] = Field(default=None, sa_column=Column(JSONB))

    avatar_id: Optional[UUID] = Field(default=None, foreign_key="avatars.id", index=True)


class ChildActivityEvent(SQLModel, table=True):
    """
    Append-only event stream.
    NOW includes typed columns for your most common event attributes.
    meta remains for extras / backwards compatibility / debug.
    """
    __tablename__ = "child_activity_events"

    id: UUID = Field(sa_column=uuid_pk())

    child_id: UUID = Field(foreign_key="children.id", index=True, nullable=False)
    kind: str = Field(index=True, nullable=False, max_length=50)

    created_at: datetime = Field(
        sa_column=Column(DateTime(timezone=True), nullable=False, index=True, server_default=UTC_NOW_SQL)
    )

    # ----------------------------
    # Typed columns (nullable)
    # ----------------------------
    subject_id: Optional[UUID] = Field(default=None, foreign_key="subjects.id", index=True)
    flashcard_id: Optional[UUID] = Field(default=None, foreign_key="flashcards.id", index=True)

    chore_id: Optional[UUID] = Field(default=None, foreign_key="chores.id", index=True)
    outdoor_activity_id: Optional[UUID] = Field(default=None, foreign_key="outdoor_activities.id", index=True)
    affirmation_id: Optional[UUID] = Field(default=None, foreign_key="affirmations.id", index=True)

    points: Optional[int] = Field(default=None)
    correct: Optional[bool] = Field(default=None)
    answer: Optional[str] = Field(default=None, max_length=500)

    # Extras: dedupeKey, anything else
    meta: Optional[dict] = Field(default=None, sa_column=Column(JSONB))

    __table_args__ = (
        # Keep your existing dedupe behavior exactly, but with a TEMPORARY
        # global day boundary (US/Eastern).
        #
        # TODO(timezone): This is global America/New_York until per-account
        # timezones are supported. Daily rollups/streaks MUST bucket days
        # using the same timezone to match dedupe semantics.
        #
        # Future approach: store account timezone (IANA name) and compute a
        # dedicated local_day/dedupe_day column at insert time (or generated
        # column) and index/roll up on that value.
        Index(
            "uq_child_kind_dedupe_per_day",
            "child_id",
            "kind",
            literal_column("((created_at AT TIME ZONE 'America/New_York')::date)"),
            literal_column("(coalesce(meta->>'dedupeKey',''))"),
            unique=True,
            postgresql_where=text("(meta ? 'dedupeKey') AND (meta->>'dedupeKey' <> '')"),
        ),
        # Helpful query index for dashboard rollups:
        Index("ix_child_events_child_kind_created", "child_id", "kind", "created_at"),
    )


class ChildProgress(SQLModel, table=True):
    __tablename__ = "child_progress"

    child_id: UUID = Field(foreign_key="children.id", primary_key=True, nullable=False)

    total_points: int = Field(default=0, nullable=False)
    total_flashcards: int = Field(default=0, nullable=False)
    total_chores: int = Field(default=0, nullable=False)
    total_outdoor: int = Field(default=0, nullable=False)
    total_affirmations: int = Field(default=0, nullable=False)

    current_streak: int = Field(default=0, nullable=False)
    longest_streak: int = Field(default=0, nullable=False)
    last_active_date: Optional[date] = Field(default=None)

    last_seen_at: Optional[datetime] = Field(default=None, sa_column=Column(DateTime(timezone=True), nullable=True))

    current_level: str = Field(default="New Kid", max_length=50, nullable=False)

    # JSONB map for per-subject counters; keep non-null to simplify callers.
    subject_counts: dict = Field(default_factory=dict, sa_column=Column(JSONB, nullable=False, server_default=text("'{}'::jsonb")))


# ---------------------------------------------------------------------------
# CONFIG / THRESHOLDS / METADATA
# ---------------------------------------------------------------------------

class LevelThreshold(SQLModel, table=True):
    __tablename__ = "level_thresholds"

    id: UUID = Field(sa_column=uuid_pk())

    name: str = Field(nullable=False, max_length=100, unique=True)
    threshold: int = Field(nullable=False)
    icon: str = Field(nullable=False, max_length=50)
    color: str = Field(nullable=False, max_length=20)
    is_active: bool = Field(default=True, nullable=False)


class DifficultyThreshold(SQLModel, table=True):
    __tablename__ = "difficulty_thresholds"

    id: UUID = Field(sa_column=uuid_pk())

    code: str = Field(nullable=False, max_length=20, unique=True, index=True)
    name: str = Field(nullable=False, max_length=20, unique=True)

    label: str = Field(nullable=False, max_length=50)
    icon: str = Field(nullable=False, max_length=50)
    color: str = Field(nullable=False, max_length=20)

    threshold: int = Field(nullable=False)
    is_active: bool = Field(default=True, nullable=False)


class PointsValue(SQLModel, table=True):
    __tablename__ = "points_values"

    id: UUID = Field(sa_column=uuid_pk())

    code: str = Field(nullable=False, max_length=100, unique=True, index=True)
    name: str = Field(nullable=False, max_length=100, unique=True)
    points: int = Field(nullable=False)
    is_active: bool = Field(default=True, nullable=False)


class AgeRange(SQLModel, table=True):
    __tablename__ = "age_ranges"

    id: UUID = Field(sa_column=uuid_pk())

    code: str = Field(nullable=False, max_length=100, unique=True, index=True)
    name: str = Field(nullable=False, max_length=100, unique=True)
    min_age: int = Field(nullable=False)
    max_age: Optional[int] = Field(default=None)
    is_active: bool = Field(default=True, nullable=False)


class AchievementDefinition(TimestampsMixin, SQLModel, table=True):
    __tablename__ = "achievements"

    id: UUID = Field(sa_column=uuid_pk())

    code: str = Field(nullable=False, max_length=100, unique=True, index=True)
    title: str = Field(nullable=False, max_length=255)
    description: str = Field(nullable=False, max_length=500)
    icon: str = Field(nullable=False, max_length=50)

    achievement_type: str = Field(nullable=False, max_length=50, default="special")

    points_threshold: Optional[int] = Field(default=None)
    streak_days_threshold: Optional[int] = Field(default=None)
    flashcards_count_threshold: Optional[int] = Field(default=None)
    chores_count_threshold: Optional[int] = Field(default=None)
    outdoor_count_threshold: Optional[int] = Field(default=None)

    is_active: bool = Field(default=True, nullable=False)


class ChildAchievement(SQLModel, table=True):
    __tablename__ = "child_achievements"

    child_id: UUID = Field(foreign_key="children.id", primary_key=True, nullable=False)
    achievement_id: UUID = Field(foreign_key="achievements.id", primary_key=True, nullable=False)

    unlocked_at: datetime = Field(sa_column=Column(DateTime(timezone=True), nullable=False, server_default=UTC_NOW_SQL))
    context: Optional[dict] = Field(default=None, sa_column=Column(JSONB))


# ---------------------------------------------------------------------------
# CONTENT TABLES
# ---------------------------------------------------------------------------

class Subject(SQLModel, table=True):
    __tablename__ = "subjects"

    id: UUID = Field(sa_column=uuid_pk())

    code: str = Field(nullable=False, max_length=50, unique=True, index=True)
    name: str = Field(nullable=False, max_length=255, unique=True)
    icon: str = Field(nullable=False, max_length=255)
    color: str = Field(nullable=False, max_length=255)


class SubjectAgeRange(SQLModel, table=True):
    __tablename__ = "subject_age_ranges"

    subject_id: UUID = Field(foreign_key="subjects.id", primary_key=True, nullable=False)
    age_range_id: UUID = Field(foreign_key="age_ranges.id", primary_key=True, nullable=False)


class Affirmation(SQLModel, table=True):
    __tablename__ = "affirmations"

    id: UUID = Field(sa_column=uuid_pk())

    text: str = Field(nullable=False)
    image: Optional[str] = Field(default=None, max_length=500)
    gradient_0: str = Field(nullable=False, max_length=255)
    gradient_1: str = Field(nullable=False, max_length=255)

    tags: Optional[list[str]] = Field(default=None, sa_column=Column(JSONB))

    age_range_id: Optional[UUID] = Field(default=None, foreign_key="age_ranges.id", index=True)


class Flashcard(SoftDeleteMixin, SQLModel, table=True):
    __tablename__ = "flashcards"

    id: UUID = Field(sa_column=uuid_pk())

    subject_id: UUID = Field(foreign_key="subjects.id", nullable=False, index=True)

    question: str = Field(nullable=False)

    # MCQ-only schema (aligned with seed.py + ai_flashcard_generator.py contract)
    # NOTE: SQLModel disallows Field(nullable=...) when sa_column is provided.
    # Put nullability + server defaults on the SQLAlchemy Column instead.
    choices: list[str] = Field(
        default_factory=list,
        sa_column=Column(JSONB, nullable=False, server_default=text("'[]'::jsonb")),
    )
    explanations: list[str] = Field(
        default_factory=list,
        sa_column=Column(JSONB, nullable=False, server_default=text("'[]'::jsonb")),
    )
    correct_index: int = Field(default=0, sa_column=Column(Integer, nullable=False))

    difficulty_code: str = Field(nullable=False, max_length=20, index=True)

    tags: Optional[list[str]] = Field(default=None, sa_column=Column(JSONB))
    age_range_id: Optional[UUID] = Field(default=None, foreign_key="age_ranges.id", index=True)

    __table_args__ = (
        UniqueConstraint("subject_id", "question", "difficulty_code", "age_range_id", name="uq_flashcard_subject_q"),
    )


class Chore(SQLModel, table=True):
    __tablename__ = "chores"

    id: UUID = Field(sa_column=uuid_pk())

    label: str = Field(nullable=False, max_length=255)
    icon: str = Field(nullable=False, max_length=255)
    is_extra: bool = Field(default=False, nullable=False)

    tags: Optional[list[str]] = Field(default=None, sa_column=Column(JSONB))
    age_range_id: Optional[UUID] = Field(default=None, foreign_key="age_ranges.id", index=True)


class OutdoorActivity(SQLModel, table=True):
    __tablename__ = "outdoor_activities"

    id: UUID = Field(sa_column=uuid_pk())

    name: str = Field(nullable=False, max_length=255)
    category: str = Field(nullable=False, max_length=255)
    icon: str = Field(nullable=False, max_length=255)
    time: str = Field(nullable=False, max_length=255)

    points: int = Field(nullable=False)
    is_daily: bool = Field(nullable=False)

    tags: Optional[list[str]] = Field(default=None, sa_column=Column(JSONB))
    age_range_id: Optional[UUID] = Field(default=None, foreign_key="age_ranges.id", index=True)


# ---------------------------------------------------------------------------
# STATS / PERFORMANCE TABLES
# ---------------------------------------------------------------------------

class ChildBalancedProgressCounter(SQLModel, table=True):
    __tablename__ = "child_balanced_progress_counters"

    id: UUID = Field(sa_column=uuid_pk())

    child_id: UUID = Field(foreign_key="children.id", index=True, nullable=False)

    # Store Subject.code directly (stable identifier; ok per product decision)
    subject_code: str = Field(nullable=False, max_length=50, index=True)

    correct_count: int = Field(default=0, nullable=False)

    updated_at: datetime = Field(
        sa_column=Column(
            DateTime(timezone=True),
            nullable=False,
            index=True,
            server_default=UTC_NOW_SQL,
            onupdate=func.timezone("utc", func.now()),
        )
    )

    __table_args__ = (
        UniqueConstraint("child_id", "subject_code", name="uq_child_balanced_progress_child_subject"),
        Index("ix_cbpc_child_subject", "child_id", "subject_code"),
    )


class ChildSubjectDifficulty(SQLModel, table=True):
    __tablename__ = "child_subject_difficulty"

    child_id: UUID = Field(foreign_key="children.id", primary_key=True, nullable=False)
    subject_id: UUID = Field(foreign_key="subjects.id", primary_key=True, nullable=False)

    # Persisted tier code (easy/medium/hard...). This is the source of truth for the
    # current difficulty tier shown to the client.
    # NOTE: schema keeps a default of "easy" for backward compatibility, but
    # runtime behavior should set the first active tier (min threshold) on insert.
    difficulty_code: str = Field(default="easy", nullable=False, max_length=20, index=True)

    # Nullable: we only update when the tier changes (or when we ensure the row exists).
    last_updated: Optional[datetime] = Field(
        default=None,
        sa_column=Column(DateTime(timezone=True), nullable=True),
    )


class ChildSubjectStreak(SQLModel, table=True):
    __tablename__ = "child_subject_streaks"

    child_id: UUID = Field(foreign_key="children.id", primary_key=True, nullable=False)
    subject_id: UUID = Field(foreign_key="subjects.id", primary_key=True, nullable=False)

    current_streak: int = Field(default=0, nullable=False)
    longest_streak: int = Field(default=0, nullable=False)

    last_updated: datetime = Field(
        sa_column=Column(
            DateTime(timezone=True),
            nullable=False,
            server_default=UTC_NOW_SQL,
            onupdate=func.timezone("utc", func.now()),
        )
    )


class ChildFlashcardPerformance(TimestampsMixin, SQLModel, table=True):
    __tablename__ = "child_flashcard_performance"

    child_id: UUID = Field(foreign_key="children.id", primary_key=True, nullable=False)
    flashcard_id: UUID = Field(foreign_key="flashcards.id", primary_key=True, nullable=False)

    correct_count: int = Field(default=0, nullable=False)
    incorrect_count: int = Field(default=0, nullable=False)

    last_seen_at: Optional[datetime] = Field(default=None, sa_column=Column(DateTime(timezone=True), nullable=True))


# ---------------------------------------------------------------------------
# CONTENT EXPANSION QUEUE
# ---------------------------------------------------------------------------

class ContentExpansionRequest(SQLModel, table=True):
    __tablename__ = "content_expansion_requests"

    id: UUID = Field(sa_column=uuid_pk())

    child_id: UUID = Field(foreign_key="children.id", index=True, nullable=False)
    subject_id: UUID = Field(foreign_key="subjects.id", index=True, nullable=False)
    age_range_id: Optional[UUID] = Field(default=None, foreign_key="age_ranges.id", index=True)

    difficulty_code: str = Field(nullable=False, max_length=20, index=True)

    trigger: str = Field(nullable=False, max_length=100)

    # pending/running/completed/skipped/failed
    status: str = Field(nullable=False, max_length=20, index=True, default="pending")

    # Idempotency key for request creation (see services/content_expansion_queue.py).
    # Dedupe is per (child+subject+age_range+difficulty+trigger+UTC-bucket).
    # Bucket size is configurable via CONTENT_EXPANSION_DEDUPE_BUCKET_MINUTES.
    # If set to 0 (or < 1), bucket dedupe is disabled (dedupe_key becomes unique per request).
    dedupe_key: str = Field(nullable=False, max_length=255, index=True)

    attempts: int = Field(default=0, nullable=False)
    error: Optional[str] = Field(default=None)

    created_at: datetime = created_at_field()
    updated_at: datetime = updated_at_field()
    completed_at: Optional[datetime] = Field(default=None, sa_column=Column(DateTime(timezone=True), nullable=True))

    __table_args__ = (
        UniqueConstraint("dedupe_key", name="uq_content_expansion_dedupe_key"),
        Index("ix_content_expansion_status_created", "status", "created_at"),
    )
