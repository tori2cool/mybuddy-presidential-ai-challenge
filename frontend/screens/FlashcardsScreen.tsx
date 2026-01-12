// frontend/screens/FlashcardsScreen.tsx
import { useEffect, useMemo, useState } from "react";
import { View, StyleSheet, Pressable, Dimensions } from "react-native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { ScreenScrollView } from "@/components/ScreenScrollView";
import { AsyncStatus } from "@/components/AsyncStatus";
import { ProgressBar } from "@/components/ProgressBar";

import { useTheme } from "@/hooks/useTheme";
import { useDashboard } from "@/contexts/DashboardContext";
import { useCurrentChild } from "@/contexts/ChildContext";

import { Spacing, BorderRadius } from "@/constants/theme";

import { getSubjects } from "@/services/subjectsService";
import { getDifficulties } from "@/services/difficultiesService";

import type { Subject, DifficultyCode, DifficultyThreshold, SubjectProgress, DashboardOut, SubjectProgressOut, SubjectStatsOut } from "@/types/models";

import FlashcardPracticeModal from "@/components/FlashcardPracticeModal";


function difficultyLabelOf(d: DifficultyThreshold): string {
  // Backend has label; fallback to name/code
  if (typeof d.label === "string" && d.label.trim().length > 0) return d.label;
  return d.code;
}

