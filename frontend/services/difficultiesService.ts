// frontend/services/difficultiesService.ts
import { apiFetch } from "@/services/apiClient";
import type { DifficultyThreshold } from "@/types/models";

export async function getDifficulties(): Promise<DifficultyThreshold[]> {
  return apiFetch<DifficultyThreshold[]>("/difficulties");
}