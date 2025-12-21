import { Subject } from "@/types/models";
import { apiFetch, withTimeout } from "./apiClient";

// Static fallback data
const fallbackSubjects: Subject[] = [
  { id: "math", name: "Math", icon: "grid", color: "#8B5CF6" },
  { id: "science", name: "Science", icon: "zap", color: "#10B981" },
  { id: "reading", name: "Reading", icon: "book-open", color: "#FB923C" },
  { id: "history", name: "History", icon: "globe", color: "#3B82F6" },
];

const SUBJECTS_TIMEOUT_MS = 3000;

export async function getSubjects(childId: string): Promise<Subject[]> {
  try {
    const data = await withTimeout(
      apiFetch<unknown>("/subjects", {
        query: { childId },
      }),
      SUBJECTS_TIMEOUT_MS,
    );

    if (!Array.isArray(data) || data.length === 0) {
      console.warn(
        "getSubjects: API returned empty/non-array; falling back to static data.",
        { childId, receivedType: typeof data },
      );
      return [...fallbackSubjects];
    }

    return data as Subject[];
  } catch (err) {
    console.warn("getSubjects: falling back to static data:", err);
    return [...fallbackSubjects];
  }
}