export default function FlashcardsScreen() {
  const { theme } = useTheme();
  const { data: dashboardData } = useDashboard();
  const { childId } = useCurrentChild();

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [difficulties, setDifficulties] = useState<DifficultyThreshold[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modalVisible, setModalVisible] = useState(false);
  const [practiceSubject, setPracticeSubject] = useState<Subject | null>(null);

  // DB-driven string (no union)
  const [selectedDifficulty, setSelectedDifficulty] = useState<DifficultyCode>("easy");

  // Fetch subjects (age-range filtered server-side)
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        setError(null);

        if (!childId) return;

        const data = await getSubjects(childId);
        if (!cancelled) setSubjects(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error("Failed to load subjects:", e);
        if (!cancelled) setError("Couldn't load subjects. Please try again later.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [childId]);

  // Fetch difficulties on mount
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const data = await getDifficulties();
        if (!cancelled) setDifficulties(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error("Failed to load difficulties:", e);
        if (!cancelled) setDifficulties([]);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // Difficulty lookup map (by code)
  const difficultyByCode = useMemo(() => {
    const map = new Map<string, DifficultyThreshold>();
    for (const d of difficulties) map.set(d.code, d);
    return map;
  }, [difficulties]);

  // Sorted difficulties by threshold (backend-defined progression)
  const sortedDifficulties = useMemo(() => {
    return [...difficulties].sort((a, b) => a.threshold - b.threshold);
  }, [difficulties]);

  // Dashboard (backend-aligned)
  const dashboard = (dashboardData ?? null) as DashboardOut | null;
  const balancedProgress = dashboard?.balanced;
  const flashcardsBySubject = dashboard?.flashcardsBySubject;

  const getSubjectProgress = (subjectCode: string): SubjectProgress => {
    const stats = (flashcardsBySubject as Record<string, SubjectStatsOut> | undefined)?.[subjectCode];

    const difficultyCode =
      typeof stats?.difficultyCode === "string" && stats.difficultyCode.trim().length > 0
        ? (stats.difficultyCode as DifficultyCode)
        : null;

    return {
      correct: typeof stats?.correct === "number" ? stats.correct : 0,
      correctStreak: typeof stats?.correctStreak === "number" ? stats.correctStreak : 0,
      longestStreak: typeof stats?.longestStreak === "number" ? stats.longestStreak : 0,
      completed: typeof stats?.completed === "number" ? stats.completed : 0,
      difficultyCode,
      nextDifficultyAtStreak:
        stats?.nextDifficultyAtStreak === null
          ? null
          : typeof stats?.nextDifficultyAtStreak === "number"
            ? stats.nextDifficultyAtStreak
            : null,
      currentTierStartAtStreak:
        typeof stats?.currentTierStartAtStreak === "number" ? stats.currentTierStartAtStreak : 0,
    };
  };

  const nextDifficultyLabelFor = (currentCode: string): string => {
    const idx = sortedDifficulties.findIndex((d) => d.code === currentCode);
    const next = idx >= 0 ? sortedDifficulties[idx + 1] : null;
    return next ? difficultyLabelOf(next) : "Next";
  };

  const handlePractice = (subject: Subject) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const stats = (flashcardsBySubject as Record<string, SubjectStatsOut> | undefined)?.[subject.code];
    const difficultyCode =
      typeof stats?.difficultyCode === "string" && stats.difficultyCode.trim().length > 0
        ? (stats.difficultyCode as DifficultyCode)
        : ("easy" as DifficultyCode);

    setSelectedDifficulty(difficultyCode);
    setPracticeSubject(subject);
    setModalVisible(true);
  };

  const handleCloseModal = () => {
    setModalVisible(false);
    setPracticeSubject(null);
    setSelectedDifficulty("easy");
  };

  if (error) {
    return (
      <ScreenScrollView>
        <View style={styles.loadingContainer}>
          <AsyncStatus loading={false} error={error} />
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
              ? subjects.length > 0
                ? subjects.map((subject) => {
                  const subjectProg = (balancedProgress.subjectProgress as Record<string, SubjectProgressOut> | undefined)?.[
                    subject.code
                  ];

                  const required = subjectProg?.required ?? balancedProgress.requiredPerSubject ?? 0;
                  const current = subjectProg?.correct ?? 0;
                  const met = subjectProg?.meetsRequirement ?? false;

                  const progressPercent =
                    required > 0 ? Math.min((current / required) * 100, 100) : 100;

                  return (
                    <View key={subject.id} style={styles.subjectProgressItem}>
                      <View style={styles.subjectProgressLabel}>
                        <Feather name={subject.icon as any} size={14} color={subject.color} />
                        <ThemedText style={[styles.subjectProgressName, { color: theme.text }]}>
                          {subject.name}
                        </ThemedText>
                        <ThemedText style={[styles.subjectProgressCount, { color: theme.textSecondary }]}>
                          {current}/{required}
                        </ThemedText>
                        {met ? <Feather name="check-circle" size={14} color="#10B981" /> : null}
                      </View>

                      <View style={[styles.miniProgressBar, { backgroundColor: theme.backgroundDefault }]}>
                        <View
                          style={[
                            styles.miniProgressFill,
                            {
                              width: `${progressPercent}%`,
                              backgroundColor: met ? "#10B981" : subject.color,
                            },
                          ]}
                        />
                      </View>
                    </View>
                  );
                })
                : null
              : null}
          </View>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <AsyncStatus loading={true} loadingMessage="Loading subjects..." />
          </View>
        ) : (
        subjects.map((subject) => {
          const subjectProgress = getSubjectProgress(subject.code);

          const difficultyInfo =
            subjectProgress.difficultyCode !== null
              ? difficultyByCode.get(subjectProgress.difficultyCode)
              : undefined;

          const chipLabel = difficultyInfo
            ? difficultyLabelOf(difficultyInfo)
            : (subjectProgress.difficultyCode ?? "—");

          const chipColor = difficultyInfo?.color ?? theme.primary;
          const chipIcon = (difficultyInfo?.icon ?? "help-circle") as any;

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

          const nextLabel =
            subjectProgress.difficultyCode !== null
              ? nextDifficultyLabelFor(subjectProgress.difficultyCode)
              : "—";

            return (
              <Pressable key={subject.id} style={[styles.card, { backgroundColor: theme.backgroundDefault }]}>
                <View style={styles.cardHeader}>
                  <View style={[styles.iconContainer, { backgroundColor: subject.color + "20" }]}>
                    <Feather name={subject.icon as any} size={28} color={subject.color} />
                  </View>

                  <View style={styles.cardContent}>
                    <View style={styles.cardTitleRow}>
                      <ThemedText type="headline">{subject.name}</ThemedText>

                      <View style={[styles.difficultyChip, { backgroundColor: chipColor + "20" }]}>
                        <Feather name={chipIcon} size={12} color={chipColor} />
                        <ThemedText style={[styles.difficultyChipText, { color: chipColor }]}>
                          {chipLabel}
                        </ThemedText>
                      </View>
                    </View>

                    <ThemedText style={[styles.progress, { color: theme.textSecondary }]}>
                      {subjectProgress.correct} correct • Streak: {subjectProgress.correctStreak} (Best:{" "}
                      {subjectProgress.longestStreak})
                    </ThemedText>
                  </View>
                </View>

                {nextAt !== null ? (
                  <View style={styles.progressToNextContainer}>
                    <View style={styles.progressToNextLabel}>
                      <ThemedText style={[styles.progressToNextText, { color: theme.textSecondary }]}>
                        Progress to {nextLabel}:
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
                  <ThemedText style={styles.practiceButtonText}>Practice {chipLabel} Questions</ThemedText>
                </Pressable>
              </Pressable>
            );
          })
        )}
      </ThemedView>

      <FlashcardPracticeModal
        visible={modalVisible}
        subject={practiceSubject}
        difficultyCode={selectedDifficulty}
        difficultyInfo={difficultyByCode.get(selectedDifficulty) ?? null}
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
