export const TOTAL_SCHOOL_LEVELS = 160;
export const STARS_PER_LEVEL = 50;
export const ACTIVITIES_PER_STAR = 3;

export type SchoolCategoryId = "math" | "science" | "humanities" | "arts" | "other";
export type SchoolSubjectId = string;

export interface SchoolSubtopic {
  id: string;
  name: string;
  icon: string;
  description: string;
}

export interface SchoolSubject {
  id: SchoolSubjectId;
  name: string;
  icon: string;
  color: string;
  categoryId: SchoolCategoryId;
  subtopics: SchoolSubtopic[];
  description: string;
}

export interface SchoolCategory {
  id: SchoolCategoryId;
  name: string;
  icon: string;
  color: string;
  subjects: SchoolSubject[];
}

export interface LevelInfo {
  level: number;
  name: string;
  description: string;
  ageRange: string;
  gradeEquivalent: string;
}

export const LEVEL_TIERS: LevelInfo[] = [
  { level: 1, name: "Beginner Explorer", description: "Starting your journey", ageRange: "3-4", gradeEquivalent: "Pre-K" },
  { level: 10, name: "Curious Learner", description: "Building foundations", ageRange: "4-5", gradeEquivalent: "Kindergarten" },
  { level: 20, name: "Young Scholar", description: "Growing knowledge", ageRange: "5-6", gradeEquivalent: "1st Grade" },
  { level: 30, name: "Rising Star", description: "Making progress", ageRange: "6-7", gradeEquivalent: "2nd Grade" },
  { level: 40, name: "Knowledge Seeker", description: "Expanding horizons", ageRange: "7-8", gradeEquivalent: "3rd Grade" },
  { level: 50, name: "Bright Mind", description: "Sharpening skills", ageRange: "8-9", gradeEquivalent: "4th Grade" },
  { level: 60, name: "Eager Achiever", description: "Reaching new heights", ageRange: "9-10", gradeEquivalent: "5th Grade" },
  { level: 70, name: "Junior Expert", description: "Mastering basics", ageRange: "10-11", gradeEquivalent: "6th Grade" },
  { level: 80, name: "Skilled Learner", description: "Deepening understanding", ageRange: "11-12", gradeEquivalent: "7th Grade" },
  { level: 90, name: "Advanced Scholar", description: "Advanced concepts", ageRange: "12-13", gradeEquivalent: "8th Grade" },
  { level: 100, name: "Knowledge Master", description: "High-level thinking", ageRange: "13-14", gradeEquivalent: "9th Grade" },
  { level: 110, name: "Academic Champion", description: "Expert level", ageRange: "14-15", gradeEquivalent: "10th Grade" },
  { level: 120, name: "Elite Scholar", description: "Near mastery", ageRange: "15-16", gradeEquivalent: "11th Grade" },
  { level: 130, name: "Distinguished Student", description: "Excellence achieved", ageRange: "16-17", gradeEquivalent: "12th Grade" },
  { level: 140, name: "College Ready", description: "University level", ageRange: "17-18", gradeEquivalent: "College Freshman" },
  { level: 150, name: "Advanced Thinker", description: "Advanced studies", ageRange: "18-19", gradeEquivalent: "College Sophomore" },
  { level: 160, name: "Grand Master", description: "Ultimate achievement", ageRange: "19+", gradeEquivalent: "College Senior+" },
];

export function getLevelTier(level: number): LevelInfo {
  const sorted = [...LEVEL_TIERS].sort((a, b) => b.level - a.level);
  return sorted.find(t => level >= t.level) || LEVEL_TIERS[0];
}

