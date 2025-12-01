import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  useMemo,
} from "react";

type ChildContextValue = {
  childId: string | null;
  setChildId: (id: string | null) => void;
};

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
  const [childId, setChildId] = useState<string | null>(null);

  const value = useMemo(
    () => ({
      childId,
      setChildId,
    }),
    [childId]
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