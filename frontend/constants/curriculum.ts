export type GradeLevel = 
  | "preK" | "K" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "10" | "11" | "12";

export type SubjectId = 
  | "math" | "science" | "reading" | "history" | "writing" 
  | "geography" | "music" | "art" | "pe" | "languages" | "coding";

export const GRADE_ORDER: GradeLevel[] = [
  "preK", "K", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"
];

export const LEVELS_PER_GRADE = 10;
export const TOTAL_LEVELS = GRADE_ORDER.length * LEVELS_PER_GRADE;

export interface GradeInfo {
  id: GradeLevel;
  name: string;
  ageRange: string;
  rankTheme: string;
  ranks: string[];
  color: string;
}

export const GRADES: Record<GradeLevel, GradeInfo> = {
  preK: {
    id: "preK",
    name: "Pre-Kindergarten",
    ageRange: "3-4",
    rankTheme: "Little Explorers",
    ranks: ["Tiny Explorer", "Mini Adventurer", "Junior Scout", "Brave Buddy", "Star Scout", "Super Scout", "Trail Leader", "Nature Guide", "Explorer Chief", "Grand Explorer"],
    color: "#EC4899"
  },
  K: {
    id: "K",
    name: "Kindergarten",
    ageRange: "5-6",
    rankTheme: "Animal Friends",
    ranks: ["Little Duckling", "Happy Bunny", "Curious Fox", "Clever Owl", "Brave Bear", "Swift Deer", "Mighty Wolf", "Noble Eagle", "Fierce Lion", "Golden Dragon"],
    color: "#F59E0B"
  },
  1: {
    id: "1",
    name: "1st Grade",
    ageRange: "6-7",
    rankTheme: "Space Cadets",
    ranks: ["Star Gazer", "Space Cadet", "Rocket Pilot", "Asteroid Ace", "Comet Chaser", "Galaxy Scout", "Nebula Navigator", "Solar Ranger", "Cosmic Captain", "Universe Commander"],
    color: "#10B981"
  },
  2: {
    id: "2",
    name: "2nd Grade",
    ageRange: "7-8",
    rankTheme: "Ocean Voyagers",
    ranks: ["Shell Seeker", "Tide Rider", "Wave Watcher", "Coral Explorer", "Reef Ranger", "Deep Diver", "Sea Captain", "Ocean Master", "Trident Holder", "Neptune's Champion"],
    color: "#3B82F6"
  },
  3: {
    id: "3",
    name: "3rd Grade",
    ageRange: "8-9",
    rankTheme: "Knights & Heroes",
    ranks: ["Page", "Squire", "Junior Knight", "Shield Bearer", "Sword Wielder", "Tower Guard", "Castle Defender", "Noble Knight", "Royal Champion", "Kingdom Guardian"],
    color: "#8B5CF6"
  },
  4: {
    id: "4",
    name: "4th Grade",
    ageRange: "9-10",
    rankTheme: "Inventor's Guild",
    ranks: ["Tinkerer", "Builder", "Craftsman", "Inventor", "Engineer", "Architect", "Master Builder", "Innovation Leader", "Tech Wizard", "Genius Mastermind"],
    color: "#EF4444"
  },
  5: {
    id: "5",
    name: "5th Grade",
    ageRange: "10-11",
    rankTheme: "Explorer's League",
    ranks: ["Trail Starter", "Path Finder", "Map Reader", "Compass Bearer", "Terrain Master", "Mountain Climber", "Summit Seeker", "Peak Conqueror", "Expedition Leader", "World Explorer"],
    color: "#14B8A6"
  },
  6: {
    id: "6",
    name: "6th Grade",
    ageRange: "11-12",
    rankTheme: "Junior Army",
    ranks: ["Private", "Private First Class", "Corporal", "Sergeant", "Staff Sergeant", "Sergeant First Class", "Master Sergeant", "First Sergeant", "Sergeant Major", "Command Sergeant Major"],
    color: "#84CC16"
  },
  7: {
    id: "7",
    name: "7th Grade",
    ageRange: "12-13",
    rankTheme: "Navy Crew",
    ranks: ["Seaman Recruit", "Seaman Apprentice", "Seaman", "Petty Officer 3rd", "Petty Officer 2nd", "Petty Officer 1st", "Chief Petty Officer", "Senior Chief", "Master Chief", "Fleet Master Chief"],
    color: "#0EA5E9"
  },
  8: {
    id: "8",
    name: "8th Grade",
    ageRange: "13-14",
    rankTheme: "Air Force Pilots",
    ranks: ["Airman Basic", "Airman", "Airman First Class", "Senior Airman", "Staff Sergeant", "Technical Sergeant", "Master Sergeant", "Senior Master Sergeant", "Chief Master Sergeant", "Command Chief"],
    color: "#6366F1"
  },
  9: {
    id: "9",
    name: "9th Grade",
    ageRange: "14-15",
    rankTheme: "Marine Corps",
    ranks: ["Private", "Private First Class", "Lance Corporal", "Corporal", "Sergeant", "Staff Sergeant", "Gunnery Sergeant", "Master Sergeant", "First Sergeant", "Sergeant Major"],
    color: "#DC2626"
  },
  10: {
    id: "10",
    name: "10th Grade",
    ageRange: "15-16",
    rankTheme: "Officers Academy",
    ranks: ["Officer Cadet", "Second Lieutenant", "First Lieutenant", "Captain", "Major", "Lieutenant Colonel", "Colonel", "Brigadier General", "Major General", "Lieutenant General"],
    color: "#7C3AED"
  },
  11: {
    id: "11",
    name: "11th Grade",
    ageRange: "16-17",
    rankTheme: "Senior Command",
    ranks: ["Junior Commander", "Assistant Commander", "Deputy Commander", "Commander", "Senior Commander", "Chief Commander", "Executive Officer", "Deputy General", "Vice General", "General"],
    color: "#059669"
  },
  12: {
    id: "12",
    name: "12th Grade",
    ageRange: "17-18",
    rankTheme: "Supreme Leaders",
    ranks: ["Bronze Scholar", "Silver Scholar", "Gold Scholar", "Platinum Scholar", "Diamond Scholar", "Elite Scholar", "Master Scholar", "Grand Scholar", "Supreme Scholar", "Valedictorian"],
    color: "#D97706"
  }
};

export interface SubjectInfo {
  id: SubjectId;
  name: string;
  icon: "grid" | "zap" | "book-open" | "globe" | "edit-3" | "map" | "music" | "palette" | "activity" | "message-circle" | "terminal";
  color: string;
  category: "core" | "elective";
  description: string;
}

export const SUBJECTS: Record<SubjectId, SubjectInfo> = {
  math: {
    id: "math",
    name: "Mathematics",
    icon: "grid",
    color: "#8B5CF6",
    category: "core",
    description: "Numbers, shapes, and problem solving"
  },
  science: {
    id: "science",
    name: "Science",
    icon: "zap",
    color: "#10B981",
    category: "core",
    description: "Explore how the world works"
  },
  reading: {
    id: "reading",
    name: "Reading & Literature",
    icon: "book-open",
    color: "#FB923C",
    category: "core",
    description: "Stories, comprehension, and vocabulary"
  },
  history: {
    id: "history",
    name: "History",
    icon: "globe",
    color: "#3B82F6",
    category: "core",
    description: "Learn about the past"
  },
  writing: {
    id: "writing",
    name: "Writing",
    icon: "edit-3",
    color: "#EC4899",
    category: "core",
    description: "Express yourself through words"
  },
  geography: {
    id: "geography",
    name: "Geography",
    icon: "map",
    color: "#14B8A6",
    category: "core",
    description: "Countries, maps, and cultures"
  },
  music: {
    id: "music",
    name: "Music",
    icon: "music",
    color: "#EF4444",
    category: "elective",
    description: "Rhythm, melody, and instruments"
  },
  art: {
    id: "art",
    name: "Art",
    icon: "palette",
    color: "#F59E0B",
    category: "elective",
    description: "Drawing, painting, and creativity"
  },
  pe: {
    id: "pe",
    name: "Physical Education",
    icon: "activity",
    color: "#84CC16",
    category: "elective",
    description: "Sports, fitness, and health"
  },
  languages: {
    id: "languages",
    name: "Languages",
    icon: "message-circle",
    color: "#6366F1",
    category: "elective",
    description: "Learn to speak new languages"
  },
  coding: {
    id: "coding",
    name: "Coding",
    icon: "terminal",
    color: "#06B6D4",
    category: "core",
    description: "Learn to code and create programs"
  }
};

export interface flashcard {
  id: string;
  question: string;
  answer: string;
  acceptableAnswers: string[];
  grade: GradeLevel;
  subject: SubjectId;
  level: number;
}

function generateflashcardId(subject: SubjectId, grade: GradeLevel, index: number): string {
  return `${subject}_${grade}_${index}`;
}

