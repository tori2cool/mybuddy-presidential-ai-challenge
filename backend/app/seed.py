"""
Seed all progress-related data (UUID-first, no legacy `key` fields).

Seeds:
- avatars
- interests
- age ranges
- subjects
- subject<->age-range mappings
- level thresholds
- difficulty thresholds
- points values
- achievements
- affirmations
- chores
- outdoor activities

Run (inside container or venv):
    alembic upgrade head
    python -m app.seed
"""

from __future__ import annotations

import json
import logging
import re
import unicodedata
from pathlib import Path
from typing import Any

from sqlalchemy import select, text
from sqlalchemy.dialects.postgresql import insert

from app.db import get_engine

logger = logging.getLogger(__name__)

from app.models import (
    AgeRange,
    Affirmation,
    AchievementDefinition,
    Avatar,
    Chore,
    DifficultyThreshold,
    Interest,
    LevelThreshold,
    OutdoorActivity,
    PointsValue,
    Subject,
    SubjectAgeRange,
)

# ---------------------------------------------------------------------------
# Ensure we only seed data once
# ---------------------------------------------------------------------------


async def db_looks_empty(conn) -> bool:
    """
    Return True only if the DB appears empty (no seeded baseline data).

    Uses `subjects` as an anchor table (it's part of baseline seed).

    Robustness requirements:
    - If the table doesn't exist yet (e.g., very early startup), treat as empty.
    - If the check query fails for any reason, log and treat as empty.
    """
    try:
        # Use EXISTS for a cheap emptiness probe.
        exists_row = await conn.scalar(text("SELECT EXISTS (SELECT 1 FROM subjects LIMIT 1)"))
        return not bool(exists_row)
    except Exception as exc:  # missing table / permissions / etc
        logger.info("Seed emptiness check failed; treating DB as empty and continuing.")
        logger.debug("Seed emptiness check exception", exc_info=exc)
        return True


# ---------------------------------------------------------------------------
# Small helpers
# ---------------------------------------------------------------------------

_slug_re = re.compile(r"[^a-z0-9]+")
_dash_re = re.compile(r"-{2,}")


def slugify(text_: str, *, max_len: int = 80, fallback: str = "item") -> str:
    """
    Stable "code" generator:
    - NFKD normalize, drop accents
    - lowercase
    - non [a-z0-9] -> '-'
    - collapse/trim dashes
    """
    s = (text_ or "").strip()
    s = unicodedata.normalize("NFKD", s)
    s = "".join(ch for ch in s if not unicodedata.combining(ch))
    s = s.lower()
    s = _slug_re.sub("-", s).strip("-")
    s = _dash_re.sub("-", s)
    if not s:
        s = fallback
    return s[:max_len].rstrip("-")


def age_range_code(min_age: int, max_age: int | None) -> str:
    # stable, readable codes
    if max_age is None:
        return f"age_{min_age}_plus"
    return f"age_{min_age}_{max_age}"


async def _seed_bulk(
    conn,
    model,
    rows: list[dict[str, Any]],
    label: str,
    *,
    conflict_cols: list[str],
) -> None:
    """Idempotent insert (ON CONFLICT DO NOTHING)."""
    if not rows:
        print(f"{label}: no seed rows provided. Skipping.")
        return

    stmt = insert(model).values(rows).on_conflict_do_nothing(index_elements=conflict_cols)
    await conn.execute(stmt)
    print(f"{label}: ensured {len(rows)} rows.")


async def _fetch_map(conn, model, key_col, val_col) -> dict[Any, Any]:
    rows = (await conn.execute(select(key_col, val_col))).all()
    return {k: v for (k, v) in rows}


# ---------------------------------------------------------------------------
# Load seed JSON from app/seed_data
# ---------------------------------------------------------------------------

# This resolves to: backend/app/seed_data if this file lives at backend/app/seed.py
SEED_DATA_DIR = Path(__file__).resolve().parent / "seed_data"


def _load_json_list(path: Path, *, label: str) -> list[dict[str, Any]]:
    if not path.exists():
        raise FileNotFoundError(f"Missing seed file: {path} ({label})")
    with path.open("r", encoding="utf-8") as f:
        data = json.load(f)
    if not isinstance(data, list):
        raise ValueError(f"{path} must contain a JSON list for {label}")
    # ensure dict items
    for i, item in enumerate(data):
        if not isinstance(item, dict):
            raise ValueError(f"{path} item[{i}] must be an object (dict) for {label}")
    return data  # type: ignore[return-value]


def _load_optional_json_list(path: Path, *, label: str) -> list[dict[str, Any]]:
    if not path.exists():
        logger.warning("Optional seed file missing (%s): %s", label, path)
        return []
    return _load_json_list(path, label=label)


# ---------------------------------------------------------------------------
# Seed data (loaded from JSON files)
# ---------------------------------------------------------------------------

