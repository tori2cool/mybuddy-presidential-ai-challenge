import { Flashcard, SubjectId, DifficultyTier } from "@/types/models";
import { apiFetch, withTimeout } from "./apiClient";

const FLASHCARDS_TIMEOUT_MS = 3000;

const flashcardData: Record<SubjectId, Flashcard[]> = {
  math: [
    { id: "m1", question: "What is 7 + 5?", answer: "12", acceptableAnswers: ["12", "twelve"], difficulty: "easy" },
    { id: "m2", question: "What is 8 + 6?", answer: "14", acceptableAnswers: ["14", "fourteen"], difficulty: "easy" },
    { id: "m3", question: "What is 15 - 9?", answer: "6", acceptableAnswers: ["6", "six"], difficulty: "easy" },
    { id: "m4", question: "What is 4 + 9?", answer: "13", acceptableAnswers: ["13", "thirteen"], difficulty: "easy" },
    { id: "m5", question: "What is 20 - 8?", answer: "12", acceptableAnswers: ["12", "twelve"], difficulty: "easy" },
    { id: "m6", question: "What is 3 x 4?", answer: "12", acceptableAnswers: ["12", "twelve"], difficulty: "easy" },
    { id: "m7", question: "What is 5 x 2?", answer: "10", acceptableAnswers: ["10", "ten"], difficulty: "easy" },
    { id: "m8", question: "What is 16 / 4?", answer: "4", acceptableAnswers: ["4", "four"], difficulty: "easy" },
    { id: "m9", question: "What is 18 / 2?", answer: "9", acceptableAnswers: ["9", "nine"], difficulty: "easy" },
    { id: "m10", question: "What is 25 - 11?", answer: "14", acceptableAnswers: ["14", "fourteen"], difficulty: "easy" },
  ],
  science: [
    { id: "s1", question: "What planet is known as the Red Planet?", answer: "Mars", acceptableAnswers: ["mars"], difficulty: "easy" },
    { id: "s2", question: "How many legs does a spider have?", answer: "8", acceptableAnswers: ["8", "eight"], difficulty: "easy" },
    { id: "s3", question: "What gas do we breathe in?", answer: "Oxygen", acceptableAnswers: ["oxygen", "o2"], difficulty: "easy" },
    { id: "s4", question: "What is the closest star to Earth?", answer: "The Sun", acceptableAnswers: ["sun", "the sun"], difficulty: "easy" },
    { id: "s5", question: "How many planets are in our solar system?", answer: "8", acceptableAnswers: ["8", "eight"], difficulty: "easy" },
    { id: "s6", question: "What animal is known as the King of the Jungle?", answer: "Lion", acceptableAnswers: ["lion", "a lion"], difficulty: "easy" },
    { id: "s7", question: "What is water made of?", answer: "Hydrogen and Oxygen", acceptableAnswers: ["hydrogen and oxygen", "h2o", "water"], difficulty: "easy" },
    { id: "s8", question: "What do bees make?", answer: "Honey", acceptableAnswers: ["honey"], difficulty: "easy" },
    { id: "s9", question: "What is the largest mammal?", answer: "Blue Whale", acceptableAnswers: ["blue whale", "whale"], difficulty: "easy" },
    { id: "s10", question: "How many bones are in the human body?", answer: "206", acceptableAnswers: ["206", "two hundred six"], difficulty: "easy" },
  ],
  reading: [
    { id: "r1", question: "What punctuation mark ends a question?", answer: "Question mark", acceptableAnswers: ["question mark", "?", "a question mark"], difficulty: "easy" },
    { id: "r2", question: "What do we call words that sound the same but have different meanings?", answer: "Homophones", acceptableAnswers: ["homophones", "homophone"], difficulty: "easy" },
    { id: "r3", question: "What is the opposite of a synonym?", answer: "Antonym", acceptableAnswers: ["antonym", "an antonym"], difficulty: "easy" },
    { id: "r4", question: "What do we call a word that describes a noun?", answer: "Adjective", acceptableAnswers: ["adjective", "an adjective"], difficulty: "easy" },
    { id: "r5", question: "What punctuation mark shows excitement?", answer: "Exclamation mark", acceptableAnswers: ["exclamation mark", "exclamation point", "!"], difficulty: "easy" },
    { id: "r6", question: "How many letters are in the alphabet?", answer: "26", acceptableAnswers: ["26", "twenty six", "twenty-six"], difficulty: "easy" },
    { id: "r7", question: "What do we call a story that is not true?", answer: "Fiction", acceptableAnswers: ["fiction", "a fiction"], difficulty: "easy" },
    { id: "r8", question: "What are the five vowels?", answer: "A, E, I, O, U", acceptableAnswers: ["a e i o u", "aeiou", "a, e, i, o, u"], difficulty: "easy" },
    { id: "r9", question: "What do we call a word that shows action?", answer: "Verb", acceptableAnswers: ["verb", "a verb"], difficulty: "easy" },
    { id: "r10", question: "What is the name for the main character in a story?", answer: "Protagonist", acceptableAnswers: ["protagonist", "the protagonist", "main character"], difficulty: "easy" },
  ],
  history: [
    { id: "h1", question: "Who was the first President of the United States?", answer: "George Washington", acceptableAnswers: ["george washington", "washington"], difficulty: "easy" },
    { id: "h2", question: "What ancient wonder was built in Egypt?", answer: "The Pyramids", acceptableAnswers: ["pyramids", "the pyramids", "great pyramids"], difficulty: "easy" },
    { id: "h3", question: "What is the name of the ship the Pilgrims sailed on?", answer: "The Mayflower", acceptableAnswers: ["mayflower", "the mayflower"], difficulty: "easy" },
    { id: "h4", question: "In what year did Columbus sail to America?", answer: "1492", acceptableAnswers: ["1492"], difficulty: "easy" },
    { id: "h5", question: "What holiday celebrates America's independence?", answer: "Fourth of July", acceptableAnswers: ["fourth of july", "july 4th", "july fourth", "independence day"], difficulty: "easy" },
    { id: "h6", question: "Who invented the light bulb?", answer: "Thomas Edison", acceptableAnswers: ["thomas edison", "edison"], difficulty: "easy" },
    { id: "h7", question: "What country gave the Statue of Liberty to America?", answer: "France", acceptableAnswers: ["france"], difficulty: "easy" },
    { id: "h8", question: "What ocean did the Titanic sink in?", answer: "Atlantic Ocean", acceptableAnswers: ["atlantic", "the atlantic", "atlantic ocean"], difficulty: "easy" },
    { id: "h9", question: "Who was known for saying 'I have a dream'?", answer: "Martin Luther King Jr.", acceptableAnswers: ["martin luther king", "mlk", "martin luther king jr", "dr king"], difficulty: "easy" },
    { id: "h10", question: "What did the ancient Romans speak?", answer: "Latin", acceptableAnswers: ["latin"], difficulty: "easy" },
  ],
};

