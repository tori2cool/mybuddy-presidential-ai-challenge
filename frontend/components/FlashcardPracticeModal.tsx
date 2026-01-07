import { useState, useRef, useEffect } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withSpring,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { ThemedText } from "@/components/ThemedText";
import { AsyncStatus } from "@/components/AsyncStatus";
import { useTheme } from "@/hooks/useTheme";
import type { DifficultyCode, DifficultyThreshold, Subject, Flashcard } from "@/types/models";
import { useDashboard } from "@/contexts/DashboardContext";
import type { ProgressEvent } from "@/services/eventsService";
import { Spacing, BorderRadius } from "@/constants/theme";
import { getFlashcards } from "@/services/flashcardsService";

interface FlashcardPracticeModalProps {
  visible: boolean;
  subject: Subject | null;
  difficultyCode: DifficultyCode;
  difficultyInfo?: DifficultyThreshold | null;
  childId: string | null;
  onClose: () => void;
}

function FlashcardPracticeModal({
  visible,
  subject,
  difficultyCode,
  difficultyInfo,
  childId,
  onClose,
}: FlashcardPracticeModalProps) {
  const { theme } = useTheme();
  const { postEvent, refreshDashboard } = useDashboard();

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

  const resolvedDifficultyInfo: { label: string; icon: string; color: string } =
    difficultyInfo
      ? {
          label: typeof difficultyInfo.label === "string" ? difficultyInfo.label : difficultyCode,
          icon: typeof difficultyInfo.icon === "string" ? difficultyInfo.icon : "help-circle",
          color: typeof difficultyInfo.color === "string" ? difficultyInfo.color : theme.primary,
        }
      : {
          label: difficultyCode,
          icon: "help-circle",
          color: theme.primary,
        };

  useEffect(() => {
    if (visible && subject && childId) {
      setIsLoading(true);
      resetState();
      let cancelled = false;

      (async () => {
        try {
          // Backend expects SubjectCode (e.g., "math"), not the subject UUID.
          const data = await getFlashcards(subject.code, difficultyCode, childId);
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
  }, [visible, subject, difficultyCode, childId]);

  useEffect(() => {
    if (!visible || hasChecked || isLoading || cards.length === 0) return;

    const t = setTimeout(() => inputRef.current?.focus(), 500);
    return () => clearTimeout(t);
  }, [visible, currentIndex, hasChecked, isLoading, cards.length]);

  const resetState = () => {
    setCards([]);
    setCurrentIndex(0);
    setUserAnswer("");
    setHasChecked(false);
    setIsCorrect(false);
    setCorrectCount(0);
    setShowResults(false);
    cardScale.value = 1;
    feedbackScale.value = 0;
  };

  const handleClose = async () => {
    try {
      await refreshDashboard({ force: true });
    } catch (err) {
      console.error("[FlashcardPracticeModal] refreshDashboard failed on close:", err);
    } finally {
      resetState();
      onClose();
    }
  };

  const currentCard = cards[currentIndex];

  const goToNext = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (currentIndex < cards.length - 1) {
      // Next card - no refresh needed
      setCurrentIndex((prev) => prev + 1);
      setUserAnswer("");
      setHasChecked(false);
      setIsCorrect(false);
      feedbackScale.value = 0;
    } else {
      // Quiz complete (last card)
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

  const checkAnswer = () => {
    try {
      if (!userAnswer.trim() || !currentCard || !subject) return;

      const normalizedUserAnswer = userAnswer.trim().toLowerCase();
      const correct = currentCard.acceptableAnswers.some(
        (acceptable) => acceptable.toLowerCase() === normalizedUserAnswer
      );

      setIsCorrect(correct);
      setHasChecked(true);

      const event: ProgressEvent = {
        kind: "flashcard",
        body: {
          correct,
          flashcardId: currentCard.id,
          answer: userAnswer.trim(),
        },
      };

      // Backend derives subject from flashcardId; do not include subjectId (extra fields are forbidden).
      console.log("Posting flashcard event:", event);

      // Fire-and-forget; DashboardContext will debounce refresh after posting.
      postEvent(event).catch((err) => {
        console.error("Failed to post flashcard event:", err);
      });

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
    } catch (err) {
      console.error("[FlashcardPracticeModal] checkAnswer failed:", err);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={handleClose}>
      <KeyboardAvoidingView
        style={styles.modalContainer}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          style={styles.modalContainer}
          contentContainerStyle={styles.modalContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={styles.modalHeader}>
            <Pressable style={styles.closeButton} onPress={handleClose}>
              <Feather name="x" size={24} color={theme.text} />
            </Pressable>
            <View style={styles.modalTitleContainer}>
              <ThemedText type="headline" style={styles.modalTitle}>
                {subject?.name}
              </ThemedText>
              <View
                style={[
                  styles.difficultyBadge,
                  { backgroundColor: resolvedDifficultyInfo.color + "20" },
                ]}
              >
                <Feather
                  name={resolvedDifficultyInfo.icon as any}
                  size={12}
                  color={resolvedDifficultyInfo.color}
                />
                <ThemedText
                  style={[styles.difficultyText, { color: resolvedDifficultyInfo.color }]}
                >
                  {resolvedDifficultyInfo.label}
                </ThemedText>
              </View>
            </View>
            <View style={styles.cardCounter}>
              <ThemedText style={{ color: theme.textSecondary }}>
                {currentIndex + 1}/{cards.length}
              </ThemedText>
            </View>
          </View>

          {/* Loading State */}
          {isLoading && (
            <View style={styles.loadingContainer}>
              <AsyncStatus loading={true} loadingMessage="Loading cards..." />
            </View>
          )}

          {/* Results Screen */}
          {showResults && !isLoading && (
            <View style={styles.resultsContainer}>
              <View style={[styles.resultsCard, { backgroundColor: theme.backgroundDefault }]}>
                <Feather name={getResultIcon() as any} size={64} color={theme.primary} />
                <ThemedText type="title" style={styles.resultsTitle}>
                  {getResultMessage()}
                </ThemedText>
                <View style={[styles.resultsScoreContainer, { borderColor: theme.primary }]}>
                  <View style={styles.resultsScoreRow}>
                    <ThemedText style={styles.resultsScoreLabel}>Correct</ThemedText>
                    <ThemedText style={[styles.resultsScoreValue, { color: theme.success }]}>
                      {correctCount}/{cards.length}
                    </ThemedText>
                  </View>
                </View>
                <View style={styles.resultsButtons}>
                  <Pressable
                    style={[styles.resultButton, { backgroundColor: theme.primary }]}
                    onPress={handleClose}
                  >
                    <Feather name="home" size={20} color="white" />
                    <ThemedText style={styles.resultButtonText}>Done</ThemedText>
                  </Pressable>
                </View>
              </View>
            </View>
          )}

          {/* Question Screen */}
          {!showResults && !isLoading && currentCard && (
            <View style={styles.questionContainer}>
              <Animated.View style={[cardAnimatedStyle]}>
                <View style={[styles.questionCard, { backgroundColor: theme.backgroundDefault }]}>
                  <View style={[styles.cardLabel, { backgroundColor: subject?.color + "20" }]}>
                    <ThemedText style={[styles.cardLabelText, { color: subject?.color }]}>
                      Question {currentIndex + 1}
                    </ThemedText>
                  </View>
                  <ThemedText type="title" style={styles.questionText}>
                    {currentCard.question}
                  </ThemedText>
                </View>
              </Animated.View>

              <View style={styles.answerSection}>
                <ThemedText style={[styles.answerLabel, { color: theme.textSecondary }]}>
                  Your Answer
                </ThemedText>
                <TextInput
                  ref={inputRef}
                  style={[
                    styles.answerInput,
                    {
                      backgroundColor: theme.backgroundDefault,
                      borderColor: isCorrect
                        ? theme.success
                        : hasChecked
                          ? theme.error
                          : theme.border,
                      color: theme.text,
                    },
                  ]}
                  value={userAnswer}
                  onChangeText={setUserAnswer}
                  placeholder="Type your answer here..."
                  placeholderTextColor={theme.textSecondary}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!hasChecked}
                  onSubmitEditing={!hasChecked ? checkAnswer : undefined}
                />

                {/* Feedback Section */}
                {hasChecked && (
                  <View style={styles.feedbackContainer}>
                    <Animated.View style={feedbackAnimatedStyle}>
                      <View
                        style={[
                          styles.feedbackBadge,
                          {
                            backgroundColor: isCorrect
                              ? theme.success + "20"
                              : theme.error + "20",
                          },
                        ]}
                      >
                        <Feather
                          name={isCorrect ? "check-circle" : "x-circle"}
                          size={20}
                          color={isCorrect ? theme.success : theme.error}
                        />
                        <ThemedText
                          style={[styles.feedbackText, { color: isCorrect ? theme.success : theme.error }]}
                        >
                          {isCorrect ? "Correct!" : "Not quite!"}
                        </ThemedText>
                      </View>
                    </Animated.View>

                    {!isCorrect && (
                      <View style={[styles.correctAnswerBox, { backgroundColor: "#FEF3C7" }]}>
                        <ThemedText style={styles.correctAnswerLabel}>Correct Answer:</ThemedText>
                        <ThemedText style={styles.correctAnswerText}>
                          {currentCard.acceptableAnswers[0]}
                        </ThemedText>
                      </View>
                    )}
                  </View>
                )}

                {/* Action Buttons */}
                {!hasChecked ? (
                  <Pressable
                    style={[styles.checkButton, { backgroundColor: theme.primary }]}
                    onPress={checkAnswer}
                  >
                    <Feather name="check" size={20} color="white" />
                    <ThemedText style={[styles.checkButtonText, { color: "white" }]}>
                      Check Answer
                    </ThemedText>
                  </Pressable>
                ) : (
                  <Pressable
                    style={[styles.nextButton, { backgroundColor: theme.primary }]}
                    onPress={goToNext}
                  >
                    <ThemedText style={styles.nextButtonText}>
                      {currentIndex < cards.length - 1 ? "Next Card" : "See Results"}
                    </ThemedText>
                    <Feather
                      name={currentIndex < cards.length - 1 ? "arrow-right" : "award"}
                      size={20}
                      color="white"
                    />
                  </Pressable>
                )}
              </View>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export default FlashcardPracticeModal;

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
  },
  modalContent: {
    flexGrow: 1,
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
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
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
  resultsScoreContainer: {
    width: 200,
    borderWidth: 4,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    alignItems: "center",
    gap: Spacing.sm,
  },
  resultsScoreRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
  },
  resultsScoreLabel: {
    fontSize: 14,
    fontWeight: "500",
  },
  resultsScoreValue: {
    fontSize: 16,
    fontWeight: "700",
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
});
