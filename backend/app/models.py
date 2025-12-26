# app/models.py
from __future__ import annotations
from sqlalchemy import UniqueConstraint, DateTime
from datetime import datetime, date, timezone
from typing import Optional, List
from sqlalchemy import Column, ForeignKey, Integer, Boolean, String, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlmodel import Field, SQLModel

# ---------- MIXINS ----------

class TimeStampedMixin(SQLModel):
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        sa_column=Column(DateTime(timezone=True), nullable=False, index=True),
    )
    updated_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        sa_column=Column(
            DateTime(timezone=True),
            nullable=False,
            index=True,
            onupdate=lambda: datetime.now(timezone.utc),
        ),
    )


class SoftDeleteMixin(SQLModel):
    is_deleted: bool = Field(default=False, index=True)
    deleted_at: Optional[datetime] = None


class TenantMixin(SQLModel):
    """
    Optional multi-tenant support.
    For example, you can store Keycloak realm / org / user-group here.
    """
    tenant_id: Optional[str] = Field(default=None, index=True, max_length=100)


# ---------- PROJECT MODELS ----------
class ChildActivityEvent(SQLModel, table=True):
    """
    Append-only event stream for progress/stats/streaks.
    """
    __tablename__ = "child_activity_events"

    id: Optional[int] = Field(default=None, primary_key=True)

    child_id: str = Field(
        foreign_key="children.id",
        index=True,
        sa_column_kwargs={"nullable": False},
        max_length=64,
    )

    # "flashcard_answered" | "chore_completed" | "outdoor_completed" | "affirmation_viewed"
    kind: str = Field(index=True, sa_column_kwargs={"nullable": False}, max_length=50)

    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        sa_column=Column(DateTime(timezone=True), nullable=False, index=True),
    )

    # flexible payload:
    # flashcard: {"subjectId":"math","correct":true,"flashcardId":"..."}
    # chore: {"choreId":"..."}
    # outdoor: {"outdoorActivityId":"..."}
    # affirmation: {"affirmationId":"..."}
    meta: Optional[dict] = Field(default=None, sa_column=Column(JSONB))

class Child(SQLModel, table=True):
    """
    Child profile used to personalize content (age/interests, etc.).

    Future content selection and AI generation will derive age and
    preferences from this record.
    """

    __tablename__ = "children"

    id: str = Field(primary_key=True, max_length=64)
    # Keycloak JWT subject (sub) that owns this child profile.
    owner_sub: str = Field(index=True, max_length=255)
    name: str = Field(sa_column_kwargs={"nullable": False}, max_length=255)
    birthday: date = Field(sa_column_kwargs={"nullable": False})
    interests: Optional[list] = Field(default=None, sa_column=Column(JSONB))
    avatar: Optional[str] = Field(default=None, max_length=255)

    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        sa_column=Column(DateTime(timezone=True), nullable=False, index=True),
    )
    updated_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        sa_column=Column(
            DateTime(timezone=True),
            nullable=False,
            index=True,
            onupdate=lambda: datetime.now(timezone.utc),
        ),
    )

class ChildProgress(SQLModel, table=True):
    """
    Pre-computed progress data.
    Updated by trigger on ChildActivityEvent insert.
    """
    __tablename__ = "child_progress"

    child_id: str = Field(foreign_key="children.id", primary_key=True, nullable=False, max_length=64)

    # Totals
    total_points: int = Field(default=0, sa_column=Column(Integer, default=0))
    total_flashcards: int = Field(default=0, sa_column=Column(Integer, default=0))
    total_chores: int = Field(default=0, sa_column=Column(Integer, default=0))
    total_outdoor: int = Field(default=0, sa_column=Column(Integer, default=0))
    total_affirmations: int = Field(default=0, sa_column=Column(Integer, default=0))

    # Streaks
    current_streak: int = Field(default=0, sa_column=Column(Integer, default=0))
    longest_streak: int = Field(default=0, sa_column=Column(Integer, default=0))
    last_active_date: Optional[date] = None

    # Session Tracking
    last_seen_at: Optional[datetime] = None

    # Current Level (computed from subject_counts)
    current_level: str = Field(default="New Kid", max_length=50)

    # Flexible Subject Data (JSONB)
    subject_counts: Optional[dict] = Field(default=None, sa_column=Column(JSONB))

class ChildSubjectHighest(SQLModel, table=True):
    """
    Tracks highest difficulty reached per subject.
    Used for "Math Whiz" achievements.
    """
    __tablename__ = "child_subject_highest"

    child_id: str = Field(foreign_key="children.id", primary_key=True, nullable=False, index=True, max_length=64)
    subject_id: str = Field(foreign_key="subjects.id", primary_key=True, nullable=False, index=True, max_length=64)
    highest_difficulty: str = Field(default="easy", max_length=20)
    reached_at: datetime = Field(default_factory=datetime.now)

class AchievementDefinition(SQLModel, table=True):
    """
    Achievement definitions (template for what can be unlocked).
    """
    __tablename__ = "achievements"

    id: str = Field(primary_key=True, nullable=False, max_length=100)
    title: str = Field(nullable=False, max_length=255)
    description: str = Field(nullable=False, max_length=500)
    icon: str = Field(nullable=False, max_length=50)
    type: str = Field(default="special", max_length=20)

    # Threshold fields
    points_threshold: Optional[int] = None
    streak_days_threshold: Optional[int] = None
    is_active: bool = Field(default=True)

    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now, sa_column_kwargs={"onupdate": datetime.now})

