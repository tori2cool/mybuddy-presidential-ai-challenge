import { Chore } from "@/types/models";
import { apiFetch, withTimeout } from "./apiClient";
import { USE_AI_BACKEND } from "@/constants/aiConfig"; 

// Static fallback data
const fallbackDailyChores: Chore[] = [
  { id: "bed", label: "Make my bed", icon: "home" },
  { id: "clothes", label: "Put away clothes", icon: "user" },
  { id: "room", label: "Clean my room", icon: "trash-2" },
];

const CHORES_TIMEOUT_MS = 3000;

export async function getDailyChores(childId: string): Promise<Chore[]> {
  // If AI backend is enabled, call API endpoint
  if (USE_AI_BACKEND) {
    try {
      const data = await withTimeout(
        apiFetch<unknown>("/ai/generate-chores", {
          query: { childId },
        }),
        CHORES_TIMEOUT_MS,
      );

      if (!Array.isArray(data) || data.length === 0) {
        console.warn(
          "getDailyChores (AI): API returned empty/non-array; falling back to static data.",
          { childId },
        );
        return [...fallbackDailyChores];
      }

      return data as Chore[];
    } catch (err) {
      console.warn("getDailyChores (AI): API failed, falling back to static data:", err);
      return [...fallbackDailyChores];
    }
  }

  // Use when USE_AI_BACKEND is false
  try {
    const data = await withTimeout(
      apiFetch<unknown>("/chores/daily", {
        query: { childId },
      }),
      CHORES_TIMEOUT_MS,
    );

    if (!Array.isArray(data) || data.length === 0) {
      console.warn(
        "getDailyChores: API returned empty/non-array; falling back to static data.",
        { childId, receivedType: typeof data },
      );
      return [...fallbackDailyChores];
    }

    return data as Chore[];
  } catch (err) {
    console.warn("getDailyChores: falling back to static data:", err);
    return [...fallbackDailyChores];
  }
}