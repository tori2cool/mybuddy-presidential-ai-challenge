import { useState, useRef, useEffect } from "react";
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
import { useProgress } from "@/contexts/ProgressContext";
import { Spacing, BorderRadius } from "@/constants/theme";

import { getDailyChores } from "@/services/choresService";
import { Chore } from "@/types/models";
import { useCurrentChildId } from "@/contexts/ChildContext";

export default function ChoresScreen() {
  const { theme } = useTheme();
  const { childId } = useCurrentChildId();
  const { addChoreCompleted, progress, getTodayStats } = useProgress();

  const [chores, setChores] = useState<Chore[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [completed, setCompleted] = useState<string[]>([]);
  const [extraChores, setExtraChores] = useState<Chore[]>([]);

  // Track which chores have already incremented progress
  const trackedChores = useRef<Set<string>>(new Set());

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

  const toggleChore = (id: string) => {
    const wasCompleted = completed.includes(id);

    if (!wasCompleted) {
      // First time marking as completed in this toggle
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      if (!trackedChores.current.has(id)) {
        addChoreCompleted();
        trackedChores.current.add(id);
      }
    }

    setCompleted((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  };

  const allChores = [...chores, ...extraChores];
  const allCompleted =
    allChores.length > 0 &&
    allChores.every((chore) => completed.includes(chore.id));
  const todayStats = getTodayStats();

  const addExtraChore = () => {
    const newChore: Chore = {
      id: `extra-${Date.now()}`,
      label: "Help with dishes",
      icon: "star",
      isExtra: true,
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
              {todayStats?.choresCompleted ?? 0}
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
              {progress.totalChoresCompleted}
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
              +{(todayStats?.choresCompleted ?? 0) * 15}
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
              checked={completed.includes(chore.id)}
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
                checked={completed.includes(chore.id)}
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
});