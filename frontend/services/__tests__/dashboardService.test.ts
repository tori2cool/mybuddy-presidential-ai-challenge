import { getDashboard } from "@/services/dashboardService";

jest.mock("@/services/apiClient", () => {
  return {
    apiFetch: jest.fn(),
    withTimeout: <T,>(p: Promise<T>) => p,
  };
});

import { apiFetch } from "@/services/apiClient";

describe("dashboardService.getDashboard", () => {
  it("coerces minimal payload", async () => {
    (apiFetch as jest.Mock).mockResolvedValueOnce({
      totalPoints: 10,
      currentStreak: 2,
      longestStreak: 5,
      lastActiveDate: "2025-01-01",
      today: {
        date: "2025-01-02",
        flashcardsCompleted: 1,
        flashcardsCorrect: 1,
        choresCompleted: 0,
        outdoorActivities: 0,
        affirmationsViewed: 0,
        totalPoints: 10,
      },
      totals: {
        flashcardsCompleted: 1,
        flashcardsCorrect: 1,
        choresCompleted: 0,
        outdoorActivities: 0,
        affirmationsViewed: 0,
      },
    });

    const res = await getDashboard("child_1");
    expect(res.dashboard.totalPoints).toBe(10);
    expect(res.dashboard.today.flashcardsCompleted).toBe(1);
    expect(res.dashboard.totals.flashcardsCorrect).toBe(1);
  });

  it("throws on non-object payload", async () => {
    (apiFetch as jest.Mock).mockResolvedValueOnce(null);
    await expect(getDashboard("child_1")).rejects.toThrow(/Invalid dashboard payload/);
  });
});
