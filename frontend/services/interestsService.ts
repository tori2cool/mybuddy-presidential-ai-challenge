// frontend/services/interestsService.ts
import type { Interest } from "@/types/models";
import { apiFetch } from "./apiClient";

/**
 * Fetch available interests.
 *
 * Backend returns UI-ready Interest objects:
 * - id (UUID)
 * - name
 * - label
 * - icon
 * - isActive
 */
export async function getInterests(): Promise<Interest[]> {
  return apiFetch<Interest[]>("/interests");
}
