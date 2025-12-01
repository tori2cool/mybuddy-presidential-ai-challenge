// mybuddyai/services/affirmationsService.ts

import { Affirmation } from "@/types/models";
import { Gradients } from "@/constants/theme";
import { apiFetch, withTimeout, ApiError } from "@/services/apiClient";

// Existing static fallback data
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
  try {
    const data = await withTimeout(
      apiFetch<Affirmation[]>("/affirmations", {
        query: { childId },
      }),
      AFFIRMATIONS_TIMEOUT_MS,
    );
    return data;
  } catch (err) {
    // In dev, you might log this:
    console.warn("getAffirmations: falling back to static data:", err);
    return [...fallbackAffirmations];
  }
}