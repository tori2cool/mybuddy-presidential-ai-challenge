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

type ChildContextValue = {
  childId: string | null;
  setChildId: (id: string | null) => Promise<void>;
  loaded: boolean;
};

const SELECTED_CHILD_ID_KEY = "selected_child_id";

const ChildContext = createContext<ChildContextValue | undefined>(undefined);

type ChildProviderProps = {
  children: ReactNode;
};

/**
 * ChildProvider
 *
 * Provides the current childId for the app. This is intentionally minimal:
 * - It just stores a string childId in React state.
 * - It does not itself talk to the backend or storage.
 * Those concerns are handled by separate hooks (e.g. useDevAutoChild).
 */
export function ChildProvider({ children }: ChildProviderProps) {
  const [childId, _setChildId] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const stored = await AsyncStorage.getItem(SELECTED_CHILD_ID_KEY);
        if (cancelled) return;
        _setChildId(stored ?? null);
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const setChildId = useCallback(async (id: string | null) => {
    _setChildId(id);
    if (id) {
      await AsyncStorage.setItem(SELECTED_CHILD_ID_KEY, id);
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
    [childId, loaded, setChildId]
  );

  return <ChildContext.Provider value={value}>{children}</ChildContext.Provider>;
}

/**
 * useCurrentChildId
 *
 * Access the current childId and setter.
 * Must be called under a <ChildProvider>.
 */
export function useCurrentChildId(): ChildContextValue {
  const ctx = useContext(ChildContext);
  if (!ctx) {
    throw new Error("useCurrentChildId must be used within a ChildProvider");
  }
  return ctx;
}