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


export type DashboardState = {
  data: DashboardData | null;
  status: DashboardStatus;
  error: string | null;
  lastUpdatedAt: string | null;
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



type CachedDashboard = {
  dashboard: DashboardData;
  lastUpdatedAt: string;
};

export function DashboardProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const userId = user?.sub ?? null;
  const { childId } = useCurrentChildId();

  const [state, setState] = useState<DashboardState>({
    data: null,
    status: "idle",
    error: null,
    lastUpdatedAt: null,
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

  const hydrateFromCache = useCallback(async () => {
    if (!userId || !childId) {
      // No identifiers yet, remain in idle state
      setState((s) => ({
        ...s,
        status: "idle",
        error: null,
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
          }));
          return;
        }
      }
    } catch (err) {
      console.warn("[DashboardContext] Failed to read cache:", err);
    }

    // No cached data, remain in idle state (will trigger refresh)
    setState((s) => ({
      ...s,
      data: null,
      status: "idle",
      error: null,
      lastUpdatedAt: null,
    }));
  }, [userId, childId]);

  const refreshDashboard = useCallback(
    async (options?: RefreshOptions) => {
      if (!childId) {
        // No child selected: remain in idle state
        setState((s) => ({
          ...s,
          status: "idle",
          error: null,
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
        } finally {
          inflightRefresh.current = null;
        }
      })();

      inflightRefresh.current = doRefresh;
      return doRefresh;
    },
    [childId, writeCache],
  );

  const refreshDashboardRef = useRef<DashboardContextValue["refreshDashboard"] | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      await hydrateFromCache();
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
  }, [userId, childId, hydrateFromCache]);

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

      try {
        const ack = await postProgressEvent(full);

        // Don't trigger dashboard refresh from here
        // Let calling components handle refresh timing

        return ack;
      } catch (err) {
        console.warn("[DashboardContext] postEvent failed:", err);

        // On error, trigger debounced refresh as best-effort
        scheduleDebouncedRefresh();

        return null;
      }
    },
    [childId, scheduleDebouncedRefresh],
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
