import { useState, useRef, useEffect } from "react";
import { View, StyleSheet, Pressable, Modal, Dimensions, TextInput, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator } from "react-native";
import { Feather } from "@expo/vector-icons";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { ScreenScrollView } from "@/components/ScreenScrollView";
import { AsyncStatus } from "@/components/AsyncStatus";
import { ProgressBar } from "@/components/ProgressBar";
import { useTheme } from "@/hooks/useTheme";
import { useProgress, DifficultyTier, SubjectId, SUBJECTS, DIFFICULTY_THRESHOLDS } from "@/contexts/ProgressContext";
import { Spacing, BorderRadius, Typography } from "@/constants/theme";
import { getSubjects } from "@/services/subjectsService";
import { getFlashcards } from "@/services/flashcardsService";
import { Flashcard, Subject } from "@/types/models";
import { useCurrentChildId } from "@/contexts/ChildContext";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const DIFFICULTY_LABELS: Record<DifficultyTier, { label: string; icon: string; color: string }> = {
  easy: { label: "Easy", icon: "smile", color: "#10B981" },
  medium: { label: "Medium", icon: "zap", color: "#F59E0B" },
  hard: { label: "Hard", icon: "award", color: "#EF4444" },
};

interface FlashcardPracticeModalProps {
  visible: boolean;
  subject: Subject | null;
  difficulty: DifficultyTier;
  childId: string | null;
  onClose: () => void;
}

