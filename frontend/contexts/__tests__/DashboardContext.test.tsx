import React from "react";
import { Text } from "react-native";

jest.mock("@/contexts/AuthContext", () => {
  return {
    useAuth: () => ({ user: { sub: "user_1" } }),
  };
});
import { render, act } from "@testing-library/react-native";

import { DashboardProvider, useDashboard } from "@/contexts/DashboardContext";

jest.mock("@/contexts/ChildContext", () => {
  return {
    useCurrentChildId: () => ({ childId: "child_1" }),
  };
});

jest.mock("@/contexts/ProgressContext", () => {
  return {
    useProgress: () => ({
      progress: {
        totalPoints: 0,
        currentStreak: 0,
        longestStreak: 0,
        lastActiveDate: null,
        dailyStats: [],
        weeklyStats: [],
        achievements: [],
        flashcardsBySubject: {
          math: { completed: 0, correct: 0, difficulty: "easy", recentResults: [] },
          science: { completed: 0, correct: 0, difficulty: "easy", recentResults: [] },
          reading: { completed: 0, correct: 0, difficulty: "easy", recentResults: [] },
          history: { completed: 0, correct: 0, difficulty: "easy", recentResults: [] },
        },
        totalChoresCompleted: 0,
        totalOutdoorActivities: 0,
        totalAffirmationsViewed: 0,
      },
    }),
  };
});

jest.mock("@/services/dashboardService", () => {
  return {
    getDashboard: jest.fn(),
  };
});

jest.mock("@/services/eventsService", () => {
  return {
    postProgressEvent: jest.fn(),
  };
});

import AsyncStorage from "@react-native-async-storage/async-storage";
import { getDashboard } from "@/services/dashboardService";
import { postProgressEvent } from "@/services/eventsService";

function Probe() {
  const { data, postEvent } = useDashboard();
  return (
    <>
      <Text testID="totalPoints">{data?.totalPoints ?? 0}</Text>
      <Text
        testID="post"
        onPress={() => {
          postEvent({ kind: "affirmation_viewed", body: { affirmationId: "a" } }).catch(() => {});
        }}
      >
        post
      </Text>
    </>
  );
}

describe("DashboardContext", () => {
  beforeEach(async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(null);
    (getDashboard as jest.Mock).mockResolvedValue({
      dashboard: {
        totalPoints: 10,
        currentStreak: 1,
        longestStreak: 1,
        lastActiveDate: null,
        today: {
          date: "2025-01-01",
          flashcardsCompleted: 0,
          flashcardsCorrect: 0,
          choresCompleted: 0,
          outdoorActivities: 0,
          affirmationsViewed: 0,
          totalPoints: 10,
        },
        totals: {
          flashcardsCompleted: 0,
          flashcardsCorrect: 0,
          choresCompleted: 0,
          outdoorActivities: 0,
          affirmationsViewed: 0,
        },
      },
      fetchedAt: "2025-01-01T00:00:00.000Z",
    });
    (postProgressEvent as jest.Mock).mockResolvedValue({ pointsAwarded: 5, newAchievementIds: [] });
  });

  it("hydrates and refreshes", async () => {
    const screen = render(
      <DashboardProvider>
        <Probe />
      </DashboardProvider>,
    );

    // initial refresh runs in effect
    await act(async () => {
      await Promise.resolve();
    });

    expect(screen.getByTestId("totalPoints").props.children).toBe(10);
    expect(getDashboard).toHaveBeenCalled();
  });

  it("posts event and triggers refresh", async () => {
    const screen = render(
      <DashboardProvider>
        <Probe />
      </DashboardProvider>,
    );

    await act(async () => {
      await Promise.resolve();
    });

    const before = screen.getByTestId("totalPoints").props.children;

    await act(async () => {
      screen.getByTestId("post").props.onPress();
      await Promise.resolve();
    });

    const after = screen.getByTestId("totalPoints").props.children;
    expect(after).toBe(before);
    expect(postProgressEvent).toHaveBeenCalled();
  });
});
