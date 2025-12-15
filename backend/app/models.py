# app/models.py
from __future__ import annotations

from datetime import datetime, date
from typing import Optional, List
from sqlalchemy import Column
from sqlalchemy.dialects.postgresql import JSONB
from sqlmodel import Field, SQLModel

# ---------- MIXINS ----------

class TimeStampedMixin(SQLModel):
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(
        default_factory=datetime.utcnow,
        sa_column_kwargs={"onupdate": datetime.utcnow},
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

# ---------- MYBUDDY CONTENT MODELS ----------
# See mybuddyai/docs/DATABASE_SCHEMA.md for the canonical schema.

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
    birthday: Optional[date] = None
    interests: list[str] = Field(
        default_factory=list,
        sa_column=Column(JSONB, nullable=False),
    )
    avatar: Optional[str] = Field(default=None, max_length=255)

    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(
        default_factory=datetime.utcnow,
        sa_column_kwargs={"onupdate": datetime.utcnow},
    )

class Affirmation(SQLModel, table=True):
    """Static affirmation content.

    Mirrors the `affirmations` table.
    """

    __tablename__ = "affirmations"

    id: str = Field(primary_key=True, max_length=255)
    text: str = Field(sa_column_kwargs={"nullable": False})
    gradient_0: str = Field(sa_column_kwargs={"nullable": False}, max_length=255)
    gradient_1: str = Field(sa_column_kwargs={"nullable": False}, max_length=255)


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
    acceptable_answers: list[str] = Field(
        default_factory=list,
        sa_column=Column(JSONB, nullable=False),
    )
    difficulty: str = Field(
        sa_column_kwargs={
            "nullable": False,
            # Application-level code should restrict this to
            # ("easy", "medium", "hard"). A DB-level CHECK constraint can be
            # added in migrations when Alembic is introduced.
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