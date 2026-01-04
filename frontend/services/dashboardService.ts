import { apiFetch, withTimeout } from "@/services/apiClient";

export type DifficultyTier = "easy" | "medium" | "hard";

export type AchievementOut = {
  id: string;
  title: string;
  description: string;
  icon: string;
  type: "daily" | "weekly" | "monthly" | "special";
  unlockedAt: string | null;
};

export type DashboardData = {
  /** Total points earned all-time */
  totalPoints: number;
  /** Current active-day streak */
  currentStreak: number;
  /** Best streak achieved */
  longestStreak: number;
  /** ISO date (YYYY-MM-DD) of last activity, or null */
  lastActiveDate: string | null;

  today: {
    date: string;
    flashcardsCompleted: number;
    flashcardsCorrect: number;
    choresCompleted: number;
    outdoorActivities: number;
    affirmationsViewed: number;
    totalPoints: number;
  };

  week: {
    weekStart: string;
    totalPoints: number;
    daysActive: number;
    flashcardsCompleted: number;
    choresCompleted: number;
    outdoorActivities: number;
    accuracyPct: number;
  };

  flashcardsBySubject: Record<
    string,
    {
      completed: number;
      correct: number;
      correctStreak: number;
      longestStreak: number;
      difficulty: DifficultyTier;
      nextDifficultyAtStreak: number | null;
      currentTierStartAtStreak: number;
    }
  >;

  totals: {
    choresCompleted: number;
    outdoorActivities: number;
    affirmationsViewed: number;
  };

  achievementsUnlocked: AchievementOut[];
  achievementsLocked: AchievementOut[];

  balanced: {
    canLevelUp: boolean;
    currentLevel: string;
    nextLevel: string | null;
    requiredPerSubject: number;
    subjectProgress: Record<string, Record<string, number | boolean>>;
    lowestSubject: string | null;
    message: string;
  };

  reward: {
    level: string;
    icon: string;
    color: string;
    nextAt: number | null;
    progress: number;
  };
};

export type GetDashboardResult = {
  dashboard: DashboardData;
  fetchedAt: string; // ISO
};

const DASHBOARD_TIMEOUT_MS = 3000;

function isNonNullObject(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object";
}

function asNumber(v: unknown, fallback = 0): number {
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}

function asStringOrNull(v: unknown): string | null {
  return typeof v === "string" ? v : null;
}

