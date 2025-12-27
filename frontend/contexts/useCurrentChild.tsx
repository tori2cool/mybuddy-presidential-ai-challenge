import { useState, useEffect } from "react";
import { useCurrentChildId } from "./ChildContext";
import { apiFetch } from "@/services/apiClient";

// Define the shape of the child object from the backend
type Child = {
  id: string;
  name: string;
  avatar: string;
  birthday: string;
  interests: string[];
  // Add any other fields you expect (e.g., created_at, etc.)
};

type UseCurrentChildResult = {
  child: Child | null;
  loading: boolean;
  error: string | null;
};

export function useCurrentChild(): UseCurrentChildResult {
  const { childId, loaded: idLoaded } = useCurrentChildId();
  const [child, setChild] = useState<Child | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!idLoaded) {
      // Still loading the persisted childId
      setLoading(true);
      return;
    }

    if (!childId) {
      // No child selected
      setChild(null);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        setError(null);
        // Adjust endpoint if yours is different (e.g., /children/{id} or /children/me)
        const data = await apiFetch<Child>(`/children/${childId}`);

        if (!cancelled) {
          setChild(data);
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err?.message || "Failed to load child");
          setChild(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [childId, idLoaded]);

  return { child, loading, error };
}