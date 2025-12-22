import { useState } from "react";
import { View, StyleSheet, Pressable, TextInput, ScrollView } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import * as Haptics from "expo-haptics";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { ScreenScrollView } from "@/components/ScreenScrollView";
import { ProgressBar } from "@/components/ProgressBar";
import { useTheme } from "@/hooks/useTheme";
import { useSchool } from "@/contexts/SchoolContext";
import { Spacing, BorderRadius } from "@/constants/theme";
import { 
  SCHOOL_CATEGORIES, 
  getLevelTier, 
  STARS_PER_LEVEL,
  TOTAL_SCHOOL_LEVELS,
  SchoolCategory,
  SchoolSubject,
} from "@/constants/schoolData";

type RootStackParamList = {
  SchoolDashboard: undefined;
  SubjectDetail: { subjectId: string };
  LevelActivity: { subjectId: string; level: number; starNumber: number };
  ParentPortal: undefined;
  SchoolForum: undefined;
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function SchoolDashboardScreen() {
  const { theme } = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const { progress, getGlobalProgress, getSubjectProgress, getUnlockedBadges } = useSchool();
  const [searchQuery, setSearchQuery] = useState("");
  
  const globalProgress = getGlobalProgress();
  const levelTier = getLevelTier(globalProgress.level);
  const unlockedBadges = getUnlockedBadges();
  
  const filteredCategories = SCHOOL_CATEGORIES.map(cat => ({
    ...cat,
    subjects: cat.subjects.filter(s => 
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.description.toLowerCase().includes(searchQuery.toLowerCase())
    ),
  })).filter(cat => cat.subjects.length > 0);

  const navigateToSubject = (subject: SchoolSubject) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    navigation.navigate("SubjectDetail", { subjectId: subject.id });
  };

  const navigateToParentPortal = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate("ParentPortal");
  };

  const navigateToForum = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate("SchoolForum");
  };

  const renderSubjectCard = (subject: SchoolSubject) => {
    const subjectProg = getSubjectProgress(subject.id);
    const progressPercent = subjectProg.totalStarsEarned / (STARS_PER_LEVEL * 10);
    
    return (
      <Pressable
        key={subject.id}
        onPress={() => navigateToSubject(subject)}
        style={[styles.subjectCard, { backgroundColor: subject.color + "15" }]}
      >
        <View style={[styles.subjectIcon, { backgroundColor: subject.color + "30" }]}>
          <Feather name={subject.icon as any} size={24} color={subject.color} />
        </View>
        <View style={styles.subjectInfo}>
          <ThemedText type="headline" style={{ color: subject.color }}>
            {subject.name}
          </ThemedText>
          <ThemedText style={[styles.subjectDesc, { color: theme.textSecondary }]} numberOfLines={1}>
            {subject.description}
          </ThemedText>
          <View style={styles.subjectProgressRow}>
            <ThemedText style={[styles.levelText, { color: theme.textSecondary }]}>
              Level {subjectProg.currentLevel}
            </ThemedText>
            <ThemedText style={[styles.starText, { color: subject.color }]}>
              {subjectProg.totalStarsEarned} stars
            </ThemedText>
          </View>
          <ProgressBar 
            progress={Math.min(progressPercent, 1)} 
            color={subject.color}
            style={styles.subjectProgressBar}
          />
        </View>
        <Feather name="chevron-right" size={20} color={theme.textSecondary} />
      </Pressable>
    );
  };

  const renderCategory = (category: SchoolCategory) => (
    <View key={category.id} style={styles.categorySection}>
      <View style={styles.categoryHeader}>
        <View style={[styles.categoryIcon, { backgroundColor: category.color + "20" }]}>
          <Feather name={category.icon as any} size={20} color={category.color} />
        </View>
        <ThemedText type="headline" style={{ color: category.color }}>
          {category.name}
        </ThemedText>
      </View>
      <View style={styles.subjectsList}>
        {category.subjects.map(renderSubjectCard)}
      </View>
    </View>
  );

  return (
    <ScreenScrollView>
      <ThemedView style={styles.container}>
        <View style={[styles.globalProgressCard, { backgroundColor: "#3B82F6" + "15" }]}>
          <View style={styles.globalHeader}>
            <View style={[styles.levelBadge, { backgroundColor: "#3B82F6" }]}>
              <Feather name="award" size={28} color="white" />
            </View>
            <View style={styles.levelDetails}>
              <ThemedText type="title" style={{ color: "#3B82F6" }}>
                Level {globalProgress.level}
              </ThemedText>
              <ThemedText style={[styles.tierName, { color: theme.textSecondary }]}>
                {levelTier.name}
              </ThemedText>
              <ThemedText style={[styles.gradeEquiv, { color: theme.textSecondary }]}>
                {levelTier.gradeEquivalent}
              </ThemedText>
            </View>
            <View style={styles.globalStats}>
              <View style={styles.statItem}>
                <Feather name="star" size={18} color="#F59E0B" />
                <ThemedText style={[styles.statValue, { color: "#F59E0B" }]}>
                  {globalProgress.totalStars}
                </ThemedText>
                <ThemedText style={[styles.statLabel, { color: theme.textSecondary }]}>
                  Stars
                </ThemedText>
              </View>
            </View>
          </View>
          
          <View style={styles.globalProgressSection}>
            <View style={styles.progressLabelRow}>
              <ThemedText style={[styles.progressLabel, { color: theme.textSecondary }]}>
                Overall Progress: Level {globalProgress.level}/{TOTAL_SCHOOL_LEVELS}
              </ThemedText>
              <ThemedText style={[styles.progressPercent, { color: "#3B82F6" }]}>
                {Math.round(globalProgress.overallProgress * 100)}%
              </ThemedText>
            </View>
            <ProgressBar 
              progress={globalProgress.overallProgress} 
              color="#3B82F6"
              style={styles.globalProgressBar}
            />
            <ThemedText style={[styles.starsToNext, { color: theme.textSecondary }]}>
              {STARS_PER_LEVEL - globalProgress.starsInLevel} stars to next level
            </ThemedText>
          </View>

          {unlockedBadges.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.badgesScroll}>
              {unlockedBadges.slice(0, 5).map(badge => (
                <View key={badge.id} style={[styles.badgeItem, { backgroundColor: "#10B981" + "20" }]}>
                  <Feather name={badge.icon as any} size={16} color="#10B981" />
                  <ThemedText style={[styles.badgeName, { color: "#10B981" }]}>
                    {badge.name}
                  </ThemedText>
                </View>
              ))}
            </ScrollView>
          ) : null}
        </View>

        <View style={[styles.searchContainer, { backgroundColor: theme.backgroundDefault }]}>
          <Feather name="search" size={20} color={theme.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: theme.text }]}
            placeholder="Search subjects..."
            placeholderTextColor={theme.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <Pressable onPress={() => setSearchQuery("")}>
              <Feather name="x" size={20} color={theme.textSecondary} />
            </Pressable>
          ) : null}
        </View>

        <View style={styles.quickActions}>
          <Pressable
            onPress={navigateToForum}
            style={[styles.actionButton, { backgroundColor: "#10B981" + "15" }]}
          >
            <Feather name="message-square" size={20} color="#10B981" />
            <ThemedText style={{ color: "#10B981" }}>Discussion</ThemedText>
          </Pressable>
          <Pressable
            onPress={navigateToParentPortal}
            style={[styles.actionButton, { backgroundColor: "#8B5CF6" + "15" }]}
          >
            <Feather name="settings" size={20} color="#8B5CF6" />
            <ThemedText style={{ color: "#8B5CF6" }}>Parent Portal</ThemedText>
          </Pressable>
        </View>

        {filteredCategories.map(renderCategory)}
      </ThemedView>
    </ScreenScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.lg,
  },
  globalProgressCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  globalHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  levelBadge: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  levelDetails: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  tierName: {
    fontSize: 14,
    marginTop: 2,
  },
  gradeEquiv: {
    fontSize: 12,
    marginTop: 2,
  },
  globalStats: {
    alignItems: "center",
  },
  statItem: {
    alignItems: "center",
  },
  statValue: {
    fontSize: 18,
    fontWeight: "bold",
    marginTop: 2,
  },
  statLabel: {
    fontSize: 12,
  },
  globalProgressSection: {
    marginTop: Spacing.sm,
  },
  progressLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: Spacing.xs,
  },
  progressLabel: {
    fontSize: 13,
  },
  progressPercent: {
    fontSize: 13,
    fontWeight: "600",
  },
  globalProgressBar: {
    height: 8,
    borderRadius: 4,
  },
  starsToNext: {
    fontSize: 12,
    marginTop: Spacing.xs,
    textAlign: "center",
  },
  badgesScroll: {
    marginTop: Spacing.md,
  },
  badgeItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
    marginRight: Spacing.sm,
  },
  badgeName: {
    fontSize: 12,
    marginLeft: Spacing.xs,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.lg,
  },
  searchInput: {
    flex: 1,
    marginLeft: Spacing.sm,
    fontSize: 16,
    paddingVertical: Spacing.xs,
  },
  quickActions: {
    flexDirection: "row",
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  categorySection: {
    marginBottom: Spacing.xl,
  },
  categoryHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  categoryIcon: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.sm,
  },
  subjectsList: {
    gap: Spacing.sm,
  },
  subjectCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  subjectIcon: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  subjectInfo: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  subjectDesc: {
    fontSize: 13,
    marginTop: 2,
  },
  subjectProgressRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: Spacing.xs,
  },
  levelText: {
    fontSize: 12,
  },
  starText: {
    fontSize: 12,
    fontWeight: "600",
  },
  subjectProgressBar: {
    height: 4,
    borderRadius: 2,
    marginTop: Spacing.xs,
  },
});