function FlashcardPracticeModal({ visible, subject, difficulty, childId, onClose }: FlashcardPracticeModalProps) {
  const { theme } = useTheme();
  const { addFlashcardResult } = useProgress();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState("");
  const [hasChecked, setHasChecked] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [showResults, setShowResults] = useState(false);
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  const inputRef = useRef<TextInput>(null);
  const cardScale = useSharedValue(1);
  const feedbackScale = useSharedValue(0);

  const difficultyInfo = DIFFICULTY_LABELS[difficulty];

  useEffect(() => {
    if (visible && subject && childId) {
      setIsLoading(true);
      resetState();
      let cancelled = false;

      (async () => {
        try {
          const data = await getFlashcards(subject.id, difficulty, childId);
          if (cancelled) return;
          setCards(data);
        } finally {
          if (!cancelled) setIsLoading(false);
        }
      })();

      return () => {
        cancelled = true;
      };
    }
  }, [visible, subject, difficulty, childId]);

  useEffect(() => {
    if (visible && !hasChecked && !isLoading && cards.length > 0) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 500);
    }
  }, [visible, currentIndex, hasChecked, isLoading, cards.length]);

  const resetState = () => {
    setCurrentIndex(0);
    setUserAnswer("");
    setHasChecked(false);
    setIsCorrect(false);
    setCorrectCount(0);
    setShowResults(false);
    cardScale.value = 1;
    feedbackScale.value = 0;
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const currentCard = cards[currentIndex];

  const checkAnswer = () => {
    if (!userAnswer.trim() || !currentCard || !subject) return;

    const normalizedUserAnswer = userAnswer.trim().toLowerCase();
    const correct = currentCard.acceptableAnswers.some(
      (acceptable) => acceptable.toLowerCase() === normalizedUserAnswer
    );

    setIsCorrect(correct);
    setHasChecked(true);
    
    addFlashcardResult(subject.id, correct);

    if (correct) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setCorrectCount((prev) => prev + 1);
      feedbackScale.value = withSequence(
        withSpring(1.2, { damping: 8 }),
        withSpring(1, { damping: 10 })
      );
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      cardScale.value = withSequence(
        withSpring(0.95, { damping: 8 }),
        withSpring(1, { damping: 10 })
      );
    }
  };

  const goToNext = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    if (currentIndex < cards.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setUserAnswer("");
      setHasChecked(false);
      setIsCorrect(false);
      feedbackScale.value = 0;
    } else {
      setShowResults(true);
    }
  };

  const cardAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: cardScale.value }],
  }));

  const feedbackAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: feedbackScale.value }],
    opacity: feedbackScale.value,
  }));

  if (!subject) return null;

  const getResultMessage = () => {
    if (cards.length === 0) return "";
    const percentage = (correctCount / cards.length) * 100;
    if (percentage === 100) return "Perfect Score! You're a superstar!";
    if (percentage >= 80) return "Awesome job! Keep it up!";
    if (percentage >= 60) return "Good work! Practice makes perfect!";
    return "Keep practicing! You'll get better!";
  };

  const getResultIcon = () => {
    if (cards.length === 0) return "star";
    const percentage = (correctCount / cards.length) * 100;
    if (percentage === 100) return "award";
    if (percentage >= 80) return "star";
    if (percentage >= 60) return "thumbs-up";
    return "heart";
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView 
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={[styles.modalContainer, { backgroundColor: theme.backgroundElevated }]}>
          <View style={styles.modalHeader}>
            <Pressable onPress={handleClose} style={styles.closeButton}>
              <Feather name="x" size={28} color={theme.textPrimary} />
            </Pressable>
            <View style={styles.modalTitleContainer}>
              <ThemedText type="headline" style={styles.modalTitle}>
                {subject.name}
              </ThemedText>
              <View style={[styles.difficultyBadge, { backgroundColor: difficultyInfo.color + "20" }]}>
                <Feather name={difficultyInfo.icon as any} size={12} color={difficultyInfo.color} />
                <ThemedText style={[styles.difficultyText, { color: difficultyInfo.color }]}>
                  {difficultyInfo.label}
                </ThemedText>
              </View>
            </View>
            <View style={styles.cardCounter}>
              <ThemedText style={{ color: subject.color, fontWeight: "600" }}>
                {!isLoading && cards.length > 0 ? `${currentIndex + 1} / ${cards.length}` : ""}
              </ThemedText>
            </View>
          </View>

          {isLoading ? (
            <AsyncStatus
              loading
              error={null}
              loadingMessage="Loading flashcards..."
              color={subject.color}
            />
          ) : showResults ? (
            <ScrollView 
              contentContainerStyle={styles.resultsContainer}
              keyboardShouldPersistTaps="handled"
            >
              <View style={[styles.resultsCard, { backgroundColor: theme.backgroundDefault }]}>
                <Feather 
                  name={getResultIcon() as any} 
                  size={80} 
                  color={subject.color} 
                />
                <ThemedText type="title" style={styles.resultsTitle}>
                  {getResultMessage()}
                </ThemedText>
                <View style={[styles.scoreCircle, { borderColor: subject.color }]}>
                  <ThemedText style={[styles.scoreText, { color: subject.color }]}>
                    {correctCount}/{cards.length}
                  </ThemedText>
                  <ThemedText style={[styles.scoreLabel, { color: theme.textSecondary }]}>
                    Correct
                  </ThemedText>
                </View>
                <View style={styles.resultsButtons}>
                  <Pressable
                    style={[styles.resultButton, { backgroundColor: subject.color }]}
                    onPress={resetState}
                  >
                    <Feather name="refresh-cw" size={20} color="white" />
                    <ThemedText style={styles.resultButtonText}>Try Again</ThemedText>
                  </Pressable>
                  <Pressable
                    style={[styles.resultButton, { backgroundColor: theme.backgroundElevated, borderWidth: 2, borderColor: subject.color }]}
                    onPress={handleClose}
                  >
                    <ThemedText style={[styles.resultButtonText, { color: subject.color }]}>Done</ThemedText>
                  </Pressable>
                </View>
              </View>
            </ScrollView>
          ) : (
            <ScrollView 
              contentContainerStyle={styles.questionContainer}
              keyboardShouldPersistTaps="handled"
            >
              <Animated.View
                style={[
                  styles.questionCard,
                  { backgroundColor: theme.backgroundDefault },
                  cardAnimatedStyle,
                ]}
              >
                <View style={[styles.cardLabel, { backgroundColor: subject.color + "20" }]}>
                  <ThemedText style={[styles.cardLabelText, { color: subject.color }]}>
                    Question {currentIndex + 1}
                  </ThemedText>
                </View>
                <ThemedText type="title" style={styles.questionText}>
                  {currentCard?.question}
                </ThemedText>
              </Animated.View>

              <View style={styles.answerSection}>
                <ThemedText style={[styles.answerLabel, { color: theme.textSecondary }]}>
                  Your Answer:
                </ThemedText>
                <TextInput
                  ref={inputRef}
                  style={[
                    styles.answerInput,
                    { 
                      backgroundColor: theme.backgroundDefault,
                      color: theme.textPrimary,
                      borderColor: hasChecked 
                        ? (isCorrect ? "#10B981" : "#EF4444") 
                        : subject.color,
                    },
                  ]}
                  value={userAnswer}
                  onChangeText={setUserAnswer}
                  placeholder="Type your answer here..."
                  placeholderTextColor={theme.textSecondary}
                  editable={!hasChecked}
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="done"
                  onSubmitEditing={() => {
                    if (!hasChecked) checkAnswer();
                  }}
                />

                {hasChecked ? (
                  <View style={styles.feedbackContainer}>
                    <Animated.View 
                      style={[
                        styles.feedbackBadge,
                        { backgroundColor: isCorrect ? "#D1FAE5" : "#FEE2E2" },
                        isCorrect ? feedbackAnimatedStyle : undefined,
                      ]}
                    >
                      <Feather 
                        name={isCorrect ? "check-circle" : "x-circle"} 
                        size={24} 
                        color={isCorrect ? "#10B981" : "#EF4444"} 
                      />
                      <ThemedText 
                        style={[
                          styles.feedbackText, 
                          { color: isCorrect ? "#10B981" : "#EF4444" }
                        ]}
                      >
                        {isCorrect ? "Correct! Great job!" : "Not quite right"}
                      </ThemedText>
                    </Animated.View>

                    {!isCorrect ? (
                      <View style={[styles.correctAnswerBox, { backgroundColor: "#FEF3C7" }]}>
                        <ThemedText style={styles.correctAnswerLabel}>
                          The correct answer is:
                        </ThemedText>
                        <ThemedText style={styles.correctAnswerText}>
                          {currentCard?.answer}
                        </ThemedText>
                      </View>
                    ) : null}

                    <Pressable
                      style={[styles.nextButton, { backgroundColor: subject.color }]}
                      onPress={goToNext}
                    >
                      <ThemedText style={styles.nextButtonText}>
                        {currentIndex < cards.length - 1 ? "Next Question" : "See Results"}
                      </ThemedText>
                      <Feather name="arrow-right" size={20} color="white" />
                    </Pressable>
                  </View>
                ) : (
                  <Pressable
                    style={[
                      styles.checkButton, 
                      { 
                        backgroundColor: userAnswer.trim() ? subject.color : theme.backgroundDefault,
                        borderColor: subject.color,
                        borderWidth: userAnswer.trim() ? 0 : 2,
                      }
                    ]}
                    onPress={checkAnswer}
                    disabled={!userAnswer.trim()}
                  >
                    <Feather 
                      name="check" 
                      size={20} 
                      color={userAnswer.trim() ? "white" : subject.color} 
                    />
                    <ThemedText 
                      style={[
                        styles.checkButtonText,
                        { color: userAnswer.trim() ? "white" : subject.color }
                      ]}
                    >
                      Check Answer
                    </ThemedText>
                  </Pressable>
                )}
              </View>
            </ScrollView>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export default function FlashcardsScreen() {
  const { theme } = useTheme();
  const { childId } = useCurrentChildId();
  const { progress, getSubjectDifficulty, getBalancedProgress } = useProgress();
  const [practiceSubject, setPracticeSubject] = useState<Subject | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedDifficulty, setSelectedDifficulty] = useState<DifficultyTier>("easy");
  const [subjects, setSubjects] = useState<Subject[]>([]);

  useEffect(() => {
    if (!childId) return;

    let cancelled = false;

    const loadSubjects = async () => {
      try {
        const fetchedSubjects = await getSubjects(childId);
        if (cancelled) return;
        setSubjects(fetchedSubjects);
      } catch (e) {
        console.error("Failed to load subjects", e);
        if (cancelled) return;
        setSubjects([]);
      }
    };

    loadSubjects();

    return () => {
      cancelled = true;
    };
  }, [childId]);

  const balancedProgress = getBalancedProgress();

  const handlePractice = (subject: Subject) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const difficulty = getSubjectDifficulty(subject.id);
    setSelectedDifficulty(difficulty);
    setPracticeSubject(subject);
    setModalVisible(true);
  };

  const handleCloseModal = () => {
    setModalVisible(false);
    setPracticeSubject(null);
  };

  const getSubjectProgress = (subjectId: SubjectId) => {
    const stats = progress.flashcardsBySubject[subjectId];
    return {
      correct: stats?.correct || 0,
      completed: stats?.completed || 0,
      difficulty: stats?.difficulty || "easy",
    };
  };

  const getNextDifficultyAt = (correct: number): number | null => {
    if (correct < DIFFICULTY_THRESHOLDS.medium) return DIFFICULTY_THRESHOLDS.medium;
    if (correct < DIFFICULTY_THRESHOLDS.hard) return DIFFICULTY_THRESHOLDS.hard;
    return null;
  };

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
            {balancedProgress.message}
          </ThemedText>
          <View style={styles.subjectProgressContainer}>
            {SUBJECTS.map((subjectId) => {
              const subject = subjects.find(s => s.id === subjectId);
              if (!subject) return null;
              const subjectProg = balancedProgress.subjectProgress[subjectId];
              const progressPercent = balancedProgress.requiredPerSubject > 0 
                ? Math.min((subjectProg.current / balancedProgress.requiredPerSubject) * 100, 100)
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
                        }
                      ]} 
                    />
                  </View>
                </View>
              );
            })}
          </View>
        </View>
        
        {subjects.map((subject) => {
          const subjectProgress = getSubjectProgress(subject.id);
          const difficultyInfo = DIFFICULTY_LABELS[subjectProgress.difficulty];
          const nextAt = getNextDifficultyAt(subjectProgress.correct);
          const progressToNext = nextAt 
            ? ((subjectProgress.correct - (subjectProgress.difficulty === "easy" ? 0 : subjectProgress.difficulty === "medium" ? 20 : 40)) / 
               (subjectProgress.difficulty === "easy" ? 20 : 20))
            : 1;

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
                    {subjectProgress.correct} correct answers
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
                      {subjectProgress.correct}/{nextAt}
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
        })}
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
    ...Typography.caption,
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
  modalContainer: {
    flex: 1,
    paddingTop: Spacing.xl,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.1)",
  },
  closeButton: {
    padding: Spacing.sm,
    marginLeft: -Spacing.sm,
  },
  modalTitleContainer: {
    alignItems: "center",
    gap: 4,
  },
  modalTitle: {
    textAlign: "center",
  },
  difficultyBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  difficultyText: {
    fontSize: 11,
    fontWeight: "600",
  },
  cardCounter: {
    padding: Spacing.sm,
    marginRight: -Spacing.sm,
  },
  questionContainer: {
    padding: Spacing.xl,
    paddingBottom: Spacing.xxl,
  },
  questionCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    marginBottom: Spacing.xl,
  },
  cardLabel: {
    alignSelf: "flex-start",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.md,
  },
  cardLabelText: {
    fontSize: 12,
    fontWeight: "600",
  },
  questionText: {
    fontSize: 22,
    lineHeight: 32,
    textAlign: "center",
  },
  answerSection: {
    gap: Spacing.md,
  },
  answerLabel: {
    fontSize: 14,
    fontWeight: "500",
  },
  answerInput: {
    height: 56,
    borderRadius: BorderRadius.md,
    borderWidth: 2,
    paddingHorizontal: Spacing.lg,
    fontSize: 18,
  },
  feedbackContainer: {
    gap: Spacing.md,
    marginTop: Spacing.sm,
  },
  feedbackBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  feedbackText: {
    fontSize: 16,
    fontWeight: "600",
  },
  correctAnswerBox: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  correctAnswerLabel: {
    fontSize: 12,
    color: "#92400E",
    marginBottom: 4,
  },
  correctAnswerText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#92400E",
  },
  nextButton: {
    height: 52,
    borderRadius: BorderRadius.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
  },
  nextButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  checkButton: {
    height: 52,
    borderRadius: BorderRadius.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
  },
  checkButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  resultsContainer: {
    flex: 1,
    justifyContent: "center",
    padding: Spacing.xl,
  },
  resultsCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.xxl,
    alignItems: "center",
    gap: Spacing.lg,
  },
  resultsTitle: {
    textAlign: "center",
    fontSize: 24,
  },
  scoreCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  scoreText: {
    fontSize: 32,
    fontWeight: "bold",
  },
  scoreLabel: {
    fontSize: 14,
    marginTop: 2,
  },
  resultsButtons: {
    flexDirection: "row",
    gap: Spacing.md,
    marginTop: Spacing.lg,
  },
  resultButton: {
    flex: 1,
    height: 48,
    borderRadius: BorderRadius.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
  },
  resultButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
