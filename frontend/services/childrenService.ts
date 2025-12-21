import { apiFetch } from "@/services/apiClient";

export type ChildModel = {
  id: string;
  name: string;
  birthday: string; // "YYYY-MM-DD"
  interests: string[];
  avatar?: string | null;
};

export type UpsertChildInput = {
  id?: string;
  name: string;
  birthday: string;
  interests?: string[];
  avatar?: string | null;
};

export async function listChildren(): Promise<ChildModel[]> {
  return apiFetch<ChildModel[]>("/children", {
    method: "GET",
  });
}

export async function getChildById(childId: string): Promise<ChildModel | null> {
  const children = await listChildren();
  return children.find((c) => c.id === childId) ?? null;
}

export async function upsertChild(payload: UpsertChildInput): Promise<ChildModel> {
  return apiFetch<ChildModel>("/children", {
    method: "POST",
    body: payload,
  });
}

export async function createChild(
  payload: Omit<UpsertChildInput, "id">,
): Promise<ChildModel> {
  return upsertChild(payload);
}
