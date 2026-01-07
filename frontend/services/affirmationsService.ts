// mybuddyai/services/affirmationsService.ts

import type { Affirmation, UUID } from "@/types/models";
import { apiFetch } from "@/services/apiClient";

/**
 * Fetch affirmations for a child.
 */
export async function getAffirmations(childId: UUID): Promise<Affirmation[]> {
  const data = await apiFetch<unknown>("/affirmations", {
    query: { childId },
  });

  if (!Array.isArray(data)) {
    throw new Error("getAffirmations: API returned non-array response");
  }

  return data as Affirmation[];
}
