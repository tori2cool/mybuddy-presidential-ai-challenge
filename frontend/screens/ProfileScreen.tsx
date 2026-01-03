import { View, StyleSheet, Image, Pressable, ScrollView } from "react-native";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { ScreenScrollView } from "@/components/ScreenScrollView";
import { useTheme } from "@/hooks/useTheme";
import { useProgress, SUBJECTS } from "@/contexts/ProgressContext";
import { SUBJECTS as SUBJECT_INFO } from "@/constants/curriculum";
import { Spacing, BorderRadius, Typography } from "@/constants/theme";
import { useCurrentChild } from "@/contexts/useCurrentChild";

const DIFFICULTY_LABELS = {
  easy: { label: "Easy", color: "#10B981" },
  medium: { label: "Medium", color: "#F59E0B" },
  hard: { label: "Hard", color: "#EF4444" },
};

export default function ProfileScreen() {
  const { theme } = useTheme();
  const { progress, getTodayStats, getThisWeekStats, getLevelInfo, getGraduationProgress, getSubjectDifficulty } = useProgress();
  const { child, loading } = useCurrentChild();

  const todayStats = getTodayStats();
  const weekStats = getThisWeekStats();
  const levelInfo = getLevelInfo();
  const graduationProgress = getGraduationProgress();

  const totalflashcards = Object.values(progress.flashcardsBySubject)
    .reduce((acc, s) => acc + s.completed, 0);
  const totalCorrect = Object.values(progress.flashcardsBySubject)
    .reduce((acc, s) => acc + s.correct, 0);
  const accuracy = totalflashcards > 0 
    ? Math.round((totalCorrect / totalflashcards) * 100) 
    : 0;

  const unlockedAchievements = progress.achievements.filter(a => a.unlockedAt);
  const lockedAchievements = progress.achievements.filter(a => !a.unlockedAt);

  return (
    <ScreenScrollView>
      <ThemedView style={styles.container}>
        <View style={styles.avatarSection}>
          <Image
            source={require("@/assets/avatars/astronaut_avatar.png")}
            style={styles.avatar}
          />
        <ThemedText type="title" style={styles.name}>
          {loading ? "Loading..." : child?.name ?? "Buddy"}
        </ThemedText>
          <View style={[styles.levelBadge, { backgroundColor: levelInfo.gradeInfo.color }]}>
            <Feather name="award" size={16} color="white" />
            <ThemedText style={styles.levelText}>{levelInfo.rank}</ThemedText>
          </View>
        </View>

        <View style={[styles.streakCard, { backgroundColor: theme.primary + "15" }]}>
          <View style={styles.streakHeader}>
            <View style={[styles.fireIcon, { backgroundColor: theme.secondary }]}>
              <Feather name="zap" size={24} color="white" />
            </View>
            <View style={styles.streakInfo}>
              <ThemedText type="hero" style={{ color: theme.primary }}>
                {progress.currentStreak}
              </ThemedText>
              <ThemedText style={[styles.streakLabel, { color: theme.textSecondary }]}>
                Day Streak
              </ThemedText>
            </View>
          </View>
          <View style={styles.streakStats}>
            <View style={styles.streakStat}>
              <ThemedText style={[styles.streakStatValue, { color: theme.text }]}>
                {progress.longestStreak}
              </ThemedText>
              <ThemedText style={[styles.streakStatLabel, { color: theme.textSecondary }]}>
                Best Streak
              </ThemedText>
            </View>
            <View style={[styles.streakDivider, { backgroundColor: theme.textSecondary + "40" }]} />
            <View style={styles.streakStat}>
              <ThemedText style={[styles.streakStatValue, { color: theme.text }]}>
                {progress.totalPoints}
              </ThemedText>
              <ThemedText style={[styles.streakStatLabel, { color: theme.textSecondary }]}>
                Total Points
              </ThemedText>
            </View>
          </View>
        </View>

        <View style={[styles.levelProgressCard, { backgroundColor: theme.backgroundDefault }]}>
          <View style={styles.levelProgressHeader}>
            <Feather name="target" size={20} color={theme.primary} />
            <ThemedText type="headline" style={{ color: theme.primary }}>
              Level Progress
            </ThemedText>
          </View>
          
          <View style={styles.levelInfo}>
            <ThemedText style={[styles.currentLevelLabel, { color: theme.textSecondary }]}>
              {levelInfo.gradeInfo.name} - Level {levelInfo.gradeLevel}
            </ThemedText>
            <View style={styles.currentLevelRow}>
              <View style={[styles.levelBadgeSmall, { backgroundColor: levelInfo.gradeInfo.color }]}>
                <Feather name="award" size={14} color="white" />
                <ThemedText style={styles.levelTextSmall}>{levelInfo.rank}</ThemedText>
              </View>
            </View>
          </View>

          <View style={styles.xpProgressSection}>
            <ThemedText style={[styles.xpLabel, { color: theme.textSecondary }]}>
              XP Progress: {levelInfo.xpProgress.current}/{levelInfo.xpProgress.required}
            </ThemedText>
            <View style={[styles.subjectProgressBar, { backgroundColor: theme.textSecondary + "30" }]}>
              <View 
                style={[
                  styles.subjectProgressFill, 
                  { 
                    width: `${levelInfo.xpProgress.progress}%`,
                    backgroundColor: theme.primary,
                  }
                ]} 
              />
            </View>
          </View>

          <ThemedText style={[styles.balanceMessage, { color: graduationProgress.canGraduate ? theme.success : theme.textSecondary }]}>
            {graduationProgress.canGraduate ? "Ready to graduate to next grade!" : "Complete requirements to graduate:"}
          </ThemedText>

          <View style={styles.subjectProgressSection}>
            <View style={styles.subjectProgressItem}>
              <View style={styles.subjectProgressHeader}>
                <View style={styles.subjectProgressLabelRow}>
                  <View style={[styles.subjectIcon, { backgroundColor: "#8B5CF6" + "20" }]}>
                    <Feather name="book" size={14} color="#8B5CF6" />
                  </View>
                  <ThemedText style={[styles.subjectName, { color: theme.text }]}>
                    Flashcards
                  </ThemedText>
                </View>
                <View style={styles.subjectProgressCountRow}>
                  <ThemedText style={[styles.subjectProgressCount, { color: graduationProgress.requirements.flashcards.met ? "#10B981" : theme.textSecondary }]}>
                    {graduationProgress.requirements.flashcards.current}/{graduationProgress.requirements.flashcards.required}
                  </ThemedText>
                  {graduationProgress.requirements.flashcards.met ? (
                    <Feather name="check-circle" size={16} color="#10B981" />
                  ) : null}
                </View>
              </View>
            </View>

            <View style={styles.subjectProgressItem}>
              <View style={styles.subjectProgressHeader}>
                <View style={styles.subjectProgressLabelRow}>
                  <View style={[styles.subjectIcon, { backgroundColor: "#10B981" + "20" }]}>
                    <Feather name="check-square" size={14} color="#10B981" />
                  </View>
                  <ThemedText style={[styles.subjectName, { color: theme.text }]}>
                    Chores
                  </ThemedText>
                </View>
                <View style={styles.subjectProgressCountRow}>
                  <ThemedText style={[styles.subjectProgressCount, { color: graduationProgress.requirements.chores.met ? "#10B981" : theme.textSecondary }]}>
                    {graduationProgress.requirements.chores.current}/{graduationProgress.requirements.chores.required}
                  </ThemedText>
                  {graduationProgress.requirements.chores.met ? (
                    <Feather name="check-circle" size={16} color="#10B981" />
                  ) : null}
                </View>
              </View>
            </View>

            <View style={styles.subjectProgressItem}>
              <View style={styles.subjectProgressHeader}>
                <View style={styles.subjectProgressLabelRow}>
                  <View style={[styles.subjectIcon, { backgroundColor: "#FB923C" + "20" }]}>
                    <Feather name="sun" size={14} color="#FB923C" />
                  </View>
                  <ThemedText style={[styles.subjectName, { color: theme.text }]}>
                    Outdoor Activities
                  </ThemedText>
                </View>
                <View style={styles.subjectProgressCountRow}>
                  <ThemedText style={[styles.subjectProgressCount, { color: graduationProgress.requirements.outdoor.met ? "#10B981" : theme.textSecondary }]}>
                    {graduationProgress.requirements.outdoor.current}/{graduationProgress.requirements.outdoor.required}
                  </ThemedText>
                  {graduationProgress.requirements.outdoor.met ? (
                    <Feather name="check-circle" size={16} color="#10B981" />
                  ) : null}
                </View>
              </View>
            </View>

            <View style={styles.subjectProgressItem}>
              <View style={styles.subjectProgressHeader}>
                <View style={styles.subjectProgressLabelRow}>
                  <View style={[styles.subjectIcon, { backgroundColor: "#EC4899" + "20" }]}>
                    <Feather name="heart" size={14} color="#EC4899" />
                  </View>
                  <ThemedText style={[styles.subjectName, { color: theme.text }]}>
                    Affirmations
                  </ThemedText>
                </View>
                <View style={styles.subjectProgressCountRow}>
                  <ThemedText style={[styles.subjectProgressCount, { color: graduationProgress.requirements.affirmations.met ? "#10B981" : theme.textSecondary }]}>
                    {graduationProgress.requirements.affirmations.current}/{graduationProgress.requirements.affirmations.required}
                  </ThemedText>
                  {graduationProgress.requirements.affirmations.met ? (
                    <Feather name="check-circle" size={16} color="#10B981" />
                  ) : null}
                </View>
              </View>
            </View>
          </View>
        </View>

        <ThemedText type="headline" style={styles.sectionTitle}>
          Today's Progress
        </ThemedText>

        <View style={styles.todayGrid}>
          <View style={[styles.todayCard, { backgroundColor: theme.backgroundDefault }]}>
            <Feather name="book" size={24} color="#8B5CF6" />
            <ThemedText style={styles.todayValue}>
              {todayStats?.flashcardsCompleted || 0}
            </ThemedText>
            <ThemedText style={[styles.todayLabel, { color: theme.textSecondary }]}>
              Flashcards
            </ThemedText>
          </View>
          <View style={[styles.todayCard, { backgroundColor: theme.backgroundDefault }]}>
            <Feather name="check-circle" size={24} color="#10B981" />
            <ThemedText style={styles.todayValue}>
              {todayStats?.choresCompleted || 0}
            </ThemedText>
            <ThemedText style={[styles.todayLabel, { color: theme.textSecondary }]}>
              Chores
            </ThemedText>
          </View>
          <View style={[styles.todayCard, { backgroundColor: theme.backgroundDefault }]}>
            <Feather name="sun" size={24} color="#FB923C" />
            <ThemedText style={styles.todayValue}>
              {todayStats?.outdoorActivities || 0}
            </ThemedText>
            <ThemedText style={[styles.todayLabel, { color: theme.textSecondary }]}>
              Outdoor
            </ThemedText>
          </View>
          <View style={[styles.todayCard, { backgroundColor: theme.backgroundDefault }]}>
            <Feather name="heart" size={24} color="#EC4899" />
            <ThemedText style={styles.todayValue}>
              {todayStats?.affirmationsViewed || 0}
            </ThemedText>
            <ThemedText style={[styles.todayLabel, { color: theme.textSecondary }]}>
              Affirmations
            </ThemedText>
          </View>
        </View>

        <ThemedText type="headline" style={styles.sectionTitle}>
          Weekly Goals
        </ThemedText>

        <View style={[styles.weeklyCard, { backgroundColor: theme.backgroundDefault }]}>
          <View style={styles.weeklyRow}>
            <View style={styles.weeklyItem}>
              <ThemedText style={[styles.weeklyLabel, { color: theme.textSecondary }]}>
                Days Active
              </ThemedText>
              <View style={styles.weeklyValueRow}>
                <ThemedText type="headline" style={{ color: theme.primary }}>
                  {weekStats?.daysActive || 0}
                </ThemedText>
                <ThemedText style={[styles.weeklyTarget, { color: theme.textSecondary }]}>
                  / 7
                </ThemedText>
              </View>
            </View>
            <View style={styles.weeklyItem}>
              <ThemedText style={[styles.weeklyLabel, { color: theme.textSecondary }]}>
                Weekly Points
              </ThemedText>
              <View style={styles.weeklyValueRow}>
                <ThemedText type="headline" style={{ color: theme.secondary }}>
                  {weekStats?.totalPoints || 0}
                </ThemedText>
              </View>
            </View>
          </View>
          <View style={styles.weeklyRow}>
            <View style={styles.weeklyItem}>
              <ThemedText style={[styles.weeklyLabel, { color: theme.textSecondary }]}>
                Flashcards
              </ThemedText>
              <View style={styles.weeklyValueRow}>
                <ThemedText type="headline">
                  {weekStats?.flashcardsCompleted || 0}
                </ThemedText>
              </View>
            </View>
            <View style={styles.weeklyItem}>
              <ThemedText style={[styles.weeklyLabel, { color: theme.textSecondary }]}>
                Accuracy
              </ThemedText>
              <View style={styles.weeklyValueRow}>
                <ThemedText type="headline" style={{ color: accuracy >= 70 ? theme.success : theme.text }}>
                  {accuracy}%
                </ThemedText>
              </View>
            </View>
          </View>
        </View>

        <ThemedText type="headline" style={styles.sectionTitle}>
          Achievements ({unlockedAchievements.length}/{progress.achievements.length})
        </ThemedText>

        {unlockedAchievements.length > 0 ? (
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.achievementsScroll}
            contentContainerStyle={styles.achievementsContent}
          >
            {unlockedAchievements.map((achievement) => (
              <View 
                key={achievement.id}
                style={[styles.achievementCard, { backgroundColor: theme.primary + "15" }]}
              >
                <View style={[styles.achievementIcon, { backgroundColor: theme.primary }]}>
                  <Feather name={achievement.icon as any} size={20} color="white" />
                </View>
                <ThemedText style={styles.achievementTitle} numberOfLines={1}>
                  {achievement.title}
                </ThemedText>
                <ThemedText 
                  style={[styles.achievementDesc, { color: theme.textSecondary }]} 
                  numberOfLines={2}
                >
                  {achievement.description}
                </ThemedText>
              </View>
            ))}
          </ScrollView>
        ) : (
          <View style={[styles.emptyAchievements, { backgroundColor: theme.backgroundDefault }]}>
            <Feather name="award" size={32} color={theme.textSecondary} />
            <ThemedText style={[styles.emptyText, { color: theme.textSecondary }]}>
              Complete activities to earn achievements!
            </ThemedText>
          </View>
        )}

        <ThemedText type="headline" style={styles.sectionTitle}>
          Locked Achievements
        </ThemedText>

        <View style={styles.lockedGrid}>
          {lockedAchievements.slice(0, 6).map((achievement) => (
            <View 
              key={achievement.id}
              style={[styles.lockedCard, { backgroundColor: theme.backgroundDefault }]}
            >
              <View style={[styles.lockedIcon, { backgroundColor: theme.textSecondary + "30" }]}>
                <Feather name="lock" size={16} color={theme.textSecondary} />
              </View>
              <ThemedText 
                style={[styles.lockedTitle, { color: theme.textSecondary }]} 
                numberOfLines={1}
              >
                {achievement.title}
              </ThemedText>
            </View>
          ))}
        </View>

        <ThemedText type="headline" style={styles.sectionTitle}>
          All-Time Stats
        </ThemedText>

        <View style={[styles.statsCard, { backgroundColor: theme.backgroundDefault }]}>
          <View style={styles.statRow}>
            <View style={styles.statItem}>
              <Feather name="book" size={20} color="#8B5CF6" />
              <ThemedText style={styles.statValue}>{totalflashcards}</ThemedText>
              <ThemedText style={[styles.statLabel, { color: theme.textSecondary }]}>
                Flashcards
              </ThemedText>
            </View>
            <View style={styles.statItem}>
              <Feather name="check-circle" size={20} color="#10B981" />
              <ThemedText style={styles.statValue}>{progress.totalChoresCompleted}</ThemedText>
              <ThemedText style={[styles.statLabel, { color: theme.textSecondary }]}>
                Chores
              </ThemedText>
            </View>
          </View>
          <View style={styles.statRow}>
            <View style={styles.statItem}>
              <Feather name="sun" size={20} color="#FB923C" />
              <ThemedText style={styles.statValue}>{progress.totalOutdoorActivities}</ThemedText>
              <ThemedText style={[styles.statLabel, { color: theme.textSecondary }]}>
                Outdoor
              </ThemedText>
            </View>
            <View style={styles.statItem}>
              <Feather name="heart" size={20} color="#EC4899" />
              <ThemedText style={styles.statValue}>{progress.totalAffirmationsViewed}</ThemedText>
              <ThemedText style={[styles.statLabel, { color: theme.textSecondary }]}>
                Affirmations
              </ThemedText>
            </View>
          </View>
        </View>

        <ThemedText type="headline" style={styles.sectionTitle}>
          Settings
        </ThemedText>

        <Pressable
          style={[styles.settingItem, { backgroundColor: theme.backgroundDefault }]}
        >
          <Feather name="bell" size={20} color={theme.text} />
          <ThemedText style={styles.settingText}>Notifications</ThemedText>
          <Feather name="chevron-right" size={20} color={theme.textSecondary} />
        </Pressable>

        <Pressable
          style={[styles.settingItem, { backgroundColor: theme.backgroundDefault }]}
        >
          <Feather name="droplet" size={20} color={theme.text} />
          <ThemedText style={styles.settingText}>Theme</ThemedText>
          <Feather name="chevron-right" size={20} color={theme.textSecondary} />
        </Pressable>

        <Pressable
          style={[styles.settingItem, { backgroundColor: theme.backgroundDefault }]}
        >
          <Feather name="help-circle" size={20} color={theme.text} />
          <ThemedText style={styles.settingText}>Help & Support</ThemedText>
          <Feather name="chevron-right" size={20} color={theme.textSecondary} />
        </Pressable>

        <View style={styles.bottomPadding} />
      </ThemedView>
    </ScreenScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.lg,
  },
  avatarSection: {
    alignItems: "center",
    marginBottom: Spacing.xl,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
  },
  name: {
    marginBottom: Spacing.sm,
  },
  levelBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    gap: Spacing.xs,
  },
  levelText: {
    color: "white",
    fontWeight: "700",
    fontSize: 14,
  },
  streakCard: {
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  streakHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  fireIcon: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  streakInfo: {
    flex: 1,
  },
  streakLabel: {
    fontSize: 14,
  },
  streakStats: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  streakStat: {
    alignItems: "center",
    flex: 1,
  },
  streakStatValue: {
    fontSize: 24,
    fontWeight: "700",
  },
  streakStatLabel: {
    fontSize: 12,
    marginTop: 2,
  },
  streakDivider: {
    width: 1,
    height: 40,
  },
  levelProgressCard: {
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  levelProgressHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  levelInfo: {
    marginBottom: Spacing.md,
  },
  currentLevelLabel: {
    fontSize: 12,
    marginBottom: Spacing.xs,
  },
  currentLevelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  levelBadgeSmall: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    gap: 4,
  },
  levelTextSmall: {
    color: "white",
    fontWeight: "600",
    fontSize: 12,
  },
  nextLevelInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  nextLevelText: {
    fontSize: 14,
  },
  balanceMessage: {
    fontSize: 14,
    marginBottom: Spacing.md,
  },
  xpProgressSection: {
    marginBottom: Spacing.md,
  },
  xpLabel: {
    fontSize: 12,
    marginBottom: Spacing.xs,
  },
  subjectProgressSection: {
    gap: Spacing.sm,
  },
  subjectProgressTitle: {
    fontSize: 12,
    marginBottom: Spacing.xs,
  },
  subjectProgressItem: {
    gap: 6,
  },
  subjectProgressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  subjectProgressLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    flex: 1,
  },
  subjectIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  subjectName: {
    fontSize: 14,
    fontWeight: "500",
  },
  difficultyPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  difficultyPillText: {
    fontSize: 10,
    fontWeight: "600",
  },
  subjectProgressCountRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  subjectProgressCount: {
    fontSize: 12,
    fontWeight: "600",
  },
  subjectProgressBar: {
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
  },
  subjectProgressFill: {
    height: "100%",
    borderRadius: 4,
  },
  maxLevelBadge: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  maxLevelText: {
    fontSize: 16,
    fontWeight: "600",
  },
  sectionTitle: {
    marginTop: Spacing.lg,
    marginBottom: Spacing.md,
  },
  todayGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  todayCard: {
    width: "48%",
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    alignItems: "center",
  },
  todayValue: {
    fontSize: 28,
    fontWeight: "700",
    marginTop: Spacing.xs,
  },
  todayLabel: {
    fontSize: 12,
    marginTop: 2,
  },
  weeklyCard: {
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
  },
  weeklyRow: {
    flexDirection: "row",
    marginBottom: Spacing.md,
  },
  weeklyItem: {
    flex: 1,
  },
  weeklyLabel: {
    fontSize: 12,
    marginBottom: Spacing.xs,
  },
  weeklyValueRow: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  weeklyTarget: {
    fontSize: 16,
    marginLeft: 2,
  },
  achievementsScroll: {
    marginHorizontal: -Spacing.lg,
  },
  achievementsContent: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
  achievementCard: {
    width: 140,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    alignItems: "center",
  },
  achievementIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.sm,
  },
  achievementTitle: {
    fontWeight: "700",
    fontSize: 14,
    textAlign: "center",
    marginBottom: 2,
  },
  achievementDesc: {
    fontSize: 11,
    textAlign: "center",
  },
  emptyAchievements: {
    borderRadius: BorderRadius.md,
    padding: Spacing.xl,
    alignItems: "center",
  },
  emptyText: {
    marginTop: Spacing.sm,
    textAlign: "center",
  },
  lockedGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  lockedCard: {
    width: "31%",
    borderRadius: BorderRadius.sm,
    padding: Spacing.sm,
    alignItems: "center",
  },
  lockedIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.xs,
  },
  lockedTitle: {
    fontSize: 11,
    textAlign: "center",
  },
  statsCard: {
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
  },
  statRow: {
    flexDirection: "row",
    marginBottom: Spacing.md,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statValue: {
    fontSize: 24,
    fontWeight: "700",
    marginTop: Spacing.xs,
  },
  statLabel: {
    fontSize: 12,
    marginTop: 2,
  },
  settingItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
    gap: Spacing.md,
  },
  settingText: {
    flex: 1,
    fontSize: 16,
  },
  bottomPadding: {
    height: Spacing.xxl,
  },
});