export const SCHOOL_CATEGORIES: SchoolCategory[] = [
  {
    id: "math",
    name: "Mathematics",
    icon: "hash",
    color: "#3B82F6",
    subjects: [
      {
        id: "counting",
        name: "Counting & Numbers",
        icon: "type",
        color: "#60A5FA",
        categoryId: "math",
        description: "Learn to count and recognize numbers",
        subtopics: [
          { id: "basic-counting", name: "Basic Counting", icon: "1", description: "Count from 1 to 100" },
          { id: "number-recognition", name: "Number Recognition", icon: "hash", description: "Recognize and write numbers" },
          { id: "skip-counting", name: "Skip Counting", icon: "fast-forward", description: "Count by 2s, 5s, 10s" },
        ]
      },
      {
        id: "addition",
        name: "Addition",
        icon: "plus",
        color: "#34D399",
        categoryId: "math",
        description: "Master the art of adding numbers",
        subtopics: [
          { id: "simple-addition", name: "Simple Addition", icon: "plus", description: "Add single digits" },
          { id: "double-digit-addition", name: "Double Digit", icon: "plus-circle", description: "Add larger numbers" },
          { id: "mental-addition", name: "Mental Math", icon: "cpu", description: "Quick mental calculations" },
        ]
      },
      {
        id: "subtraction",
        name: "Subtraction",
        icon: "minus",
        color: "#F87171",
        categoryId: "math",
        description: "Learn to subtract and find differences",
        subtopics: [
          { id: "simple-subtraction", name: "Simple Subtraction", icon: "minus", description: "Subtract single digits" },
          { id: "borrowing", name: "Borrowing", icon: "corner-down-left", description: "Subtract with borrowing" },
        ]
      },
      {
        id: "multiplication",
        name: "Multiplication",
        icon: "x",
        color: "#A78BFA",
        categoryId: "math",
        description: "Multiply numbers together",
        subtopics: [
          { id: "times-tables", name: "Times Tables", icon: "grid", description: "Memorize multiplication facts" },
          { id: "multi-digit-mult", name: "Multi-Digit", icon: "layers", description: "Multiply larger numbers" },
        ]
      },
      {
        id: "division",
        name: "Division",
        icon: "divide",
        color: "#FBBF24",
        categoryId: "math",
        description: "Divide and conquer numbers",
        subtopics: [
          { id: "basic-division", name: "Basic Division", icon: "divide", description: "Simple division facts" },
          { id: "long-division", name: "Long Division", icon: "align-left", description: "Divide larger numbers" },
        ]
      },
      {
        id: "algebra",
        name: "Algebra",
        icon: "code",
        color: "#EC4899",
        categoryId: "math",
        description: "Solve equations with variables",
        subtopics: [
          { id: "variables", name: "Variables", icon: "x", description: "Introduction to variables" },
          { id: "equations", name: "Equations", icon: "equal", description: "Solve basic equations" },
          { id: "polynomials", name: "Polynomials", icon: "trending-up", description: "Work with polynomial expressions" },
        ]
      },
      {
        id: "geometry",
        name: "Geometry",
        icon: "hexagon",
        color: "#14B8A6",
        categoryId: "math",
        description: "Explore shapes and space",
        subtopics: [
          { id: "shapes-2d", name: "2D Shapes", icon: "square", description: "Triangles, squares, circles" },
          { id: "shapes-3d", name: "3D Shapes", icon: "box", description: "Cubes, spheres, pyramids" },
          { id: "angles", name: "Angles", icon: "corner-right-down", description: "Measure and calculate angles" },
          { id: "area-perimeter", name: "Area & Perimeter", icon: "maximize", description: "Calculate area and perimeter" },
        ]
      },
      {
        id: "calculus",
        name: "Calculus",
        icon: "trending-up",
        color: "#8B5CF6",
        categoryId: "math",
        description: "Advanced mathematical analysis",
        subtopics: [
          { id: "limits", name: "Limits", icon: "arrow-right", description: "Understanding limits" },
          { id: "derivatives", name: "Derivatives", icon: "activity", description: "Rates of change" },
          { id: "integrals", name: "Integrals", icon: "bar-chart-2", description: "Areas under curves" },
        ]
      },
    ]
  },
  {
    id: "science",
    name: "Science",
    icon: "zap",
    color: "#10B981",
    subjects: [
      {
        id: "biology",
        name: "Biology",
        icon: "heart",
        color: "#34D399",
        categoryId: "science",
        description: "Study of living things",
        subtopics: [
          { id: "cells", name: "Cells", icon: "circle", description: "Building blocks of life" },
          { id: "plants", name: "Plants", icon: "sun", description: "Plant biology and photosynthesis" },
          { id: "animals", name: "Animals", icon: "github", description: "Animal kingdoms and classification" },
          { id: "human-body", name: "Human Body", icon: "user", description: "Anatomy and physiology" },
          { id: "genetics", name: "Genetics", icon: "git-branch", description: "DNA and heredity" },
        ]
      },
      {
        id: "physics",
        name: "Physics",
        icon: "zap",
        color: "#60A5FA",
        categoryId: "science",
        description: "Laws of nature and energy",
        subtopics: [
          { id: "motion", name: "Motion", icon: "move", description: "Forces and movement" },
          { id: "energy", name: "Energy", icon: "battery-charging", description: "Forms of energy" },
          { id: "electricity", name: "Electricity", icon: "zap", description: "Electrical circuits" },
          { id: "waves", name: "Waves", icon: "activity", description: "Sound and light waves" },
        ]
      },
      {
        id: "chemistry",
        name: "Chemistry",
        icon: "droplet",
        color: "#A78BFA",
        categoryId: "science",
        description: "Study of matter and reactions",
        subtopics: [
          { id: "elements", name: "Elements", icon: "grid", description: "Periodic table basics" },
          { id: "compounds", name: "Compounds", icon: "link", description: "Chemical compounds" },
          { id: "reactions", name: "Reactions", icon: "refresh-cw", description: "Chemical reactions" },
          { id: "acids-bases", name: "Acids & Bases", icon: "droplet", description: "pH and solutions" },
        ]
      },
      {
        id: "earth-science",
        name: "Earth Science",
        icon: "globe",
        color: "#F59E0B",
        categoryId: "science",
        description: "Our planet and beyond",
        subtopics: [
          { id: "geology", name: "Geology", icon: "layers", description: "Rocks and minerals" },
          { id: "weather", name: "Weather", icon: "cloud", description: "Meteorology basics" },
          { id: "astronomy", name: "Astronomy", icon: "star", description: "Stars and planets" },
          { id: "oceans", name: "Oceans", icon: "anchor", description: "Marine science" },
        ]
      },
    ]
  },
  {
    id: "humanities",
    name: "Humanities",
    icon: "book-open",
    color: "#FB923C",
    subjects: [
      {
        id: "reading",
        name: "Reading",
        icon: "book-open",
        color: "#FB923C",
        categoryId: "humanities",
        description: "Reading comprehension skills",
        subtopics: [
          { id: "phonics", name: "Phonics", icon: "volume-2", description: "Letter sounds and blending" },
          { id: "vocabulary", name: "Vocabulary", icon: "book", description: "Word knowledge" },
          { id: "comprehension", name: "Comprehension", icon: "file-text", description: "Understanding what you read" },
          { id: "literature", name: "Literature", icon: "bookmark", description: "Classic and modern works" },
        ]
      },
      {
        id: "writing",
        name: "Writing",
        icon: "edit-3",
        color: "#EC4899",
        categoryId: "humanities",
        description: "Express yourself through words",
        subtopics: [
          { id: "handwriting", name: "Handwriting", icon: "edit", description: "Penmanship and letter formation" },
          { id: "sentences", name: "Sentences", icon: "align-left", description: "Building sentences" },
          { id: "paragraphs", name: "Paragraphs", icon: "file-text", description: "Paragraph structure" },
          { id: "essays", name: "Essays", icon: "file", description: "Essay writing" },
          { id: "creative-writing", name: "Creative Writing", icon: "feather", description: "Stories and poems" },
        ]
      },
      {
        id: "history",
        name: "World History",
        icon: "clock",
        color: "#6366F1",
        categoryId: "humanities",
        description: "From Earth's formation to present day",
        subtopics: [
          { id: "ancient-history", name: "Ancient History", icon: "archive", description: "Early civilizations" },
          { id: "medieval-history", name: "Medieval Era", icon: "shield", description: "Middle Ages" },
          { id: "modern-history", name: "Modern History", icon: "calendar", description: "Recent centuries" },
          { id: "world-wars", name: "World Wars", icon: "flag", description: "20th century conflicts" },
          { id: "earth-formation", name: "Earth Formation", icon: "globe", description: "How our planet began" },
        ]
      },
      {
        id: "geography",
        name: "Geography",
        icon: "map",
        color: "#14B8A6",
        categoryId: "humanities",
        description: "Countries, maps, and cultures",
        subtopics: [
          { id: "continents", name: "Continents", icon: "map", description: "World's 7 continents" },
          { id: "countries", name: "Countries", icon: "flag", description: "Nations of the world" },
          { id: "capitals", name: "Capitals", icon: "map-pin", description: "Capital cities" },
          { id: "physical-geography", name: "Physical Features", icon: "mountain", description: "Mountains, rivers, deserts" },
          { id: "cultures", name: "Cultures", icon: "users", description: "World cultures and traditions" },
        ]
      },
    ]
  },
  {
    id: "arts",
    name: "Arts & Skills",
    icon: "palette",
    color: "#8B5CF6",
    subjects: [
      {
        id: "music",
        name: "Music",
        icon: "music",
        color: "#EF4444",
        categoryId: "arts",
        description: "Rhythm, melody, and instruments",
        subtopics: [
          { id: "rhythm", name: "Rhythm", icon: "clock", description: "Beat and tempo" },
          { id: "melody", name: "Melody", icon: "music", description: "Tunes and notes" },
          { id: "instruments", name: "Instruments", icon: "speaker", description: "Learn about instruments" },
          { id: "music-theory", name: "Music Theory", icon: "book", description: "Reading and writing music" },
        ]
      },
      {
        id: "coding",
        name: "Coding",
        icon: "terminal",
        color: "#06B6D4",
        categoryId: "arts",
        description: "Learn to code and create programs",
        subtopics: [
          { id: "logic", name: "Logic & Algorithms", icon: "git-merge", description: "Thinking like a programmer" },
          { id: "python-basics", name: "Python Basics", icon: "code", description: "First programming language" },
          { id: "web-basics", name: "Web Development", icon: "globe", description: "HTML, CSS, JavaScript" },
          { id: "game-dev", name: "Game Development", icon: "play", description: "Create simple games" },
        ]
      },
      {
        id: "gardening",
        name: "Gardening",
        icon: "sun",
        color: "#84CC16",
        categoryId: "arts",
        description: "Grow plants and make soil",
        subtopics: [
          { id: "soil-basics", name: "Soil Basics", icon: "layers", description: "Understanding soil" },
          { id: "planting", name: "Planting", icon: "sun", description: "How to plant seeds" },
          { id: "plant-care", name: "Plant Care", icon: "droplet", description: "Watering and maintenance" },
          { id: "composting", name: "Composting", icon: "refresh-cw", description: "Making your own soil" },
          { id: "vegetables", name: "Growing Vegetables", icon: "sun", description: "Edible garden" },
        ]
      },
      {
        id: "art",
        name: "Visual Art",
        icon: "palette",
        color: "#F59E0B",
        categoryId: "arts",
        description: "Drawing, painting, and creativity",
        subtopics: [
          { id: "drawing", name: "Drawing", icon: "edit-2", description: "Pencil and pen techniques" },
          { id: "painting", name: "Painting", icon: "droplet", description: "Colors and brushwork" },
          { id: "art-history", name: "Art History", icon: "image", description: "Famous artists and movements" },
        ]
      },
    ]
  },
  {
    id: "other",
    name: "Other Subjects",
    icon: "folder",
    color: "#6B7280",
    subjects: [
      {
        id: "languages",
        name: "Languages",
        icon: "message-circle",
        color: "#6366F1",
        categoryId: "other",
        description: "Learn to speak new languages",
        subtopics: [
          { id: "spanish", name: "Spanish", icon: "globe", description: "Learn Spanish" },
          { id: "french", name: "French", icon: "globe", description: "Learn French" },
          { id: "mandarin", name: "Mandarin", icon: "globe", description: "Learn Mandarin Chinese" },
        ]
      },
      {
        id: "life-skills",
        name: "Life Skills",
        icon: "briefcase",
        color: "#78716C",
        categoryId: "other",
        description: "Practical everyday skills",
        subtopics: [
          { id: "money", name: "Money & Finance", icon: "dollar-sign", description: "Managing money" },
          { id: "cooking", name: "Cooking", icon: "coffee", description: "Basic cooking skills" },
          { id: "safety", name: "Safety", icon: "shield", description: "Staying safe" },
        ]
      },
      {
        id: "pe",
        name: "Physical Education",
        icon: "activity",
        color: "#84CC16",
        categoryId: "other",
        description: "Sports, fitness, and health",
        subtopics: [
          { id: "fitness", name: "Fitness", icon: "activity", description: "Exercise and health" },
          { id: "sports", name: "Sports", icon: "target", description: "Team and individual sports" },
          { id: "nutrition", name: "Nutrition", icon: "heart", description: "Healthy eating" },
        ]
      },
    ]
  },
];

