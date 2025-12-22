import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  ReactNode,
} from "react";
import { AppState, AppStateStatus } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { useCurrentChildId } from "@/contexts/ChildContext";
import { useProgress } from "@/contexts/ProgressContext";
import { useAuth } from "@/contexts/AuthContext";
import {
  DashboardData,
  getDashboard,
} from "@/services/dashboardService";
import {
  EventAckOut,
  postProgressEvent,
  ProgressEventIn,
} from "@/services/eventsService";

export type DashboardStatus = "idle" | "loading" | "refreshing" | "error";
export type DashboardSource = "cache" | "network" | "fallback";

export type DashboardState = {
  data: DashboardData | null;
  status: DashboardStatus;
  error: string | null;
  lastUpdatedAt: string | null;
  source: DashboardSource;
};

export type RefreshOptions = {
  force?: boolean;
};

type DashboardContextValue = DashboardState & {
  refreshDashboard: (options?: RefreshOptions) => Promise<void>;
  flushDebouncedRefresh: () => Promise<void>;
  postEvent: (event: Omit<ProgressEventIn, "childId">) => Promise<EventAckOut | null>;
};

const DashboardContext = createContext<DashboardContextValue | undefined>(undefined);

const DASHBOARD_CACHE_VERSION = "v1";

function dashboardCacheKey(params: { userId: string; childId: string }) {
  return `dashboard:${DASHBOARD_CACHE_VERSION}:user:${params.userId}:child:${params.childId}`;
}