function coerceDashboardData(payload: unknown): DashboardData {
  if (!isNonNullObject(payload)) {
    throw new Error("Invalid dashboard payload: expected object");
  }

  const todayRaw = isNonNullObject(payload.today) ? payload.today : {};
  const weekRaw = isNonNullObject(payload.week) ? payload.week : {};
  const bySubjectRaw = isNonNullObject(payload.flashcardsBySubject)
    ? payload.flashcardsBySubject
    : {};

  const achievementsUnlockedRaw = Array.isArray(payload.achievementsUnlocked)
    ? payload.achievementsUnlocked
    : [];
  const achievementsLockedRaw = Array.isArray(payload.achievementsLocked)
    ? payload.achievementsLocked
    : [];

  const balancedRaw = isNonNullObject(payload.balanced) ? payload.balanced : {};
  const rewardRaw = isNonNullObject(payload.reward) ? payload.reward : {};

  const flashcardsBySubject: DashboardData["flashcardsBySubject"] = {};
  for (const [subjectId, v] of Object.entries(bySubjectRaw)) {
    const s = isNonNullObject(v) ? v : {};
    const difficulty =
      s.difficulty === "easy" || s.difficulty === "medium" || s.difficulty === "hard"
        ? s.difficulty
        : "easy";

    flashcardsBySubject[subjectId] = {
      completed: asNumber(s.completed),
      correct: asNumber(s.correct),
      correctStreak: asNumber(s.correctStreak),
      longestStreak: asNumber(s.longestStreak),
      difficulty,
      nextDifficultyAtStreak:
        s.nextDifficultyAtStreak === null || typeof s.nextDifficultyAtStreak === "number"
          ? s.nextDifficultyAtStreak
          : null,
      currentTierStartAtStreak: asNumber(s.currentTierStartAtStreak),
    };
  }

  const coerceAchievement = (a: unknown): AchievementOut | null => {
    if (!isNonNullObject(a)) return null;
    const type =
      a.type === "daily" ||
      a.type === "weekly" ||
      a.type === "monthly" ||
      a.type === "special"
        ? a.type
        : "daily";

    return {
      id: typeof a.id === "string" ? a.id : "",
      title: typeof a.title === "string" ? a.title : "",
      description: typeof a.description === "string" ? a.description : "",
      icon: typeof a.icon === "string" ? a.icon : "award",
      type,
      unlockedAt: asStringOrNull(a.unlockedAt),
    };
  };

  return {
    totalPoints: asNumber(payload.totalPoints),
    currentStreak: asNumber(payload.currentStreak),
    longestStreak: asNumber(payload.longestStreak),
    lastActiveDate: asStringOrNull(payload.lastActiveDate),
    today: {
      date:
        typeof todayRaw.date === "string"
          ? todayRaw.date
          : new Date().toISOString().split("T")[0],
      flashcardsCompleted: asNumber(todayRaw.flashcardsCompleted),
      flashcardsCorrect: asNumber(todayRaw.flashcardsCorrect),
      choresCompleted: asNumber(todayRaw.choresCompleted),
      outdoorActivities: asNumber(todayRaw.outdoorActivities),
      affirmationsViewed: asNumber(todayRaw.affirmationsViewed),
      totalPoints: asNumber(todayRaw.totalPoints),
    },
    week: {
      weekStart:
        typeof weekRaw.weekStart === "string"
          ? weekRaw.weekStart
          : new Date().toISOString().split("T")[0],
      totalPoints: asNumber(weekRaw.totalPoints),
      daysActive: asNumber(weekRaw.daysActive),
      flashcardsCompleted: asNumber(weekRaw.flashcardsCompleted),
      choresCompleted: asNumber(weekRaw.choresCompleted),
      outdoorActivities: asNumber(weekRaw.outdoorActivities),
      accuracyPct: asNumber(weekRaw.accuracyPct),
    },
    flashcardsBySubject,
    totals: {
      choresCompleted: asNumber(payload.totalChoresCompleted),
      outdoorActivities: asNumber(payload.totalOutdoorActivities),
      affirmationsViewed: asNumber(payload.totalAffirmationsViewed),
    },
    achievementsUnlocked: achievementsUnlockedRaw
      .map(coerceAchievement)
      .filter((x): x is AchievementOut => !!x && !!x.id),
    achievementsLocked: achievementsLockedRaw
      .map(coerceAchievement)
      .filter((x): x is AchievementOut => !!x && !!x.id),
    balanced: {
      canLevelUp: !!balancedRaw.canLevelUp,
      currentLevel: typeof balancedRaw.currentLevel === "string" ? balancedRaw.currentLevel : "",
      nextLevel: asStringOrNull(balancedRaw.nextLevel),
      requiredPerSubject: asNumber(balancedRaw.requiredPerSubject),
      subjectProgress: isNonNullObject(balancedRaw.subjectProgress)
        ? (balancedRaw.subjectProgress as Record<string, Record<string, number | boolean>>)
        : {},
      lowestSubject: asStringOrNull(balancedRaw.lowestSubject),
      message: typeof balancedRaw.message === "string" ? balancedRaw.message : "",
    },
    reward: {
      level: typeof rewardRaw.level === "string" ? rewardRaw.level : "",
      icon: typeof rewardRaw.icon === "string" ? rewardRaw.icon : "award",
      color: typeof rewardRaw.color === "string" ? rewardRaw.color : "#8B5CF6",
      nextAt:
        typeof rewardRaw.nextAt === "number" && Number.isFinite(rewardRaw.nextAt)
          ? rewardRaw.nextAt
          : null,
      progress: Math.max(0, Math.min(100, asNumber(rewardRaw.progress))),
    },
  };
}

export async function getDashboard(childId: string): Promise<GetDashboardResult> {
  const raw = await withTimeout(
    apiFetch<unknown>(`/children/${encodeURIComponent(childId)}/dashboard`, {
      method: "GET",
    }),
    DASHBOARD_TIMEOUT_MS,
  );

  return {
    dashboard: coerceDashboardData(raw),
    fetchedAt: new Date().toISOString(),
  };
}
