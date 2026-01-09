// frontend/screens/ProfileScreen.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  ScrollView,
  RefreshControl,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { ScreenScrollView } from "@/components/ScreenScrollView";
import { AvatarThumb } from "@/components/AvatarThumb";
import { useTheme } from "@/hooks/useTheme";
import { useDashboard } from "@/contexts/DashboardContext";
import { Spacing, BorderRadius, Typography } from "@/constants/theme";
import { useCurrentChild } from "@/contexts/ChildContext";
import { getChildById } from "@/services/childrenService";
import { getAvatars } from "@/services/avatarsService";
import { getSubjects } from "@/services/subjectsService";
import { getDifficulties } from "@/services/difficultiesService";
import type {
  Subject,
  DifficultyCode,
  DifficultyThreshold,
  UUID,
} from "@/types/models";
import { useNavigation } from "@react-navigation/native";
import { AINoticeFooter } from "@/components/AINoticeFooter";

export default function ProfileScreen() {
  const { theme } = useTheme();
  const navigation = useNavigation();
  const { childId } = useCurrentChild(); // string | null

  const [childName, setChildName] = useState<string | null>(null);
  const [childAvatarId, setChildAvatarId] = useState<string | null>(null);

  const [avatarsById, setAvatarsById] = useState<Map<string, import("@/types/models").Avatar> | null>(null);
  const avatarsFetchInFlight = useRef(false);

  // ✅ Subjects are objects, keyed by subject.id (UUID)
  const [subjects, setSubjects] = useState<Subject[]>([]);

  // ✅ Difficulties should be objects (DifficultyThreshold), not DifficultyCode[]
  const [difficulties, setDifficulties] = useState<DifficultyThreshold[]>([]);

  // ---- Load child name ----
  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!childId || childId.trim().length === 0) {
        setChildName(null);
        setChildAvatarId(null);
        return;
      }

      try {
        const child = await getChildById(childId);
        if (cancelled) return;
        setChildName(child?.name ?? null);
        setChildAvatarId(child?.avatarId ?? null);
      } catch {
        if (!cancelled) {
          setChildName(null);
          setChildAvatarId(null);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [childId]);

  // ---- Fetch avatars catalog once (non-blocking; fall back to initials if it fails) ----
  useEffect(() => {
    let cancelled = false;

    if (avatarsById || avatarsFetchInFlight.current) return;
    avatarsFetchInFlight.current = true;

    void (async () => {
      try {
        const list = await getAvatars();
        if (cancelled) return;
        setAvatarsById(new Map(list.map((a) => [a.id, a])));
      } catch (e) {
        console.warn("[ProfileScreen] Failed to load avatars", e);
      } finally {
        avatarsFetchInFlight.current = false;
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [avatarsById]);

  const {
    data: dashboard,
    refreshDashboard,
    status: dashboardStatus,
    error: dashboardError,
  } = useDashboard();

  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    if (!childId || childId.trim().length === 0) return;
    setRefreshing(true);
    try {
      await refreshDashboard({ force: true });
    } finally {
      setRefreshing(false);
    }
  }, [childId, refreshDashboard]);

  const refreshControl = useMemo(
    () => (
      <RefreshControl
        refreshing={refreshing || dashboardStatus === "refreshing"}
        onRefresh={onRefresh}
      />
    ),
    [refreshing, dashboardStatus, onRefresh],
  );

  const reward = dashboard?.reward;
  const balancedProgress = dashboard?.balanced;

  const totalFlashcards = Object.values(dashboard?.flashcardsBySubject ?? {}).reduce(
    (acc: number, s: any) => acc + (s?.completed ?? 0),
    0,
  );
  const totalCorrect = Object.values(dashboard?.flashcardsBySubject ?? {}).reduce(
    (acc: number, s: any) => acc + (s?.correct ?? 0),
    0,
  );
  const accuracy =
    totalFlashcards > 0 ? Math.round((totalCorrect / totalFlashcards) * 100) : 0;

  const unlockedAchievements = dashboard?.achievementsUnlocked ?? [];
  const lockedAchievements = dashboard?.achievementsLocked ?? [];

  // Initial background refresh (SWR); keep non-blocking.
  useEffect(() => {
    refreshDashboard({ force: false }).catch(() => {});
  }, [refreshDashboard]);

  // ---- Fetch subjects for this child ----
  useEffect(() => {
    let cancelled = false;

    const loadSubjects = async () => {
      if (!childId || childId.trim().length === 0) {
        setSubjects([]);
        return;
      }
      try {
        const data = await getSubjects(childId);
        if (!cancelled) setSubjects(data);
      } catch (e) {
        console.error("Failed to load subjects:", e);
        if (!cancelled) setSubjects([]);
      }
    };

    loadSubjects();
    return () => {
      cancelled = true;
    };
  }, [childId]);

  // ---- Fetch difficulties (thresholds/config) ----
  useEffect(() => {
    let cancelled = false;

    const loadDifficulties = async () => {
      try {
        const data = await getDifficulties();
        if (!cancelled) setDifficulties(data);
      } catch (e) {
        console.error("Failed to load difficulties:", e);
        if (!cancelled) setDifficulties([]);
      }
    };

    loadDifficulties();
    return () => {
      cancelled = true;
    };
  }, []);

  // ✅ Lookup difficulty info by code ("easy"/"medium"/"hard"/etc)
  const difficultyByCode = useMemo(() => {
    const map = new Map<DifficultyCode, DifficultyThreshold>();
    for (const d of difficulties) map.set(d.code, d);
    return map;
  }, [difficulties]);

  // Helper: get subject stats from dashboard map using subject.code (string)
  const getSubjectStats = useCallback(
    (subjectCode: string) => {
      // Backend now keys flashcardsBySubject by Subject.code (string), not UUID
      return (dashboard?.flashcardsBySubject as any)?.[subjectCode] as
        | {
            difficultyCode?: DifficultyCode | null;
            difficulty?: DifficultyCode | null; // tolerate older field name
          }
        | undefined;
    },
    [dashboard],
  );

  return (
    <ScreenScrollView refreshControl={refreshControl}>
      <ThemedView style={styles.container}>
        <View style={styles.avatarSection}>
          <AvatarThumb
            name={childName ?? "Profile"}
            imageUri={(childAvatarId ? avatarsById?.get(childAvatarId)?.imagePath : null) ?? null}
            backgroundColor={theme.backgroundSecondary}
            size={100}
            borderRadius={BorderRadius.lg}
          />

          <ThemedText type="title" style={styles.name}>
            {childName ?? "Profile"}
          </ThemedText>

          {dashboardError ? (
            <ThemedText
              style={[
                styles.inlineError,
                {
                  color: theme.textSecondary,
                },
              ]}
            >
              {dashboardError}
            </ThemedText>
          ) : null}

          {childName ? (
            <Pressable
              onPress={() => {
                navigation.getParent()?.navigate("ChildSelect" as never);
              }}
              accessibilityRole="button"
              hitSlop={10}
            >
              <ThemedText
                style={[
                  styles.switchLink,
                  {
                    color: theme.textSecondary,
                    textDecorationColor: theme.textSecondary,
                  },
                ]}
              >
                Not {childName}?
              </ThemedText>
            </Pressable>
          ) : null}

          <View
            style={[
              styles.levelBadge,
              { backgroundColor: reward?.color ?? theme.primary },
            ]}
          >
            <Feather
              name={(reward?.icon ?? "award") as any}
              size={16}
              color="white"
            />
            <ThemedText style={styles.levelText}>{reward?.level ?? ""}</ThemedText>
          </View>
        </View>

        <View style={[styles.streakCard, { backgroundColor: theme.primary + "15" }]}>
          <View style={styles.streakHeader}>
            <View style={[styles.fireIcon, { backgroundColor: theme.secondary }]}>
              <Feather name="zap" size={24} color="white" />
            </View>
            <View style={styles.streakInfo}>
              <ThemedText type="hero" style={{ color: theme.primary }}>
                {dashboard?.currentStreak ?? 0}
              </ThemedText>
              <ThemedText style={[styles.streakLabel, { color: theme.textSecondary }]}>
                Day Streak
              </ThemedText>
            </View>
          </View>
          <View style={styles.streakStats}>
            <View style={styles.streakStat}>
              <ThemedText style={[styles.streakStatValue, { color: theme.text }]}>
                {dashboard?.longestStreak ?? 0}
              </ThemedText>
              <ThemedText style={[styles.streakStatLabel, { color: theme.textSecondary }]}>
                Best Streak
              </ThemedText>
            </View>
            <View style={[styles.streakDivider, { backgroundColor: theme.backgroundSecondary }]} />
            <View style={styles.streakStat}>
              <ThemedText style={[styles.streakStatValue, { color: theme.text }]}>
                {dashboard?.totalPoints ?? 0}
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
              Current Level
            </ThemedText>
            <View style={styles.currentLevelRow}>
              <View
                style={[
                  styles.levelBadgeSmall,
                  { backgroundColor: reward?.color ?? theme.primary },
                ]}
              >
                <Feather
                  name={(reward?.icon ?? "award") as any}
                  size={14}
                  color="white"
                />
                <ThemedText style={styles.levelTextSmall}>{reward?.level ?? ""}</ThemedText>
              </View>

              {balancedProgress?.nextLevel ? (
                <View style={styles.nextLevelInfo}>
                  <Feather name="arrow-right" size={16} color={theme.textSecondary} />
                  <ThemedText style={[styles.nextLevelText, { color: theme.textSecondary }]}>
                    {balancedProgress.nextLevel}
                  </ThemedText>
                </View>
              ) : null}
            </View>
          </View>

          <ThemedText
            style={[
              styles.balanceMessage,
              {
                color: balancedProgress?.canLevelUp ? theme.success : theme.textSecondary,
              },
            ]}
          >
            {balancedProgress?.message ?? ""}
          </ThemedText>

          {balancedProgress?.nextLevel ? (
            <View style={styles.subjectProgressSection}>
              <ThemedText style={[styles.subjectProgressTitle, { color: theme.textSecondary }]}>
                Correct Answers Needed Per Subject:
              </ThemedText>

              {subjects.map((subject) => {
                // ✅ subjectProgress is keyed by subject.code (string)
                const subjectProg = (balancedProgress?.subjectProgress as any)?.[subject.code] as
                  | { current: number; required: number; met: boolean }
                  | undefined;

                // ✅ stats map is keyed by subject.code (string)
                const stats = getSubjectStats(subject.code);

                // Prefer difficultyCode; tolerate old "difficulty"
                const difficultyCode: DifficultyCode =
                  (stats?.difficultyCode ??
                    stats?.difficulty ??
                    "easy") as DifficultyCode;

                const diffInfo = difficultyByCode.get(difficultyCode);
                if (!diffInfo) return null;

                const required = subjectProg?.required ?? balancedProgress?.requiredPerSubject ?? 0;
                const current = subjectProg?.current ?? 0;
                const met = subjectProg?.met ?? false;

                const progressPercent =
                  required > 0 ? Math.min((current / required) * 100, 100) : 100;

                return (
                  <View key={subject.id} style={styles.subjectProgressItem}>
                    <View style={styles.subjectProgressHeader}>
                      <View style={styles.subjectProgressLabelRow}>
                        <View style={[styles.subjectIcon, { backgroundColor: subject.color + "20" }]}>
                          <Feather name={subject.icon as any} size={14} color={subject.color} />
                        </View>

                        <ThemedText style={[styles.subjectName, { color: theme.text }]}>
                          {subject.name}
                        </ThemedText>

                        <View style={[styles.difficultyPill, { backgroundColor: diffInfo.color + "20" }]}>
                          <ThemedText style={[styles.difficultyPillText, { color: diffInfo.color }]}>
                            {diffInfo.label}
                          </ThemedText>
                        </View>
                      </View>

                      <View style={styles.subjectProgressCountRow}>
                        <ThemedText
                          style={[
                            styles.subjectProgressCount,
                            { color: met ? "#10B981" : theme.textSecondary },
                          ]}
                        >
                          {current}/{required}
                        </ThemedText>

                        {met ? <Feather name="check-circle" size={16} color="#10B981" /> : null}
                      </View>
                    </View>

                    <View style={[styles.subjectProgressBar, { backgroundColor: theme.backgroundDefault }]}>
                      <View
                        style={[
                          styles.subjectProgressFill,
                          {
                            width: `${progressPercent}%`,
                            backgroundColor: met ? "#10B981" : subject.color,
                          },
                        ]}
                      />
                    </View>
                  </View>
                );
              })}
            </View>
          ) : (
            <View style={[styles.maxLevelBadge, { backgroundColor: "#10B981" + "20" }]}>
              <Feather name="award" size={20} color="#10B981" />
              <ThemedText style={[styles.maxLevelText, { color: "#10B981" }]}>
                Maximum Level Achieved!
              </ThemedText>
            </View>
          )}
        </View>

        {/* Everything below here is unchanged from your file */}
        <ThemedText type="headline" style={styles.sectionTitle}>
          Today's Progress
        </ThemedText>

        <View style={styles.todayGrid}>
          <View style={[styles.todayCard, { backgroundColor: theme.backgroundDefault }]}>
            <Feather name="book" size={24} color="#8B5CF6" />
            <ThemedText style={styles.todayValue}>
              {dashboard?.today.flashcardsCompleted ?? 0}
            </ThemedText>
            <ThemedText style={[styles.todayLabel, { color: theme.textSecondary }]}>
              Flashcards
            </ThemedText>
          </View>
          <View style={[styles.todayCard, { backgroundColor: theme.backgroundDefault }]}>
            <Feather name="check-circle" size={24} color="#10B981" />
            <ThemedText style={styles.todayValue}>
              {dashboard?.today.choresCompleted ?? 0}
            </ThemedText>
            <ThemedText style={[styles.todayLabel, { color: theme.textSecondary }]}>
              Chores
            </ThemedText>
          </View>
          <View style={[styles.todayCard, { backgroundColor: theme.backgroundDefault }]}>
            <Feather name="sun" size={24} color="#FB923C" />
            <ThemedText style={styles.todayValue}>
              {dashboard?.today.outdoorActivities ?? 0}
            </ThemedText>
            <ThemedText style={[styles.todayLabel, { color: theme.textSecondary }]}>
              Outdoor
            </ThemedText>
          </View>
          <View style={[styles.todayCard, { backgroundColor: theme.backgroundDefault }]}>
            <Feather name="heart" size={24} color="#EC4899" />
            <ThemedText style={styles.todayValue}>
              {dashboard?.today.affirmationsViewed ?? 0}
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
                  {dashboard?.week.daysActive ?? 0}
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
                  {dashboard?.week.totalPoints ?? 0}
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
                  {dashboard?.week.flashcardsCompleted ?? 0}
                </ThemedText>
              </View>
            </View>
            <View style={styles.weeklyItem}>
              <ThemedText style={[styles.weeklyLabel, { color: theme.textSecondary }]}>
                Accuracy
              </ThemedText>
              <View style={styles.weeklyValueRow}>
                <ThemedText
                  type="headline"
                  style={{
                    color:
                      (dashboard?.week.accuracyPct ?? 0) >= 70
                        ? theme.success
                        : theme.text,
                  }}
                >
                  {dashboard?.week.accuracyPct ?? 0}%
                </ThemedText>
              </View>
            </View>
          </View>
        </View>

        <ThemedText type="headline" style={styles.sectionTitle}>
          Achievements ({unlockedAchievements.length}/
          {(dashboard?.achievementsUnlocked?.length ?? 0) +
            (dashboard?.achievementsLocked?.length ?? 0)})
        </ThemedText>

        {unlockedAchievements.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.achievementsScroll}
            contentContainerStyle={styles.achievementsContent}
          >
            {unlockedAchievements.map((achievement: any) => (
              <View
                key={achievement.id}
                style={[
                  styles.achievementCard,
                  { backgroundColor: theme.primary + "15" },
                ]}
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
          {lockedAchievements.slice(0, 6).map((achievement: any) => (
            <View
              key={achievement.id}
              style={[styles.lockedCard, { backgroundColor: theme.backgroundDefault }]}
            >
              <View style={[styles.lockedIcon, { backgroundColor: theme.backgroundSecondary }]}>
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
              <ThemedText style={styles.statValue}>{totalFlashcards}</ThemedText>
              <ThemedText style={[styles.statLabel, { color: theme.textSecondary }]}>
                Flashcards
              </ThemedText>
            </View>
            <View style={styles.statItem}>
              <Feather name="check-circle" size={20} color="#10B981" />
              <ThemedText style={styles.statValue}>
                {dashboard?.totals.choresCompleted ?? 0}
              </ThemedText>
              <ThemedText style={[styles.statLabel, { color: theme.textSecondary }]}>
                Chores
              </ThemedText>
            </View>
          </View>
          <View style={styles.statRow}>
            <View style={styles.statItem}>
              <Feather name="sun" size={20} color="#FB923C" />
              <ThemedText style={styles.statValue}>
                {dashboard?.totals.outdoorActivities ?? 0}
              </ThemedText>
              <ThemedText style={[styles.statLabel, { color: theme.textSecondary }]}>
                Outdoor
              </ThemedText>
            </View>
            <View style={styles.statItem}>
              <Feather name="heart" size={20} color="#EC4899" />
              <ThemedText style={styles.statValue}>
                {dashboard?.totals.affirmationsViewed ?? 0}
              </ThemedText>
              <ThemedText style={[styles.statLabel, { color: theme.textSecondary }]}>
                Affirmations
              </ThemedText>
            </View>
          </View>
        </View>

        <ThemedText type="headline" style={styles.sectionTitle}>
          Settings
        </ThemedText>

        <Pressable style={[styles.settingItem, { backgroundColor: theme.backgroundDefault }]}>
          <Feather name="bell" size={20} color={theme.text} />
          <ThemedText style={styles.settingText}>Notifications</ThemedText>
          <Feather name="chevron-right" size={20} color={theme.textSecondary} />
        </Pressable>

        <Pressable style={[styles.settingItem, { backgroundColor: theme.backgroundDefault }]}>
          <Feather name="droplet" size={20} color={theme.text} />
          <ThemedText style={styles.settingText}>Theme</ThemedText>
          <Feather name="chevron-right" size={20} color={theme.textSecondary} />
        </Pressable>

        <Pressable style={[styles.settingItem, { backgroundColor: theme.backgroundDefault }]}>
          <Feather name="help-circle" size={20} color={theme.text} />
          <ThemedText style={styles.settingText}>Help & Support</ThemedText>
          <Feather name="chevron-right" size={20} color={theme.textSecondary} />
        </Pressable>

        <View style={styles.bottomPadding} />
        <AINoticeFooter />
      </ThemedView>
    </ScreenScrollView>
  );
}

const styles = StyleSheet.create({
  inlineError: {
    fontSize: 12,
    marginTop: Spacing.xs,
    textAlign: "center",
  },
  container: {
    paddingHorizontal: Spacing.lg,
  },
  avatarSection: {
    alignItems: "center",
    marginBottom: Spacing.xl,
  },
  avatar: {
    marginBottom: Spacing.md,
  },
  name: {
    marginBottom: 2,
  },
  switchLink: {
    fontSize: 13,
    textDecorationLine: "underline",
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
