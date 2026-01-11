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

import { useCurrentChild } from "@/contexts/ChildContext";
import { useAuth } from "@/contexts/AuthContext";
import type { UUID } from "@/types/models";

import type { DashboardOut } from "@/types/models";
import { getDashboard } from "@/services/dashboardService";
import type { EventAckOut, ProgressEvent } from "@/services/eventsService";
import { postProgressEvent } from "@/services/eventsService";

export type DashboardStatus = "idle" | "loading" | "refreshing" | "error";

export type DashboardState = {
  data: DashboardOut | null;
  status: DashboardStatus;
  error: string | null;

  /** Primary identifier */
  childId: UUID | null;
};

export type RefreshOptions = {
  force?: boolean;
};

type DashboardContextValue = DashboardState & {
  refreshDashboard: (options?: RefreshOptions) => Promise<void>;
  flushDebouncedRefresh: () => Promise<void>;
  postEvent: (event: ProgressEvent) => Promise<EventAckOut | null>;
};

const DashboardContext = createContext<DashboardContextValue | undefined>(undefined);

const DASHBOARD_CACHE_VERSION = "v3"; // bump: remove fetchedAt/lastUpdatedAt + slug legacy

function dashboardCacheKey(params: { userId: string; childId: UUID }) {
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
  dashboard: DashboardOut;
};

export function DashboardProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const userId = user?.sub ?? null;

  const { childId } = useCurrentChild();

  const [state, setState] = useState<DashboardState>({
    data: null,
    status: "idle",
    error: null,
    childId,
  });

  const inflightRefresh = useRef<Promise<void> | null>(null);

  // Debounced refresh control
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingDebouncedRefresh = useRef<Promise<void> | null>(null);

  const writeCache = useCallback(
    async (c: CachedDashboard) => {
      if (!userId || !childId) return;
      try {
        await AsyncStorage.setItem(dashboardCacheKey({ userId, childId }), JSON.stringify(c));
      } catch (err) {
        console.warn("[DashboardContext] Failed to write cache:", err);
      }
    },
    [userId, childId]
  );

  const hydrateFromCache = useCallback(async () => {
    if (!userId || !childId) {
      setState((s) => ({
        ...s,
        data: null,
        status: "idle",
        error: null,
        childId,
      }));
      return;
    }

    try {
      const stored = await AsyncStorage.getItem(dashboardCacheKey({ userId, childId }));
      if (stored) {
        const parsed = safeJsonParse<CachedDashboard>(stored);
        if (parsed?.dashboard) {
          setState((s) => ({
            ...s,
            data: parsed.dashboard,
            status: "idle",
            error: null,
            childId,
          }));
          return;
        }
      }
    } catch (err) {
      console.warn("[DashboardContext] Failed to read cache:", err);
    }

    setState((s) => ({
      ...s,
      data: null,
      status: "idle",
      error: null,
      childId,
    }));
  }, [userId, childId]);

  const refreshDashboard = useCallback(
    async (options?: RefreshOptions) => {
      // Don't fire dashboard calls until auth bootstrap completes and we're authenticated.
      if (authLoading || !isAuthenticated || !childId) {
        setState((s) => ({
          ...s,
          status: "idle",
          error: null,
          childId,
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
          childId,
        }));

        try {
          const dashboard = await getDashboard(childId);

          setState((s) => ({
            ...s,
            data: dashboard,
            status: "idle",
            error: null,
            childId,
          }));

          await writeCache({ dashboard });
        } catch (err: any) {
          const message = err?.message ? String(err.message) : "Failed to refresh dashboard";
          setState((s) => ({
            ...s,
            status: "error",
            error: message,
            childId,
          }));
        } finally {
          inflightRefresh.current = null;
        }
      })();

      inflightRefresh.current = doRefresh;
      return doRefresh;
    },
    [authLoading, isAuthenticated, childId, writeCache]
  );

  const refreshDashboardRef = useRef<DashboardContextValue["refreshDashboard"] | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      await hydrateFromCache();
      if (cancelled) return;

      // SWR: background refresh
      if (!authLoading && isAuthenticated && childId) {
        await refreshDashboardRef.current?.({ force: false });
      }
    })().catch((err) => {
      console.warn("[DashboardContext] initial hydrate failed:", err);
    });

    return () => {
      cancelled = true;
    };
  }, [userId, childId, authLoading, isAuthenticated, hydrateFromCache]);

  useEffect(() => {
    refreshDashboardRef.current = refreshDashboard;
  }, [refreshDashboard]);

  // Sync childId with state when ChildContext changes
  useEffect(() => {
    setState((s) => ({
      ...s,
      childId,
    }));
  }, [childId]);

  const flushDebouncedRefresh = useCallback(async () => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
      debounceTimer.current = null;
    }
    const pending = pendingDebouncedRefresh.current;
    pendingDebouncedRefresh.current = null;
    if (pending) await pending;
  }, []);

  const scheduleDebouncedRefresh = useCallback(() => {
    if (!childId) return;

    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    pendingDebouncedRefresh.current = new Promise<void>((resolve) => {
      debounceTimer.current = setTimeout(() => {
        refreshDashboard({ force: false }).finally(() => resolve());
      }, 1500);
    });
  }, [childId, refreshDashboard]);

  // Flush debounced refresh when app backgrounds/inactive
  const appState = useRef<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      const prevState = appState.current;
      appState.current = nextState;

      if (prevState === "active" && (nextState === "inactive" || nextState === "background")) {
        flushDebouncedRefresh().catch(() => {});
      }
    });

    return () => subscription.remove();
  }, [flushDebouncedRefresh]);

  const postEvent = useCallback(
    async (event: ProgressEvent): Promise<EventAckOut | null> => {
      if (!childId) return null;

      try {
        const ack = await postProgressEvent(childId, event);
        scheduleDebouncedRefresh();
        return ack;
      } catch (err) {
        console.warn("[DashboardContext] postEvent failed:", err);
        scheduleDebouncedRefresh();
        return null;
      }
    },
    [childId, scheduleDebouncedRefresh]
  );

  const value = useMemo<DashboardContextValue>(
    () => ({
      ...state,
      refreshDashboard,
      flushDebouncedRefresh,
      postEvent,
    }),
    [state, refreshDashboard, flushDebouncedRefresh, postEvent]
  );

  return <DashboardContext.Provider value={value}>{children}</DashboardContext.Provider>;
}

export function useDashboard(): DashboardContextValue {
  const ctx = useContext(DashboardContext);
  if (!ctx) throw new Error("useDashboard must be used within a DashboardProvider");
  return ctx;
}
