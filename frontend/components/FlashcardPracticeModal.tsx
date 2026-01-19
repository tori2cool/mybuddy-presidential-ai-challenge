import { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { ThemedText } from "@/components/ThemedText";
import { AsyncStatus } from "@/components/AsyncStatus";
import { useTheme } from "@/hooks/useTheme";
import type { DifficultyCode, DifficultyThreshold, Subject, Flashcard } from "@/types/models";
import { useDashboard } from "@/contexts/DashboardContext";
import type { ProgressEvent } from "@/services/eventsService";
import { Spacing, BorderRadius } from "@/constants/theme";
import { getFlashcards, flagFlashcardForRegen } from "@/services/flashcardsService";
import Constants from 'expo-constants';

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
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [hasChecked, setHasChecked] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [showResults, setShowResults] = useState(false);
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const [flagModalVisible, setFlagModalVisible] = useState(false);
  const [flagReasonCode, setFlagReasonCode] = useState<string>("wrong");
  const [flagSubmitting, setFlagSubmitting] = useState(false);

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
      console.log('[FlashcardModal Debug] Modal opened - visible:', visible);
      console.log('[FlashcardModal Debug] Subject:', subject.code, 'Name:', subject.name);
      console.log('[FlashcardModal Debug] Difficulty:', difficultyCode);
      console.log('[FlashcardModal Debug] Child ID:', childId);

      const apiKey = process.env.EXPO_PUBLIC_OPENAI_API_KEY || 
                    Constants.expoConfig?.extra?.EXPO_PUBLIC_OPENAI_API_KEY;

      console.log('[FlashcardModal Debug] API Key status:', 
        apiKey ? `Loaded (starts with ${apiKey.slice(0, 7)}... ends with ...${apiKey.slice(-4)})` : 'MISSING');

      console.log('[FlashcardModal Debug] Expo extra contents:', Constants.expoConfig?.extra || 'No extra found');
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

  // No keyboard focus needed for MCQ UI

  const resetState = () => {
    setCards([]);
    setCurrentIndex(0);
    setSelectedIndex(null);
    setHasChecked(false);
    setIsCorrect(false);
    setCorrectCount(0);
    setShowResults(false);
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

  const handleFlag = async () => {
    if (!currentCard?.id || !childId) return;

    setFlagSubmitting(true);
    try {
      await flagFlashcardForRegen(currentCard.id, childId, flagReasonCode);

      // Remove the current card locally so the kid doesn't see it again in this session.
      setCards((prev) => prev.filter((c) => c.id !== currentCard.id));
      setCurrentIndex((prevIdx) => Math.max(0, Math.min(prevIdx, Math.max(0, cards.length - 2))));
      setSelectedIndex(null);
      setHasChecked(false);
      setIsCorrect(false);

      setFlagModalVisible(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err) {
      console.error("[FlashcardPracticeModal] flag failed:", err);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setFlagSubmitting(false);
    }
  };

  const goToNext = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (currentIndex < cards.length - 1) {
      // Next card - no refresh needed
      setCurrentIndex((prev) => prev + 1);
      setSelectedIndex(null);
      setHasChecked(false);
      setIsCorrect(false);
    } else {
      // Quiz complete (last card)
      setShowResults(true);
    }
  };


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
      if (selectedIndex === null || !currentCard || !subject) return;

      const correct = selectedIndex === currentCard.correctIndex;

      setIsCorrect(correct);
      setHasChecked(true);

      const event: ProgressEvent = {
        kind: "flashcard",
        body: {
          correct,
          flashcardId: currentCard.id,
          answer: currentCard.choices[selectedIndex] ?? null,
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
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } catch (err) {
      console.error("[FlashcardPracticeModal] checkAnswer failed:", err);
    }
  };

  if (Platform.OS === "web") {
    return (
      <Modal visible={visible} animationType="fade" transparent onRequestClose={handleClose}>
        <View style={styles.webOverlay}>
          <View style={[styles.webSheet, { backgroundColor: theme.backgroundRoot }]}>
            <ScrollView
              style={styles.webScroll}
              contentContainerStyle={[styles.modalContent, { backgroundColor: theme.backgroundRoot }]}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.inner}>
                {/* Header */}
                <View
                  style={[
                    styles.modalHeader,
                    {
                      backgroundColor: theme.backgroundRoot,
                      borderBottomColor:
                        theme.border ??
                        theme.backgroundTertiary ??
                        (theme.textSecondary + "33"),
                    },
                  ]}
                >
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
                      <View style={[styles.resultsScoreContainer, { borderColor: theme.primary }]}
                      >
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
                          <ThemedText
                            style={[styles.resultButtonText, styles.resultButtonLabel]}
                          >
                            Done
                          </ThemedText>
                        </Pressable>
                      </View>
                    </View>
                  </View>
                )}

                {/* Flag Modal */}
                <Modal
                  visible={flagModalVisible}
                  transparent
                  animationType="fade"
                  onRequestClose={() => setFlagModalVisible(false)}
                >
                  <View style={styles.flagModalOverlay}>
                    <View style={[styles.flagModalCard, { backgroundColor: theme.backgroundDefault }]}>
                      <ThemedText type="title" style={{ textAlign: "center" }}>
                        Flag this card
                      </ThemedText>

                      <ThemedText style={{ color: theme.textSecondary, textAlign: "center" }}>
                        Tell us what's wrong and we'll replace it.
                      </ThemedText>

                      <View style={{ gap: Spacing.sm, marginTop: Spacing.md }}>
                        {[
                          { code: "wrong", label: "Wrong Answer" },
                          { code: "confusing", label: "Confusing or Unclear" },
                          { code: "ambiguous", label: "Multiple Answers" },
                          { code: "inappropriate", label: "Not Appropriate" },
                          { code: "biased", label: "Biased" },
                        ].map((r) => {
                          const selected = flagReasonCode === r.code;
                          return (
                            <Pressable
                              key={r.code}
                              style={[
                                styles.flagReasonRow,
                                {
                                  borderColor: selected ? theme.primary : theme.border,
                                  backgroundColor: selected
                                    ? theme.primary + "10"
                                    : theme.backgroundDefault,
                                },
                              ]}
                              onPress={() => setFlagReasonCode(r.code)}
                              disabled={flagSubmitting}
                            >
                              <ThemedText style={{ color: theme.text, flex: 1 }}>{r.label}</ThemedText>
                              {selected && <Feather name="check" size={16} color={theme.primary} />}
                            </Pressable>
                          );
                        })}
                      </View>

                      <View style={{ flexDirection: "row", gap: Spacing.md, marginTop: Spacing.lg }}>
                        <Pressable
                          style={[
                            styles.flagModalButton,
                            {
                              backgroundColor: theme.backgroundSecondary ?? theme.backgroundDefault,
                              borderColor: theme.border,
                            },
                          ]}
                          onPress={() => setFlagModalVisible(false)}
                          disabled={flagSubmitting}
                        >
                          <ThemedText style={{ color: theme.text }}>Cancel</ThemedText>
                        </Pressable>

                        <Pressable
                          style={[
                            styles.flagModalButton,
                            {
                              backgroundColor: theme.error,
                              borderColor: theme.error,
                              opacity: flagSubmitting ? 0.7 : 1,
                            },
                          ]}
                          onPress={handleFlag}
                          disabled={flagSubmitting}
                        >
                          <ThemedText style={{ color: "white", fontWeight: "600" }}>
                            {flagSubmitting ? "Flagging..." : "Flag for Review"}
                          </ThemedText>
                        </Pressable>
                      </View>
                    </View>
                  </View>
                </Modal>

                {/* Question Screen */}
                {!showResults && !isLoading && currentCard && (
                  <View style={styles.questionContainer}>
                    <View style={[styles.questionCard, { backgroundColor: theme.backgroundDefault }]}>
                      <View style={styles.questionHeaderRow}>
                        <View style={[styles.cardLabel, { backgroundColor: subject?.color + "20" }]}>
                          <ThemedText style={[styles.cardLabelText, { color: subject?.color }]}
                          >
                            Question {currentIndex + 1}
                          </ThemedText>
                        </View>

                        <Pressable
                          style={[styles.flagIconButton, { backgroundColor: theme.backgroundDefault }]}
                          onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            setFlagModalVisible(true);
                          }}
                          accessibilityRole="button"
                          accessibilityLabel="Flag question"
                        >
                          <ThemedText style={[styles.flagIconText, { color: theme.textSecondary }]}
                          >
                            🚩
                          </ThemedText>
                        </Pressable>
                      </View>
                      <ThemedText type="title" style={styles.questionText}>
                        {currentCard.question}
                      </ThemedText>
                    </View>

                    <View style={styles.answerSection}>
                      <ThemedText style={[styles.answerLabel, { color: theme.textSecondary }]}>
                        Choose an Answer
                      </ThemedText>

                      <View style={styles.choicesContainer}>
                        {(currentCard.choices || []).slice(0, 4).map((choice, idx) => {
                          const selected = selectedIndex === idx;
                          const borderColor = hasChecked
                            ? idx === currentCard.correctIndex
                              ? theme.success
                              : selected
                                ? theme.error
                                : theme.border
                            : selected
                              ? theme.primary
                              : theme.border;

                          const backgroundColor = hasChecked
                            ? idx === currentCard.correctIndex
                              ? theme.success + "15"
                              : selected
                                ? theme.error + "10"
                                : theme.backgroundDefault
                            : selected
                              ? theme.primary + "10"
                              : theme.backgroundDefault;

                          return (
                            <Pressable
                              key={`${currentCard.id}:${idx}`}
                              style={[
                                styles.choiceButton,
                                {
                                  backgroundColor,
                                  borderColor,
                                },
                              ]}
                              onPress={() => {
                                if (hasChecked) return;
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                setSelectedIndex(idx);
                              }}
                            >
                              <View style={styles.choiceRow}>
                                <ThemedText style={{ color: theme.text, flex: 1 }}>{choice}</ThemedText>
                                {selected && !hasChecked && (
                                  <Feather name="check" size={16} color={theme.primary} />
                                )}
                                {hasChecked && idx === currentCard.correctIndex && (
                                  <Feather name="check-circle" size={16} color={theme.success} />
                                )}
                                {hasChecked && selected && idx !== currentCard.correctIndex && (
                                  <Feather name="x-circle" size={16} color={theme.error} />
                                )}
                              </View>
                            </Pressable>
                          );
                        })}
                      </View>

                      {/* Feedback Section */}
                      {hasChecked && selectedIndex !== null && (
                        <View style={styles.feedbackContainer}>
                          <View
                            style={[
                              styles.explanationBox,
                              {
                                backgroundColor: theme.backgroundDefault,
                                borderColor: theme.border,
                              },
                            ]}
                          >
                            <ThemedText style={[styles.explanationLabel, { color: theme.textSecondary }]}
                            >
                              Explanation
                            </ThemedText>
                            <ThemedText style={[styles.explanationText, { color: theme.text }]}
                            >
                              {currentCard.explanations?.[selectedIndex] || ""}
                            </ThemedText>
                          </View>

                          {!isCorrect && (
                            <View
                              style={[
                                styles.correctAnswerBox,
                                {
                                  backgroundColor: theme.backgroundSecondary ?? theme.backgroundDefault,
                                  borderWidth: 1,
                                  borderColor:
                                    theme.border ??
                                    theme.backgroundTertiary ??
                                    (theme.textSecondary + "33"),
                                  borderLeftWidth: 4,
                                  borderLeftColor: theme.secondary ?? theme.primary,
                                },
                              ]}
                            >
                              <ThemedText style={[styles.correctAnswerLabel, { color: theme.textSecondary }]}
                              >
                                Correct Answer:
                              </ThemedText>
                              <ThemedText style={[styles.correctAnswerText, { color: theme.text }]}
                              >
                                {currentCard.choices[currentCard.correctIndex]}
                              </ThemedText>
                              <ThemedText
                                style={[styles.correctAnswerExplanation, { color: theme.textSecondary }]}
                              >
                                {currentCard.explanations?.[currentCard.correctIndex] || ""}
                              </ThemedText>
                            </View>
                          )}
                        </View>
                      )}

                      {/* Action Buttons */}
                      {!hasChecked ? (
                        <Pressable
                          style={[
                            styles.checkButton,
                            {
                              backgroundColor: theme.primary,
                              opacity: selectedIndex === null ? 0.6 : 1,
                            },
                          ]}
                          onPress={checkAnswer}
                          disabled={selectedIndex === null}
                        >
                          <Feather name="check" size={20} color="white" />
                          <ThemedText style={[styles.checkButtonText, { color: "white" }]}
                          >
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
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={handleClose}>
      <KeyboardAvoidingView
        style={[styles.modalContainer, { backgroundColor: theme.backgroundRoot }]}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[styles.modalContent, { backgroundColor: theme.backgroundRoot }]}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.inner}>
            {/* Header */}
            <View
            style={[
              styles.modalHeader,
              {
                backgroundColor: theme.backgroundRoot,
                borderBottomColor:
                  theme.border ??
                  theme.backgroundTertiary ??
                  (theme.textSecondary + "33"),
              },
            ]}
          >
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
                    <ThemedText style={[styles.resultButtonText, styles.resultButtonLabel]}>Done</ThemedText>
                  </Pressable>
                </View>
              </View>
            </View>
          )}

          {/* Flag Modal */}
          <Modal
            visible={flagModalVisible}
            transparent
            animationType="fade"
            onRequestClose={() => setFlagModalVisible(false)}
          >
            <View style={styles.flagModalOverlay}>
              <View style={[styles.flagModalCard, { backgroundColor: theme.backgroundDefault }]}>
                <ThemedText type="title" style={{ textAlign: "center" }}>
                  Flag this card
                </ThemedText>

                <ThemedText style={{ color: theme.textSecondary, textAlign: "center" }}>
                  Tell us what’s wrong and we’ll replace it.
                </ThemedText>

                <View style={{ gap: Spacing.sm, marginTop: Spacing.md }}>
                  {[
                    { code: "wrong", label: "Wrong Answer" },
                    { code: "confusing", label: "Confusing or Unclear" },
                    { code: "ambiguous", label: "Multiple Answers" },
                    { code: "inappropriate", label: "Not Appropriate" },
                    { code: "biased", label: "Biased" },
                  ].map((r) => {
                    const selected = flagReasonCode === r.code;
                    return (
                      <Pressable
                        key={r.code}
                        style={[
                          styles.flagReasonRow,
                          {
                            borderColor: selected ? theme.primary : theme.border,
                            backgroundColor: selected ? theme.primary + "10" : theme.backgroundDefault,
                          },
                        ]}
                        onPress={() => setFlagReasonCode(r.code)}
                        disabled={flagSubmitting}
                      >
                        <ThemedText style={{ color: theme.text, flex: 1 }}>{r.label}</ThemedText>
                        {selected && <Feather name="check" size={16} color={theme.primary} />}
                      </Pressable>
                    );
                  })}
                </View>

                <View style={{ flexDirection: "row", gap: Spacing.md, marginTop: Spacing.lg }}>
                  <Pressable
                    style={[
                      styles.flagModalButton,
                      {
                        backgroundColor: theme.backgroundSecondary ?? theme.backgroundDefault,
                        borderColor: theme.border,
                      },
                    ]}
                    onPress={() => setFlagModalVisible(false)}
                    disabled={flagSubmitting}
                  >
                    <ThemedText style={{ color: theme.text }}>Cancel</ThemedText>
                  </Pressable>

                  <Pressable
                    style={[
                      styles.flagModalButton,
                      { backgroundColor: theme.error, borderColor: theme.error, opacity: flagSubmitting ? 0.7 : 1 },
                    ]}
                    onPress={handleFlag}
                    disabled={flagSubmitting}
                  >
                    <ThemedText style={{ color: "white", fontWeight: "600" }}>
                      {flagSubmitting ? "Flagging..." : "Flag for Review"}
                    </ThemedText>
                  </Pressable>
                </View>
              </View>
            </View>
          </Modal>

          {/* Question Screen */}
          {!showResults && !isLoading && currentCard && (
            <View style={styles.questionContainer}>
              <View style={[styles.questionCard, { backgroundColor: theme.backgroundDefault }]}>
                <View style={styles.questionHeaderRow}>
                  <View style={[styles.cardLabel, { backgroundColor: subject?.color + "20" }]}>
                    <ThemedText style={[styles.cardLabelText, { color: subject?.color }]}>
                      Question {currentIndex + 1}
                    </ThemedText>
                  </View>

                  <Pressable
                    style={[styles.flagIconButton, { backgroundColor: theme.backgroundDefault }]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setFlagModalVisible(true);
                    }}
                    accessibilityRole="button"
                    accessibilityLabel="Flag question"
                  >
                    <ThemedText style={[styles.flagIconText, { color: theme.textSecondary }]}>🚩</ThemedText>
                  </Pressable>
                </View>
                <ThemedText type="title" style={styles.questionText}>
                  {currentCard.question}
                </ThemedText>
              </View>

              <View style={styles.answerSection}>
                <ThemedText style={[styles.answerLabel, { color: theme.textSecondary }]}>
                  Choose an Answer
                </ThemedText>

                <View style={styles.choicesContainer}>
                  {(currentCard.choices || []).slice(0, 4).map((choice, idx) => {
                    const selected = selectedIndex === idx;
                    const borderColor = hasChecked
                      ? idx === currentCard.correctIndex
                        ? theme.success
                        : selected
                          ? theme.error
                          : theme.border
                      : selected
                        ? theme.primary
                        : theme.border;

                    const backgroundColor = hasChecked
                      ? idx === currentCard.correctIndex
                        ? theme.success + "15"
                        : selected
                          ? theme.error + "10"
                          : theme.backgroundDefault
                      : selected
                        ? theme.primary + "10"
                        : theme.backgroundDefault;

                    return (
                      <Pressable
                        key={`${currentCard.id}:${idx}`}
                        style={[
                          styles.choiceButton,
                          {
                            backgroundColor,
                            borderColor,
                          },
                        ]}
                        onPress={() => {
                          if (hasChecked) return;
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          setSelectedIndex(idx);
                        }}
                      >
                        <View style={styles.choiceRow}>
                          <ThemedText style={{ color: theme.text, flex: 1 }}>{choice}</ThemedText>
                          {selected && !hasChecked && (
                            <Feather name="check" size={16} color={theme.primary} />
                          )}
                          {hasChecked && idx === currentCard.correctIndex && (
                            <Feather name="check-circle" size={16} color={theme.success} />
                          )}
                          {hasChecked && selected && idx !== currentCard.correctIndex && (
                            <Feather name="x-circle" size={16} color={theme.error} />
                          )}
                        </View>
                      </Pressable>
                    );
                  })}
                </View>

                {/* Feedback Section */}
                {hasChecked && selectedIndex !== null && (
                  <View style={styles.feedbackContainer}>
                    <View
                      style={[
                        styles.explanationBox,
                        {
                          backgroundColor: theme.backgroundDefault,
                          borderColor: theme.border,
                        },
                      ]}
                    >
                      <ThemedText
                        style={[styles.explanationLabel, { color: theme.textSecondary }]}
                      >
                        Explanation
                      </ThemedText>
                      <ThemedText style={[styles.explanationText, { color: theme.text }]}
                      >
                        {currentCard.explanations?.[selectedIndex] || ""}
                      </ThemedText>
                    </View>

                    {!isCorrect && (
                      <View
                        style={[
                          styles.correctAnswerBox,
                          {
                            backgroundColor:
                              theme.backgroundSecondary ?? theme.backgroundDefault,
                            borderWidth: 1,
                            borderColor:
                              theme.border ??
                              theme.backgroundTertiary ??
                              (theme.textSecondary + "33"),
                            borderLeftWidth: 4,
                            borderLeftColor: theme.secondary ?? theme.primary,
                          },
                        ]}
                      >
                        <ThemedText
                          style={[
                            styles.correctAnswerLabel,
                            { color: theme.textSecondary },
                          ]}
                        >
                          Correct Answer:
                        </ThemedText>
                        <ThemedText
                          style={[styles.correctAnswerText, { color: theme.text }]}
                        >
                          {currentCard.choices[currentCard.correctIndex]}
                        </ThemedText>
                        <ThemedText
                          style={[
                            styles.correctAnswerExplanation,
                            { color: theme.textSecondary },
                          ]}
                        >
                          {currentCard.explanations?.[currentCard.correctIndex] || ""}
                        </ThemedText>
                      </View>
                    )}
                  </View>
                )}


                {/* Action Buttons */}
                {!hasChecked ? (
                  <Pressable
                    style={[
                      styles.checkButton,
                      {
                        backgroundColor: theme.primary,
                        opacity: selectedIndex === null ? 0.6 : 1,
                      },
                    ]}
                    onPress={checkAnswer}
                    disabled={selectedIndex === null}
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
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export default FlashcardPracticeModal;

const styles = StyleSheet.create({
  webOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.xl,
  },
  webSheet: {
    width: "100%",
    maxWidth: 960,
    height: "90%",
    maxHeight: "90%",
    borderRadius: BorderRadius.lg,
    overflow: "hidden",
  },
  webScroll: {
    flex: 1,
  },
  modalContainer: {
    flex: 1,
  },
  modalContent: {
    flexGrow: 1,
  },
  inner: {
    width: "100%",
    flex: 1,
  },
  innerWeb: {
    maxWidth: 960,
    alignSelf: "center",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
    borderBottomWidth: 1,
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
  questionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.md,
  },
  cardLabel: {
    alignSelf: "flex-start",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  flagIconButton: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  flagIconText: {
    fontSize: 18,
    lineHeight: 18,
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
  choicesContainer: {
    gap: Spacing.md,
  },
  choiceButton: {
    borderRadius: BorderRadius.md,
    borderWidth: 2,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  choiceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  feedbackContainer: {
    gap: Spacing.md,
    marginTop: Spacing.sm,
  },
  correctAnswerBox: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  correctAnswerLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  correctAnswerText: {
    fontSize: 18,
    fontWeight: "600",
  },
  correctAnswerExplanation: {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 20,
  },
  explanationBox: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  explanationLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  explanationText: {
    fontSize: 14,
    lineHeight: 20,
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
    marginTop: Spacing.lg,
    alignSelf: "stretch",
    width: "100%",
    alignItems: "stretch",
  },
  resultButton: {
    // Results screen primary action button
    height: 52,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "stretch",
    width: "100%",
  },
  resultButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  resultButtonLabel: {
    marginLeft: Spacing.sm,
  },

  flagModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.xl,
  },
  flagModalCard: {
    width: "100%",
    ...(Platform.OS === "web" ? { maxWidth: 960 } : null),
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    gap: Spacing.sm,
  },
  flagReasonRow: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  flagModalButton: {
    flex: 1,
    height: 48,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
});
