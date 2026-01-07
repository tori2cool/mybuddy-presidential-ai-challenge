"""Age utility functions for content personalization."""

from datetime import date
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from ..models import AgeRange, Child


def calculate_age(birthday: date) -> int:
    """
    Calculate age in years from birthday.

    Args:
        birthday: The child's birthday

    Returns:
        Age in years (minimum 3 for personalization purposes)
    """
    today = date.today()
    age = today.year - birthday.year - ((today.month, today.day) < (birthday.month, birthday.day))

    # Treat ages under 3 as age 3 for personalization
    return max(age, 3)


async def get_age_range_for_age(age: int, db: AsyncSession) -> Optional[AgeRange]:
    """
    Look up the matching age range for a given age.

    Args:
        age: Age in years
        db: AsyncSession for database access

    Returns:
        Matching AgeRange or None if not found
    """
    stmt = select(AgeRange).where(
        AgeRange.min_age <= age,
        (AgeRange.max_age == None) | (AgeRange.max_age >= age),
        AgeRange.is_active == True
    )
    result = await db.execute(stmt)
    return result.scalars().first()


async def get_age_range_for_child(child: Child, db: AsyncSession) -> Optional[AgeRange]:
    """
    Get the age range for a child.

    Args:
        child: Child object
        db: AsyncSession for database access

    Returns:
        Matching AgeRange or None if not found
    """
    age = calculate_age(child.birthday)
    return await get_age_range_for_age(age, db)
