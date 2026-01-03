import { Flashcard, SubjectId, DifficultyTier } from "@/types/models";
import { apiFetch, withTimeout } from "./apiClient";
import { USE_AI_BACKEND } from "@/constants/aiConfig";

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
    { id: "m11", question: "What is 8 x 7?", answer: "56", acceptableAnswers: ["56", "fifty six", "fifty-six"], difficulty: "medium" },
    { id: "m12", question: "What is 9 x 9?", answer: "81", acceptableAnswers: ["81", "eighty one", "eighty-one"], difficulty: "medium" },
    { id: "m13", question: "What is 72 / 8?", answer: "9", acceptableAnswers: ["9", "nine"], difficulty: "medium" },
    { id: "m14", question: "What is 15 x 4?", answer: "60", acceptableAnswers: ["60", "sixty"], difficulty: "medium" },
    { id: "m15", question: "What is 144 / 12?", answer: "12", acceptableAnswers: ["12", "twelve"], difficulty: "medium" },
    { id: "m16", question: "If you have 45 apples and give away 18, how many are left?", answer: "27", acceptableAnswers: ["27", "twenty seven", "twenty-seven"], difficulty: "medium" },
    { id: "m17", question: "What is 7 x 8 + 6?", answer: "62", acceptableAnswers: ["62", "sixty two", "sixty-two"], difficulty: "medium" },
    { id: "m18", question: "What is 100 - 37?", answer: "63", acceptableAnswers: ["63", "sixty three", "sixty-three"], difficulty: "medium" },
    { id: "m19", question: "What is 11 x 11?", answer: "121", acceptableAnswers: ["121", "one hundred twenty one"], difficulty: "medium" },
    { id: "m20", question: "What is half of 86?", answer: "43", acceptableAnswers: ["43", "forty three", "forty-three"], difficulty: "medium" },
    { id: "m21", question: "If a book costs $12 and you have $50, how many books can you buy?", answer: "4", acceptableAnswers: ["4", "four"], difficulty: "hard" },
    { id: "m22", question: "What is 25 x 25?", answer: "625", acceptableAnswers: ["625", "six hundred twenty five"], difficulty: "hard" },
    { id: "m23", question: "What is (8 + 12) x 5?", answer: "100", acceptableAnswers: ["100", "one hundred"], difficulty: "hard" },
    { id: "m24", question: "A train travels 60 miles per hour. How far does it go in 3 hours?", answer: "180", acceptableAnswers: ["180", "180 miles", "one hundred eighty", "one hundred eighty miles"], difficulty: "hard" },
    { id: "m25", question: "What is 15% of 200?", answer: "30", acceptableAnswers: ["30", "thirty"], difficulty: "hard" },
    { id: "m26", question: "What is 144 / 6 + 18?", answer: "42", acceptableAnswers: ["42", "forty two", "forty-two"], difficulty: "hard" },
    { id: "m27", question: "If 3 pencils cost $1.50, how much do 10 pencils cost?", answer: "5", acceptableAnswers: ["5", "$5", "$5.00", "five", "five dollars", "5 dollars"], difficulty: "hard" },
    { id: "m28", question: "What is the area of a rectangle with length 8 and width 6?", answer: "48", acceptableAnswers: ["48", "forty eight", "forty-eight"], difficulty: "hard" },
    { id: "m29", question: "What is 999 + 111?", answer: "1110", acceptableAnswers: ["1110", "one thousand one hundred ten"], difficulty: "hard" },
    { id: "m30", question: "What number times itself equals 169?", answer: "13", acceptableAnswers: ["13", "thirteen"], difficulty: "hard" },
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
    { id: "s11", question: "What is the largest organ in the human body?", answer: "Skin", acceptableAnswers: ["skin", "the skin"], difficulty: "medium" },
    { id: "s12", question: "What force keeps us on the ground?", answer: "Gravity", acceptableAnswers: ["gravity"], difficulty: "medium" },
    { id: "s13", question: "What is the process plants use to make food?", answer: "Photosynthesis", acceptableAnswers: ["photosynthesis"], difficulty: "medium" },
    { id: "s14", question: "What is the hardest natural substance on Earth?", answer: "Diamond", acceptableAnswers: ["diamond", "diamonds"], difficulty: "medium" },
    { id: "s15", question: "What planet has the most moons?", answer: "Saturn", acceptableAnswers: ["saturn"], difficulty: "medium" },
    { id: "s16", question: "What is the chemical symbol for gold?", answer: "Au", acceptableAnswers: ["au"], difficulty: "medium" },
    { id: "s17", question: "What type of animal is a dolphin?", answer: "Mammal", acceptableAnswers: ["mammal", "a mammal"], difficulty: "medium" },
    { id: "s18", question: "What is the center of an atom called?", answer: "Nucleus", acceptableAnswers: ["nucleus", "the nucleus"], difficulty: "medium" },
    { id: "s19", question: "What is the main gas in Earth's atmosphere?", answer: "Nitrogen", acceptableAnswers: ["nitrogen"], difficulty: "medium" },
    { id: "s20", question: "How long does it take Earth to orbit the Sun?", answer: "365 days", acceptableAnswers: ["365 days", "365", "1 year", "one year", "a year"], difficulty: "medium" },
    { id: "s21", question: "What are the three states of matter?", answer: "Solid, Liquid, Gas", acceptableAnswers: ["solid liquid gas", "solid, liquid, gas", "solid liquid and gas"], difficulty: "hard" },
    { id: "s22", question: "What is the speed of light in miles per second?", answer: "186,000", acceptableAnswers: ["186000", "186,000", "186000 miles"], difficulty: "hard" },
    { id: "s23", question: "What part of the cell contains genetic information?", answer: "Nucleus", acceptableAnswers: ["nucleus", "the nucleus", "dna"], difficulty: "hard" },
    { id: "s24", question: "What causes the tides on Earth?", answer: "The Moon's gravity", acceptableAnswers: ["moon", "the moon", "moon's gravity", "gravity of the moon"], difficulty: "hard" },
    { id: "s25", question: "What is Newton's First Law also known as?", answer: "Law of Inertia", acceptableAnswers: ["law of inertia", "inertia"], difficulty: "hard" },
    { id: "s26", question: "What is the boiling point of water in Fahrenheit?", answer: "212", acceptableAnswers: ["212", "212 degrees", "212f"], difficulty: "hard" },
    { id: "s27", question: "What type of rock is formed from cooled lava?", answer: "Igneous", acceptableAnswers: ["igneous", "igneous rock"], difficulty: "hard" },
    { id: "s28", question: "What is the unit of electrical resistance?", answer: "Ohm", acceptableAnswers: ["ohm", "ohms"], difficulty: "hard" },
    { id: "s29", question: "What is the chemical formula for table salt?", answer: "NaCl", acceptableAnswers: ["nacl", "sodium chloride"], difficulty: "hard" },
    { id: "s30", question: "What is the function of white blood cells?", answer: "Fight infection", acceptableAnswers: ["fight infection", "fight infections", "protect the body", "immunity", "immune system"], difficulty: "hard" },
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
    { id: "r11", question: "What is a group of sentences about one topic called?", answer: "Paragraph", acceptableAnswers: ["paragraph", "a paragraph"], difficulty: "medium" },
    { id: "r12", question: "What do we call a word that replaces a noun?", answer: "Pronoun", acceptableAnswers: ["pronoun", "a pronoun"], difficulty: "medium" },
    { id: "r13", question: "What is the name for the bad character in a story?", answer: "Antagonist", acceptableAnswers: ["antagonist", "the antagonist", "villain"], difficulty: "medium" },
    { id: "r14", question: "What do we call a comparison using 'like' or 'as'?", answer: "Simile", acceptableAnswers: ["simile", "a simile"], difficulty: "medium" },
    { id: "r15", question: "What is the setting of a story?", answer: "Where and when it takes place", acceptableAnswers: ["where and when", "time and place", "place and time", "location"], difficulty: "medium" },
    { id: "r16", question: "What do we call words with opposite meanings?", answer: "Antonyms", acceptableAnswers: ["antonyms", "antonym"], difficulty: "medium" },
    { id: "r17", question: "What is a biography?", answer: "A story about someone's life", acceptableAnswers: ["story of someone's life", "story about someone's life", "life story", "about someone's life"], difficulty: "medium" },
    { id: "r18", question: "What punctuation separates items in a list?", answer: "Comma", acceptableAnswers: ["comma", "commas", ","], difficulty: "medium" },
    { id: "r19", question: "What is the plural of 'child'?", answer: "Children", acceptableAnswers: ["children"], difficulty: "medium" },
    { id: "r20", question: "What do we call a word that modifies a verb?", answer: "Adverb", acceptableAnswers: ["adverb", "an adverb"], difficulty: "medium" },
    { id: "r21", question: "What is a metaphor?", answer: "A direct comparison without using like or as", acceptableAnswers: ["direct comparison", "comparison without like or as", "comparing things directly"], difficulty: "hard" },
    { id: "r22", question: "What is the theme of a story?", answer: "The main message or lesson", acceptableAnswers: ["main message", "lesson", "moral", "central idea", "main idea"], difficulty: "hard" },
    { id: "r23", question: "What is personification?", answer: "Giving human traits to non-human things", acceptableAnswers: ["giving human traits to things", "making things human", "human traits to objects"], difficulty: "hard" },
    { id: "r24", question: "What is the climax of a story?", answer: "The most exciting part", acceptableAnswers: ["most exciting part", "turning point", "peak", "high point"], difficulty: "hard" },
    { id: "r25", question: "What is alliteration?", answer: "Repeating the same starting sound", acceptableAnswers: ["same starting sound", "repeated sounds", "same beginning sounds"], difficulty: "hard" },
    { id: "r26", question: "What is the difference between 'affect' and 'effect'?", answer: "Affect is a verb, effect is a noun", acceptableAnswers: ["affect is verb effect is noun", "affect verb effect noun"], difficulty: "hard" },
    { id: "r27", question: "What is irony?", answer: "When the opposite of what you expect happens", acceptableAnswers: ["opposite of expected", "unexpected outcome", "opposite of what's expected"], difficulty: "hard" },
    { id: "r28", question: "What is a prefix?", answer: "Letters added to the beginning of a word", acceptableAnswers: ["beginning of word", "letters before word", "added to beginning"], difficulty: "hard" },
    { id: "r29", question: "What is a suffix?", answer: "Letters added to the end of a word", acceptableAnswers: ["end of word", "letters after word", "added to end"], difficulty: "hard" },
    { id: "r30", question: "What is the resolution of a story?", answer: "How the story ends", acceptableAnswers: ["how it ends", "ending", "conclusion", "how the conflict is solved"], difficulty: "hard" },
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
    { id: "h11", question: "What war was fought between the North and South in America?", answer: "Civil War", acceptableAnswers: ["civil war", "the civil war", "american civil war"], difficulty: "medium" },
    { id: "h12", question: "Who wrote the Declaration of Independence?", answer: "Thomas Jefferson", acceptableAnswers: ["thomas jefferson", "jefferson"], difficulty: "medium" },
    { id: "h13", question: "What empire built the Colosseum?", answer: "Roman Empire", acceptableAnswers: ["roman", "roman empire", "romans", "rome"], difficulty: "medium" },
    { id: "h14", question: "What was the name of the first airplane?", answer: "Wright Flyer", acceptableAnswers: ["wright flyer", "flyer", "wright brothers plane"], difficulty: "medium" },
    { id: "h15", question: "Who was the President during the Civil War?", answer: "Abraham Lincoln", acceptableAnswers: ["abraham lincoln", "lincoln", "abe lincoln"], difficulty: "medium" },
    { id: "h16", question: "What ancient civilization built the Parthenon?", answer: "Greeks", acceptableAnswers: ["greeks", "greek", "ancient greece", "greece"], difficulty: "medium" },
    { id: "h17", question: "What year did World War II end?", answer: "1945", acceptableAnswers: ["1945"], difficulty: "medium" },
    { id: "h18", question: "Who was the first person to walk on the moon?", answer: "Neil Armstrong", acceptableAnswers: ["neil armstrong", "armstrong"], difficulty: "medium" },
    { id: "h19", question: "What was the Boston Tea Party protesting?", answer: "Taxes", acceptableAnswers: ["taxes", "taxation", "tax", "british taxes"], difficulty: "medium" },
    { id: "h20", question: "What is the oldest civilization in Mesopotamia?", answer: "Sumer", acceptableAnswers: ["sumer", "sumerian", "sumerians"], difficulty: "medium" },
    { id: "h21", question: "What were the causes of World War I?", answer: "Nationalism, alliances, imperialism", acceptableAnswers: ["nationalism", "alliances", "imperialism", "assassination"], difficulty: "hard" },
    { id: "h22", question: "What was the Renaissance?", answer: "A rebirth of art and learning in Europe", acceptableAnswers: ["rebirth", "rebirth of art", "cultural movement", "rebirth of learning"], difficulty: "hard" },
    { id: "h23", question: "Who was Cleopatra?", answer: "The last pharaoh of Egypt", acceptableAnswers: ["pharaoh", "queen of egypt", "egyptian queen", "last pharaoh"], difficulty: "hard" },
    { id: "h24", question: "What was the Cold War?", answer: "Political tension between USA and USSR", acceptableAnswers: ["tension between usa and ussr", "usa vs soviet union", "america vs russia"], difficulty: "hard" },
    { id: "h25", question: "What did the Magna Carta establish?", answer: "Limits on the king's power", acceptableAnswers: ["limits on king", "rights", "limited monarchy", "rights of people"], difficulty: "hard" },
    { id: "h26", question: "What was the Industrial Revolution?", answer: "Shift from farming to factory work", acceptableAnswers: ["factories", "machines", "manufacturing", "industrial change"], difficulty: "hard" },
    { id: "h27", question: "Who were the Vikings?", answer: "Seafaring Norse people from Scandinavia", acceptableAnswers: ["norse", "scandinavian", "seafarers", "warriors from scandinavia"], difficulty: "hard" },
    { id: "h28", question: "What was the Silk Road?", answer: "Ancient trade route between East and West", acceptableAnswers: ["trade route", "trading route", "route between east and west"], difficulty: "hard" },
    { id: "h29", question: "What caused the fall of the Roman Empire?", answer: "Invasions, economic trouble, and overexpansion", acceptableAnswers: ["invasions", "barbarians", "economic problems", "overexpansion"], difficulty: "hard" },
    { id: "h30", question: "What was the effect of the printing press?", answer: "Spread of knowledge and literacy", acceptableAnswers: ["spread knowledge", "more books", "literacy", "education"], difficulty: "hard" },
  ],
};

export async function getFlashcards(
  subjectId: SubjectId,
  difficulty: DifficultyTier,
  childId: string | null,
): Promise<Flashcard[]> {
  if (USE_AI_BACKEND) {
    try {
      const data = await withTimeout(
        apiFetch<Flashcard[]>("/ai/generate-flashcards", {
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
          "getFlashcards (AI): API returned empty/non-array; falling back to static data.",
          {
            subjectId,
            difficulty,
            childId,
          },
        );
        const subjectCards = flashcardData[subjectId] || [];
        return subjectCards.filter((card) => card.difficulty === difficulty);
      }

      return data;
    } catch (err) {
      console.warn("getFlashcards (AI): API failed, falling back to static data:", err);
      const subjectCards = flashcardData[subjectId] || [];
      return subjectCards.filter((card) => card.difficulty === difficulty);
    }
  }

  // use when USE_AI_BACKEND is false
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