import { apiFetch, withTimeout } from "@/services/apiClient";

export type ProgressEventKind = "flashcard" | "chore" | "outdoor" | "affirmation";

export type BaseEventBody = {
  occurredAt?: string; // ISO
};

// Mirrors backend/app/schemas/progress.py (FlashcardAnsweredIn)
export type FlashcardAnsweredEventBody = BaseEventBody & {
  subjectId: string;
  correct: boolean;
  flashcardId?: string;
  answer?: string;
};

// Mirrors backend/app/schemas/progress.py (ChoreCompletedIn)
export type ChoreCompletedEventBody = BaseEventBody & {
  choreId: string;
  isExtra: boolean;
};

// Mirrors backend/app/schemas/progress.py (OutdoorCompletedIn)
export type OutdoorCompletedEventBody = BaseEventBody & {
  outdoorActivityId: string;
  isDaily: boolean;
};

// Mirrors backend/app/schemas/progress.py (AffirmationViewedIn)
export type AffirmationViewedEventBody = BaseEventBody & {
  affirmationId: string;
};

export type ProgressEventIn =
  | { childId: string; kind: "flashcard"; body: FlashcardAnsweredEventBody }
  | { childId: string; kind: "chore"; body: ChoreCompletedEventBody }
  | { childId: string; kind: "outdoor"; body: OutdoorCompletedEventBody }
  | { childId: string; kind: "affirmation"; body: AffirmationViewedEventBody };

export type EventAckOut = {
  pointsAwarded: number;
  newAchievementIds: string[];
};

const EVENTS_TIMEOUT_MS = 3000;

export async function postProgressEvent(event: ProgressEventIn): Promise<EventAckOut> {
  const occurredAt = event.body.occurredAt ?? new Date().toISOString();
  const body = {
    ...event.body,
    occurredAt,
  };

  return withTimeout(
    apiFetch<EventAckOut>(
      `/children/${encodeURIComponent(event.childId)}/events/${encodeURIComponent(event.kind)}`,
      {
        method: "POST",
        body,
      },
    ),
    EVENTS_TIMEOUT_MS,
  );
}
