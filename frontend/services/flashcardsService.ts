// frontend/services/flashcardsService.ts
import type { Flashcard, UUID, DifficultyCode } from "@/types/models";
import { apiFetch } from "./apiClient";

export async function flagFlashcardForRegen(
  flashcardId: UUID,
  childId: UUID,
  reasonCode: string,
): Promise<{ status: string }> {
  if (!flashcardId || flashcardId.trim().length === 0) {
    throw new Error("flagFlashcardForRegen: flashcardId is required");
  }
  if (!childId || childId.trim().length === 0) {
    throw new Error("flagFlashcardForRegen: childId is required");
  }
  if (!reasonCode || reasonCode.trim().length === 0) {
    throw new Error("flagFlashcardForRegen: reasonCode is required");
  }

  return apiFetch<{ status: string }>(`/flashcards/${flashcardId}/flag`, {
    method: "POST",
    body: {
      childId,
      reasonCode,
    },
  });
}

export async function getFlashcards(
  subjectCode: string,
  difficultyCode: DifficultyCode,
  childId: UUID,
): Promise<Flashcard[]> {
  if (!childId || childId.trim().length === 0) {
    throw new Error("getFlashcards: childId is required");
  }
  if (!subjectCode || subjectCode.trim().length === 0) {
    throw new Error("getFlashcards: subjectCode is required");
  }
  if (!difficultyCode || difficultyCode.trim().length === 0) {
    throw new Error("getFlashcards: difficultyCode is required");
  }

  const data = await apiFetch<Flashcard[]>("/flashcards", {
    query: {
      subjectCode,
      difficultyCode,
      childId,  // ← REQUIRED for child ownership validation
    },
  });

  if (!Array.isArray(data)) {
    throw new Error("getFlashcards: API returned non-array response");
  }

  return data;
}
