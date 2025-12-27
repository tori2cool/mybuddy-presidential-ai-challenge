import { OutdoorActivity } from "@/types/models";
import { apiFetch, withTimeout } from "./apiClient";

// Static fallback data
const fallbackOutdoorActivities: OutdoorActivity[] = [
  {
    id: "run",
    name: "Play Tag",
    category: "Active Play",
    icon: "zap",
    time: "15 min",
    points: 20,
    isDaily: true,
  },
  {
    id: "explore",
    name: "Nature Walk",
    category: "Nature Explorer",
    icon: "compass",
    time: "20 min",
    points: 20,
    isDaily: false,
  },
  {
    id: "sports",
    name: "Kick the Ball",
    category: "Sports & Games",
    icon: "circle",
    time: "30 min",
    points: 20,
    isDaily: false,
  },
  {
    id: "creative",
    name: "Draw with Chalk",
    category: "Creative Outside",
    icon: "edit-3",
    time: "25 min",
    points: 20,
    isDaily: false,
  },
  {
    id: "bike",
    name: "Ride Your Bike",
    category: "Active Play",
    icon: "activity",
    time: "20 min",
    points: 20,
    isDaily: false,
  },
];

const OUTDOOR_TIMEOUT_MS = 3000;

export async function getOutdoorActivities(
  childId: string,
  opts?: { isDaily?: boolean },
): Promise<OutdoorActivity[]> {
  const applyDailyFilter = (items: OutdoorActivity[]): OutdoorActivity[] => {
    if (opts?.isDaily === true) return items.filter((a) => a.isDaily);
    if (opts?.isDaily === false) return items.filter((a) => !a.isDaily);
    return items;
  };

  try {
    const data = await withTimeout(
      apiFetch<unknown>("/outdoor/activities", {
        query: {
          childId,
          ...(opts?.isDaily !== undefined ? { isDaily: opts.isDaily } : {}),
        },
      }),
      OUTDOOR_TIMEOUT_MS,
    );

    if (Array.isArray(data)) {
      const filtered = applyDailyFilter(data as OutdoorActivity[]);

      // Apply empty-array fallback after filtering.
      if (filtered.length === 0) {
        console.warn(
          "getOutdoorActivities: API returned empty/non-array; falling back to static data.",
          { childId, receivedType: typeof data },
        );
        return applyDailyFilter([...fallbackOutdoorActivities]);
      }

      return filtered;
    }

    if (__DEV__) {
      console.warn(
        "getOutdoorActivities: API returned empty/non-array; falling back to static data.",
        { childId, receivedType: typeof data },
      );
    }
    return applyDailyFilter([...fallbackOutdoorActivities]);
  } catch (err) {
    console.warn("getOutdoorActivities: falling back to static data:", err);
    return applyDailyFilter([...fallbackOutdoorActivities]);
  }
}
