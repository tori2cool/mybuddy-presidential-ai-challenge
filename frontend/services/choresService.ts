// frontend/services/choresService.ts
import type { Chore, UUID } from "@/types/models";
import { apiFetch } from "./apiClient";

export async function getDailyChores(childId: UUID): Promise<Chore[]> {
  if (!childId || childId.trim().length === 0) {
    throw new Error("getDailyChores: childId is required");
  }

  return apiFetch<Chore[]>("/chores/daily", {
    query: { childId },
  });
}