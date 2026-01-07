// frontend/services/dashboardService.ts
import { apiFetch } from "@/services/apiClient";
import type { UUID } from "@/types/models";
import type { DifficultyCode } from "@/types/models";

export type AchievementOut = {
  id: UUID;
  title: string;
  description: string;
  icon: string;
  type: "daily" | "weekly" | "monthly" | "special";
  unlockedAt: string | null; // ISO string or null (UI can ignore if desired)
};

export type DashboardData = {
  totalPoints: number;
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string | null; // date-only; not a timestamp

  today: {
    date: string; // date-only
    flashcardsCompleted: number;
    flashcardsCorrect: number;
    choresCompleted: number;
    outdoorActivities: number;
    affirmationsViewed: number;
    totalPoints: number;
  };

  week: {
    weekStart: string; // date-only
    totalPoints: number;
    daysActive: number;
    flashcardsCompleted: number;
    choresCompleted: number;
    outdoorActivities: number;
    accuracyPct: number;
  };

  // Keys are Subject codes (SubjectCode = str, e.g., "math", "science")
  flashcardsBySubject: Record<
    string,
    {
      completed: number;
      correct: number;
      correctStreak: number;
      longestStreak: number;
      difficultyCode: DifficultyCode;
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

function isNonNullObject(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object";
}

function requireNonNullObject(v: unknown, msg: string): Record<string, unknown> {
  if (!isNonNullObject(v)) throw new Error(msg);
  return v;
}

function requireNumber(v: unknown, msg: string): number {
  if (typeof v !== "number" || !Number.isFinite(v)) throw new Error(msg);
  return v;
}

function asStringOrNull(v: unknown): string | null {
  return typeof v === "string" ? v : null;
}

function requireString(v: unknown, msg: string): string {
  if (typeof v !== "string" || v.length === 0) throw new Error(msg);
  return v;
}

function requireDifficultyCode(v: unknown, msg: string): string {
  if (typeof v === "string" && v.length > 0) return v;
  throw new Error(msg);
}

function requireNumberOrNull(v: unknown, msg: string): number | null {
  if (v === null) return null;
  if (typeof v === "number" && Number.isFinite(v)) return v;
  throw new Error(msg);
}

function coerceAchievement(a: unknown, path: string): AchievementOut {
  const o = requireNonNullObject(a, `${path}: expected object`);
  const type =
    o.type === "daily" || o.type === "weekly" || o.type === "monthly" || o.type === "special"
      ? o.type
      : (() => {
          throw new Error(`${path}.type: invalid`);
        })();

  return {
    id: requireString(o.id, `${path}.id: expected string`),
    title: requireString(o.title, `${path}.title: expected string`),
    description: requireString(o.description, `${path}.description: expected string`),
    icon: typeof o.icon === "string" && o.icon.length > 0 ? o.icon : "award",
    type,
    unlockedAt: asStringOrNull(o.unlockedAt),
  };
}

function coerceTotals(p: Record<string, unknown>): DashboardData["totals"] {
  // Preferred shape: totals: { choresCompleted, outdoorActivities, affirmationsViewed }
  if (isNonNullObject(p.totals)) {
    const t = p.totals as Record<string, unknown>;
    return {
      choresCompleted: requireNumber(t.choresCompleted, "dashboard.totals.choresCompleted: expected number"),
      outdoorActivities: requireNumber(t.outdoorActivities, "dashboard.totals.outdoorActivities: expected number"),
      affirmationsViewed: requireNumber(t.affirmationsViewed, "dashboard.totals.affirmationsViewed: expected number"),
    };
  }

  // Back-compat: flat totals fields (what you currently parse)
  return {
    choresCompleted: requireNumber(p.totalChoresCompleted, "dashboard.totalChoresCompleted: expected number"),
    outdoorActivities: requireNumber(p.totalOutdoorActivities, "dashboard.totalOutdoorActivities: expected number"),
    affirmationsViewed: requireNumber(p.totalAffirmationsViewed, "dashboard.totalAffirmationsViewed: expected number"),
  };
}

function coerceDashboardData(payload: unknown): DashboardData {
  const p = requireNonNullObject(payload, "Invalid dashboard payload: expected object");

  const todayRaw = requireNonNullObject(p.today, "dashboard.today: expected object");
  const weekRaw = requireNonNullObject(p.week, "dashboard.week: expected object");
  const bySubjectRaw = requireNonNullObject(
    p.flashcardsBySubject,
    "dashboard.flashcardsBySubject: expected object"
  );

  const achievementsUnlockedRaw = Array.isArray(p.achievementsUnlocked)
    ? p.achievementsUnlocked
    : (() => {
        throw new Error("dashboard.achievementsUnlocked: expected array");
      })();

  const achievementsLockedRaw = Array.isArray(p.achievementsLocked)
    ? p.achievementsLocked
    : (() => {
        throw new Error("dashboard.achievementsLocked: expected array");
      })();

  const balancedRaw = requireNonNullObject(p.balanced, "dashboard.balanced: expected object");
  const rewardRaw = requireNonNullObject(p.reward, "dashboard.reward: expected object");

  const flashcardsBySubject: DashboardData["flashcardsBySubject"] = {};
  for (const [subjectId, v] of Object.entries(bySubjectRaw)) {
    const s = requireNonNullObject(v, `dashboard.flashcardsBySubject.${subjectId}: expected object`);
    flashcardsBySubject[subjectId] = {
      completed: requireNumber(s.completed, `...${subjectId}.completed: expected number`),
      correct: requireNumber(s.correct, `...${subjectId}.correct: expected number`),
      correctStreak: requireNumber(s.correctStreak, `...${subjectId}.correctStreak: expected number`),
      longestStreak: requireNumber(s.longestStreak, `...${subjectId}.longestStreak: expected number`),
      difficultyCode: requireDifficultyCode(s.difficultyCode, `...${subjectId}.difficultyCode: expected string`),
      nextDifficultyAtStreak: requireNumberOrNull(
        s.nextDifficultyAtStreak,
        `...${subjectId}.nextDifficultyAtStreak: expected number|null`
      ),
      currentTierStartAtStreak: requireNumber(
        s.currentTierStartAtStreak,
        `...${subjectId}.currentTierStartAtStreak: expected number`
      ),
    };
  }

  const subjectProgress = isNonNullObject(balancedRaw.subjectProgress)
    ? (balancedRaw.subjectProgress as Record<string, Record<string, number | boolean>>)
    : (() => {
        throw new Error("dashboard.balanced.subjectProgress: expected object");
      })();

  return {
    totalPoints: requireNumber(p.totalPoints, "dashboard.totalPoints: expected number"),
    currentStreak: requireNumber(p.currentStreak, "dashboard.currentStreak: expected number"),
    longestStreak: requireNumber(p.longestStreak, "dashboard.longestStreak: expected number"),
    lastActiveDate: asStringOrNull(p.lastActiveDate),

    today: {
      date: requireString(todayRaw.date, "dashboard.today.date: expected string"),
      flashcardsCompleted: requireNumber(todayRaw.flashcardsCompleted, "dashboard.today.flashcardsCompleted: expected number"),
      flashcardsCorrect: requireNumber(todayRaw.flashcardsCorrect, "dashboard.today.flashcardsCorrect: expected number"),
      choresCompleted: requireNumber(todayRaw.choresCompleted, "dashboard.today.choresCompleted: expected number"),
      outdoorActivities: requireNumber(todayRaw.outdoorActivities, "dashboard.today.outdoorActivities: expected number"),
      affirmationsViewed: requireNumber(todayRaw.affirmationsViewed, "dashboard.today.affirmationsViewed: expected number"),
      totalPoints: requireNumber(todayRaw.totalPoints, "dashboard.today.totalPoints: expected number"),
    },

    week: {
      weekStart: requireString(weekRaw.weekStart, "dashboard.week.weekStart: expected string"),
      totalPoints: requireNumber(weekRaw.totalPoints, "dashboard.week.totalPoints: expected number"),
      daysActive: requireNumber(weekRaw.daysActive, "dashboard.week.daysActive: expected number"),
      flashcardsCompleted: requireNumber(weekRaw.flashcardsCompleted, "dashboard.week.flashcardsCompleted: expected number"),
      choresCompleted: requireNumber(weekRaw.choresCompleted, "dashboard.week.choresCompleted: expected number"),
      outdoorActivities: requireNumber(weekRaw.outdoorActivities, "dashboard.week.outdoorActivities: expected number"),
      accuracyPct: requireNumber(weekRaw.accuracyPct, "dashboard.week.accuracyPct: expected number"),
    },

    flashcardsBySubject,

    totals: coerceTotals(p),

    achievementsUnlocked: achievementsUnlockedRaw.map((a, i) =>
      coerceAchievement(a, `dashboard.achievementsUnlocked[${i}]`)
    ),
    achievementsLocked: achievementsLockedRaw.map((a, i) =>
      coerceAchievement(a, `dashboard.achievementsLocked[${i}]`)
    ),

    balanced: {
      canLevelUp: !!balancedRaw.canLevelUp,
      currentLevel: requireString(balancedRaw.currentLevel, "dashboard.balanced.currentLevel: expected string"),
      nextLevel: asStringOrNull(balancedRaw.nextLevel),
      requiredPerSubject: requireNumber(balancedRaw.requiredPerSubject, "dashboard.balanced.requiredPerSubject: expected number"),
      subjectProgress,
      lowestSubject: asStringOrNull(balancedRaw.lowestSubject),
      message: requireString(balancedRaw.message, "dashboard.balanced.message: expected string"),
    },

    reward: {
      level: requireString(rewardRaw.level, "dashboard.reward.level: expected string"),
      icon: typeof rewardRaw.icon === "string" && rewardRaw.icon.length > 0 ? rewardRaw.icon : "award",
      color: requireString(rewardRaw.color, "dashboard.reward.color: expected string"),
      nextAt: requireNumberOrNull(rewardRaw.nextAt, "dashboard.reward.nextAt: expected number|null"),
      progress: requireNumber(rewardRaw.progress, "dashboard.reward.progress: expected number"),
    },
  };
}

export async function getDashboard(childId: UUID): Promise<DashboardData> {
  if (!childId || childId.trim().length === 0) {
    throw new Error("getDashboard: childId is required");
  }

  const raw = await apiFetch<unknown>(`/children/${encodeURIComponent(childId)}/dashboard`, {
    method: "GET",
  });

  // Support both:
  // - { dashboard: {...} }
  // - {...} (dashboard root)
  if (isNonNullObject(raw) && "dashboard" in raw) {
    const r = raw as Record<string, unknown>;
    return coerceDashboardData(r.dashboard);
  }

  return coerceDashboardData(raw);
}
