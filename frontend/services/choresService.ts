import { Chore } from "@/types/models";
import { apiFetch, withTimeout } from "./apiClient";

// Static fallback data
const fallbackDailyChores: Chore[] = [
  { id: "bed", label: "Make my bed", icon: "home" },
  { id: "clothes", label: "Put away clothes", icon: "user" },
  { id: "room", label: "Clean my room", icon: "trash-2" },
];

const CHORES_TIMEOUT_MS = 3000;

export async function getDailyChores(childId: string): Promise<Chore[]> {
  try {
    const data = await withTimeout(
      apiFetch<Chore[]>("/chores/daily", {
        query: { childId },
      }),
      CHORES_TIMEOUT_MS,
    );
    return data;
  } catch (err) {
    console.warn("getDailyChores: falling back to static data:", err);
    return [...fallbackDailyChores];
  }
}