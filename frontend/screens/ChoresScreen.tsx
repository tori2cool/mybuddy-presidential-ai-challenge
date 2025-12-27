import { useState } from "react";
import { View, StyleSheet, Pressable, ScrollView } from "react-native";
import * as Haptics from "expo-haptics";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { ScreenScrollView } from "@/components/ScreenScrollView";
import { CheckboxItem } from "@/components/CheckboxItem";
import { useTheme } from "@/hooks/useTheme";
import { useProgress } from "@/contexts/ProgressContext";
import { Spacing, BorderRadius } from "@/constants/theme";
import { Feather } from "@expo/vector-icons";
import { ALL_CHORES, CHORE_CATEGORIES, ChoreCategory, Chore } from "@/constants/choresData";

export default function ChoresScreen() {
  const { theme } = useTheme();
  const { isChoreCompleted, toggleChore, progress, getTodayStats } = useProgress();
  const [selectedCategory, setSelectedCategory] = useState<ChoreCategory | "all">("all");
  const [childAge] = useState(10);

  const todayStats = getTodayStats();

  const filteredChores = ALL_CHORES.filter(chore => {
    const ageFilter = chore.ageMin <= childAge;
    const categoryFilter = selectedCategory === "all" || chore.category === selectedCategory;
    return ageFilter && categoryFilter;
  });

  const handleToggleChore = (chore: Chore) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    toggleChore(chore.id, chore.points);
  };

  const completedCount = filteredChores.filter(c => isChoreCompleted(c.id)).length;
  const totalPoints = filteredChores
    .filter(c => isChoreCompleted(c.id))
    .reduce((sum, c) => sum + c.points, 0);

  const categories: (ChoreCategory | "all")[] = ["all", ...Object.keys(CHORE_CATEGORIES) as ChoreCategory[]];

  return (
    <ScreenScrollView>
      <ThemedView style={styles.container}>
        <View style={styles.header}>
          <ThemedText type="headline">
            {new Date().toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </ThemedText>
        </View>

        <View style={[styles.statsBar, { backgroundColor: theme.backgroundDefault }]}>
          <View style={styles.statItem}>
            <Feather name="check-circle" size={20} color={theme.success} />
            <ThemedText style={[styles.statValue, { color: theme.success }]}>
              {completedCount}
            </ThemedText>
            <ThemedText style={[styles.statLabel, { color: theme.textSecondary }]}>
              Today
            </ThemedText>
          </View>
          <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
          <View style={styles.statItem}>
            <Feather name="star" size={20} color={theme.secondary} />
            <ThemedText style={[styles.statValue, { color: theme.secondary }]}>
              {progress.totalChoresCompleted}
            </ThemedText>
            <ThemedText style={[styles.statLabel, { color: theme.textSecondary }]}>
              Total
            </ThemedText>
          </View>
          <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
          <View style={styles.statItem}>
            <Feather name="zap" size={20} color={theme.primary} />
            <ThemedText style={[styles.statValue, { color: theme.primary }]}>
              +{totalPoints}
            </ThemedText>
            <ThemedText style={[styles.statLabel, { color: theme.textSecondary }]}>
              Points
            </ThemedText>
          </View>
        </View>

        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.categoryScroll}
          contentContainerStyle={styles.categoryContainer}
        >
          {categories.map((category) => {
            const isSelected = category === selectedCategory;
            const categoryInfo = category === "all" 
              ? { name: "All", icon: "list", color: theme.primary }
              : CHORE_CATEGORIES[category];
            
            return (
              <Pressable
                key={category}
                onPress={() => setSelectedCategory(category)}
                style={[
                  styles.categoryChip,
                  {
                    backgroundColor: isSelected ? categoryInfo.color : theme.backgroundDefault,
                  },
                ]}
              >
                <Feather 
                  name={categoryInfo.icon as any} 
                  size={16} 
                  color={isSelected ? "white" : categoryInfo.color} 
                />
                <ThemedText 
                  style={[
                    styles.categoryText,
                    { color: isSelected ? "white" : theme.text }
                  ]}
                >
                  {categoryInfo.name}
                </ThemedText>
              </Pressable>
            );
          })}
        </ScrollView>

        <ThemedText type="title" style={styles.sectionTitle}>
          {selectedCategory === "all" 
            ? "All Chores" 
            : CHORE_CATEGORIES[selectedCategory].name}
        </ThemedText>

        {filteredChores.length === 0 ? (
          <View style={[styles.emptyState, { backgroundColor: theme.backgroundDefault }]}>
            <Feather name="inbox" size={48} color={theme.textSecondary} />
            <ThemedText style={[styles.emptyText, { color: theme.textSecondary }]}>
              No chores in this category for your age
            </ThemedText>
          </View>
        ) : (
          filteredChores.map((chore) => {
            const isCompleted = isChoreCompleted(chore.id);
            const categoryInfo = CHORE_CATEGORIES[chore.category];
            
            return (
              <View
                key={chore.id}
                style={[
                  styles.choreCard,
                  { 
                    backgroundColor: isCompleted 
                      ? theme.success + "15" 
                      : theme.backgroundDefault,
                  },
                ]}
              >
                <Pressable
                  onPress={() => handleToggleChore(chore)}
                  style={styles.choreContent}
                >
                  <View
                    style={[
                      styles.checkbox,
                      {
                        backgroundColor: isCompleted ? theme.success : "transparent",
                        borderColor: isCompleted ? theme.success : theme.border,
                      },
                    ]}
                  >
                    {isCompleted ? (
                      <Feather name="check" size={14} color="white" />
                    ) : null}
                  </View>
                  <View style={styles.choreInfo}>
                    <ThemedText 
                      style={[
                        styles.choreName,
                        isCompleted && { textDecorationLine: "line-through" as const, opacity: 0.7 }
                      ]}
                    >
                      {chore.name}
                    </ThemedText>
                    <ThemedText style={[styles.choreDesc, { color: theme.textSecondary }]}>
                      {chore.description}
                    </ThemedText>
                  </View>
                  <View style={styles.chorePoints}>
                    <Feather name="zap" size={14} color={categoryInfo.color} />
                    <ThemedText style={[styles.pointsValue, { color: categoryInfo.color }]}>
                      +{chore.points}
                    </ThemedText>
                  </View>
                </Pressable>
              </View>
            );
          })
        )}

        {completedCount > 0 && completedCount === filteredChores.length ? (
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
            <ThemedText style={[styles.celebrationSubtext, { color: theme.success }]}>
              You earned {totalPoints} points!
            </ThemedText>
          </View>
        ) : null}
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
  categoryScroll: {
    marginBottom: Spacing.lg,
  },
  categoryContainer: {
    gap: Spacing.sm,
    paddingRight: Spacing.lg,
  },
  categoryChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    gap: Spacing.xs,
  },
  categoryText: {
    fontSize: 13,
    fontWeight: "600",
  },
  sectionTitle: {
    marginBottom: Spacing.lg,
  },
  choreCard: {
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
  },
  choreContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: BorderRadius.xs,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  choreInfo: {
    flex: 1,
  },
  choreName: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 2,
  },
  choreDesc: {
    fontSize: 12,
  },
  chorePoints: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  pointsValue: {
    fontSize: 14,
    fontWeight: "700",
  },
  emptyState: {
    padding: Spacing.xl,
    borderRadius: BorderRadius.md,
    alignItems: "center",
  },
  emptyText: {
    marginTop: Spacing.md,
    textAlign: "center",
  },
  celebration: {
    borderRadius: BorderRadius.md,
    padding: Spacing.xl,
    alignItems: "center",
    marginTop: Spacing.xl,
    marginBottom: Spacing.xl,
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
