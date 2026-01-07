// frontend/types/api.ts
export type UUID = string;
export type SubjectCode = string;
export type DifficultyCode = string;
export type AgeRangeCode = string;

export interface Avatar {
  id: UUID;
  name: string;
  imagePath: string;
  isActive: boolean;
}

export interface Child {
  id: UUID;
  name: string;
  birthday: string; // yyyy-mm-dd
  interests: UUID[] | null; // consider UUID[] instead
  avatarId: UUID | null;
}

export interface Interest {
  id: UUID;
  name: string;
  label: string;
  icon: string;
  isActive: boolean;
}

export interface Subject {
  id: UUID;
  code: SubjectCode;
  name: string;
  icon: string;
  color: string;
}

export interface AgeRange {
  id: UUID;
  code: AgeRangeCode;
  name: string;
  minAge: number;
  maxAge: number | null;
  isActive: boolean; // recommended
}

export interface DifficultyThreshold {
  id: UUID;
  code: DifficultyCode;
  label: string;
  icon: string;
  color: string;
  threshold: number;
  isActive: boolean; // recommended
}

export interface Affirmation {
  id: UUID;
  text: string;
  image: string | null;
  gradient: [string, string];
  tags: string[] | null;
  ageRangeId: UUID | null;
}

export interface Flashcard {
  id: UUID;
  subjectId: UUID;
  question: string;
  answer: string;
  acceptableAnswers: string[] | null;
  difficultyCode: DifficultyCode;
  tags: string[] | null;
  ageRangeId: UUID | null;
}

export interface ChildProgress {
  childId: UUID;
  totalPoints: number;
  totalFlashcards: number;
  totalChores: number;
  totalOutdoor: number;
  totalAffirmations: number;
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string | null;
  currentLevel: string;
}

export interface SubjectFlashcardStats {
  subjectId: UUID;
  correct: number;
  correctStreak: number;
  longestStreak: number;
  completed: number;
  difficultyCode: DifficultyCode | null;
  nextDifficultyAtStreak: number | null;
  currentTierStartAtStreak: number;
}

export type SubjectProgress = {
  correct: number;
  correctStreak: number;
  longestStreak: number;
  completed: number;
  difficultyCode: DifficultyCode | null;
  nextDifficultyAtStreak: number | null;
  currentTierStartAtStreak: number;
};

export interface Chore {
  id: UUID;
  label: string;
  icon: string;
  isExtra: boolean;
  tags: string[] | null;
  ageRangeId: UUID | null;
}

export interface OutdoorActivity {
  id: UUID;
  name: string;
  category: string;
  icon: string;
  time: string;
  points: number;
  isDaily: boolean;
  tags: string[] | null;
  ageRangeId: UUID | null;
}

export interface Dashboard {
  child: Child;
  progress: ChildProgress;
  subjects: Subject[];
  flashcardsBySubject: Record<SubjectCode, SubjectFlashcardStats>;
}

export type DatePickerProps = {
  value: Date;
  maximumDate?: Date;
  onChange: (date: Date | null) => void;
  textColor?: string;
  bgColor?: string;
  borderColor?: string;
};