export interface SchoolActivity {
  id: string;
  type: "quiz" | "reading" | "video";
  title: string;
  content: string;
  questions?: SchoolQuestion[];
  videoUrl?: string;
}

export interface SchoolQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

export interface StarActivity {
  starNumber: number;
  activities: SchoolActivity[];
}

export function generateLevelContent(level: number, subjectId: string, subtopicId: string): StarActivity[] {
  const starActivities: StarActivity[] = [];
  
  for (let star = 1; star <= STARS_PER_LEVEL; star++) {
    const activities: SchoolActivity[] = [];
    const tierInfo = getLevelTier(level);
    
    activities.push({
      id: `${subjectId}-${level}-${star}-reading`,
      type: "reading",
      title: `Level ${level} - Star ${star} Reading`,
      content: `Welcome to Level ${level}, Star ${star}! This is where you'll learn about ${subtopicId.replace(/-/g, " ")}. ${tierInfo.description}. At this level (${tierInfo.gradeEquivalent}), you're learning important concepts that will help you grow as a learner. Keep going and earn all 50 stars to complete this level!`,
    });
    
    activities.push({
      id: `${subjectId}-${level}-${star}-quiz`,
      type: "quiz",
      title: `Level ${level} - Star ${star} Quiz`,
      content: `Test your knowledge of ${subtopicId.replace(/-/g, " ")}`,
      questions: [
        {
          id: `q1-${level}-${star}`,
          question: `What level are you currently on?`,
          options: [`Level ${level - 1}`, `Level ${level}`, `Level ${level + 1}`, `Level ${level + 2}`],
          correctAnswer: 1,
          explanation: `You are on Level ${level}! Great job learning!`
        },
        {
          id: `q2-${level}-${star}`,
          question: `How many stars do you need to complete each level?`,
          options: ["25 stars", "50 stars", "100 stars", "10 stars"],
          correctAnswer: 1,
          explanation: "You need to earn 50 stars to complete each level and unlock the next one!"
        },
        {
          id: `q3-${level}-${star}`,
          question: `Which star are you working on right now?`,
          options: [`Star ${star - 1}`, `Star ${star}`, `Star ${star + 1}`, `Star ${star + 2}`],
          correctAnswer: 1,
          explanation: `You're working on Star ${star}! Keep going!`
        },
      ]
    });
    
    activities.push({
      id: `${subjectId}-${level}-${star}-video`,
      type: "video",
      title: `Level ${level} - Star ${star} Video`,
      content: `Watch this educational video about ${subtopicId.replace(/-/g, " ")}`,
      videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    });
    
    starActivities.push({
      starNumber: star,
      activities,
    });
  }
  
  return starActivities;
}

export function getAllSubjects(): SchoolSubject[] {
  return SCHOOL_CATEGORIES.flatMap(cat => cat.subjects);
}

export function getSubjectById(subjectId: string): SchoolSubject | undefined {
  return getAllSubjects().find(s => s.id === subjectId);
}

export function getCategoryById(categoryId: SchoolCategoryId): SchoolCategory | undefined {
  return SCHOOL_CATEGORIES.find(c => c.id === categoryId);
}
