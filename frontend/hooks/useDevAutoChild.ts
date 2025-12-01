import { useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCurrentChildId } from "@/contexts/ChildContext";
import { apiFetch } from "@/services/apiClient";

const DEV_CHILD_ID_KEY = "DEV_CHILD_ID";

export function useDevAutoChild() {
  const { childId, setChildId } = useCurrentChildId();

  useEffect(() => {
    if (process.env.NODE_ENV !== "development") {
      return;
    }
    if (childId) {
      return;
    }

    let cancelled = false;

    async function ensureDevChild() {
      try {
        const existing = await AsyncStorage.getItem(DEV_CHILD_ID_KEY);
        if (cancelled) return;

        if (existing) {
          setChildId(existing);
          return;
        }

        const data = await apiFetch<any>("/children", {
          method: "POST",
          body: {
            name: "Dev Child",
            interests: ["Dev"],
          },
        });

        console.log("useDevAutoChild: raw /children response", data);
        const newId: string | undefined = data?.id;

        if (!newId) {
          console.error("useDevAutoChild: response missing `id` field", data);
          return;
        }

        if (cancelled) return;

        await AsyncStorage.setItem(DEV_CHILD_ID_KEY, newId);
        setChildId(newId);
      } catch (err) {
        console.error("Error in useDevAutoChild", err);
      }
    }

    ensureDevChild();

    return () => {
      cancelled = true;
    };
  }, [childId, setChildId]);
}