class ChildAchievement(SQLModel, table=True):
    """
    Tracks which achievements a child has unlocked.
    """
    __tablename__ = "child_achievements"

    # COMPOSITE PRIMARY KEY: (child_id, achievement_id)
    child_id: str = Field(foreign_key="children.id", primary_key=True, nullable=False, index=True, max_length=64)
    achievement_id: str = Field(foreign_key="achievements.id", primary_key=True, nullable=False, index=True, max_length=100)
    unlocked_at: datetime = Field(default_factory=datetime.now)
    context: Optional[dict] = Field(sa_column=Column(JSONB), default=None)

class LevelThreshold(SQLModel, table=True):
    """
    Level thresholds (New Kid, Good Kid, etc.).
    """
    __tablename__ = "level_thresholds"

    level_name: str = Field(primary_key=True, nullable=False, max_length=100)
    threshold: int = Field(sa_column=Column(Integer, nullable=False))
    icon: str = Field(nullable=False, max_length=50)
    color: str = Field(nullable=False, max_length=20)
    is_active: bool = Field(default=True)


class DifficultyThreshold(SQLModel, table=True):
    """
    Difficulty thresholds (easy, medium, hard).
    Fetched from database for difficulty calculation.
    """
    __tablename__ = "difficulty_thresholds"

    difficulty: str = Field(primary_key=True, nullable=False, max_length=20)
    threshold: int = Field(sa_column=Column(Integer, nullable=False))
    is_active: bool = Field(default=True)


class PointsValue(SQLModel, table=True):
    """
    Points values per activity.
    """
    __tablename__ = "points_values"

    activity: str = Field(primary_key=True, nullable=False, max_length=100)
    points: int = Field(sa_column=Column(Integer, nullable=False))
    is_active: bool = Field(default=True)

class Affirmation(SQLModel, table=True):
    """Static affirmation content.
    Mirrors the `affirmations` table.
    """

    __tablename__ = "affirmations"

    id: str = Field(primary_key=True, max_length=255)
    text: str = Field(nullable=False)
    gradient_0: str = Field(nullable=False, max_length=255)
    gradient_1: str = Field(nullable=False, max_length=255)

class Subject(SQLModel, table=True):
    """Academic subject used to organize flashcards and other content.

    Mirrors the `subjects` table.
    """

    __tablename__ = "subjects"

    id: str = Field(primary_key=True, max_length=255)
    name: str = Field(sa_column_kwargs={"nullable": False}, max_length=255)
    icon: str = Field(sa_column_kwargs={"nullable": False}, max_length=255)
    color: str = Field(sa_column_kwargs={"nullable": False}, max_length=255)


class Flashcard(SQLModel, table=True):
    """Flashcard content, linked to a subject.

    Mirrors the `flashcards` table.
    """

    __tablename__ = "flashcards"

    id: str = Field(primary_key=True, max_length=255)
    subject_id: str = Field(
        foreign_key="subjects.id",
        sa_column_kwargs={"nullable": False},
        max_length=255,
    )
    question: str = Field(sa_column_kwargs={"nullable": False})
    answer: str = Field(sa_column_kwargs={"nullable": False})
    acceptable_answers: Optional[list] = Field(default=None, sa_column=Column(JSONB))
    difficulty: str = Field(
        sa_column_kwargs={
            "nullable": False,
        },
        max_length=50,
    )


class Chore(SQLModel, table=True):
    """Chore templates for the Chores screen.

    Mirrors the `chores` table.
    """

    __tablename__ = "chores"

    id: str = Field(primary_key=True, max_length=255)
    label: str = Field(sa_column_kwargs={"nullable": False}, max_length=255)
    icon: str = Field(sa_column_kwargs={"nullable": False}, max_length=255)
    is_extra: bool = Field(default=False, sa_column_kwargs={"nullable": False})


class OutdoorActivity(SQLModel, table=True):
    """Outdoor activity options for the Outdoor screen.

    Mirrors the `outdoor_activities` table.
    """

    __tablename__ = "outdoor_activities"

    id: str = Field(primary_key=True, max_length=255)
    name: str = Field(sa_column_kwargs={"nullable": False}, max_length=255)
    category: str = Field(sa_column_kwargs={"nullable": False}, max_length=255)
    icon: str = Field(sa_column_kwargs={"nullable": False}, max_length=255)
    time: str = Field(sa_column_kwargs={"nullable": False}, max_length=255)
    points: int = Field(sa_column_kwargs={"nullable": False})
    is_daily: bool = Field(sa_column_kwargs={"nullable": False})


# ---------- PROJECT MODELS ----------

class ProjectBase(SQLModel):
    name: str = Field(index=True, max_length=200)
    description: Optional[str] = None


class Project(
    ProjectBase,
    TimeStampedMixin,
    SoftDeleteMixin,
    TenantMixin,
    table=True,
):
    id: Optional[int] = Field(default=None, primary_key=True)


class ProjectCreate(ProjectBase, TenantMixin):
    """
    Request model for creating a project.
    `tenant_id` may be omitted and will be derived from the token.
    """
    pass


class ProjectRead(ProjectBase, TimeStampedMixin, TenantMixin):
    """
    Response model for reading a project.
    """
    id: int
    is_deleted: bool
    deleted_at: Optional[datetime]


class ProjectUpdate(SQLModel):
    """
    Partial update model.
    """
    name: Optional[str] = None
    description: Optional[str] = None