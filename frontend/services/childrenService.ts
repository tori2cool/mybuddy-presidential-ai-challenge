// frontend/services/childrenService.ts (or whatever this file is)

import { apiFetch } from "@/services/apiClient";
import type { Child, UUID } from "@/types/models";

/**
 * Input shape for create/update.
 * - id omitted for create
 * - avatarId is UUID FK to avatars.id (or null)
 * - interests are UUIDs (Interest ids) or null
 */
export type UpsertChildInput = {
  id?: UUID;
  name: string;
  birthday: string; // YYYY-MM-DD
  interests?: UUID[] | null;
  avatarId?: UUID | null;
};

export async function listChildren(): Promise<Child[]> {
  return apiFetch<Child[]>("/children", { method: "GET" });
}

/**
 * fetch child directly.
 * Requires backend endpoint: GET /children/{id}
 */
export async function getChildById(childId: UUID): Promise<Child> {
  return apiFetch<Child>(`/children/${childId}`, { method: "GET" });
}

/**
 * separate create vs update.
 * If your backend currently only supports POST /children (upsert),
 * keep upsertChild() using POST and have createChild() call it.
 */
export async function upsertChild(payload: UpsertChildInput): Promise<Child> {
  // If payload.id exists and your backend supports PATCH /children/{id}, do that:
  if (payload.id) {
    const { id, ...body } = payload;
    return apiFetch<Child>(`/children/${id}`, {
      method: "PATCH",
      body,
    });
  }

  // Create
  return apiFetch<Child>("/children", {
    method: "POST",
    body: payload,
  });
}

export async function createChild(payload: Omit<UpsertChildInput, "id">): Promise<Child> {
  return upsertChild(payload);
}