function safeJsonParse<T>(text: string): T | null {
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

function getTodayISODate(): string {
  return new Date().toISOString().split("T")[0];
}

function getWeekStartISODate(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day;
  const weekStart = new Date(now.setDate(diff));
  return weekStart.toISOString().split("T")[0];
}

function deriveDashboardFromProgress(progress: ReturnType<typeof useProgress>["progress"]): DashboardData {
  const todayDate = getTodayISODate();
  const todayStats = progress.dailyStats.find((s) => s.date === todayDate);

  const flashcardsBySubject: DashboardData["flashcardsBySubject"] = {};
  for (const [subjectId, s] of Object.entries(progress.flashcardsBySubject)) {
    flashcardsBySubject[subjectId] = {
      completed: s?.completed ?? 0,
      correct: s?.correct ?? 0,
      difficulty: (s?.difficulty ?? "easy") as any,
    };
  }

  // Existing ProgressContext includes week stats / reward / balanced progress / achievements.
  // Use them only as a fallback when backend dashboard is unavailable.
  const weekStats = progress.weeklyStats.find((w) => w.weekStart === getWeekStartISODate());

  return {
    totalPoints: progress.totalPoints,
    currentStreak: progress.currentStreak,
    longestStreak: progress.longestStreak,
    lastActiveDate: progress.lastActiveDate,
    today: {
      date: todayDate,
      flashcardsCompleted: todayStats?.flashcardsCompleted ?? 0,
      flashcardsCorrect: todayStats?.flashcardsCorrect ?? 0,
      choresCompleted: todayStats?.choresCompleted ?? 0,
      outdoorActivities: todayStats?.outdoorActivities ?? 0,
      affirmationsViewed: todayStats?.affirmationsViewed ?? 0,
      totalPoints: todayStats?.totalPoints ?? 0,
    },
    week: {
      weekStart: weekStats?.weekStart ?? todayDate,
      totalPoints: weekStats?.totalPoints ?? 0,
      daysActive: weekStats?.daysActive ?? 0,
      flashcardsCompleted: weekStats?.flashcardsCompleted ?? 0,
      choresCompleted: weekStats?.choresCompleted ?? 0,
      outdoorActivities: weekStats?.outdoorActivities ?? 0,
      accuracyPct: weekStats?.accuracyPct ?? 0,
    },
    flashcardsBySubject,
    totals: {
      choresCompleted: progress.totalChoresCompleted,
      outdoorActivities: progress.totalOutdoorActivities,
      affirmationsViewed: progress.totalAffirmationsViewed,
    },
    achievementsUnlocked: progress.achievements
      .filter((a) => !!a.unlockedAt)
      .map((a) => ({
        id: a.id,
        title: a.title,
        description: a.description,
        icon: a.icon,
        type: a.type as any,
        unlockedAt: a.unlockedAt ?? null,
      })),
    achievementsLocked: progress.achievements
      .filter((a) => !a.unlockedAt)
      .map((a) => ({
        id: a.id,
        title: a.title,
        description: a.description,
        icon: a.icon,
        type: a.type as any,
        unlockedAt: null,
      })),
    balanced: progress.balancedProgress,
    reward: progress.rewardLevel,
  };
}

type CachedDashboard = {
  dashboard: DashboardData;
  lastUpdatedAt: string;
};

export function DashboardProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const userId = user?.sub ?? null;
  const { childId } = useCurrentChildId();
  const { progress } = useProgress();

  const [state, setState] = useState<DashboardState>({
    data: null,
    status: "idle",
    error: null,
    lastUpdatedAt: null,
    source: "fallback",
  });

  const inflightRefresh = useRef<Promise<void> | null>(null);

  // Debounced refresh control
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingDebouncedRefresh = useRef<Promise<void> | null>(null);

  const writeCache = useCallback(
    async (c: CachedDashboard) => {
      if (!userId || !childId) return;
      try {
        await AsyncStorage.setItem(
          dashboardCacheKey({ userId, childId }),
          JSON.stringify(c),
        );
      } catch (err) {
        console.warn("[DashboardContext] Failed to write cache:", err);
      }
    },
    [userId, childId],
  );

  const hydrateFromCacheOrFallback = useCallback(async () => {
    // If we don't have the identifiers needed for a cache key yet, fall back.
    if (!userId || !childId) {
      setState((s) => ({
        ...s,
        data: deriveDashboardFromProgress(progress),
        status: "idle",
        error: null,
        lastUpdatedAt: null,
        source: "fallback",
      }));
      return;
    }

    try {
      const stored = await AsyncStorage.getItem(
        dashboardCacheKey({ userId, childId }),
      );
      if (stored) {
        const parsed = safeJsonParse<CachedDashboard>(stored);
        if (parsed?.dashboard) {
          setState((s) => ({
            ...s,
            data: parsed.dashboard,
            status: "idle",
            error: null,
            lastUpdatedAt: parsed.lastUpdatedAt ?? null,
            source: "cache",
          }));
          return;
        }
      }
    } catch (err) {
      console.warn("[DashboardContext] Failed to read cache:", err);
    }

    // Fallback to local ProgressContext-derived data
    setState((s) => ({
      ...s,
      data: deriveDashboardFromProgress(progress),
      status: "idle",
      error: null,
      lastUpdatedAt: null,
      source: "fallback",
    }));
  }, [userId, childId, progress]);

  const refreshDashboardRef = useRef<DashboardContextValue["refreshDashboard"] | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      await hydrateFromCacheOrFallback();
      if (cancelled) return;

      // SWR: try background refresh if we have identifiers to call backend.
      if (childId) {
        await refreshDashboardRef.current?.({ force: false });
      }
    })().catch((err) => {
      console.warn("[DashboardContext] initial hydrate failed:", err);
    });

    return () => {
      cancelled = true;
    };
  }, [userId, childId, hydrateFromCacheOrFallback]);

  // Keep fallback derived data in sync if we're in fallback mode
  useEffect(() => {
    if (!childId) {
      setState((s) => ({
        ...s,
        data: deriveDashboardFromProgress(progress),
        source: "fallback",
      }));
      return;
    }

    if (state.source === "fallback") {
      setState((s) => ({
        ...s,
        data: deriveDashboardFromProgress(progress),
      }));
    }
  }, [childId, progress, state.source]);

  const refreshDashboard = useCallback(
    async (options?: RefreshOptions) => {
      if (!childId) {
        // No child selected: keep fallback.
        setState((s) => ({
          ...s,
          data: deriveDashboardFromProgress(progress),
          status: "idle",
          error: null,
          source: "fallback",
        }));
        return;
      }

      if (inflightRefresh.current && !options?.force) {
        return inflightRefresh.current;
      }

      const doRefresh = (async () => {
        setState((s) => ({
          ...s,
          status: s.data ? "refreshing" : "loading",
          error: null,
        }));

        try {
          const result = await getDashboard(childId);
          setState((s) => ({
            ...s,
            data: result.dashboard,
            status: "idle",
            error: null,
            lastUpdatedAt: result.fetchedAt,
            source: "network",
          }));
          await writeCache({ dashboard: result.dashboard, lastUpdatedAt: result.fetchedAt });
        } catch (err: any) {
          const message = err?.message ? String(err.message) : "Failed to refresh dashboard";
          // Do not wipe last known good data
          setState((s) => ({
            ...s,
            status: "error",
            error: message,
          }));

          // If we have no data at all, provide fallback
          setState((s) => {
            if (s.data) return s;
            return {
              ...s,
              data: deriveDashboardFromProgress(progress),
              source: "fallback",
              status: "error",
            };
          });
        } finally {
          inflightRefresh.current = null;
        }
      })();

      inflightRefresh.current = doRefresh;
      return doRefresh;
    },
    [childId, progress, writeCache],
  );

  useEffect(() => {
    refreshDashboardRef.current = refreshDashboard;
  }, [refreshDashboard]);

  const flushDebouncedRefresh = useCallback(async () => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
      debounceTimer.current = null;
    }
    const pending = pendingDebouncedRefresh.current;
    pendingDebouncedRefresh.current = null;

    if (pending) {
      await pending;
    }
  }, []);

  const scheduleDebouncedRefresh = useCallback(() => {
    if (!childId) return;

    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    pendingDebouncedRefresh.current = new Promise<void>((resolve) => {
      debounceTimer.current = setTimeout(() => {
        refreshDashboard({ force: false })
          .catch(() => {
            // ignore; already stored in context error
          })
          .finally(() => {
            resolve();
          });
      }, 1500);
    });
  }, [childId, refreshDashboard]);

  // Flush debounced refresh when app backgrounds/inactive to avoid losing the
  // last queued refresh.
  const appState = useRef<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      const prevState = appState.current;
      appState.current = nextState;

      // When transitioning from active -> background/inactive, flush.
      if (
        prevState === "active" &&
        (nextState === "inactive" || nextState === "background")
      ) {
        flushDebouncedRefresh().catch(() => {
          // ignore: refresh errors are stored in context state
        });
      }
    });

    return () => {
      subscription.remove();
    };
  }, [flushDebouncedRefresh]);

  const postEvent = useCallback(
    async (event: Omit<ProgressEventIn, "childId">): Promise<EventAckOut | null> => {
      if (!childId) return null;

      const full: ProgressEventIn = { ...event, childId };

      // Read-only rule: no optimistic dashboard mutations here.
      try {
        const ack = await postProgressEvent(full);

        // Debounced refresh for high-frequency events (flashcards)
        if (full.kind === "flashcard") {
          scheduleDebouncedRefresh();
        } else {
          await refreshDashboard({ force: false });
        }

        return ack;
      } catch (err) {
        console.warn("[DashboardContext] postEvent failed:", err);

        // Best-effort refresh to converge (but don't crash flows)
        if (full.kind === "flashcard") {
          scheduleDebouncedRefresh();
        } else {
          await refreshDashboard({ force: false }).catch(() => {});
        }

        return null;
      }
    },
    [childId, refreshDashboard, scheduleDebouncedRefresh],
  );

  const value = useMemo<DashboardContextValue>(
    () => ({
      ...state,
      refreshDashboard,
      flushDebouncedRefresh,
      postEvent,
    }),
    [state, refreshDashboard, flushDebouncedRefresh, postEvent],
  );

  return <DashboardContext.Provider value={value}>{children}</DashboardContext.Provider>;
}

export function useDashboard(): DashboardContextValue {
  const ctx = useContext(DashboardContext);
  if (!ctx) {
    throw new Error("useDashboard must be used within a DashboardProvider");
  }
  return ctx;
}