# ========== AVATARS ==========
AVATARS_SEED = _load_json_list(SEED_DATA_DIR / "avatars.json", label="avatars")

# ========== INTERESTS ==========
INTERESTS_SEED = _load_json_list(SEED_DATA_DIR / "interests.json", label="interests")

# ========== AGE RANGES ==========
AGE_RANGES_SEED = _load_json_list(SEED_DATA_DIR / "age_ranges.json", label="age_ranges")

# ========== SUBJECTS ==========
SUBJECTS_SEED = _load_json_list(SEED_DATA_DIR / "subjects.json", label="subjects")

# ========== SUBJECT_AGE_RANGES ==========
SUBJECT_AGE_RANGES_SEED = _load_json_list(SEED_DATA_DIR / "subject_age_ranges.json", label="subject_age_ranges")

# ========== LEVEL THRESHOLDS ==========
LEVEL_THRESHOLDS_SEED = _load_json_list(SEED_DATA_DIR / "level_thresholds.json", label="level_thresholds")

# ========== DIFFICULTY THRESHOLDS ==========
DIFFICULTY_THRESHOLDS_SEED = _load_json_list(SEED_DATA_DIR / "difficulty_thresholds.json", label="difficulty_thresholds")

# ========== POINTS VALUES ==========
# model requires: code + name (both unique) + points
POINTS_VALUES_SEED = _load_json_list(SEED_DATA_DIR / "points_values.json", label="points_values")

# ========== ACHIEVEMENTS ==========
# model requires: code + title (etc)
ACHIEVEMENTS_SEED = _load_json_list(SEED_DATA_DIR / "achievements.json", label="achievements")

# ========== AFFIRMATIONS ==========
AFFIRMATIONS_SEED = _load_json_list(SEED_DATA_DIR / "affirmations.json", label="affirmations")

# ========== CHORES ==========
CHORES_SEED = _load_json_list(SEED_DATA_DIR / "chores.json", label="chores")

# ========== OUTDOOR ACTIVITIES ==========
OUTDOOR_ACTIVITIES_SEED = _load_json_list(SEED_DATA_DIR / "outdoor_activities.json", label="outdoor_activities")


# ---------------------------------------------------------------------------
# Relationship seeding
# ---------------------------------------------------------------------------


async def seed_subject_age_ranges(
    conn,
    subject_name_to_id: dict[str, Any],
    age_range_name_to_id: dict[str, Any],
) -> None:
    rows: list[dict[str, Any]] = []
    for entry in SUBJECT_AGE_RANGES_SEED:
        sid = subject_name_to_id.get(entry["subject_name"])
        aid = age_range_name_to_id.get(entry["age_range"])
        if not sid or not aid:
            print(f"  [SubjectAgeRange] Skipping invalid entry: {entry}")
            continue
        rows.append({"subject_id": sid, "age_range_id": aid})

    if not rows:
        print("  [SubjectAgeRange] No rows to seed.")
        return

    # This table has a composite PK (subject_id, age_range_id), so ON CONFLICT is valid.
    stmt = insert(SubjectAgeRange).values(rows).on_conflict_do_nothing()
    await conn.execute(stmt)
    print(f"  [SubjectAgeRange] Seeded {len(rows)} subject-age range mappings")


# ---------------------------------------------------------------------------
# Main seed
# ---------------------------------------------------------------------------


