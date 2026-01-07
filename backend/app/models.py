# app/models.py
from __future__ import annotations

from datetime import date, datetime
from typing import Optional
from uuid import UUID, uuid4

from sqlalchemy import Column, DateTime, Index, UniqueConstraint, func, text
from sqlalchemy.dialects.postgresql import JSONB, UUID as PG_UUID
from sqlalchemy.sql import literal_column
from sqlmodel import Field, SQLModel

# ---------------------------------------------------------------------------
# Conventions (industry standard)
# ---------------------------------------------------------------------------
# - All tables use UUID primary keys (client-safe strings)
# - Foreign keys reference UUID ids, not slugs/keys
# - Only keep stable string "code" fields where the domain benefits (enum-like):
#   subjects.code, difficulty_thresholds.code, points_values.code, age_ranges.code, achievements.code
# - Timestamps are UTC and DB-driven (server_default + onupdate)
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


# ---------------------------------------------------------------------------
# LOOKUP TABLES (no keys; UUID + unique name)
# ---------------------------------------------------------------------------

class Avatar(SQLModel, table=True):
    __tablename__ = "avatars"

    id: UUID = Field(default_factory=uuid4, sa_column=uuid_pk())

    name: str = Field(nullable=False, max_length=50, unique=True)  # e.g. "astronaut"
    image_path: str = Field(nullable=False, max_length=500)
    is_active: bool = Field(default=True)


class Interest(SQLModel, table=True):
    __tablename__ = "interests"

    id: UUID = Field(default_factory=uuid4, sa_column=uuid_pk())

    name: str = Field(nullable=False, max_length=50, unique=True)
    label: str = Field(nullable=False, max_length=255)
    icon: str = Field(nullable=False, max_length=50)
    is_active: bool = Field(default=True)


# ---------------------------------------------------------------------------
# CORE DOMAIN
# ---------------------------------------------------------------------------

class Child(SQLModel, table=True):
    __tablename__ = "children"

    id: UUID = Field(default_factory=uuid4, sa_column=uuid_pk())

    owner_sub: str = Field(nullable=False, index=True, max_length=255)

    name: str = Field(nullable=False, max_length=255)
    birthday: date = Field(nullable=False)

    # Store interests as JSON list (e.g., Interest.name or Interest.id as strings).
    # Industry standard would be a join table; keep JSON if you prefer for now.
    interests: Optional[list] = Field(default=None, sa_column=Column(JSONB))

    # FK by UUID (no avatar_key)
    avatar_id: Optional[UUID] = Field(default=None, foreign_key="avatars.id", index=True)

    created_at: datetime = created_at_field()
    updated_at: datetime = updated_at_field()


class ChildActivityEvent(SQLModel, table=True):
    __tablename__ = "child_activity_events"

    id: UUID = Field(default_factory=uuid4, sa_column=uuid_pk())

    child_id: UUID = Field(foreign_key="children.id", index=True, nullable=False)
    kind: str = Field(index=True, nullable=False, max_length=50)

    created_at: datetime = Field(
        sa_column=Column(DateTime(timezone=True), nullable=False, index=True, server_default=UTC_NOW_SQL)
    )
    meta: Optional[dict] = Field(default=None, sa_column=Column(JSONB))

    __table_args__ = (
        Index(
            "uq_child_kind_dedupe_per_day",
            "child_id",
            "kind",
            literal_column("((created_at AT TIME ZONE 'UTC')::date)"),
            literal_column("(coalesce(meta->>'dedupeKey',''))"),
            unique=True,
            postgresql_where=text("(meta ? 'dedupeKey') AND (meta->>'dedupeKey' <> '')"),
        ),
    )


class ChildProgress(SQLModel, table=True):
    __tablename__ = "child_progress"

    child_id: UUID = Field(foreign_key="children.id", primary_key=True, nullable=False)

    total_points: int = Field(default=0)
    total_flashcards: int = Field(default=0)
    total_chores: int = Field(default=0)
    total_outdoor: int = Field(default=0)
    total_affirmations: int = Field(default=0)

    current_streak: int = Field(default=0)
    longest_streak: int = Field(default=0)
    last_active_date: Optional[date] = Field(default=None)

    last_seen_at: Optional[datetime] = Field(default=None, sa_column=Column(DateTime(timezone=True), nullable=True))

    current_level: str = Field(default="New Kid", max_length=50)

    subject_counts: Optional[dict] = Field(default=None, sa_column=Column(JSONB))


