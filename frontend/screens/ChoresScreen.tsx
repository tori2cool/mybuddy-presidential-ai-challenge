import { useMemo, useState, useEffect } from "react";
import { View, StyleSheet } from "react-native";
import * as Haptics from "expo-haptics";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { ScreenScrollView } from "@/components/ScreenScrollView";
import { CheckboxItem } from "@/components/CheckboxItem";
import { IconButton } from "@/components/IconButton";
import { AsyncStatus } from "@/components/AsyncStatus";

import { useTheme } from "@/hooks/useTheme";
import { useDashboard } from "@/contexts/DashboardContext";
import { Spacing, BorderRadius } from "@/constants/theme";

import { getDailyChores } from "@/services/choresService";
import { Chore } from "@/types/models";
import { useCurrentChildId } from "@/contexts/ChildContext";
import { NavigatorScreenParams, useNavigation } from "@react-navigation/native";
import { RootStackParamList, TabParamList } from "@/navigation/RootNavigator";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useProfileScroll } from "@/contexts/ProfileScrollContext";

export default function ChoresScreen() {
  const { theme } = useTheme();
  const { childId } = useCurrentChildId();
  const { data: dashboard, postEvent, refreshDashboard } = useDashboard();

  const [chores, setChores] = useState<Chore[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingCompleted, setPendingCompleted] = useState<Set<string>>(new Set());
  const [extraChores, setExtraChores] = useState<Chore[]>([]);

  useEffect(() => {
    if (!childId) return;

    let cancelled = false;

    const loadChores = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getDailyChores(childId);
        if (cancelled) return;
        setChores(data);
      } catch (e) {
        console.error("Failed to load chores", e);
        if (cancelled) return;
        setError("Couldn't load chores. Please try again later.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadChores();

    return () => {
      cancelled = true;
    };
  }, [childId]);

  const completedSet = useMemo(() => {
    const ids = dashboard?.todayCompletedChoreIds ?? [];
    const s = new Set<string>(ids);
    for (const id of pendingCompleted) s.add(id);
    return s;
  }, [dashboard?.todayCompletedChoreIds, pendingCompleted]);

  const toggleChore = (id: string) => {
    // Persisted completion for today: do not allow toggling back or re-posting.
    const alreadyCompletedToday = (dashboard?.todayCompletedChoreIds ?? []).includes(id);
    if (alreadyCompletedToday) return;

    if (completedSet.has(id)) return;

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    setPendingCompleted((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });

    if (childId) {
      const chore = allChores.find((c) => c.id === id);
      postEvent({
        kind: "chore",
        body: { choreId: id, isExtra: chore?.isExtra ?? false },
      })
        .then(() => refreshDashboard({ force: true }))
        .finally(() => {
          // Clear optimistic state once we have refreshed (or tried).
          setPendingCompleted((prev) => {
            const next = new Set(prev);
            next.delete(id);
            return next;
          });
        })
        .catch(() => { });
    }
  };

  const allChores = [...chores, ...extraChores];
  const allCompleted = allChores.length > 0 && allChores.every((chore) => completedSet.has(chore.id));
  const choresToday = dashboard?.today?.choresCompleted ?? 0;
  const choresTotal = dashboard?.totalChoresCompleted ?? 0;

  const addExtraChore = () => {
    const newChore: Chore = {
      id: `extra-${Date.now()}`,
      label: "Help with dishes",
      icon: "star",
      isExtra: true,
      tags: null,
      ageRangeId: null
    };
    setExtraChores((prev) => [...prev, newChore]);
  };

  return (
    <ScreenScrollView>
      <ThemedView style={styles.container}>
        {/* Header with date and add-extra button */}
        <View style={styles.header}>
          <ThemedText type="headline">
            {new Date().toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </ThemedText>
          <IconButton
            name="plus-circle"
            size={28}
            color={theme.primary}
            onPress={addExtraChore}
          />
        </View>

        {/* Stats bar */}
        <View
          style={[
            styles.statsBar,
            { backgroundColor: theme.backgroundDefault },
          ]}
        >
          <View style={styles.statItem}>
            <Feather name="check-circle" size={20} color={theme.success} />
            <ThemedText style={[styles.statValue, { color: theme.success }]}>
              {choresToday}
            </ThemedText>
            <ThemedText
              style={[styles.statLabel, { color: theme.textSecondary }]}
            >
              Today
            </ThemedText>
          </View>

          <View
            style={[styles.statDivider, { backgroundColor: theme.border }]}
          />

          <View style={styles.statItem}>
            <Feather name="star" size={20} color={theme.secondary} />
            <ThemedText
              style={[styles.statValue, { color: theme.secondary }]}
            >
              {choresTotal}
            </ThemedText>
            <ThemedText
              style={[styles.statLabel, { color: theme.textSecondary }]}
            >
              Total
            </ThemedText>
          </View>

          <View
            style={[styles.statDivider, { backgroundColor: theme.border }]}
          />

          <View style={styles.statItem}>
            <Feather name="zap" size={20} color={theme.primary} />
            <ThemedText style={[styles.statValue, { color: theme.primary }]}>
              +{choresToday * 15}
            </ThemedText>
            <ThemedText
              style={[styles.statLabel, { color: theme.textSecondary }]}
            >
              Points
            </ThemedText>
          </View>
        </View>

        {/* Title */}
        <ThemedText type="title" style={styles.sectionTitle}>
          Daily Chores
        </ThemedText>

        {/* Async loading / error indicator */}
        <AsyncStatus
          loading={loading}
          error={error}
          loadingMessage="Loading chores..."
        />

        {/* Only show chore list when not loading and no error */}
        {!loading &&
          !error &&
          chores.map((chore) => (
            <CheckboxItem
              key={chore.id}
              label={chore.label}
              checked={completedSet.has(chore.id)}
              onToggle={() => toggleChore(chore.id)}
              icon={chore.icon}
            />
          ))}

        {/* Extra chores */}
        {extraChores.length > 0 && (
          <>
            <ThemedText type="title" style={styles.sectionTitle}>
              Extra Credit
            </ThemedText>
            {extraChores.map((chore) => (
              <CheckboxItem
                key={chore.id}
                label={chore.label}
                checked={completedSet.has(chore.id)}
                onToggle={() => toggleChore(chore.id)}
                icon={chore.icon}
              />
            ))}
          </>
        )}

        {/* Celebration when everything is done */}
        {allCompleted && (
          <View
            style={[
              styles.celebration,
              { backgroundColor: theme.success + "20" },
            ]}
          >
            <Feather name="award" size={48} color={theme.success} />
            <ThemedText
              type="headline"
              style={[styles.celebrationText, { color: theme.success }]}
            >
              All done! You're amazing!
            </ThemedText>
            <ThemedText
              style={[
                styles.celebrationSubtext,
                { color: theme.success },
              ]}
            >
              You earned {allChores.length * 15} points today!
            </ThemedText>
          </View>
        )}
      </ThemedView>
    </ScreenScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.lg,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.lg,
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
    marginTop: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  celebration: {
    borderRadius: BorderRadius.md,
    padding: Spacing.xl,
    alignItems: "center",
    marginTop: Spacing.xl,
  },
  celebrationText: {
    textAlign: "center",
    marginTop: Spacing.md,
  },
  celebrationSubtext: {
    fontSize: 14,
    marginTop: Spacing.xs,
  },
  settingsButton: {
    backgroundColor: "rgba(0,0,0,0.2)",
    borderRadius: 22,
    marginTop: 10
  },
});