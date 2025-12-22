import { useState } from "react";
import { View, StyleSheet, Pressable, ScrollView } from "react-native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { ScreenScrollView } from "@/components/ScreenScrollView";
import { Button } from "@/components/Button";
import { useTheme } from "@/hooks/useTheme";
import { useProgress } from "@/contexts/ProgressContext";
import { Spacing, BorderRadius, Typography } from "@/constants/theme";
import { ALL_OUTDOOR_ACTIVITIES, OUTDOOR_CATEGORIES, OutdoorCategory, OutdoorActivity } from "@/constants/outdoorData";

export default function OutdoorScreen() {
  const { theme } = useTheme();
  const { isOutdoorCompleted, toggleOutdoor, progress, getTodayStats } = useProgress();
  const [selectedCategory, setSelectedCategory] = useState<OutdoorCategory | "all">("all");

  const todayStats = getTodayStats();

  const filteredActivities = selectedCategory === "all" 
    ? ALL_OUTDOOR_ACTIVITIES 
    : ALL_OUTDOOR_ACTIVITIES.filter(a => a.category === selectedCategory);

  const handleToggleActivity = (activity: OutdoorActivity) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    toggleOutdoor(activity.id, activity.points);
  };

  const completedCount = filteredActivities.filter(a => isOutdoorCompleted(a.id)).length;
  const totalPoints = filteredActivities
    .filter(a => isOutdoorCompleted(a.id))
    .reduce((sum, a) => sum + a.points, 0);

  const categories: (OutdoorCategory | "all")[] = ["all", ...Object.keys(OUTDOOR_CATEGORIES) as OutdoorCategory[]];

  return (
    <ScreenScrollView>
      <ThemedView style={styles.container}>
        <View style={[styles.statsBar, { backgroundColor: theme.backgroundDefault }]}>
          <View style={styles.statItem}>
            <Feather name="sun" size={20} color={theme.success} />
            <ThemedText style={[styles.statValue, { color: theme.success }]}>
              {completedCount}
            </ThemedText>
            <ThemedText style={[styles.statLabel, { color: theme.textSecondary }]}>
              Today
            </ThemedText>
          </View>
          <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
          <View style={styles.statItem}>
            <Feather name="compass" size={20} color={theme.secondary} />
            <ThemedText style={[styles.statValue, { color: theme.secondary }]}>
              {progress.totalOutdoorActivities}
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
              ? { name: "All", icon: "grid", color: theme.primary }
              : OUTDOOR_CATEGORIES[category];
            
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

        <ThemedText type="headline" style={styles.sectionTitle}>
          {selectedCategory === "all" 
            ? "Today's Adventures" 
            : OUTDOOR_CATEGORIES[selectedCategory].name}
        </ThemedText>
        
        {filteredActivities.map((activity) => {
          const isCompleted = isOutdoorCompleted(activity.id);
          const categoryInfo = OUTDOOR_CATEGORIES[activity.category];
          
          return (
            <View
              key={activity.id}
              style={[
                styles.card,
                {
                  backgroundColor: isCompleted 
                    ? theme.success + "15"
                    : theme.backgroundDefault,
                },
              ]}
            >
              <View style={styles.cardHeader}>
                <View
                  style={[
                    styles.iconContainer,
                    {
                      backgroundColor: isCompleted
                        ? theme.success
                        : categoryInfo.color + "20",
                    },
                  ]}
                >
                  <Feather
                    name={isCompleted ? "check" : activity.icon}
                    size={28}
                    color={isCompleted ? "white" : categoryInfo.color}
                  />
                </View>
                <View style={styles.cardContent}>
                  <View style={styles.titleRow}>
                    <ThemedText type="headline">{activity.name}</ThemedText>
                  </View>
                  <ThemedText
                    style={[styles.category, { color: theme.textSecondary }]}
                  >
                    {categoryInfo.name} • {activity.duration} • +{activity.points} pts
                  </ThemedText>
                  <ThemedText
                    style={[styles.description, { color: theme.textSecondary }]}
                  >
                    {activity.description}
                  </ThemedText>
                </View>
              </View>
              
              {isCompleted ? (
                <Pressable
                  onPress={() => handleToggleActivity(activity)}
                  style={[
                    styles.completedBanner,
                    { backgroundColor: theme.success + "20" },
                  ]}
                >
                  <Feather name="check-circle" size={16} color={theme.success} />
                  <ThemedText
                    style={[styles.completedText, { color: theme.success }]}
                  >
                    Completed! +{activity.points} points earned!
                  </ThemedText>
                </Pressable>
              ) : (
                <Button
                  onPress={() => handleToggleActivity(activity)}
                  style={styles.startButton}
                >
                  I Did It!
                </Button>
              )}
            </View>
          );
        })}

        {completedCount > 0 && completedCount >= 3 ? (
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
              Great job getting outside!
            </ThemedText>
            <ThemedText style={[styles.celebrationSubtext, { color: theme.success }]}>
              You earned {totalPoints} points today!
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
  card: {
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
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
  category: {
    ...Typography.caption,
    marginTop: Spacing.xs,
  },
  description: {
    fontSize: 12,
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
  celebration: {
    borderRadius: BorderRadius.md,
    padding: Spacing.xl,
    alignItems: "center",
    marginTop: Spacing.lg,
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
