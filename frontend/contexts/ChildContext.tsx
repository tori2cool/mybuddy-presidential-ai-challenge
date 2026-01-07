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
import type { UUID } from "@/types/models"; // or "@/types/api" if that's now canonical

type ChildContextValue = {
  /** Selected child UUID (or null if none selected). */
  childId: UUID | null;
  setChildId: (id: UUID | null) => Promise<void>;
  loaded: boolean;
};

const SELECTED_CHILD_ID_KEY = "selected_child_id";

const ChildContext = createContext<ChildContextValue | undefined>(undefined);

type ChildProviderProps = {
  children: ReactNode;
};

export function ChildProvider({ children }: ChildProviderProps) {
  const [childId, _setChildId] = useState<UUID | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const stored = await AsyncStorage.getItem(SELECTED_CHILD_ID_KEY);
        if (cancelled) return;

        const normalized = stored && stored.trim().length > 0 ? (stored as UUID) : null;
        _setChildId(normalized);
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

    if (normalized) {
      await AsyncStorage.setItem(SELECTED_CHILD_ID_KEY, normalized);
    } else {
      await AsyncStorage.removeItem(SELECTED_CHILD_ID_KEY);
    }
  }, []);

  const value = useMemo(
    () => ({
      childId,
      setChildId,
      loaded,
    }),
    [childId, setChildId, loaded]
  );

  return <ChildContext.Provider value={value}>{children}</ChildContext.Provider>;
}

export function useCurrentChild(): ChildContextValue {
  const ctx = useContext(ChildContext);
  if (!ctx) throw new Error("useCurrentChild must be used within a ChildProvider");
  return ctx;
}

/**
 * Back-compat exports (optional)
 * Prefer the explicit names below.
 */
export const useCurrentChildId = useCurrentChild;

/** @deprecated Old naming; use useCurrentChildId / useCurrentChild */
export const useCurrentChildSlug = useCurrentChild;
