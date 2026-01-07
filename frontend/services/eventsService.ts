import { apiFetch } from "@/services/apiClient";
import type { UUID } from "@/types/models";

export type ProgressEventKind = "flashcard" | "chore" | "outdoor" | "affirmation";

// Mirrors backend/app/schemas/progress.py (FlashcardAnsweredIn)
// NOTE: backend derives subject from flashcardId; do not send subjectId (extra fields are forbidden).
export type FlashcardAnsweredEventBody = {
  correct: boolean;
  flashcardId: UUID;
  answer?: string | null;
};

// Mirrors backend/app/schemas/progress.py (ChoreCompletedIn)
export type ChoreCompletedEventBody = {
  choreId: UUID;
  // Backend can derive isExtra from choreId. Keep optional for compatibility.
  isExtra?: boolean | null;
};

// Mirrors backend/app/schemas/progress.py (OutdoorCompletedIn)
export type OutdoorCompletedEventBody = {
  outdoorActivityId: UUID;
  // Backend can derive isDaily from outdoorActivityId. Keep optional for compatibility.
  isDaily?: boolean | null;
};

// Mirrors backend/app/schemas/progress.py (AffirmationViewedIn)
export type AffirmationViewedEventBody = {
  affirmationId: UUID;
};

/**
 * Event *payload* (no childId).
 * childId belongs in the URL path.
 */
export type ProgressEvent =
  | { kind: "flashcard"; body: FlashcardAnsweredEventBody }
  | { kind: "chore"; body: ChoreCompletedEventBody }
  | { kind: "outdoor"; body: OutdoorCompletedEventBody }
  | { kind: "affirmation"; body: AffirmationViewedEventBody };

export type EventAckOut = {
  pointsAwarded: number;
  newAchievementIds: UUID[];
};

export async function postProgressEvent(childId: UUID, event: ProgressEvent): Promise<EventAckOut> {
  if (!childId || childId.trim().length === 0) {
    throw new Error("postProgressEvent: missing childId");
  }

  return apiFetch<EventAckOut>(
    `/children/${encodeURIComponent(childId)}/events/${encodeURIComponent(event.kind)}`,
    {
      method: "POST",
      body: event.body,
    }
  );
}
