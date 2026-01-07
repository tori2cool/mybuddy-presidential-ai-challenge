// frontend/services/subjectsService.ts
import type { Subject, UUID } from "@/types/models";
import { apiFetch } from "./apiClient";

export async function getSubjects(childId: UUID): Promise<Subject[]> {
  if (!childId || childId.trim().length === 0) {
    throw new Error("getSubjects: childId is required");
  }

  const data = await apiFetch<Subject[]>("/subjects", {
    query: { childId },
  });

  if (!Array.isArray(data)) {
    throw new Error("getSubjects: API returned non-array response");
  }

  return data;
}
