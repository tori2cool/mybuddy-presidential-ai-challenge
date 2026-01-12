// frontend/screens/OutdoorScreen.tsx
import { useMemo, useState, useEffect } from "react";
import { View, StyleSheet } from "react-native";
import * as Haptics from "expo-haptics";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { ScreenScrollView } from "@/components/ScreenScrollView";
import { Button } from "@/components/Button";
import { AsyncStatus } from "@/components/AsyncStatus";

import { useTheme } from "@/hooks/useTheme";
import { useDashboard } from "@/contexts/DashboardContext";
import { Spacing, BorderRadius, Typography } from "@/constants/theme";

import { getOutdoorActivities } from "@/services/outdoorService";
import type { OutdoorActivity, UUID } from "@/types/models";
import { useCurrentChildId } from "@/contexts/ChildContext";

const SEP = " · "; // nice middle-dot separator

export default function OutdoorScreen() {
  const { theme } = useTheme();
  const { childId } = useCurrentChildId();
  const { data: dashboard, postEvent, refreshDashboard } = useDashboard();

  const [activities, setActivities] = useState<OutdoorActivity[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingCompleted, setPendingCompleted] = useState<Set<UUID>>(new Set());

  useEffect(() => {
    if (!childId) return;

    let cancelled = false;

    const loadActivities = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getOutdoorActivities(childId);
        if (cancelled) return;
        setActivities(data);
      } catch (e) {
        console.error("Failed to load outdoor activities", e);
        if (cancelled) return;
        setError("Couldn't load outdoor activities. Please try again later.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadActivities();

    return () => {
      cancelled = true;
    };
  }, [childId]);

  const completedSet = useMemo(() => {
    const ids = dashboard?.todayCompletedOutdoorActivityIds ?? [];
    const s = new Set<UUID>(ids);
    for (const id of pendingCompleted) s.add(id);
    return s;
  }, [dashboard?.todayCompletedOutdoorActivityIds, pendingCompleted]);

  const outdoorToday = dashboard?.today?.outdoorActivities ?? 0;
  const outdoorTotal = dashboard?.totalOutdoorActivities ?? 0;

  const markComplete = (id: UUID) => {
    const alreadyCompletedToday = (dashboard?.todayCompletedOutdoorActivityIds ?? []).includes(id);
    if (alreadyCompletedToday) return;

    if (completedSet.has(id)) return;

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    setPendingCompleted((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });

    if (childId) {
      const activity = activities.find((a) => a.id === id);
      postEvent({
        kind: "outdoor",
        body: {
          outdoorActivityId: id,
          isDaily: activity?.isDaily ?? false,
        },
      })
        .then(() => refreshDashboard({ force: true }))
        .finally(() => {
          setPendingCompleted((prev) => {
            const next = new Set(prev);
            next.delete(id);
            return next;
          });
        })
        .catch(() => {});
    }
  };

  return (
    <ScreenScrollView>
      <ThemedView style={styles.container}>
        {/* Stats bar */}
        <View style={[styles.statsBar, { backgroundColor: theme.backgroundDefault }]}>
          <View style={styles.statItem}>
            <Feather name="sun" size={20} color={theme.success} />
            <ThemedText style={[styles.statValue, { color: theme.success }]}>
              {outdoorToday}
            </ThemedText>
            <ThemedText style={[styles.statLabel, { color: theme.textSecondary }]}>
              Today
            </ThemedText>
          </View>

          <View style={[styles.statDivider, { backgroundColor: theme.backgroundSecondary }]} />

          <View style={styles.statItem}>
            <Feather name="compass" size={20} color={theme.secondary} />
            <ThemedText style={[styles.statValue, { color: theme.secondary }]}>
              {outdoorTotal}
            </ThemedText>
            <ThemedText style={[styles.statLabel, { color: theme.textSecondary }]}>
              Total
            </ThemedText>
          </View>

          <View style={[styles.statDivider, { backgroundColor: theme.backgroundSecondary }]} />

          <View style={styles.statItem}>
            <Feather name="zap" size={20} color={theme.primary} />
            <ThemedText style={[styles.statValue, { color: theme.primary }]}>
              +{outdoorToday * 20}
            </ThemedText>
            <ThemedText style={[styles.statLabel, { color: theme.textSecondary }]}>
              Points
            </ThemedText>
          </View>
        </View>

        <ThemedText type="headline" style={styles.sectionTitle}>
          Today's Adventures
        </ThemedText>

        <AsyncStatus loading={loading} error={error} loadingMessage="Loading outdoor activities..." />

        {!loading &&
          !error &&
          activities.map((activity) => {
            const isCompleted = completedSet.has(activity.id);

            return (
              <View
                key={activity.id}
                style={[
                  styles.card,
                  {
                    backgroundColor: activity.isDaily ? theme.primary + "10" : theme.backgroundDefault,
                    borderColor: activity.isDaily ? theme.primary : "transparent",
                    borderWidth: activity.isDaily ? 2 : 0,
                  },
                ]}
              >
                <View style={styles.cardHeader}>
                  <View
                    style={[
                      styles.iconContainer,
                      {
                        backgroundColor: isCompleted ? theme.success : theme.primary + "20",
                      },
                    ]}
                  >
                    <Feather
                      name={isCompleted ? "check" : (activity.icon as any)}
                      size={28}
                      color={isCompleted ? "white" : theme.primary}
                    />
                  </View>

                  <View style={styles.cardContent}>
                    <View style={styles.titleRow}>
                      <ThemedText type="headline">{activity.name}</ThemedText>
                      {activity.isDaily ? (
                        <View style={[styles.badge, { backgroundColor: theme.secondary }]}>
                          <ThemedText style={styles.badgeText}>Today</ThemedText>
                        </View>
                      ) : null}
                    </View>

                    <ThemedText style={[styles.category, { color: theme.textSecondary }]}>
                      {activity.category}
                      {SEP}
                      {activity.time}
                      {SEP}+{activity.points} pts
                    </ThemedText>
                  </View>
                </View>

                {isCompleted ? (
                  <View style={[styles.completedBanner, { backgroundColor: theme.success + "20" }]}>
                    <Feather name="check-circle" size={16} color={theme.success} />
                    <ThemedText style={[styles.completedText, { color: theme.success }]}>
                      Completed! +{activity.points} points earned!
                    </ThemedText>
                  </View>
                ) : (
                  <Button onPress={() => markComplete(activity.id)} style={styles.startButton}>
                    I'm Done!
                  </Button>
                )}
              </View>
            );
          })}
      </ThemedView>
    </ScreenScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.lg,
  },
  statsBar: {
    flexDirection: "row",
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    alignItems: "center",
    justifyContent: "space-around",
  },
  statItem: {
    alignItems: "center",
    flex: 1,
  },
  statValue: {
    fontSize: 20,
    fontWeight: "700",
    marginTop: Spacing.xs,
  },
  statLabel: {
    fontSize: 12,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 40,
  },
  sectionTitle: {
    marginBottom: Spacing.xl,
  },
  card: {
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  cardContent: {
    flex: 1,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  badge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.xs,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "white",
  },
  category: {
    ...Typography.caption,
    marginTop: Spacing.xs,
  },
  startButton: {
    height: 44,
  },
  completedBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    gap: Spacing.sm,
  },
  completedText: {
    fontWeight: "600",
  },
});
