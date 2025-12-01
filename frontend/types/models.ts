import { Gradients } from "@/constants/theme";

export type DifficultyTier = "easy" | "medium" | "hard";
export type SubjectId = "math" | "science" | "reading" | "history";

export interface Child {
  id: string;
  name: string;
  birthday: string | null;
  interests: string[];
  avatar: string | null;
}

export interface Affirmation {
  id: string;
  text: string;
  gradient: readonly [string, string];
}

export interface Flashcard {
  id: string;
  question: string;
  answer: string;
  acceptableAnswers: string[];
  difficulty: DifficultyTier;
}

export interface Subject {
  id: SubjectId;
  name: string;
  icon: "grid" | "zap" | "book-open" | "globe";
  color: string;
}

export interface Chore {
  id: string;
  label: string;
  icon: "home" | "user" | "trash-2" | "star";
  isExtra?: boolean;
}

export interface OutdoorActivity {
  id: string;
  name: string;
  category: string;
  icon: "zap" | "compass" | "circle" | "edit-3" | "activity";
  time: string;
  points: number;
  isDaily: boolean;
}