export async function getFlashcards(
  subjectId: SubjectId,
  difficulty: DifficultyTier,
  childId: string | null,
): Promise<Flashcard[]> {
  if (!childId) {
    console.warn("getFlashcards: missing childId; falling back to static data.", {
      subjectId,
      difficulty,
    });
    const subjectCards = flashcardData[subjectId] || [];
    return subjectCards.filter((card) => card.difficulty === difficulty);
  }
  try {
    const data = await withTimeout(
      apiFetch<Flashcard[]>("/flashcards", {
        query: {
          subjectId,
          difficulty,
          childId,
        },
      }),
      FLASHCARDS_TIMEOUT_MS,
    );

    if (!Array.isArray(data) || data.length === 0) {
      console.warn(
        "getFlashcards: API returned empty/non-array; falling back to static data.",
        {
          childId,
          subjectId,
          difficulty,
          receivedType: Array.isArray(data) ? "array" : typeof data,
        },
      );
      const subjectCards = flashcardData[subjectId] || [];
      return subjectCards.filter((card) => card.difficulty === difficulty);
    }

    return data;
  } catch (err) {
    console.warn("getFlashcards: falling back to static data:", err);
    const subjectCards = flashcardData[subjectId] || [];
    return subjectCards.filter((card) => card.difficulty === difficulty);
  }
}