async def seed() -> None:
    logger.info("Seeding progress data...")

    engine = get_engine()
    async with engine.begin() as conn:
        if not await db_looks_empty(conn):
            logger.info("Seed skipped (database not empty)")
            return

        # --- Avatars ---
        avatars = [{**row, "is_active": True} for row in AVATARS_SEED]
        await _seed_bulk(conn, Avatar, avatars, "Avatars", conflict_cols=["name"])

        # --- Interests ---
        interests = [{**row, "is_active": True} for row in INTERESTS_SEED]
        await _seed_bulk(conn, Interest, interests, "Interests", conflict_cols=["name"])

        # --- Age ranges ---
        age_ranges_rows = []
        for row in AGE_RANGES_SEED:
            age_ranges_rows.append(
                {
                    "code": age_range_code(row["min_age"], row["max_age"]),
                    "name": row["name"],
                    "min_age": row["min_age"],
                    "max_age": row["max_age"],
                    "is_active": True,
                }
            )
        await _seed_bulk(conn, AgeRange, age_ranges_rows, "Age ranges", conflict_cols=["code"])

        # Build age range maps
        age_range_name_to_id = await _fetch_map(conn, AgeRange, AgeRange.name, AgeRange.id)
        age_range_code_to_id = await _fetch_map(conn, AgeRange, AgeRange.code, AgeRange.id)

        # --- Subjects ---
        subject_rows = []
        for row in SUBJECTS_SEED:
            subject_rows.append(
                {
                    "code": slugify(row["name"], max_len=50, fallback="subject"),
                    "name": row["name"],
                    "icon": row["icon"],
                    "color": row["color"],
                }
            )
        await _seed_bulk(conn, Subject, subject_rows, "Subjects", conflict_cols=["code"])

        # Build subject maps
        subject_name_to_id = await _fetch_map(conn, Subject, Subject.name, Subject.id)
        subject_code_to_id = await _fetch_map(conn, Subject, Subject.code, Subject.id)

        # --- Subject <-> AgeRange M2M ---
        await seed_subject_age_ranges(conn, subject_name_to_id, age_range_name_to_id)

        # --- Level thresholds ---
        level_rows = [{**row, "is_active": True} for row in LEVEL_THRESHOLDS_SEED]
        await _seed_bulk(conn, LevelThreshold, level_rows, "Level thresholds", conflict_cols=["name"])

        # --- Difficulty thresholds ---
        diff_rows = [{**row, "is_active": True} for row in DIFFICULTY_THRESHOLDS_SEED]
        await _seed_bulk(conn, DifficultyThreshold, diff_rows, "Difficulty thresholds", conflict_cols=["code"])

        # --- Points values ---
        points_rows = [{**row, "is_active": True} for row in POINTS_VALUES_SEED]
        await _seed_bulk(conn, PointsValue, points_rows, "Points values", conflict_cols=["code"])

        # --- Achievements ---
        ach_rows = []
        for row in ACHIEVEMENTS_SEED:
            ach_rows.append(
                {
                    "code": slugify(row["title"], max_len=100, fallback="achievement"),
                    "title": row["title"],
                    "description": row["description"],
                    "icon": row["icon"],
                    "achievement_type": row.get("achievement_type") or "special",
                    "points_threshold": row.get("points_threshold"),
                    "streak_days_threshold": row.get("streak_days_threshold"),
                    "flashcards_count_threshold": row.get("flashcards_count_threshold"),
                    "chores_count_threshold": row.get("chores_count_threshold"),
                    "outdoor_count_threshold": row.get("outdoor_count_threshold"),
                    "is_active": True,
                }
            )
        await _seed_bulk(conn, AchievementDefinition, ach_rows, "Achievements", conflict_cols=["code"])

        # --- Affirmations (NO ON CONFLICT) ---
        aff_rows: list[dict[str, Any]] = []
        for aff in AFFIRMATIONS_SEED:
            aid = age_range_name_to_id.get(aff["age_range"])
            if not aid:
                print(f"Warning: Skipping affirmation with unknown age_range '{aff.get('age_range')}'")
                continue
            aff_rows.append(
                {
                    "text": aff["text"],
                    "image": aff.get("image"),
                    "gradient_0": aff["gradient_0"],
                    "gradient_1": aff["gradient_1"],
                    "tags": aff.get("tags"),
                    "age_range_id": aid,
                }
            )

        if aff_rows:
            await conn.execute(insert(Affirmation).values(aff_rows))
            print(f"Affirmations: inserted {len(aff_rows)} rows.")
        else:
            print("Affirmations: no seed rows provided. Skipping.")

        # --- Chores (NO ON CONFLICT) ---
        chore_rows: list[dict[str, Any]] = []
        for chore in CHORES_SEED:
            aid = age_range_name_to_id.get(chore["age_range"])
            if not aid:
                print(f"Warning: Skipping chore with unknown age_range '{chore.get('age_range')}'")
                continue
            chore_rows.append(
                {
                    "label": chore["label"],
                    "icon": chore["icon"],
                    "is_extra": chore["is_extra"],
                    "tags": chore.get("tags"),
                    "age_range_id": aid,
                }
            )

        if chore_rows:
            await conn.execute(insert(Chore).values(chore_rows))
            print(f"Chores: inserted {len(chore_rows)} rows.")
        else:
            print("Chores: no seed rows provided. Skipping.")

        # --- Outdoor activities (NO ON CONFLICT) ---
        outdoor_rows: list[dict[str, Any]] = []
        for outdoor in OUTDOOR_ACTIVITIES_SEED:
            aid = age_range_name_to_id.get(outdoor["age_range"])
            if not aid:
                print(f"Warning: Skipping outdoor activity with unknown age_range '{outdoor.get('age_range')}'")
                continue
            outdoor_rows.append(
                {
                    "name": outdoor["name"],
                    "category": outdoor["category"],
                    "icon": outdoor["icon"],
                    "time": outdoor["time"],
                    "points": outdoor["points"],
                    "is_daily": outdoor["is_daily"],
                    "tags": outdoor.get("tags"),
                    "age_range_id": aid,
                }
            )

        if outdoor_rows:
            await conn.execute(insert(OutdoorActivity).values(outdoor_rows))
            print(f"Outdoor activities: inserted {len(outdoor_rows)} rows.")
        else:
            print("Outdoor activities: no seed rows provided. Skipping.")

    logger.info("Done!")


if __name__ == "__main__":
    import asyncio

    asyncio.run(seed())