# ---------------------------------------------------------------------------
# CONFIG / THRESHOLDS / METADATA
# Keep "code" where it acts like a stable enum identifier.
# ---------------------------------------------------------------------------

class LevelThreshold(SQLModel, table=True):
    __tablename__ = "level_thresholds"

    id: UUID = Field(default_factory=uuid4, sa_column=uuid_pk())

    name: str = Field(nullable=False, max_length=100, unique=True)
    threshold: int = Field(nullable=False)
    icon: str = Field(nullable=False, max_length=50)
    color: str = Field(nullable=False, max_length=20)
    is_active: bool = Field(default=True)


class DifficultyThreshold(SQLModel, table=True):
    __tablename__ = "difficulty_thresholds"

    id: UUID = Field(default_factory=uuid4, sa_column=uuid_pk())

    code: str = Field(nullable=False, max_length=20, unique=True, index=True)  # "easy"
    name: str = Field(nullable=False, max_length=20, unique=True)              # "Easy" or same as code

    label: str = Field(nullable=False, max_length=50)
    icon: str = Field(nullable=False, max_length=50)
    color: str = Field(nullable=False, max_length=20)

    threshold: int = Field(nullable=False)
    is_active: bool = Field(default=True)


class PointsValue(SQLModel, table=True):
    __tablename__ = "points_values"

    id: UUID = Field(default_factory=uuid4, sa_column=uuid_pk())

    code: str = Field(nullable=False, max_length=100, unique=True, index=True)  # "flashcard_correct"
    name: str = Field(nullable=False, max_length=100, unique=True)
    points: int = Field(nullable=False)
    is_active: bool = Field(default=True)


class AgeRange(SQLModel, table=True):
    __tablename__ = "age_ranges"

    id: UUID = Field(default_factory=uuid4, sa_column=uuid_pk())

    code: str = Field(nullable=False, max_length=100, unique=True, index=True)  # "age_3_5"
    name: str = Field(nullable=False, max_length=100, unique=True)
    min_age: int = Field(nullable=False)
    max_age: Optional[int] = Field(default=None)
    is_active: bool = Field(default=True)


class AchievementDefinition(SQLModel, table=True):
    __tablename__ = "achievements"

    id: UUID = Field(default_factory=uuid4, sa_column=uuid_pk())

    code: str = Field(nullable=False, max_length=100, unique=True, index=True)  # "balanced-learner"
    title: str = Field(nullable=False, max_length=255)
    description: str = Field(nullable=False, max_length=500)
    icon: str = Field(nullable=False, max_length=50)

    achievement_type: str = Field(nullable=False, max_length=50, default="special")

    points_threshold: Optional[int] = Field(default=None)
    streak_days_threshold: Optional[int] = Field(default=None)
    flashcards_count_threshold: Optional[int] = Field(default=None)
    chores_count_threshold: Optional[int] = Field(default=None)
    outdoor_count_threshold: Optional[int] = Field(default=None)
    is_active: bool = Field(default=True)

    created_at: datetime = created_at_field()
    updated_at: datetime = updated_at_field()


class ChildAchievement(SQLModel, table=True):
    __tablename__ = "child_achievements"

    child_id: UUID = Field(foreign_key="children.id", primary_key=True, nullable=False)
    achievement_id: UUID = Field(foreign_key="achievements.id", primary_key=True, nullable=False)

    unlocked_at: datetime = Field(sa_column=Column(DateTime(timezone=True), nullable=False, server_default=UTC_NOW_SQL))
    context: Optional[dict] = Field(default=None, sa_column=Column(JSONB))


# ---------------------------------------------------------------------------
# CONTENT TABLES (UUID id only; no keys)
# Keep Subject.code because it’s a semantic enum in your app.
# ---------------------------------------------------------------------------

class Subject(SQLModel, table=True):
    __tablename__ = "subjects"

    id: UUID = Field(default_factory=uuid4, sa_column=uuid_pk())

    code: str = Field(nullable=False, max_length=50, unique=True, index=True)  # "math"
    name: str = Field(nullable=False, max_length=255, unique=True)
    icon: str = Field(nullable=False, max_length=255)
    color: str = Field(nullable=False, max_length=255)


class SubjectAgeRange(SQLModel, table=True):
    __tablename__ = "subject_age_ranges"

    subject_id: UUID = Field(foreign_key="subjects.id", primary_key=True, nullable=False)
    age_range_id: UUID = Field(foreign_key="age_ranges.id", primary_key=True, nullable=False)