export const CURRICULUM_DATA: Record<SubjectId, Record<GradeLevel, flashcard[]>> = {
  math: {
    preK: [
      { id: "m_pk_1", question: "How many fingers on one hand?", answer: "5", acceptableAnswers: ["5", "five"], grade: "preK", subject: "math", level: 1 },
      { id: "m_pk_2", question: "What comes after 1?", answer: "2", acceptableAnswers: ["2", "two"], grade: "preK", subject: "math", level: 1 },
      { id: "m_pk_3", question: "What shape is a ball?", answer: "Circle", acceptableAnswers: ["circle", "round", "sphere"], grade: "preK", subject: "math", level: 2 },
      { id: "m_pk_4", question: "How many eyes do you have?", answer: "2", acceptableAnswers: ["2", "two"], grade: "preK", subject: "math", level: 2 },
      { id: "m_pk_5", question: "What is 1 + 1?", answer: "2", acceptableAnswers: ["2", "two"], grade: "preK", subject: "math", level: 3 },
    ],
    K: [
      { id: "m_k_1", question: "What is 2 + 2?", answer: "4", acceptableAnswers: ["4", "four"], grade: "K", subject: "math", level: 1 },
      { id: "m_k_2", question: "Count to 10. What comes after 9?", answer: "10", acceptableAnswers: ["10", "ten"], grade: "K", subject: "math", level: 1 },
      { id: "m_k_3", question: "What shape has 3 sides?", answer: "Triangle", acceptableAnswers: ["triangle"], grade: "K", subject: "math", level: 2 },
      { id: "m_k_4", question: "What is 3 + 2?", answer: "5", acceptableAnswers: ["5", "five"], grade: "K", subject: "math", level: 3 },
      { id: "m_k_5", question: "What shape has 4 equal sides?", answer: "Square", acceptableAnswers: ["square"], grade: "K", subject: "math", level: 4 },
    ],
    1: [
      { id: "m_1_1", question: "What is 7 + 5?", answer: "12", acceptableAnswers: ["12", "twelve"], grade: "1", subject: "math", level: 1 },
      { id: "m_1_2", question: "What is 10 - 4?", answer: "6", acceptableAnswers: ["6", "six"], grade: "1", subject: "math", level: 2 },
      { id: "m_1_3", question: "What is 8 + 6?", answer: "14", acceptableAnswers: ["14", "fourteen"], grade: "1", subject: "math", level: 3 },
      { id: "m_1_4", question: "What is 15 - 9?", answer: "6", acceptableAnswers: ["6", "six"], grade: "1", subject: "math", level: 4 },
      { id: "m_1_5", question: "What is 2 x 5?", answer: "10", acceptableAnswers: ["10", "ten"], grade: "1", subject: "math", level: 5 },
    ],
    2: [
      { id: "m_2_1", question: "What is 12 + 15?", answer: "27", acceptableAnswers: ["27", "twenty seven"], grade: "2", subject: "math", level: 1 },
      { id: "m_2_2", question: "What is 5 x 4?", answer: "20", acceptableAnswers: ["20", "twenty"], grade: "2", subject: "math", level: 2 },
      { id: "m_2_3", question: "What is 36 / 6?", answer: "6", acceptableAnswers: ["6", "six"], grade: "2", subject: "math", level: 3 },
      { id: "m_2_4", question: "What is half of 50?", answer: "25", acceptableAnswers: ["25", "twenty five"], grade: "2", subject: "math", level: 4 },
      { id: "m_2_5", question: "What is 7 x 8?", answer: "56", acceptableAnswers: ["56", "fifty six"], grade: "2", subject: "math", level: 5 },
    ],
    3: [
      { id: "m_3_1", question: "What is 9 x 9?", answer: "81", acceptableAnswers: ["81", "eighty one"], grade: "3", subject: "math", level: 1 },
      { id: "m_3_2", question: "What is 144 / 12?", answer: "12", acceptableAnswers: ["12", "twelve"], grade: "3", subject: "math", level: 2 },
      { id: "m_3_3", question: "What is 25 x 4?", answer: "100", acceptableAnswers: ["100", "one hundred"], grade: "3", subject: "math", level: 3 },
      { id: "m_3_4", question: "What is 1/4 of 100?", answer: "25", acceptableAnswers: ["25", "twenty five"], grade: "3", subject: "math", level: 4 },
      { id: "m_3_5", question: "What is 15 x 6?", answer: "90", acceptableAnswers: ["90", "ninety"], grade: "3", subject: "math", level: 5 },
    ],
    4: [
      { id: "m_4_1", question: "What is 234 + 567?", answer: "801", acceptableAnswers: ["801"], grade: "4", subject: "math", level: 1 },
      { id: "m_4_2", question: "What is 12 x 12?", answer: "144", acceptableAnswers: ["144"], grade: "4", subject: "math", level: 2 },
      { id: "m_4_3", question: "What is 3/4 as a decimal?", answer: "0.75", acceptableAnswers: ["0.75", ".75"], grade: "4", subject: "math", level: 3 },
      { id: "m_4_4", question: "What is the area of a square with side 8?", answer: "64", acceptableAnswers: ["64", "64 square units"], grade: "4", subject: "math", level: 4 },
      { id: "m_4_5", question: "What is 1000 / 25?", answer: "40", acceptableAnswers: ["40", "forty"], grade: "4", subject: "math", level: 5 },
    ],
    5: [
      { id: "m_5_1", question: "What is 15% of 200?", answer: "30", acceptableAnswers: ["30", "thirty"], grade: "5", subject: "math", level: 1 },
      { id: "m_5_2", question: "What is the perimeter of a rectangle 10 by 5?", answer: "30", acceptableAnswers: ["30", "thirty"], grade: "5", subject: "math", level: 2 },
      { id: "m_5_3", question: "Solve: 2x = 14", answer: "7", acceptableAnswers: ["7", "x=7", "x = 7"], grade: "5", subject: "math", level: 3 },
      { id: "m_5_4", question: "What is 3.5 x 4?", answer: "14", acceptableAnswers: ["14", "14.0"], grade: "5", subject: "math", level: 4 },
      { id: "m_5_5", question: "What is the volume of a cube with side 3?", answer: "27", acceptableAnswers: ["27", "27 cubic units"], grade: "5", subject: "math", level: 5 },
    ],
    6: [
      { id: "m_6_1", question: "Simplify: 24/36", answer: "2/3", acceptableAnswers: ["2/3", "two thirds"], grade: "6", subject: "math", level: 1 },
      { id: "m_6_2", question: "What is -5 + 8?", answer: "3", acceptableAnswers: ["3", "three"], grade: "6", subject: "math", level: 2 },
      { id: "m_6_3", question: "What is the ratio 15:25 in simplest form?", answer: "3:5", acceptableAnswers: ["3:5", "3 to 5"], grade: "6", subject: "math", level: 3 },
      { id: "m_6_4", question: "Solve: x + 7 = 15", answer: "8", acceptableAnswers: ["8", "x=8", "x = 8"], grade: "6", subject: "math", level: 4 },
      { id: "m_6_5", question: "What is 2^5?", answer: "32", acceptableAnswers: ["32", "thirty two"], grade: "6", subject: "math", level: 5 },
    ],
    7: [
      { id: "m_7_1", question: "Solve: 3x - 5 = 16", answer: "7", acceptableAnswers: ["7", "x=7", "x = 7"], grade: "7", subject: "math", level: 1 },
      { id: "m_7_2", question: "What is the slope of y = 2x + 3?", answer: "2", acceptableAnswers: ["2", "two"], grade: "7", subject: "math", level: 2 },
      { id: "m_7_3", question: "What is 40% of 250?", answer: "100", acceptableAnswers: ["100", "one hundred"], grade: "7", subject: "math", level: 3 },
      { id: "m_7_4", question: "What is the circumference of a circle with radius 7? (Use pi=3.14)", answer: "43.96", acceptableAnswers: ["43.96", "44", "43.98"], grade: "7", subject: "math", level: 4 },
      { id: "m_7_5", question: "Simplify: 3(x + 4)", answer: "3x + 12", acceptableAnswers: ["3x + 12", "3x+12"], grade: "7", subject: "math", level: 5 },
    ],
    8: [
      { id: "m_8_1", question: "Solve: 2x + 3y = 12 when y = 2", answer: "3", acceptableAnswers: ["3", "x=3", "x = 3"], grade: "8", subject: "math", level: 1 },
      { id: "m_8_2", question: "What is the square root of 144?", answer: "12", acceptableAnswers: ["12", "twelve"], grade: "8", subject: "math", level: 2 },
      { id: "m_8_3", question: "Factor: x^2 - 9", answer: "(x+3)(x-3)", acceptableAnswers: ["(x+3)(x-3)", "(x-3)(x+3)"], grade: "8", subject: "math", level: 3 },
      { id: "m_8_4", question: "What is the Pythagorean theorem?", answer: "a^2 + b^2 = c^2", acceptableAnswers: ["a^2 + b^2 = c^2", "a2 + b2 = c2", "a squared plus b squared equals c squared"], grade: "8", subject: "math", level: 4 },
      { id: "m_8_5", question: "Solve: x^2 = 49", answer: "7 or -7", acceptableAnswers: ["7 or -7", "7, -7", "+/- 7", "plus or minus 7"], grade: "8", subject: "math", level: 5 },
    ],
    9: [
      { id: "m_9_1", question: "Simplify: (x^2)(x^3)", answer: "x^5", acceptableAnswers: ["x^5", "x5"], grade: "9", subject: "math", level: 1 },
      { id: "m_9_2", question: "What is the quadratic formula?", answer: "x = (-b +/- sqrt(b^2-4ac))/2a", acceptableAnswers: ["x = (-b +/- sqrt(b^2-4ac))/2a", "negative b plus or minus square root of b squared minus 4ac all over 2a"], grade: "9", subject: "math", level: 2 },
      { id: "m_9_3", question: "Solve: x^2 - 5x + 6 = 0", answer: "x = 2 or x = 3", acceptableAnswers: ["2 and 3", "2, 3", "x=2 or x=3", "2 or 3"], grade: "9", subject: "math", level: 3 },
      { id: "m_9_4", question: "What is sin(90 degrees)?", answer: "1", acceptableAnswers: ["1", "one"], grade: "9", subject: "math", level: 4 },
      { id: "m_9_5", question: "What is the distance formula?", answer: "d = sqrt((x2-x1)^2 + (y2-y1)^2)", acceptableAnswers: ["d = sqrt((x2-x1)^2 + (y2-y1)^2)", "square root of (x2-x1) squared plus (y2-y1) squared"], grade: "9", subject: "math", level: 5 },
    ],
    10: [
      { id: "m_10_1", question: "What is the derivative of x^2?", answer: "2x", acceptableAnswers: ["2x"], grade: "10", subject: "math", level: 1 },
      { id: "m_10_2", question: "What is log base 10 of 1000?", answer: "3", acceptableAnswers: ["3", "three"], grade: "10", subject: "math", level: 2 },
      { id: "m_10_3", question: "What is cos(0)?", answer: "1", acceptableAnswers: ["1", "one"], grade: "10", subject: "math", level: 3 },
      { id: "m_10_4", question: "Simplify: e^(ln(5))", answer: "5", acceptableAnswers: ["5", "five"], grade: "10", subject: "math", level: 4 },
      { id: "m_10_5", question: "What is the integral of 2x?", answer: "x^2 + C", acceptableAnswers: ["x^2 + C", "x^2 + c", "x squared plus c"], grade: "10", subject: "math", level: 5 },
    ],
    11: [
      { id: "m_11_1", question: "What is the limit of 1/x as x approaches infinity?", answer: "0", acceptableAnswers: ["0", "zero"], grade: "11", subject: "math", level: 1 },
      { id: "m_11_2", question: "What is the derivative of sin(x)?", answer: "cos(x)", acceptableAnswers: ["cos(x)", "cosx", "cos x"], grade: "11", subject: "math", level: 2 },
      { id: "m_11_3", question: "What is i^2 (where i is imaginary)?", answer: "-1", acceptableAnswers: ["-1", "negative 1", "negative one"], grade: "11", subject: "math", level: 3 },
      { id: "m_11_4", question: "What is the sum of interior angles in a hexagon?", answer: "720", acceptableAnswers: ["720", "720 degrees"], grade: "11", subject: "math", level: 4 },
      { id: "m_11_5", question: "Solve: ln(x) = 2", answer: "e^2", acceptableAnswers: ["e^2", "e squared", "7.39"], grade: "11", subject: "math", level: 5 },
    ],
    12: [
      { id: "m_12_1", question: "What is the determinant of a 2x2 matrix [[a,b],[c,d]]?", answer: "ad - bc", acceptableAnswers: ["ad - bc", "ad-bc"], grade: "12", subject: "math", level: 1 },
      { id: "m_12_2", question: "What is the Taylor series expansion centered at?", answer: "A point", acceptableAnswers: ["a point", "a", "x=a", "center point"], grade: "12", subject: "math", level: 2 },
      { id: "m_12_3", question: "What is the integral of e^x?", answer: "e^x + C", acceptableAnswers: ["e^x + C", "e^x + c", "e^x"], grade: "12", subject: "math", level: 3 },
      { id: "m_12_4", question: "What is Euler's identity?", answer: "e^(i*pi) + 1 = 0", acceptableAnswers: ["e^(i*pi) + 1 = 0", "e to the i pi plus 1 equals 0"], grade: "12", subject: "math", level: 4 },
      { id: "m_12_5", question: "What is the chain rule for derivatives?", answer: "d/dx[f(g(x))] = f'(g(x)) * g'(x)", acceptableAnswers: ["f'(g(x)) * g'(x)", "derivative of outer times derivative of inner"], grade: "12", subject: "math", level: 5 },
    ],
  },
  science: {
    preK: [
      { id: "s_pk_1", question: "What do plants need to grow?", answer: "Water and sunlight", acceptableAnswers: ["water", "sunlight", "water and sunlight", "sun and water"], grade: "preK", subject: "science", level: 1 },
      { id: "s_pk_2", question: "What do you hear with?", answer: "Ears", acceptableAnswers: ["ears", "my ears"], grade: "preK", subject: "science", level: 2 },
      { id: "s_pk_3", question: "Is ice cold or hot?", answer: "Cold", acceptableAnswers: ["cold"], grade: "preK", subject: "science", level: 3 },
    ],
    K: [
      { id: "s_k_1", question: "What animal says 'moo'?", answer: "Cow", acceptableAnswers: ["cow", "a cow"], grade: "K", subject: "science", level: 1 },
      { id: "s_k_2", question: "What season has snow?", answer: "Winter", acceptableAnswers: ["winter"], grade: "K", subject: "science", level: 2 },
      { id: "s_k_3", question: "Do fish live in water or on land?", answer: "Water", acceptableAnswers: ["water", "in water"], grade: "K", subject: "science", level: 3 },
    ],
    1: [
      { id: "s_1_1", question: "What planet is known as the Red Planet?", answer: "Mars", acceptableAnswers: ["mars"], grade: "1", subject: "science", level: 1 },
      { id: "s_1_2", question: "How many legs does a spider have?", answer: "8", acceptableAnswers: ["8", "eight"], grade: "1", subject: "science", level: 2 },
      { id: "s_1_3", question: "What gas do we breathe in?", answer: "Oxygen", acceptableAnswers: ["oxygen", "o2"], grade: "1", subject: "science", level: 3 },
    ],
    2: [
      { id: "s_2_1", question: "What is the closest star to Earth?", answer: "The Sun", acceptableAnswers: ["sun", "the sun"], grade: "2", subject: "science", level: 1 },
      { id: "s_2_2", question: "What do bees make?", answer: "Honey", acceptableAnswers: ["honey"], grade: "2", subject: "science", level: 2 },
      { id: "s_2_3", question: "What is the largest mammal?", answer: "Blue Whale", acceptableAnswers: ["blue whale", "whale"], grade: "2", subject: "science", level: 3 },
    ],
    3: [
      { id: "s_3_1", question: "What is the largest organ in the human body?", answer: "Skin", acceptableAnswers: ["skin", "the skin"], grade: "3", subject: "science", level: 1 },
      { id: "s_3_2", question: "What force keeps us on the ground?", answer: "Gravity", acceptableAnswers: ["gravity"], grade: "3", subject: "science", level: 2 },
      { id: "s_3_3", question: "What process do plants use to make food?", answer: "Photosynthesis", acceptableAnswers: ["photosynthesis"], grade: "3", subject: "science", level: 3 },
    ],
    4: [
      { id: "s_4_1", question: "What is the chemical symbol for water?", answer: "H2O", acceptableAnswers: ["h2o", "H2O"], grade: "4", subject: "science", level: 1 },
      { id: "s_4_2", question: "What planet has the most moons?", answer: "Saturn", acceptableAnswers: ["saturn"], grade: "4", subject: "science", level: 2 },
      { id: "s_4_3", question: "What is the hardest natural substance?", answer: "Diamond", acceptableAnswers: ["diamond", "diamonds"], grade: "4", subject: "science", level: 3 },
    ],
    5: [
      { id: "s_5_1", question: "What are the three states of matter?", answer: "Solid, Liquid, Gas", acceptableAnswers: ["solid liquid gas", "solid, liquid, gas"], grade: "5", subject: "science", level: 1 },
      { id: "s_5_2", question: "What is the center of an atom called?", answer: "Nucleus", acceptableAnswers: ["nucleus"], grade: "5", subject: "science", level: 2 },
      { id: "s_5_3", question: "What is the main gas in Earth's atmosphere?", answer: "Nitrogen", acceptableAnswers: ["nitrogen"], grade: "5", subject: "science", level: 3 },
    ],
    6: [
      { id: "s_6_1", question: "What causes the tides?", answer: "The Moon's gravity", acceptableAnswers: ["moon", "the moon", "moon's gravity"], grade: "6", subject: "science", level: 1 },
      { id: "s_6_2", question: "What is the boiling point of water in Celsius?", answer: "100", acceptableAnswers: ["100", "100 degrees", "100c"], grade: "6", subject: "science", level: 2 },
      { id: "s_6_3", question: "What type of rock forms from cooled lava?", answer: "Igneous", acceptableAnswers: ["igneous", "igneous rock"], grade: "6", subject: "science", level: 3 },
    ],
    7: [
      { id: "s_7_1", question: "What is the unit of electrical resistance?", answer: "Ohm", acceptableAnswers: ["ohm", "ohms"], grade: "7", subject: "science", level: 1 },
      { id: "s_7_2", question: "What is the chemical formula for table salt?", answer: "NaCl", acceptableAnswers: ["nacl", "NaCl"], grade: "7", subject: "science", level: 2 },
      { id: "s_7_3", question: "What organelle is the powerhouse of the cell?", answer: "Mitochondria", acceptableAnswers: ["mitochondria", "mitochondrion"], grade: "7", subject: "science", level: 3 },
    ],
    8: [
      { id: "s_8_1", question: "What is Newton's First Law called?", answer: "Law of Inertia", acceptableAnswers: ["law of inertia", "inertia"], grade: "8", subject: "science", level: 1 },
      { id: "s_8_2", question: "What is the speed of light in m/s?", answer: "300,000,000", acceptableAnswers: ["300000000", "3 x 10^8", "300 million"], grade: "8", subject: "science", level: 2 },
      { id: "s_8_3", question: "What is the pH of a neutral solution?", answer: "7", acceptableAnswers: ["7", "seven"], grade: "8", subject: "science", level: 3 },
    ],
    9: [
      { id: "s_9_1", question: "What is the formula for calculating force?", answer: "F = ma", acceptableAnswers: ["f=ma", "f = ma", "force equals mass times acceleration"], grade: "9", subject: "science", level: 1 },
      { id: "s_9_2", question: "What is the atomic number of Carbon?", answer: "6", acceptableAnswers: ["6", "six"], grade: "9", subject: "science", level: 2 },
      { id: "s_9_3", question: "What is the basic unit of heredity?", answer: "Gene", acceptableAnswers: ["gene", "genes"], grade: "9", subject: "science", level: 3 },
    ],
    10: [
      { id: "s_10_1", question: "What is Avogadro's number?", answer: "6.022 x 10^23", acceptableAnswers: ["6.022 x 10^23", "6.022e23", "avogadro's constant"], grade: "10", subject: "science", level: 1 },
      { id: "s_10_2", question: "What is the equation for kinetic energy?", answer: "KE = 1/2 mv^2", acceptableAnswers: ["ke = 1/2 mv^2", "1/2 mv squared"], grade: "10", subject: "science", level: 2 },
      { id: "s_10_3", question: "What is the process of cell division called?", answer: "Mitosis", acceptableAnswers: ["mitosis", "cell division"], grade: "10", subject: "science", level: 3 },
    ],
    11: [
      { id: "s_11_1", question: "What is Ohm's Law?", answer: "V = IR", acceptableAnswers: ["v=ir", "v = ir", "voltage equals current times resistance"], grade: "11", subject: "science", level: 1 },
      { id: "s_11_2", question: "What is the universal gas constant R?", answer: "8.314 J/(mol*K)", acceptableAnswers: ["8.314", "8.314 j/mol k"], grade: "11", subject: "science", level: 2 },
      { id: "s_11_3", question: "What is the process of converting mRNA to protein?", answer: "Translation", acceptableAnswers: ["translation"], grade: "11", subject: "science", level: 3 },
    ],
    12: [
      { id: "s_12_1", question: "What is Einstein's mass-energy equation?", answer: "E = mc^2", acceptableAnswers: ["e=mc^2", "e = mc^2", "e equals mc squared"], grade: "12", subject: "science", level: 1 },
      { id: "s_12_2", question: "What is the Heisenberg Uncertainty Principle about?", answer: "Cannot know position and momentum exactly", acceptableAnswers: ["position and momentum", "uncertainty in position and momentum"], grade: "12", subject: "science", level: 2 },
      { id: "s_12_3", question: "What is the half-life concept in nuclear physics?", answer: "Time for half to decay", acceptableAnswers: ["time for half to decay", "half of radioactive material decays"], grade: "12", subject: "science", level: 3 },
    ],
  },
  reading: {
    preK: [
      { id: "r_pk_1", question: "What letter does 'Apple' start with?", answer: "A", acceptableAnswers: ["a", "A"], grade: "preK", subject: "reading", level: 1 },
      { id: "r_pk_2", question: "What letter does 'Ball' start with?", answer: "B", acceptableAnswers: ["b", "B"], grade: "preK", subject: "reading", level: 2 },
      { id: "r_pk_3", question: "What rhymes with 'cat'?", answer: "Hat", acceptableAnswers: ["hat", "bat", "mat", "rat", "sat"], grade: "preK", subject: "reading", level: 3 },
    ],
    K: [
      { id: "r_k_1", question: "What sound does the letter 'S' make?", answer: "Sss", acceptableAnswers: ["sss", "s", "ssss"], grade: "K", subject: "reading", level: 1 },
      { id: "r_k_2", question: "How many letters in the alphabet?", answer: "26", acceptableAnswers: ["26", "twenty six"], grade: "K", subject: "reading", level: 2 },
      { id: "r_k_3", question: "What are the vowels?", answer: "A, E, I, O, U", acceptableAnswers: ["a e i o u", "aeiou"], grade: "K", subject: "reading", level: 3 },
    ],
    1: [
      { id: "r_1_1", question: "What punctuation ends a question?", answer: "Question mark", acceptableAnswers: ["question mark", "?"], grade: "1", subject: "reading", level: 1 },
      { id: "r_1_2", question: "What is the opposite of 'big'?", answer: "Small", acceptableAnswers: ["small", "little", "tiny"], grade: "1", subject: "reading", level: 2 },
      { id: "r_1_3", question: "A word that sounds the same but has different meaning is called?", answer: "Homophone", acceptableAnswers: ["homophone", "homophones"], grade: "1", subject: "reading", level: 3 },
    ],
    2: [
      { id: "r_2_1", question: "What is a word that describes a noun?", answer: "Adjective", acceptableAnswers: ["adjective"], grade: "2", subject: "reading", level: 1 },
      { id: "r_2_2", question: "What is a word that shows action?", answer: "Verb", acceptableAnswers: ["verb"], grade: "2", subject: "reading", level: 2 },
      { id: "r_2_3", question: "What is a story that is not true called?", answer: "Fiction", acceptableAnswers: ["fiction"], grade: "2", subject: "reading", level: 3 },
    ],
    3: [
      { id: "r_3_1", question: "What is the main character called?", answer: "Protagonist", acceptableAnswers: ["protagonist", "main character"], grade: "3", subject: "reading", level: 1 },
      { id: "r_3_2", question: "What do we call a word that replaces a noun?", answer: "Pronoun", acceptableAnswers: ["pronoun"], grade: "3", subject: "reading", level: 2 },
      { id: "r_3_3", question: "A comparison using 'like' or 'as' is called?", answer: "Simile", acceptableAnswers: ["simile"], grade: "3", subject: "reading", level: 3 },
    ],
    4: [
      { id: "r_4_1", question: "What is the setting of a story?", answer: "Where and when it takes place", acceptableAnswers: ["where and when", "time and place"], grade: "4", subject: "reading", level: 1 },
      { id: "r_4_2", question: "What is the bad character called?", answer: "Antagonist", acceptableAnswers: ["antagonist", "villain"], grade: "4", subject: "reading", level: 2 },
      { id: "r_4_3", question: "What is a biography?", answer: "Story about someone's life", acceptableAnswers: ["story about someone's life", "life story"], grade: "4", subject: "reading", level: 3 },
    ],
    5: [
      { id: "r_5_1", question: "What is the theme of a story?", answer: "Main message or flashcard", acceptableAnswers: ["main message", "flashcard", "moral"], grade: "5", subject: "reading", level: 1 },
      { id: "r_5_2", question: "What is personification?", answer: "Giving human traits to non-human things", acceptableAnswers: ["giving human traits to things", "human traits to objects"], grade: "5", subject: "reading", level: 2 },
      { id: "r_5_3", question: "What is the climax?", answer: "Most exciting part", acceptableAnswers: ["most exciting part", "turning point"], grade: "5", subject: "reading", level: 3 },
    ],
    6: [
      { id: "r_6_1", question: "What is alliteration?", answer: "Repeating the same starting sound", acceptableAnswers: ["same starting sound", "repeated sounds"], grade: "6", subject: "reading", level: 1 },
      { id: "r_6_2", question: "What is irony?", answer: "Opposite of what you expect", acceptableAnswers: ["opposite of expected", "unexpected outcome"], grade: "6", subject: "reading", level: 2 },
      { id: "r_6_3", question: "What is a metaphor?", answer: "Direct comparison without like or as", acceptableAnswers: ["direct comparison", "comparison without like or as"], grade: "6", subject: "reading", level: 3 },
    ],
    7: [
      { id: "r_7_1", question: "What is a prefix?", answer: "Letters added to the beginning", acceptableAnswers: ["beginning of word", "letters before word"], grade: "7", subject: "reading", level: 1 },
      { id: "r_7_2", question: "What is a suffix?", answer: "Letters added to the end", acceptableAnswers: ["end of word", "letters after word"], grade: "7", subject: "reading", level: 2 },
      { id: "r_7_3", question: "What is the resolution?", answer: "How the story ends", acceptableAnswers: ["how it ends", "ending", "conclusion"], grade: "7", subject: "reading", level: 3 },
    ],
    8: [
      { id: "r_8_1", question: "What is foreshadowing?", answer: "Hints about future events", acceptableAnswers: ["hints about future", "clues about what happens next"], grade: "8", subject: "reading", level: 1 },
      { id: "r_8_2", question: "What is a flashback?", answer: "Scene from the past", acceptableAnswers: ["scene from the past", "going back in time"], grade: "8", subject: "reading", level: 2 },
      { id: "r_8_3", question: "What is satire?", answer: "Using humor to criticize", acceptableAnswers: ["using humor to criticize", "mocking through humor"], grade: "8", subject: "reading", level: 3 },
    ],
    9: [
      { id: "r_9_1", question: "What is an allegory?", answer: "Story with hidden meaning", acceptableAnswers: ["story with hidden meaning", "symbolic story"], grade: "9", subject: "reading", level: 1 },
      { id: "r_9_2", question: "What is dramatic irony?", answer: "Audience knows more than characters", acceptableAnswers: ["audience knows more", "reader knows more than character"], grade: "9", subject: "reading", level: 2 },
      { id: "r_9_3", question: "What is a soliloquy?", answer: "Character speaks thoughts aloud alone", acceptableAnswers: ["speaking thoughts aloud", "talking to oneself on stage"], grade: "9", subject: "reading", level: 3 },
    ],
    10: [
      { id: "r_10_1", question: "What is stream of consciousness?", answer: "Writing that mimics thought flow", acceptableAnswers: ["mimics thought flow", "continuous thoughts"], grade: "10", subject: "reading", level: 1 },
      { id: "r_10_2", question: "What is an unreliable narrator?", answer: "Narrator whose account cannot be trusted", acceptableAnswers: ["narrator can't be trusted", "untrustworthy narrator"], grade: "10", subject: "reading", level: 2 },
      { id: "r_10_3", question: "What is juxtaposition?", answer: "Placing contrasting elements together", acceptableAnswers: ["contrasting elements together", "putting opposites side by side"], grade: "10", subject: "reading", level: 3 },
    ],
    11: [
      { id: "r_11_1", question: "What is the difference between denotation and connotation?", answer: "Literal vs emotional meaning", acceptableAnswers: ["literal vs emotional meaning", "dictionary vs implied meaning"], grade: "11", subject: "reading", level: 1 },
      { id: "r_11_2", question: "What is an oxymoron?", answer: "Contradictory terms together", acceptableAnswers: ["contradictory terms", "opposing words together"], grade: "11", subject: "reading", level: 2 },
      { id: "r_11_3", question: "What is epistolary form?", answer: "Written as letters", acceptableAnswers: ["written as letters", "story told through letters"], grade: "11", subject: "reading", level: 3 },
    ],
    12: [
      { id: "r_12_1", question: "What is metafiction?", answer: "Fiction about fiction itself", acceptableAnswers: ["fiction about fiction", "self-referential fiction"], grade: "12", subject: "reading", level: 1 },
      { id: "r_12_2", question: "What is magical realism?", answer: "Magic in realistic setting", acceptableAnswers: ["magic in realistic setting", "fantastical elements in real world"], grade: "12", subject: "reading", level: 2 },
      { id: "r_12_3", question: "What is the postmodern literary movement?", answer: "Challenges traditional narrative", acceptableAnswers: ["challenges traditional narrative", "breaks conventions"], grade: "12", subject: "reading", level: 3 },
    ],
  },
  history: {
    preK: [
      { id: "h_pk_1", question: "What do we celebrate on July 4th?", answer: "Independence Day", acceptableAnswers: ["independence day", "4th of july", "america's birthday"], grade: "preK", subject: "history", level: 1 },
      { id: "h_pk_2", question: "Who lives in the White House?", answer: "The President", acceptableAnswers: ["president", "the president"], grade: "preK", subject: "history", level: 2 },
    ],
    K: [
      { id: "h_k_1", question: "What holiday has a turkey dinner?", answer: "Thanksgiving", acceptableAnswers: ["thanksgiving"], grade: "K", subject: "history", level: 1 },
      { id: "h_k_2", question: "Who was George Washington?", answer: "First President", acceptableAnswers: ["first president", "first us president"], grade: "K", subject: "history", level: 2 },
    ],
    1: [
      { id: "h_1_1", question: "Who was the first President?", answer: "George Washington", acceptableAnswers: ["george washington", "washington"], grade: "1", subject: "history", level: 1 },
      { id: "h_1_2", question: "What ship did the Pilgrims sail on?", answer: "Mayflower", acceptableAnswers: ["mayflower", "the mayflower"], grade: "1", subject: "history", level: 2 },
      { id: "h_1_3", question: "What year did Columbus sail to America?", answer: "1492", acceptableAnswers: ["1492"], grade: "1", subject: "history", level: 3 },
    ],
    2: [
      { id: "h_2_1", question: "Who invented the light bulb?", answer: "Thomas Edison", acceptableAnswers: ["thomas edison", "edison"], grade: "2", subject: "history", level: 1 },
      { id: "h_2_2", question: "What country gave us the Statue of Liberty?", answer: "France", acceptableAnswers: ["france"], grade: "2", subject: "history", level: 2 },
      { id: "h_2_3", question: "Who said 'I have a dream'?", answer: "Martin Luther King Jr.", acceptableAnswers: ["martin luther king", "mlk"], grade: "2", subject: "history", level: 3 },
    ],
    3: [
      { id: "h_3_1", question: "What was the Civil War fought over?", answer: "Slavery and states rights", acceptableAnswers: ["slavery", "states rights"], grade: "3", subject: "history", level: 1 },
      { id: "h_3_2", question: "Who wrote the Declaration of Independence?", answer: "Thomas Jefferson", acceptableAnswers: ["thomas jefferson", "jefferson"], grade: "3", subject: "history", level: 2 },
      { id: "h_3_3", question: "What ancient wonder was built in Egypt?", answer: "The Pyramids", acceptableAnswers: ["pyramids", "the pyramids"], grade: "3", subject: "history", level: 3 },
    ],
    4: [
      { id: "h_4_1", question: "Who was President during the Civil War?", answer: "Abraham Lincoln", acceptableAnswers: ["abraham lincoln", "lincoln"], grade: "4", subject: "history", level: 1 },
      { id: "h_4_2", question: "What empire built the Colosseum?", answer: "Roman Empire", acceptableAnswers: ["roman", "roman empire", "rome"], grade: "4", subject: "history", level: 2 },
      { id: "h_4_3", question: "What was the first airplane called?", answer: "Wright Flyer", acceptableAnswers: ["wright flyer", "flyer"], grade: "4", subject: "history", level: 3 },
    ],
    5: [
      { id: "h_5_1", question: "Who was the first person on the moon?", answer: "Neil Armstrong", acceptableAnswers: ["neil armstrong", "armstrong"], grade: "5", subject: "history", level: 1 },
      { id: "h_5_2", question: "What was the Boston Tea Party protesting?", answer: "Taxes", acceptableAnswers: ["taxes", "taxation"], grade: "5", subject: "history", level: 2 },
      { id: "h_5_3", question: "What year did World War II end?", answer: "1945", acceptableAnswers: ["1945"], grade: "5", subject: "history", level: 3 },
    ],
    6: [
      { id: "h_6_1", question: "What was the Renaissance?", answer: "Rebirth of art and learning", acceptableAnswers: ["rebirth", "rebirth of art"], grade: "6", subject: "history", level: 1 },
      { id: "h_6_2", question: "Who was Cleopatra?", answer: "Last pharaoh of Egypt", acceptableAnswers: ["pharaoh", "queen of egypt"], grade: "6", subject: "history", level: 2 },
      { id: "h_6_3", question: "What was the Cold War?", answer: "Tension between USA and USSR", acceptableAnswers: ["tension between usa and ussr", "usa vs soviet union"], grade: "6", subject: "history", level: 3 },
    ],
    7: [
      { id: "h_7_1", question: "What did the Magna Carta establish?", answer: "Limits on king's power", acceptableAnswers: ["limits on king", "rights"], grade: "7", subject: "history", level: 1 },
      { id: "h_7_2", question: "What was the Industrial Revolution?", answer: "Shift to factory work", acceptableAnswers: ["factories", "machines"], grade: "7", subject: "history", level: 2 },
      { id: "h_7_3", question: "Who were the Vikings?", answer: "Norse seafarers", acceptableAnswers: ["norse", "scandinavian seafarers"], grade: "7", subject: "history", level: 3 },
    ],
    8: [
      { id: "h_8_1", question: "What was the Silk Road?", answer: "Ancient trade route", acceptableAnswers: ["trade route", "trading route"], grade: "8", subject: "history", level: 1 },
      { id: "h_8_2", question: "What caused the fall of Rome?", answer: "Invasions and economic trouble", acceptableAnswers: ["invasions", "barbarians"], grade: "8", subject: "history", level: 2 },
      { id: "h_8_3", question: "What was the effect of the printing press?", answer: "Spread of knowledge", acceptableAnswers: ["spread knowledge", "more books"], grade: "8", subject: "history", level: 3 },
    ],
    9: [
      { id: "h_9_1", question: "What caused World War I?", answer: "Nationalism, alliances, imperialism", acceptableAnswers: ["nationalism", "alliances"], grade: "9", subject: "history", level: 1 },
      { id: "h_9_2", question: "What was the French Revolution about?", answer: "Overthrow of monarchy", acceptableAnswers: ["overthrow monarchy", "end of king's rule"], grade: "9", subject: "history", level: 2 },
      { id: "h_9_3", question: "What was the Enlightenment?", answer: "Age of reason and science", acceptableAnswers: ["age of reason", "intellectual movement"], grade: "9", subject: "history", level: 3 },
    ],
    10: [
      { id: "h_10_1", question: "What was the Holocaust?", answer: "Genocide during WWII", acceptableAnswers: ["genocide during wwii", "nazi persecution"], grade: "10", subject: "history", level: 1 },
      { id: "h_10_2", question: "What was the Berlin Wall?", answer: "Divided East and West Berlin", acceptableAnswers: ["divided berlin", "wall between east and west"], grade: "10", subject: "history", level: 2 },
      { id: "h_10_3", question: "What was apartheid?", answer: "Racial segregation in South Africa", acceptableAnswers: ["racial segregation", "segregation in south africa"], grade: "10", subject: "history", level: 3 },
    ],
    11: [
      { id: "h_11_1", question: "What was the Marshall Plan?", answer: "US aid to rebuild Europe", acceptableAnswers: ["us aid to europe", "rebuild europe after wwii"], grade: "11", subject: "history", level: 1 },
      { id: "h_11_2", question: "What was the Cuban Missile Crisis?", answer: "Nuclear standoff USA vs USSR", acceptableAnswers: ["nuclear standoff", "missiles in cuba"], grade: "11", subject: "history", level: 2 },
      { id: "h_11_3", question: "What was the Vietnam War about?", answer: "Containing communism", acceptableAnswers: ["containing communism", "stop spread of communism"], grade: "11", subject: "history", level: 3 },
    ],
    12: [
      { id: "h_12_1", question: "What was the Treaty of Versailles?", answer: "Ended WWI", acceptableAnswers: ["ended wwi", "peace treaty after world war 1"], grade: "12", subject: "history", level: 1 },
      { id: "h_12_2", question: "What is globalization?", answer: "Worldwide economic integration", acceptableAnswers: ["worldwide economic integration", "global trade"], grade: "12", subject: "history", level: 2 },
      { id: "h_12_3", question: "What was the Arab Spring?", answer: "Pro-democracy protests in Middle East", acceptableAnswers: ["pro-democracy protests", "middle east uprisings"], grade: "12", subject: "history", level: 3 },
    ],
  },
  writing: {
    preK: [
      { id: "w_pk_1", question: "How do you write the letter A?", answer: "Two slanted lines with a line across", acceptableAnswers: ["two lines", "triangle with line"], grade: "preK", subject: "writing", level: 1 },
    ],
    K: [
      { id: "w_k_1", question: "What goes at the end of a sentence?", answer: "Period", acceptableAnswers: ["period", "."], grade: "K", subject: "writing", level: 1 },
    ],
    1: [
      { id: "w_1_1", question: "What letter starts a sentence?", answer: "Capital letter", acceptableAnswers: ["capital letter", "uppercase"], grade: "1", subject: "writing", level: 1 },
    ],
    2: [
      { id: "w_2_1", question: "What are the three parts of a sentence?", answer: "Subject, verb, object", acceptableAnswers: ["subject verb object", "subject, verb, object"], grade: "2", subject: "writing", level: 1 },
    ],
    3: [
      { id: "w_3_1", question: "What is a paragraph?", answer: "Group of sentences about one idea", acceptableAnswers: ["group of sentences", "sentences about one topic"], grade: "3", subject: "writing", level: 1 },
    ],
    4: [
      { id: "w_4_1", question: "What is a thesis statement?", answer: "Main argument of an essay", acceptableAnswers: ["main argument", "central idea"], grade: "4", subject: "writing", level: 1 },
    ],
    5: [
      { id: "w_5_1", question: "What is a topic sentence?", answer: "First sentence of a paragraph", acceptableAnswers: ["first sentence", "introduces paragraph topic"], grade: "5", subject: "writing", level: 1 },
    ],
    6: [
      { id: "w_6_1", question: "What is a hook in writing?", answer: "Opening that grabs attention", acceptableAnswers: ["grabs attention", "interesting opening"], grade: "6", subject: "writing", level: 1 },
    ],
    7: [
      { id: "w_7_1", question: "What is a transition word?", answer: "Word connecting ideas", acceptableAnswers: ["connects ideas", "linking word"], grade: "7", subject: "writing", level: 1 },
    ],
    8: [
      { id: "w_8_1", question: "What is MLA format?", answer: "Citation style for papers", acceptableAnswers: ["citation style", "formatting for papers"], grade: "8", subject: "writing", level: 1 },
    ],
    9: [
      { id: "w_9_1", question: "What is a persuasive essay?", answer: "Essay to convince the reader", acceptableAnswers: ["convince reader", "argumentative writing"], grade: "9", subject: "writing", level: 1 },
    ],
    10: [
      { id: "w_10_1", question: "What is ethos in rhetoric?", answer: "Appeal to credibility", acceptableAnswers: ["credibility", "appeal to authority"], grade: "10", subject: "writing", level: 1 },
    ],
    11: [
      { id: "w_11_1", question: "What is pathos in rhetoric?", answer: "Appeal to emotion", acceptableAnswers: ["emotion", "emotional appeal"], grade: "11", subject: "writing", level: 1 },
    ],
    12: [
      { id: "w_12_1", question: "What is logos in rhetoric?", answer: "Appeal to logic", acceptableAnswers: ["logic", "logical appeal"], grade: "12", subject: "writing", level: 1 },
    ],
  },
  geography: {
    preK: [
      { id: "g_pk_1", question: "What is big and blue above us?", answer: "Sky", acceptableAnswers: ["sky", "the sky"], grade: "preK", subject: "geography", level: 1 },
    ],
    K: [
      { id: "g_k_1", question: "What are the 7 continents?", answer: "Africa, Antarctica, Asia, Australia, Europe, North America, South America", acceptableAnswers: ["africa antarctica asia australia europe north america south america"], grade: "K", subject: "geography", level: 1 },
    ],
    1: [
      { id: "g_1_1", question: "What ocean is the largest?", answer: "Pacific Ocean", acceptableAnswers: ["pacific", "pacific ocean"], grade: "1", subject: "geography", level: 1 },
    ],
    2: [
      { id: "g_2_1", question: "What is the capital of the USA?", answer: "Washington D.C.", acceptableAnswers: ["washington dc", "washington d.c."], grade: "2", subject: "geography", level: 1 },
    ],
    3: [
      { id: "g_3_1", question: "What is the longest river in the world?", answer: "Nile River", acceptableAnswers: ["nile", "nile river"], grade: "3", subject: "geography", level: 1 },
    ],
    4: [
      { id: "g_4_1", question: "What is the tallest mountain?", answer: "Mount Everest", acceptableAnswers: ["mount everest", "everest"], grade: "4", subject: "geography", level: 1 },
    ],
    5: [
      { id: "g_5_1", question: "What is the largest country by area?", answer: "Russia", acceptableAnswers: ["russia"], grade: "5", subject: "geography", level: 1 },
    ],
    6: [
      { id: "g_6_1", question: "What line divides Earth into hemispheres?", answer: "Equator", acceptableAnswers: ["equator", "the equator"], grade: "6", subject: "geography", level: 1 },
    ],
    7: [
      { id: "g_7_1", question: "What is latitude?", answer: "Distance from equator", acceptableAnswers: ["distance from equator", "horizontal lines"], grade: "7", subject: "geography", level: 1 },
    ],
    8: [
      { id: "g_8_1", question: "What is longitude?", answer: "Distance from Prime Meridian", acceptableAnswers: ["distance from prime meridian", "vertical lines"], grade: "8", subject: "geography", level: 1 },
    ],
    9: [
      { id: "g_9_1", question: "What are tectonic plates?", answer: "Earth's crust sections", acceptableAnswers: ["earth's crust sections", "moving plates"], grade: "9", subject: "geography", level: 1 },
    ],
    10: [
      { id: "g_10_1", question: "What is a topographic map?", answer: "Shows elevation and terrain", acceptableAnswers: ["shows elevation", "terrain map"], grade: "10", subject: "geography", level: 1 },
    ],
    11: [
      { id: "g_11_1", question: "What is urban sprawl?", answer: "City expansion into rural areas", acceptableAnswers: ["city expansion", "urban growth"], grade: "11", subject: "geography", level: 1 },
    ],
    12: [
      { id: "g_12_1", question: "What is geopolitics?", answer: "Politics influenced by geography", acceptableAnswers: ["politics and geography", "geographic politics"], grade: "12", subject: "geography", level: 1 },
    ],
  },
  music: {
    preK: [
      { id: "mu_pk_1", question: "What do you use to make music?", answer: "Instruments", acceptableAnswers: ["instruments", "voice", "hands"], grade: "preK", subject: "music", level: 1 },
    ],
    K: [
      { id: "mu_k_1", question: "What is a drum?", answer: "Percussion instrument", acceptableAnswers: ["percussion instrument", "instrument you hit"], grade: "K", subject: "music", level: 1 },
    ],
    1: [
      { id: "mu_1_1", question: "How many notes in a scale?", answer: "7", acceptableAnswers: ["7", "seven"], grade: "1", subject: "music", level: 1 },
    ],
    2: [
      { id: "mu_2_1", question: "What are the note names?", answer: "A B C D E F G", acceptableAnswers: ["a b c d e f g", "abcdefg"], grade: "2", subject: "music", level: 1 },
    ],
    3: [
      { id: "mu_3_1", question: "What is tempo?", answer: "Speed of music", acceptableAnswers: ["speed", "speed of music"], grade: "3", subject: "music", level: 1 },
    ],
    4: [
      { id: "mu_4_1", question: "What is a melody?", answer: "Sequence of notes", acceptableAnswers: ["sequence of notes", "tune"], grade: "4", subject: "music", level: 1 },
    ],
    5: [
      { id: "mu_5_1", question: "What is harmony?", answer: "Notes played together", acceptableAnswers: ["notes together", "chords"], grade: "5", subject: "music", level: 1 },
    ],
    6: [
      { id: "mu_6_1", question: "What is a chord?", answer: "Three or more notes together", acceptableAnswers: ["three notes together", "multiple notes"], grade: "6", subject: "music", level: 1 },
    ],
    7: [
      { id: "mu_7_1", question: "What is a time signature?", answer: "Beats per measure", acceptableAnswers: ["beats per measure", "rhythm indicator"], grade: "7", subject: "music", level: 1 },
    ],
    8: [
      { id: "mu_8_1", question: "What is a key signature?", answer: "Sharps or flats in a piece", acceptableAnswers: ["sharps or flats", "indicates key"], grade: "8", subject: "music", level: 1 },
    ],
    9: [
      { id: "mu_9_1", question: "What is syncopation?", answer: "Emphasis on weak beats", acceptableAnswers: ["weak beats", "off-beat rhythm"], grade: "9", subject: "music", level: 1 },
    ],
    10: [
      { id: "mu_10_1", question: "What is counterpoint?", answer: "Independent melodies together", acceptableAnswers: ["independent melodies", "polyphonic"], grade: "10", subject: "music", level: 1 },
    ],
    11: [
      { id: "mu_11_1", question: "What is a fugue?", answer: "Musical composition style", acceptableAnswers: ["composition style", "contrapuntal composition"], grade: "11", subject: "music", level: 1 },
    ],
    12: [
      { id: "mu_12_1", question: "What is atonality?", answer: "No tonal center", acceptableAnswers: ["no tonal center", "no key"], grade: "12", subject: "music", level: 1 },
    ],
  },
  art: {
    preK: [
      { id: "a_pk_1", question: "What colors make green?", answer: "Blue and yellow", acceptableAnswers: ["blue and yellow", "yellow and blue"], grade: "preK", subject: "art", level: 1 },
    ],
    K: [
      { id: "a_k_1", question: "What are the primary colors?", answer: "Red, blue, yellow", acceptableAnswers: ["red blue yellow", "red, blue, yellow"], grade: "K", subject: "art", level: 1 },
    ],
    1: [
      { id: "a_1_1", question: "What colors make orange?", answer: "Red and yellow", acceptableAnswers: ["red and yellow", "yellow and red"], grade: "1", subject: "art", level: 1 },
    ],
    2: [
      { id: "a_2_1", question: "What is a self-portrait?", answer: "Picture of yourself", acceptableAnswers: ["picture of yourself", "drawing of yourself"], grade: "2", subject: "art", level: 1 },
    ],
    3: [
      { id: "a_3_1", question: "What is a landscape?", answer: "Art of outdoor scenery", acceptableAnswers: ["outdoor scenery", "nature picture"], grade: "3", subject: "art", level: 1 },
    ],
    4: [
      { id: "a_4_1", question: "What is perspective?", answer: "Creating depth on flat surface", acceptableAnswers: ["depth on flat surface", "3d appearance"], grade: "4", subject: "art", level: 1 },
    ],
    5: [
      { id: "a_5_1", question: "What is a still life?", answer: "Art of inanimate objects", acceptableAnswers: ["inanimate objects", "objects arranged"], grade: "5", subject: "art", level: 1 },
    ],
    6: [
      { id: "a_6_1", question: "What is shading?", answer: "Adding dark tones for depth", acceptableAnswers: ["dark tones", "adding shadows"], grade: "6", subject: "art", level: 1 },
    ],
    7: [
      { id: "a_7_1", question: "What is composition?", answer: "Arrangement of elements", acceptableAnswers: ["arrangement", "how art is organized"], grade: "7", subject: "art", level: 1 },
    ],
    8: [
      { id: "a_8_1", question: "What is the Renaissance art period?", answer: "14th-17th century European art", acceptableAnswers: ["european art movement", "rebirth of art"], grade: "8", subject: "art", level: 1 },
    ],
    9: [
      { id: "a_9_1", question: "Who painted the Mona Lisa?", answer: "Leonardo da Vinci", acceptableAnswers: ["leonardo da vinci", "da vinci"], grade: "9", subject: "art", level: 1 },
    ],
    10: [
      { id: "a_10_1", question: "What is Impressionism?", answer: "Art focused on light and color", acceptableAnswers: ["light and color", "quick brushstrokes"], grade: "10", subject: "art", level: 1 },
    ],
    11: [
      { id: "a_11_1", question: "What is abstract art?", answer: "Non-representational art", acceptableAnswers: ["non-representational", "not realistic"], grade: "11", subject: "art", level: 1 },
    ],
    12: [
      { id: "a_12_1", question: "What is conceptual art?", answer: "Ideas over aesthetics", acceptableAnswers: ["ideas over aesthetics", "concept-based art"], grade: "12", subject: "art", level: 1 },
    ],
  },
  pe: {
    preK: [
      { id: "pe_pk_1", question: "What do you do with a ball?", answer: "Throw, catch, kick", acceptableAnswers: ["throw", "catch", "kick", "play"], grade: "preK", subject: "pe", level: 1 },
    ],
    K: [
      { id: "pe_k_1", question: "How many players on a soccer team?", answer: "11", acceptableAnswers: ["11", "eleven"], grade: "K", subject: "pe", level: 1 },
    ],
    1: [
      { id: "pe_1_1", question: "What exercise makes your heart stronger?", answer: "Cardio", acceptableAnswers: ["cardio", "running", "exercise"], grade: "1", subject: "pe", level: 1 },
    ],
    2: [
      { id: "pe_2_1", question: "What is stretching for?", answer: "Flexibility", acceptableAnswers: ["flexibility", "prevent injury"], grade: "2", subject: "pe", level: 1 },
    ],
    3: [
      { id: "pe_3_1", question: "What sport uses a racket?", answer: "Tennis", acceptableAnswers: ["tennis", "badminton"], grade: "3", subject: "pe", level: 1 },
    ],
    4: [
      { id: "pe_4_1", question: "How many innings in baseball?", answer: "9", acceptableAnswers: ["9", "nine"], grade: "4", subject: "pe", level: 1 },
    ],
    5: [
      { id: "pe_5_1", question: "What is aerobic exercise?", answer: "Exercise with oxygen", acceptableAnswers: ["with oxygen", "cardio exercise"], grade: "5", subject: "pe", level: 1 },
    ],
    6: [
      { id: "pe_6_1", question: "What is anaerobic exercise?", answer: "High intensity without oxygen", acceptableAnswers: ["without oxygen", "high intensity"], grade: "6", subject: "pe", level: 1 },
    ],
    7: [
      { id: "pe_7_1", question: "What is your heart rate zone?", answer: "Target beats per minute", acceptableAnswers: ["target heart rate", "beats per minute range"], grade: "7", subject: "pe", level: 1 },
    ],
    8: [
      { id: "pe_8_1", question: "What is a warm-up for?", answer: "Prepare body for exercise", acceptableAnswers: ["prepare body", "prevent injury"], grade: "8", subject: "pe", level: 1 },
    ],
    9: [
      { id: "pe_9_1", question: "What is BMI?", answer: "Body Mass Index", acceptableAnswers: ["body mass index", "weight to height ratio"], grade: "9", subject: "pe", level: 1 },
    ],
    10: [
      { id: "pe_10_1", question: "What is HIIT?", answer: "High Intensity Interval Training", acceptableAnswers: ["high intensity interval training", "interval training"], grade: "10", subject: "pe", level: 1 },
    ],
    11: [
      { id: "pe_11_1", question: "What is sports psychology?", answer: "Mental aspects of performance", acceptableAnswers: ["mental performance", "psychology in sports"], grade: "11", subject: "pe", level: 1 },
    ],
    12: [
      { id: "pe_12_1", question: "What is periodization in training?", answer: "Systematic training variation", acceptableAnswers: ["training variation", "planned training cycles"], grade: "12", subject: "pe", level: 1 },
    ],
  },
  languages: {
    preK: [
      { id: "l_pk_1", question: "How do you say 'hello' in Spanish?", answer: "Hola", acceptableAnswers: ["hola"], grade: "preK", subject: "languages", level: 1 },
    ],
    K: [
      { id: "l_k_1", question: "How do you say 'goodbye' in Spanish?", answer: "Adios", acceptableAnswers: ["adios", "adiós"], grade: "K", subject: "languages", level: 1 },
    ],
    1: [
      { id: "l_1_1", question: "How do you say 'thank you' in French?", answer: "Merci", acceptableAnswers: ["merci"], grade: "1", subject: "languages", level: 1 },
    ],
    2: [
      { id: "l_2_1", question: "How do you say 'please' in Spanish?", answer: "Por favor", acceptableAnswers: ["por favor"], grade: "2", subject: "languages", level: 1 },
    ],
    3: [
      { id: "l_3_1", question: "How do you count to 3 in Spanish?", answer: "Uno, dos, tres", acceptableAnswers: ["uno dos tres", "uno, dos, tres"], grade: "3", subject: "languages", level: 1 },
    ],
    4: [
      { id: "l_4_1", question: "What is 'water' in French?", answer: "Eau", acceptableAnswers: ["eau", "l'eau"], grade: "4", subject: "languages", level: 1 },
    ],
    5: [
      { id: "l_5_1", question: "What is 'friend' in Spanish?", answer: "Amigo", acceptableAnswers: ["amigo", "amiga"], grade: "5", subject: "languages", level: 1 },
    ],
    6: [
      { id: "l_6_1", question: "What is 'I love you' in French?", answer: "Je t'aime", acceptableAnswers: ["je t'aime", "je taime"], grade: "6", subject: "languages", level: 1 },
    ],
    7: [
      { id: "l_7_1", question: "What is a cognate?", answer: "Word similar in two languages", acceptableAnswers: ["similar word", "same word different language"], grade: "7", subject: "languages", level: 1 },
    ],
    8: [
      { id: "l_8_1", question: "What is conjugation?", answer: "Changing verb form", acceptableAnswers: ["verb form change", "modifying verbs"], grade: "8", subject: "languages", level: 1 },
    ],
    9: [
      { id: "l_9_1", question: "What is the subjunctive mood?", answer: "Expresses doubt or wish", acceptableAnswers: ["doubt or wish", "hypothetical"], grade: "9", subject: "languages", level: 1 },
    ],
    10: [
      { id: "l_10_1", question: "What is an idiomatic expression?", answer: "Phrase with figurative meaning", acceptableAnswers: ["figurative meaning", "non-literal phrase"], grade: "10", subject: "languages", level: 1 },
    ],
    11: [
      { id: "l_11_1", question: "What is language immersion?", answer: "Learning by full exposure", acceptableAnswers: ["full exposure", "surrounded by language"], grade: "11", subject: "languages", level: 1 },
    ],
    12: [
      { id: "l_12_1", question: "What is linguistic relativity?", answer: "Language affects thought", acceptableAnswers: ["language affects thought", "Sapir-Whorf hypothesis"], grade: "12", subject: "languages", level: 1 },
    ],
  },
  coding: {
    preK: [
      { id: "c_pk_1", question: "What does a computer use to think?", answer: "Code", acceptableAnswers: ["code", "programs", "software"], grade: "preK", subject: "coding", level: 1 },
      { id: "c_pk_2", question: "What do we call telling a computer what to do?", answer: "Programming", acceptableAnswers: ["programming", "coding"], grade: "preK", subject: "coding", level: 2 },
      { id: "c_pk_3", question: "A robot follows instructions. True or false?", answer: "True", acceptableAnswers: ["true", "yes"], grade: "preK", subject: "coding", level: 3 },
    ],
    K: [
      { id: "c_k_1", question: "What is a sequence in coding?", answer: "Steps in order", acceptableAnswers: ["steps in order", "order of steps", "instructions in order"], grade: "K", subject: "coding", level: 1 },
      { id: "c_k_2", question: "What is a bug in coding?", answer: "A mistake", acceptableAnswers: ["a mistake", "mistake", "error", "problem"], grade: "K", subject: "coding", level: 2 },
      { id: "c_k_3", question: "What do we call fixing a bug?", answer: "Debugging", acceptableAnswers: ["debugging", "fixing"], grade: "K", subject: "coding", level: 3 },
    ],
    1: [
      { id: "c_1_1", question: "What is a loop in coding?", answer: "Repeating steps", acceptableAnswers: ["repeating steps", "repeat", "doing something over and over"], grade: "1", subject: "coding", level: 1 },
      { id: "c_1_2", question: "What does 'run' mean in coding?", answer: "Start the program", acceptableAnswers: ["start the program", "execute", "start"], grade: "1", subject: "coding", level: 2 },
      { id: "c_1_3", question: "What is an algorithm?", answer: "Step-by-step instructions", acceptableAnswers: ["step-by-step instructions", "steps", "instructions"], grade: "1", subject: "coding", level: 3 },
    ],
    2: [
      { id: "c_2_1", question: "What is a variable?", answer: "A container for data", acceptableAnswers: ["a container for data", "container", "holds information", "stores data"], grade: "2", subject: "coding", level: 1 },
      { id: "c_2_2", question: "What is an 'if' statement?", answer: "A decision", acceptableAnswers: ["a decision", "decision", "choice", "condition"], grade: "2", subject: "coding", level: 2 },
      { id: "c_2_3", question: "What does 'input' mean?", answer: "Information going in", acceptableAnswers: ["information going in", "data in", "what you type"], grade: "2", subject: "coding", level: 3 },
    ],
    3: [
      { id: "c_3_1", question: "What does 'output' mean?", answer: "Information coming out", acceptableAnswers: ["information coming out", "data out", "result", "what shows on screen"], grade: "3", subject: "coding", level: 1 },
      { id: "c_3_2", question: "What is a function?", answer: "Reusable code", acceptableAnswers: ["reusable code", "code you can use again", "group of instructions"], grade: "3", subject: "coding", level: 2 },
      { id: "c_3_3", question: "What symbol ends most code lines in JavaScript?", answer: "Semicolon", acceptableAnswers: ["semicolon", ";"], grade: "3", subject: "coding", level: 3 },
    ],
    4: [
      { id: "c_4_1", question: "What is HTML used for?", answer: "Creating web pages", acceptableAnswers: ["creating web pages", "web pages", "websites"], grade: "4", subject: "coding", level: 1 },
      { id: "c_4_2", question: "What is CSS used for?", answer: "Styling web pages", acceptableAnswers: ["styling web pages", "styles", "making things look nice"], grade: "4", subject: "coding", level: 2 },
      { id: "c_4_3", question: "What does a comment do in code?", answer: "Explains the code", acceptableAnswers: ["explains the code", "notes for humans", "documentation"], grade: "4", subject: "coding", level: 3 },
    ],
    5: [
      { id: "c_5_1", question: "What is JavaScript used for?", answer: "Making websites interactive", acceptableAnswers: ["making websites interactive", "interactive websites", "web programming"], grade: "5", subject: "coding", level: 1 },
      { id: "c_5_2", question: "What is a string in coding?", answer: "Text in quotes", acceptableAnswers: ["text in quotes", "text", "words"], grade: "5", subject: "coding", level: 2 },
      { id: "c_5_3", question: "What is a boolean?", answer: "True or false", acceptableAnswers: ["true or false", "true/false", "yes or no"], grade: "5", subject: "coding", level: 3 },
    ],
    6: [
      { id: "c_6_1", question: "What is an array?", answer: "A list of items", acceptableAnswers: ["a list of items", "list", "collection"], grade: "6", subject: "coding", level: 1 },
      { id: "c_6_2", question: "What does 'console.log' do?", answer: "Prints to the console", acceptableAnswers: ["prints to the console", "shows output", "displays text"], grade: "6", subject: "coding", level: 2 },
      { id: "c_6_3", question: "What is a for loop?", answer: "Repeats a set number of times", acceptableAnswers: ["repeats a set number of times", "counting loop", "loop with counter"], grade: "6", subject: "coding", level: 3 },
    ],
    7: [
      { id: "c_7_1", question: "What is a while loop?", answer: "Repeats while condition is true", acceptableAnswers: ["repeats while condition is true", "conditional loop", "loop with condition"], grade: "7", subject: "coding", level: 1 },
      { id: "c_7_2", question: "What is an object in JavaScript?", answer: "A collection of properties", acceptableAnswers: ["a collection of properties", "key-value pairs", "data structure"], grade: "7", subject: "coding", level: 2 },
      { id: "c_7_3", question: "What is a parameter?", answer: "Input to a function", acceptableAnswers: ["input to a function", "function input", "argument"], grade: "7", subject: "coding", level: 3 },
    ],
    8: [
      { id: "c_8_1", question: "What is Git used for?", answer: "Version control", acceptableAnswers: ["version control", "tracking changes", "code history"], grade: "8", subject: "coding", level: 1 },
      { id: "c_8_2", question: "What is an API?", answer: "Application Programming Interface", acceptableAnswers: ["application programming interface", "interface for programs", "way programs talk"], grade: "8", subject: "coding", level: 2 },
      { id: "c_8_3", question: "What is a class in programming?", answer: "A blueprint for objects", acceptableAnswers: ["a blueprint for objects", "template", "object template"], grade: "8", subject: "coding", level: 3 },
    ],
    9: [
      { id: "c_9_1", question: "What is Python known for?", answer: "Easy to read syntax", acceptableAnswers: ["easy to read syntax", "readability", "simple syntax"], grade: "9", subject: "coding", level: 1 },
      { id: "c_9_2", question: "What is recursion?", answer: "A function calling itself", acceptableAnswers: ["a function calling itself", "self-calling function", "function calls itself"], grade: "9", subject: "coding", level: 2 },
      { id: "c_9_3", question: "What is JSON?", answer: "JavaScript Object Notation", acceptableAnswers: ["javascript object notation", "data format", "text data format"], grade: "9", subject: "coding", level: 3 },
    ],
    10: [
      { id: "c_10_1", question: "What is Big O notation for?", answer: "Measuring algorithm efficiency", acceptableAnswers: ["measuring algorithm efficiency", "time complexity", "algorithm speed"], grade: "10", subject: "coding", level: 1 },
      { id: "c_10_2", question: "What is O(n)?", answer: "Linear time complexity", acceptableAnswers: ["linear time complexity", "linear time", "grows with input"], grade: "10", subject: "coding", level: 2 },
      { id: "c_10_3", question: "What is a database?", answer: "Organized data storage", acceptableAnswers: ["organized data storage", "data storage", "stores information"], grade: "10", subject: "coding", level: 3 },
    ],
    11: [
      { id: "c_11_1", question: "What is SQL used for?", answer: "Querying databases", acceptableAnswers: ["querying databases", "database queries", "working with databases"], grade: "11", subject: "coding", level: 1 },
      { id: "c_11_2", question: "What is a REST API?", answer: "Stateless web service", acceptableAnswers: ["stateless web service", "web api", "http api"], grade: "11", subject: "coding", level: 2 },
      { id: "c_11_3", question: "What is unit testing?", answer: "Testing individual components", acceptableAnswers: ["testing individual components", "testing small parts", "component testing"], grade: "11", subject: "coding", level: 3 },
    ],
    12: [
      { id: "c_12_1", question: "What is machine learning?", answer: "Computers learning from data", acceptableAnswers: ["computers learning from data", "ai learning", "learning algorithms"], grade: "12", subject: "coding", level: 1 },
      { id: "c_12_2", question: "What is a neural network?", answer: "Brain-inspired algorithm", acceptableAnswers: ["brain-inspired algorithm", "connected nodes", "ai model"], grade: "12", subject: "coding", level: 2 },
      { id: "c_12_3", question: "What is DevOps?", answer: "Development and operations combined", acceptableAnswers: ["development and operations combined", "dev and ops", "continuous delivery"], grade: "12", subject: "coding", level: 3 },
    ],
  },
};

export function getLevelFromPoints(xp: number): { grade: GradeLevel; level: number; globalLevel: number } {
  const pointsPerLevel = 100;
  const globalLevel = Math.floor(xp / pointsPerLevel) + 1;
  const gradeIndex = Math.floor((globalLevel - 1) / LEVELS_PER_GRADE);
  const levelInGrade = ((globalLevel - 1) % LEVELS_PER_GRADE) + 1;
  const grade = GRADE_ORDER[Math.min(gradeIndex, GRADE_ORDER.length - 1)];
  return { grade, level: levelInGrade, globalLevel };
}

export function getRankForLevel(grade: GradeLevel, level: number): string {
  const gradeInfo = GRADES[grade];
  const rankIndex = Math.min(level - 1, gradeInfo.ranks.length - 1);
  return gradeInfo.ranks[rankIndex];
}

export function getXpForNextLevel(currentXp: number): { current: number; required: number; progress: number } {
  const pointsPerLevel = 100;
  const currentLevelStart = Math.floor(currentXp / pointsPerLevel) * pointsPerLevel;
  const current = currentXp - currentLevelStart;
  return { current, required: pointsPerLevel, progress: current / pointsPerLevel };
}
