// mybuddyai/services/affirmationsService.ts

import { Affirmation } from "@/types/models";
import { Gradients } from "@/constants/theme";
import { apiFetch, withTimeout } from "@/services/apiClient";
import { USE_AI_BACKEND } from "@/constants/aiConfig";

// Existing static fallback data (unchanged)
const fallbackAffirmations: Affirmation[] = [
  { id: "1", text: "I am capable of amazing things", gradient: Gradients.sunset },
  { id: "2", text: "Today is full of possibilities", gradient: Gradients.ocean },
  { id: "3", text: "I am brave and strong", gradient: Gradients.forest },
  { id: "4", text: "I can learn anything I put my mind to", gradient: Gradients.sky },
  { id: "5", text: "I am kind to myself and others", gradient: Gradients.sunrise },
  { id: "6", text: "I believe in myself", gradient: Gradients.twilight },
  { id: "7", text: "I am proud of who I am", gradient: Gradients.sunset },
  { id: "8", text: "I spread positivity wherever I go", gradient: Gradients.ocean },
];

const AFFIRMATIONS_TIMEOUT_MS = 3000;

export async function getAffirmations(childId: string): Promise<Affirmation[]> {
  // AI backend toggle
  if (USE_AI_BACKEND) {
    try {
      const data = await withTimeout(
        apiFetch<unknown>("/ai/generate-affirmations", {
          query: { childId },
        }),
        AFFIRMATIONS_TIMEOUT_MS,
      );

      if (!Array.isArray(data) || data.length === 0) {
        console.warn(
          "getAffirmations (AI): API returned empty/non-array; falling back to static data.",
          { childId },
        );
        return [...fallbackAffirmations];
      }

      return data as Affirmation[];
    } catch (err) {
      console.warn("getAffirmations (AI): API failed, falling back to static data:", err);
      return [...fallbackAffirmations];
    }
  }

  // use when USE_AI_BACKEND is false
  try {
    const data = await withTimeout(
      apiFetch<unknown>("/affirmations", {
        query: { childId },
      }),
      AFFIRMATIONS_TIMEOUT_MS,
    );

    if (!Array.isArray(data) || data.length === 0) {
      console.warn(
        "getAffirmations: API returned empty/non-array; falling back to static data.",
        { childId, receivedType: typeof data },
      );
      return [...fallbackAffirmations];
    }

    return data as Affirmation[];
  } catch (err) {
    console.warn("getAffirmations: falling back to static data:", err);
    return [...fallbackAffirmations];
  }
}