class Affirmation(SQLModel, table=True):
    __tablename__ = "affirmations"

    id: UUID = Field(default_factory=uuid4, sa_column=uuid_pk())

    text: str = Field(nullable=False)
    image: Optional[str] = Field(default=None, max_length=500)
    gradient_0: str = Field(nullable=False, max_length=255)
    gradient_1: str = Field(nullable=False, max_length=255)
    tags: Optional[list] = Field(default=None, sa_column=Column(JSONB))

    age_range_id: Optional[UUID] = Field(default=None, foreign_key="age_ranges.id", index=True)


class Flashcard(SQLModel, table=True):
    __tablename__ = "flashcards"

    id: UUID = Field(default_factory=uuid4, sa_column=uuid_pk())

    subject_id: UUID = Field(foreign_key="subjects.id", nullable=False, index=True)

    question: str = Field(nullable=False)
    answer: str = Field(nullable=False)

    acceptable_answers: Optional[list] = Field(default=None, sa_column=Column(JSONB))

    # Store difficulty by code string (easy/medium/hard) to keep API simple.
    difficulty_code: str = Field(nullable=False, max_length=20, index=True)

    tags: Optional[list] = Field(default=None, sa_column=Column(JSONB))
    age_range_id: Optional[UUID] = Field(default=None, foreign_key="age_ranges.id", index=True)

    __table_args__ = (
        # Prevent exact duplicates if you want. Optional.
        UniqueConstraint("subject_id", "question", "difficulty_code", "age_range_id", name="uq_flashcard_subject_q"),
    )


class Chore(SQLModel, table=True):
    __tablename__ = "chores"

    id: UUID = Field(default_factory=uuid4, sa_column=uuid_pk())

    label: str = Field(nullable=False, max_length=255)
    icon: str = Field(nullable=False, max_length=255)
    is_extra: bool = Field(default=False, nullable=False)

    tags: Optional[list] = Field(default=None, sa_column=Column(JSONB))
    age_range_id: Optional[UUID] = Field(default=None, foreign_key="age_ranges.id", index=True)


class OutdoorActivity(SQLModel, table=True):
    __tablename__ = "outdoor_activities"

    id: UUID = Field(default_factory=uuid4, sa_column=uuid_pk())

    name: str = Field(nullable=False, max_length=255)
    category: str = Field(nullable=False, max_length=255)
    icon: str = Field(nullable=False, max_length=255)
    time: str = Field(nullable=False, max_length=255)

    points: int = Field(nullable=False)
    is_daily: bool = Field(nullable=False)

    tags: Optional[list] = Field(default=None, sa_column=Column(JSONB))
    age_range_id: Optional[UUID] = Field(default=None, foreign_key="age_ranges.id", index=True)


# ---------------------------------------------------------------------------
# STATS / PERFORMANCE TABLES (UUID FKs)
# ---------------------------------------------------------------------------

class ChildSubjectStreak(SQLModel, table=True):
    __tablename__ = "child_subject_streaks"

    child_id: UUID = Field(foreign_key="children.id", primary_key=True, nullable=False)
    subject_id: UUID = Field(foreign_key="subjects.id", primary_key=True, nullable=False)

    current_streak: int = Field(default=0)
    longest_streak: int = Field(default=0)

    last_updated: datetime = Field(
        sa_column=Column(
            DateTime(timezone=True),
            nullable=False,
            server_default=UTC_NOW_SQL,
            onupdate=func.timezone("utc", func.now()),
        )
    )


class ChildFlashcardPerformance(SQLModel, table=True):
    __tablename__ = "child_flashcard_performance"

    child_id: UUID = Field(foreign_key="children.id", primary_key=True, nullable=False)
    flashcard_id: UUID = Field(foreign_key="flashcards.id", primary_key=True, nullable=False)

    correct_count: int = Field(default=0)
    incorrect_count: int = Field(default=0)

    last_seen_at: Optional[datetime] = Field(default=None, sa_column=Column(DateTime(timezone=True), nullable=True))

    created_at: datetime = created_at_field()
    updated_at: datetime = updated_at_field()


class ChildSubjectHighest(SQLModel, table=True):
    __tablename__ = "child_subject_highest"

    child_id: UUID = Field(foreign_key="children.id", primary_key=True, nullable=False)
    subject_id: UUID = Field(foreign_key="subjects.id", primary_key=True, nullable=False)

    highest_difficulty_code: str = Field(default="easy", max_length=20)
    reached_at: datetime = Field(sa_column=Column(DateTime(timezone=True), nullable=False, server_default=UTC_NOW_SQL))
