import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  ReactNode,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { UUID } from "@/types/models";

const SELECTED_CHILD_ID_KEY = "selected_child_id";
const CHILD_SESSION_ACTIVE_KEY = "child_session_active"; // new key

type ChildContextValue = {
  /** Selected child UUID (or null if none selected). */
  childId: UUID | null;
  setChildId: (id: UUID | null) => Promise<void>;
  /** True only after user actively selected a child this session */
  isSessionActive: boolean;
  loaded: boolean;
};

const ChildContext = createContext<ChildContextValue | undefined>(undefined);

type ChildProviderProps = {
  children: ReactNode;
};

export function ChildProvider({ children }: ChildProviderProps) {
  const [childId, _setChildId] = useState<UUID | null>(null);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const [storedId, storedActive] = await Promise.all([
          AsyncStorage.getItem(SELECTED_CHILD_ID_KEY),
          AsyncStorage.getItem(CHILD_SESSION_ACTIVE_KEY),
        ]);

        if (cancelled) return;

        const normalizedId = storedId && storedId.trim().length > 0 ? (storedId as UUID) : null;
        const normalizedActive = storedActive === "true";

        _setChildId(normalizedId);
        setIsSessionActive(normalizedActive);
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const setChildId = useCallback(async (id: UUID | null) => {
    const normalized = id && id.trim().length > 0 ? id : null;

    _setChildId(normalized);
    // Always mark session as active when user explicitly selects (or clears) a child
    setIsSessionActive(true);

    if (normalized) {
      await Promise.all([
        AsyncStorage.setItem(SELECTED_CHILD_ID_KEY, normalized),
        AsyncStorage.setItem(CHILD_SESSION_ACTIVE_KEY, "true"),
      ]);
    } else {
      await Promise.all([
        AsyncStorage.removeItem(SELECTED_CHILD_ID_KEY),
        AsyncStorage.removeItem(CHILD_SESSION_ACTIVE_KEY),
      ]);
    }
  }, []);

  const value = useMemo(
    () => ({
      childId,
      setChildId,
      isSessionActive,
      loaded,
    }),
    [childId, setChildId, isSessionActive, loaded]
  );

  return <ChildContext.Provider value={value}>{children}</ChildContext.Provider>;
}

export function useCurrentChild(): ChildContextValue {
  const ctx = useContext(ChildContext);
  if (!ctx) throw new Error("useCurrentChild must be used within a ChildProvider");
  return ctx;
}

// Optional: convenience hook if you only need the flag
export function useChildSessionActive(): boolean {
  const { isSessionActive } = useCurrentChild();
  return isSessionActive;
}

/**
 * Back-compat export. Prefer using `useCurrentChild()` directly.
 */
export const useCurrentChildId = useCurrentChild;
