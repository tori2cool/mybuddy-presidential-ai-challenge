import { DifficultyTier } from "@/types/models";

export const DIFFICULTY_LABELS: Record<
  DifficultyTier,
  { label: string; icon: string; color: string }
> = {
  easy: { label: "Easy", icon: "smile", color: "#10B981" },
  medium: { label: "Medium", icon: "zap", color: "#F59E0B" },
  hard: { label: "Hard", icon: "award", color: "#EF4444" },
};
