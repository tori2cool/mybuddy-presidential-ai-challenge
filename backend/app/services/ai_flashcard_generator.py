import json
from openai import AsyncOpenAI
from ..config import settings


class FlashcardGenerator:
    """Generates flashcards using OpenAI API."""
    
    def __init__(self):
        self.client = AsyncOpenAI(
            api_key=settings.flashcard_api_key,
            base_url=settings.flashcard_api_base,
        )
        self.model = settings.flashcard_model
    
    async def generate_flashcards(
        self,
        subject: str,
        age_range: str,
        difficulty: str,
        interests: list[str],
        count: int = 10,
    ) -> list[dict]:
        """
        Generate flashcards using AI.
        
        Returns list of dicts with:
        - question: str
        - answer: str
        - acceptable_answers: list[str]
        """
        prompt = self._build_prompt(subject, age_range, difficulty, interests, count)
        
        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "system", 
                        "content": "You are an expert educational content creator. Create engaging, age-appropriate flashcard questions."
                    },
                    {
                        "role": "user", 
                        "content": prompt
                    },
                ],
                response_format={"type": "json_object"},
                temperature=0.7,
            )
            
            result = response.choices[0].message.content
            return self._parse_result(result)
        except Exception as e:
            print(f"[AI Flashcard Generator] Error generating flashcards: {e}")
            # Return fallback flashcards if AI fails
            return self._generate_fallback_flashcards(subject, age_range, difficulty, interests, count)
    
    def _build_prompt(self, subject: str, age_range: str, difficulty: str, interests: list[str], count: int) -> str:
        """Build the AI prompt for flashcard generation."""
        interests_str = ", ".join(interests) if interests else "general educational topics"
        
        # Difficulty-specific guidance
        difficulty_guidance = {
            "easy": "simple, straightforward questions with clear answers",
            "medium": "moderately challenging questions requiring some thought",
            "hard": "complex questions that require critical thinking and deeper understanding"
        }
        
        guidance = difficulty_guidance.get(difficulty, "appropriately challenging questions")
        
        return f"""Generate {count} flashcards for a {age_range} age group.

Subject: {subject}
Difficulty: {difficulty}
Child's interests: {interests_str}

Requirements:
- Questions should be {guidance}
- Include examples and references to the child's interests where possible
- Answers should be concise and age-appropriate
- Provide 2-3 acceptable variations of the answer (synonyms, spellings, etc.)
- Make questions engaging and fun
- Avoid overly complex language

Return JSON in this format:
{{
  "flashcards": [
    {{
      "question": "What is 5 + 3?",
      "answer": "8",
      "acceptable_answers": ["8", "eight"]
    }}
  ]
}}"""
    
    def _parse_result(self, result: str) -> list[dict]:
        """Parse AI response into structured data."""
        try:
            data = json.loads(result)
            return data.get("flashcards", [])
        except json.JSONDecodeError as e:
            print(f"[AI Flashcard Generator] Failed to parse AI response: {e}")
            print(f"[AI Flashcard Generator] Response was: {result}")
            return []
    
    def _generate_fallback_flashcards(
        self,
        subject: str,
        age_range: str,
        difficulty: str,
        interests: list[str],
        count: int,
    ) -> list[dict]:
        """Generate simple fallback flashcards if AI fails."""
        fallbacks = []
        interests_str = ", ".join(interests) if interests else "general topics"
        
        for i in range(count):
            fallbacks.append({
                "question": f"[FALLBACK] {subject} question for {age_range} ({difficulty}) about {interests_str} #{i+1}",
                "answer": "answer",
                "acceptable_answers": ["answer"]
            })
        
        print(f"[AI Flashcard Generator] Generated {len(fallbacks)} fallback flashcards")
        return fallbacks
