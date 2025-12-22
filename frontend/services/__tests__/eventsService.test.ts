import { postProgressEvent } from "@/services/eventsService";

jest.mock("@/services/apiClient", () => {
  return {
    apiFetch: jest.fn(),
    withTimeout: <T,>(p: Promise<T>) => p,
  };
});

import { apiFetch } from "@/services/apiClient";

describe("eventsService", () => {
  it("postProgressEvent posts to /children/{childId}/events/{kind}", async () => {
    (apiFetch as jest.Mock).mockResolvedValueOnce({ pointsAwarded: 5, newAchievementIds: [] });

    const ack = await postProgressEvent({ childId: "c", kind: "affirmation_viewed", body: { affirmationId: "a1" } });
    expect(ack.pointsAwarded).toBe(5);
    expect(apiFetch).toHaveBeenCalledWith(
      "/children/c/events/affirmation_viewed",
      expect.objectContaining({ method: "POST" }),
    );
  });
});
