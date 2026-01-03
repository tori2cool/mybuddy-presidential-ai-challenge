// frontend/services/outdoorService.ts
import type { OutdoorActivity, UUID } from "@/types/models";
import { apiFetch } from "./apiClient";

const applyDailyFilter = (items: OutdoorActivity[], opts?: { isDaily?: boolean }): OutdoorActivity[] => {
  if (opts?.isDaily === true) return items.filter((a) => a.isDaily);
  if (opts?.isDaily === false) return items.filter((a) => !a.isDaily);
  return items;
};

export async function getOutdoorActivities(
  childId: UUID,
  opts?: { isDaily?: boolean },
): Promise<OutdoorActivity[]> {
  if (!childId || childId.trim().length === 0) {
    throw new Error("getOutdoorActivities: childId is required");
  }

  const data = await apiFetch<OutdoorActivity[]>("/outdoor/activities", {
    query: {
      childId,
      ...(opts?.isDaily !== undefined ? { isDaily: opts.isDaily } : {}),
    },
  });

  if (!Array.isArray(data)) {
    throw new Error("getOutdoorActivities: API returned non-array response");
  }

  return data;
}
