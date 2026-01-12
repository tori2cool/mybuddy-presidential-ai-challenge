// frontend/types/api.ts
// NOTE: This file contains shared frontend types.
// Dashboard-related outputs are aligned to backend/app/schemas/dashboard.py (source of truth).
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
  choices: string[];
  correctIndex: number;
  explanations: string[];
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

// NOTE: This `Dashboard` interface is a legacy/aggregate UI shape used in a few older components.
// It is NOT the same as the backend-aligned `DashboardOut` type below.
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

// ------------------------------
// Dashboard (backend-aligned, canonical)
// ------------------------------
// NOTE: `DashboardOut` is the canonical dashboard response shape and is aligned
// with the backend schema (backend/app/schemas/dashboard.py).
// Prefer using `DashboardOut` in all frontend code.

export type AchievementType = "daily" | "weekly" | "monthly" | "special";

export type AchievementOut = {
  id: UUID;
  code: string;
  title: string;
  description: string;
  icon: string;
  type: AchievementType;
  unlockedAt: string | null;
};

export type TodayStatsOut = {
  date: string;
  flashcardsCompleted: number;
  flashcardsCorrect: number;
  choresCompleted: number;
  outdoorActivities: number;
  affirmationsViewed: number;
  totalPoints: number;
};

export type WeekStatsOut = {
  weekStart: string;
  totalPoints: number;
  daysActive: number;
  flashcardsCompleted: number;
  choresCompleted: number;
  outdoorActivities: number;
  accuracyPct: number;
};

export type SubjectStatsOut = {
  completed: number;
  correct: number;
  correctStreak: number;
  longestStreak: number;
  difficultyCode: DifficultyCode | null;
  nextDifficultyAtStreak: number | null;
  currentTierStartAtStreak: number;
};

export type SubjectProgressOut = {
  correct: number;
  required: number;
  meetsRequirement: boolean;
};

export type BalancedProgressOut = {
  canLevelUp: boolean;
  currentLevel: string;
  nextLevel: string | null;
  requiredPerSubject: number;
  subjectProgress: Record<SubjectCode, SubjectProgressOut>;
  lowestSubject: SubjectCode | null;
  message: string;
};

export type RewardOut = {
  level: string;
  icon: string;
  color: string;
  nextAt: number | null;
  progress: number;
};

export type DashboardOut = {
  totalPoints: number;
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string | null;

  today: TodayStatsOut;
  week: WeekStatsOut;

  flashcardsBySubject: Record<SubjectCode, SubjectStatsOut>;

  // Backend sends these as flat totals (NOT nested).
  totalChoresCompleted: number;
  totalOutdoorActivities: number;
  totalAffirmationsViewed: number;

  // Daily completion state (UTC day), for persisted checkboxes/buttons
  todayCompletedChoreIds: UUID[];
  todayCompletedOutdoorActivityIds: UUID[];

  achievementsUnlocked: AchievementOut[];
  achievementsLocked: AchievementOut[];

  balanced: BalancedProgressOut;
  reward: RewardOut;
};

