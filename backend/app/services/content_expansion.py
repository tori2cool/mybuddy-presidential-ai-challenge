from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import uuid4
from ..models import Flashcard, Subject, AgeRange, ChildFlashcardPerformance, Child
from ..config import settings


async def should_expand_content(
    session: AsyncSession,
    child_id: str,
    flashcard_id: str,
    threshold: int = 2,
) -> bool:
    """
    Check if a child has answered a flashcard correctly threshold times.
    If so, we should expand content for this subject/age/difficulty combination.
    """
    perf_stmt = select(ChildFlashcardPerformance).where(
        ChildFlashcardPerformance.child_id == child_id,
        ChildFlashcardPerformance.flashcard_id == flashcard_id,
    )
    perf = (await session.execute(perf_stmt)).scalar_one_or_none()
    
    if perf and perf.correct_count >= threshold:
        return True
    return False


async def get_flashcard_context_with_interests(
    session: AsyncSession,
    flashcard_id: str,
    child_id: str,
) -> dict:
    """
    Get the subject, age_range, difficulty, and child's interests for flashcard generation.
    """
    flashcard_stmt = select(Flashcard).where(Flashcard.slug == flashcard_id)
    flashcard = (await session.execute(flashcard_stmt)).scalar_one_or_none()
    
    if not flashcard:
        raise ValueError(f"Flashcard {flashcard_id} not found")
    
    child_stmt = select(Child).where(Child.id == child_id)
    child = (await session.execute(child_stmt)).scalar_one_or_none()
    
    interests = []
    if child and child.interests:
        interests = child.interests
    
    return {
        "subject_id": flashcard.subject_id,
        "age_range_id": flashcard.age_range_id,
        "difficulty": flashcard.difficulty,
        "interests": interests,
    }


async def seed_new_flashcards(
    session: AsyncSession,
    subject_id: str,
    age_range_id: str,
    difficulty: str,
    interests: list[str],
    count: int = 10,
) -> list[str]:
    """
    Generate and insert new flashcards for the given context using AI.
    Returns list of new flashcard slugs.
    """
    from ..services.ai_flashcard_generator import FlashcardGenerator
    
    # Get context info
    subject_stmt = select(Subject).where(Subject.id == subject_id)
    subject = (await session.execute(subject_stmt)).scalar_one_or_none()
    subject_name = subject.name if subject else subject_id
    
    age_stmt = select(AgeRange).where(AgeRange.id == age_range_id)
    age_range = (await session.execute(age_stmt)).scalar_one_or_none()
    age_name = age_range.name if age_range else age_range_id
    
    # Generate flashcards using AI
    print(f"[Content Expansion] Generating {count} flashcards for {subject_name}/{age_name}/{difficulty} using AI...")
    
    generator = FlashcardGenerator()
    flashcard_data = await generator.generate_flashcards(
        subject=subject_name,
        age_range=age_name,
        difficulty=difficulty,
        interests=interests,
        count=count,
    )
    
    if not flashcard_data:
        print(f"[Content Expansion] No flashcards generated, skipping insertion")
        return []
    
    # Insert into database
    new_flashcards = []
    for card in flashcard_data:
        # Let database auto-generate ID
        new_flashcard = Flashcard(
            subject_id=subject_id,
            question=card["question"],
            answer=card["answer"],
            acceptable_answers=card["acceptable_answers"],
            difficulty=difficulty,
            age_range_id=age_range_id,
            slug=str(uuid4()),
        )
        session.add(new_flashcard)
        new_flashcards.append(new_flashcard)
    
    print(f"[Content Expansion] Inserted {len(new_flashcards)} new flashcards")
    await session.flush()
    
    # Return the slugs (primary public identifiers)
    return [fc.slug for fc in new_flashcards]


async def check_auto_flashcard_limit(
    session: AsyncSession,
    subject_id: str,
    age_range_id: str,
    difficulty: str,
) -> tuple[int, bool]:
    """
    Check how many flashcards exist for this context.
    Returns (count, should_expand) where should_expand is True if count < max_auto_flashcards.
    """
    existing_cards = await session.execute(
        select(func.count(Flashcard.id)).where(
            Flashcard.subject_id == subject_id,
            Flashcard.age_range_id == age_range_id,
            Flashcard.difficulty == difficulty,
        )
    )
    total_count = existing_cards.scalar_one() or 0
    
    should_expand = total_count < settings.max_auto_flashcards
    return total_count, should_expand
