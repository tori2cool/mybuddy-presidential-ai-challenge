import { useState, useEffect } from "react";
import { View, StyleSheet, Pressable, Dimensions } from "react-native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { ScreenScrollView } from "@/components/ScreenScrollView";
import { AsyncStatus } from "@/components/AsyncStatus";
import { ProgressBar } from "@/components/ProgressBar";
import { useTheme } from "@/hooks/useTheme";
import { DifficultyTier, SubjectId } from "@/types/models";

const SUBJECTS: SubjectId[] = ["math", "science", "reading", "history"];

import { useDashboard } from "@/contexts/DashboardContext";
import { Spacing, BorderRadius } from "@/constants/theme";
import { getSubjects } from "@/services/subjectsService";
import { DIFFICULTY_LABELS } from "@/constants/difficulty";
import { Subject } from "@/types/models";
import { useCurrentChildId } from "@/contexts/ChildContext";
import FlashcardPracticeModal from "@/components/FlashcardPracticeModal";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export default function FlashcardsScreen() {
  const { theme } = useTheme();
  const { childId } = useCurrentChildId();
  const { data: dashboardData, postEvent } = useDashboard();

  console.log("FlashcardsScreen: current childId =", childId);

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [practiceSubject, setPracticeSubject] = useState<Subject | null>(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState<DifficultyTier>("easy");

  useEffect(() => {
    const loadSubjects = async () => {
      try {
        setLoading(true);
        setError(null);

        if (!childId) return; // wait until childId exists

        const data = await getSubjects(childId);
        setSubjects(data);
      } catch (e) {
        console.error("Failed to load subjects:", e);
        setError("Couldn't load subjects. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    loadSubjects();
  }, [childId]);

  const dashboard = dashboardData;
  const balancedProgress = dashboard?.balanced;
  const flashcardsBySubject = dashboard?.flashcardsBySubject;

  const handlePractice = (subject: Subject) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const difficulty = (flashcardsBySubject?.[subject.id]?.difficulty ?? "easy") as DifficultyTier;
    setSelectedDifficulty(difficulty);
    setPracticeSubject(subject);
    setModalVisible(true);
  };

  const handleCloseModal = () => {
    setModalVisible(false);
    setPracticeSubject(null);
    setSelectedDifficulty("easy");
  };

  const getSubjectProgress = (subjectId: SubjectId) => {
    const stats = flashcardsBySubject?.[subjectId];
    return {
      correct: stats?.correct ?? 0,
      correctStreak: stats?.correctStreak ?? 0,
      longestStreak: stats?.longestStreak ?? 0,
      completed: stats?.completed ?? 0,
      difficulty: (stats?.difficulty ?? "easy") as DifficultyTier,
      nextDifficultyAtStreak: stats?.nextDifficultyAtStreak ?? null,
      currentTierStartAtStreak: stats?.currentTierStartAtStreak ?? 0,
    };
  };

  if (error) {
    return (
      <ScreenScrollView>
        <View style={styles.loadingContainer}>
          <AsyncStatus error={error} />
        </View>
      </ScreenScrollView>
    );
  }

  return (
    <ScreenScrollView>
      <ThemedView style={styles.container}>
        <ThemedText type="headline" style={styles.sectionTitle}>
          Practice & Learn
        </ThemedText>

        <View style={[styles.balanceCard, { backgroundColor: theme.primary + "15" }]}>
          <View style={styles.balanceHeader}>
            <Feather name="target" size={20} color={theme.primary} />
            <ThemedText type="headline" style={[styles.balanceTitle, { color: theme.primary }]}>
              Level Progress
            </ThemedText>
          </View>

          <ThemedText style={[styles.balanceMessage, { color: theme.textSecondary }]}>
            {balancedProgress?.message ?? ""}
          </ThemedText>

          <View style={styles.subjectProgressContainer}>
            {balancedProgress
              ? SUBJECTS.map((subjectId) => {
                  const subject = subjects.find((s) => s.id === subjectId);
                  if (!subject) return null;
                  const subjectProg = balancedProgress.subjectProgress[subjectId];
                  const progressPercent =
                    balancedProgress.requiredPerSubject > 0
                      ? Math.min(
                          (subjectProg.current / balancedProgress.requiredPerSubject) * 100,
                          100,
                        )
                      : 100;

              return (
                <View key={subjectId} style={styles.subjectProgressItem}>
                  <View style={styles.subjectProgressLabel}>
                    <Feather name={subject.icon} size={14} color={subject.color} />
                    <ThemedText style={[styles.subjectProgressName, { color: theme.textPrimary }]}>
                      {subject.name}
                    </ThemedText>
                    <ThemedText style={[styles.subjectProgressCount, { color: theme.textSecondary }]}>
                      {subjectProg.current}/{subjectProg.required}
                    </ThemedText>
                    {subjectProg.met ? (
                      <Feather name="check-circle" size={14} color="#10B981" />
                    ) : null}
                  </View>
                  <View style={[styles.miniProgressBar, { backgroundColor: theme.backgroundDefault }]}>
                    <View
                      style={[
                        styles.miniProgressFill,
                        {
                          width: `${progressPercent}%`,
                          backgroundColor: subjectProg.met ? "#10B981" : subject.color,
                        },
                      ]}
                    />
                  </View>
                </View>
              );
              })
              : null}
          </View>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <AsyncStatus loading={true} loadingMessage="Loading subjects..." />
          </View>
        ) : (
          subjects.map((subject) => {
            const subjectProgress = getSubjectProgress(subject.id);
            const difficultyInfo = DIFFICULTY_LABELS[subjectProgress.difficulty];
            const nextAt = subjectProgress.nextDifficultyAtStreak;
            const currentStart = subjectProgress.currentTierStartAtStreak;

            let progressToNext = 1;
            if (nextAt !== null) {
              const tierSize = nextAt - currentStart;
              if (tierSize > 0) {
                progressToNext = (subjectProgress.correctStreak - currentStart) / tierSize;
                progressToNext = Math.max(0, Math.min(progressToNext, 1));
              }
            }

            return (
              <Pressable
                key={subject.id}
                style={[styles.card, { backgroundColor: theme.backgroundDefault }]}
              >
                <View style={styles.cardHeader}>
                  <View style={[styles.iconContainer, { backgroundColor: subject.color + "20" }]}>
                    <Feather name={subject.icon} size={28} color={subject.color} />
                  </View>
                  <View style={styles.cardContent}>
                    <View style={styles.cardTitleRow}>
                      <ThemedText type="headline">{subject.name}</ThemedText>
                      <View style={[styles.difficultyChip, { backgroundColor: difficultyInfo.color + "20" }]}>
                        <Feather name={difficultyInfo.icon as any} size={12} color={difficultyInfo.color} />
                        <ThemedText style={[styles.difficultyChipText, { color: difficultyInfo.color }]}>
                          {difficultyInfo.label}
                        </ThemedText>
                      </View>
                    </View>
                    <ThemedText style={[styles.progress, { color: theme.textSecondary }]}>
                      {subjectProgress.correct} correct • Streak: {subjectProgress.correctStreak} (Best: {subjectProgress.longestStreak})
                    </ThemedText>
                  </View>
                </View>

                {nextAt !== null ? (
                  <View style={styles.progressToNextContainer}>
                    <View style={styles.progressToNextLabel}>
                      <ThemedText style={[styles.progressToNextText, { color: theme.textSecondary }]}>
                        Progress to {subjectProgress.difficulty === "easy" ? "Medium" : "Hard"}:
                      </ThemedText>
                      <ThemedText style={[styles.progressToNextCount, { color: subject.color }]}>
                        {subjectProgress.correctStreak}/{nextAt} in a row
                      </ThemedText>
                    </View>
                    <ProgressBar progress={Math.max(0, Math.min(progressToNext, 1))} height={8} />
                  </View>
                ) : (
                  <View style={[styles.masteredBadge, { backgroundColor: "#10B981" + "20" }]}>
                    <Feather name="award" size={16} color="#10B981" />
                    <ThemedText style={[styles.masteredText, { color: "#10B981" }]}>
                      Maximum Difficulty Reached!
                    </ThemedText>
                  </View>
                )}

                <Pressable
                  style={[styles.practiceButton, { backgroundColor: subject.color }]}
                  onPress={() => handlePractice(subject)}
                >
                  <ThemedText style={styles.practiceButtonText}>
                    Practice {difficultyInfo.label} Questions
                  </ThemedText>
                </Pressable>
              </Pressable>
            );
          })
        )}
      </ThemedView>

      <FlashcardPracticeModal
        visible={modalVisible}
        subject={practiceSubject}
        difficulty={selectedDifficulty}
        childId={childId}
        onClose={handleCloseModal}
      />
    </ScreenScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.lg,
  },
  sectionTitle: {
    marginBottom: Spacing.lg,
  },
  balanceCard: {
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  balanceHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  balanceTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  balanceMessage: {
    fontSize: 14,
    marginBottom: Spacing.md,
  },
  subjectProgressContainer: {
    gap: Spacing.sm,
  },
  subjectProgressItem: {
    gap: 4,
  },
  subjectProgressLabel: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  subjectProgressName: {
    fontSize: 13,
    fontWeight: "500",
    flex: 1,
  },
  subjectProgressCount: {
    fontSize: 12,
    marginRight: 4,
  },
  miniProgressBar: {
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
  },
  miniProgressFill: {
    height: "100%",
    borderRadius: 3,
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
  cardTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  difficultyChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  difficultyChipText: {
    fontSize: 11,
    fontWeight: "600",
  },
  progress: {
    fontSize: 12,
    marginTop: Spacing.xs,
  },
  progressToNextContainer: {
    marginBottom: Spacing.md,
  },
  progressToNextLabel: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  progressToNextText: {
    fontSize: 12,
  },
  progressToNextCount: {
    fontSize: 12,
    fontWeight: "600",
  },
  masteredBadge: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.md,
  },
  masteredText: {
    fontSize: 14,
    fontWeight: "600",
  },
  practiceButton: {
    height: 44,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  practiceButtonText: {
    color: "white",
    fontWeight: "600",
    fontSize: 16,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
