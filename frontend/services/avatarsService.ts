// frontend/services/avatarsService.ts

import type { Avatar } from "@/types/models";
import { apiFetch } from "./apiClient";

/**
 * Fetch available avatars.
 */
export async function getAvatars(): Promise<Avatar[]> {
  return apiFetch<Avatar[]>("/avatars");
}