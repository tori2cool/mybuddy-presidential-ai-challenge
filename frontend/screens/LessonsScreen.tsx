import { useState, useRef, useEffect } from "react";
import { View, StyleSheet, Pressable, Modal, Dimensions, TextInput, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
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
import { ProgressBar } from "@/components/ProgressBar";
import { useTheme } from "@/hooks/useTheme";
import { useProgress, SubjectId } from "@/contexts/ProgressContext";
import { useSchool } from "@/contexts/SchoolContext";
import { Spacing, BorderRadius } from "@/constants/theme";
import { 
  SUBJECTS, 
  SubjectInfo, 
  CURRICULUM_DATA, 
  Lesson, 
  GRADES,
  GradeLevel,
} from "@/constants/curriculum";
import { LessonsStackParamList } from "@/navigation/LessonsStackNavigator";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface LessonPracticeModalProps {
  visible: boolean;
  subject: SubjectInfo | null;
  grade: GradeLevel;
  onClose: () => void;
}

function LessonPracticeModal({ visible, subject, grade, onClose }: LessonPracticeModalProps) {
  const { theme } = useTheme();
  const { addLessonResult } = useProgress();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState("");
  const [hasChecked, setHasChecked] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [showResults, setShowResults] = useState(false);
  
  const inputRef = useRef<TextInput>(null);
  const cardScale = useSharedValue(1);
  const feedbackScale = useSharedValue(0);

  const lessons = subject ? (CURRICULUM_DATA[subject.id]?.[grade] || []) : [];
  const currentLesson = lessons[currentIndex];
  const gradeInfo = GRADES[grade];

  useEffect(() => {
    if (visible && !hasChecked) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 500);
    }
  }, [visible, currentIndex, hasChecked]);

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

  const checkAnswer = () => {
    if (!userAnswer.trim() || !currentLesson || !subject) return;

    const normalizedUserAnswer = userAnswer.trim().toLowerCase();
    const correct = currentLesson.acceptableAnswers.some(
      (acceptable) => acceptable.toLowerCase() === normalizedUserAnswer
    );

    setIsCorrect(correct);
    setHasChecked(true);
    
    addLessonResult(subject.id as SubjectId, correct);

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
    
    if (currentIndex < lessons.length - 1) {
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

  if (!subject || lessons.length === 0) {
    return (
      <Modal
        visible={visible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={handleClose}
      >
        <View style={[styles.modalContainer, { backgroundColor: theme.backgroundRoot }]}>
          <View style={styles.modalHeader}>
            <Pressable onPress={handleClose} style={styles.closeButton}>
              <Feather name="x" size={24} color={theme.text} />
            </Pressable>
          </View>
          <View style={styles.noLessonsContainer}>
            <Feather name="book" size={64} color={theme.textSecondary} />
            <ThemedText type="headline" style={styles.noLessonsText}>
              No lessons available for this grade level yet.
            </ThemedText>
            <ThemedText style={[styles.noLessonsSubtext, { color: theme.textSecondary }]}>
              Keep learning and more content will unlock!
            </ThemedText>
          </View>
        </View>
      </Modal>
    );
  }

  const getResultMessage = () => {
    const percentage = (correctCount / lessons.length) * 100;
    if (percentage === 100) return "Perfect Score! You're a superstar!";
    if (percentage >= 80) return "Awesome job! Keep it up!";
    if (percentage >= 60) return "Good work! Practice makes perfect!";
    return "Keep practicing! You'll get better!";
  };

  const getResultIcon = (): "award" | "star" | "thumbs-up" | "heart" => {
    const percentage = (correctCount / lessons.length) * 100;
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
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={[styles.modalContainer, { backgroundColor: theme.backgroundRoot }]}
      >
        <View style={styles.modalHeader}>
          <View style={[styles.gradeBadge, { backgroundColor: gradeInfo.color }]}>
            <ThemedText style={styles.gradeBadgeText}>{gradeInfo.name}</ThemedText>
          </View>
          <Pressable onPress={handleClose} style={styles.closeButton}>
            <Feather name="x" size={24} color={theme.text} />
          </Pressable>
        </View>

        {showResults ? (
          <View style={styles.resultsContainer}>
            <View style={[styles.resultsCard, { backgroundColor: theme.backgroundDefault }]}>
              <Feather name={getResultIcon()} size={64} color={subject.color} />
              <ThemedText type="title" style={styles.resultsTitle}>
                {getResultMessage()}
              </ThemedText>
              <ThemedText style={[styles.resultsScore, { color: theme.textSecondary }]}>
                You got {correctCount} out of {lessons.length} correct!
              </ThemedText>
              <View style={styles.resultsPoints}>
                <Feather name="zap" size={20} color={theme.primary} />
                <ThemedText style={[styles.pointsText, { color: theme.primary }]}>
                  +{correctCount * 10 + (lessons.length - correctCount) * 2} XP earned!
                </ThemedText>
              </View>
              <Pressable
                onPress={handleClose}
                style={[styles.doneButton, { backgroundColor: subject.color }]}
              >
                <ThemedText style={styles.doneButtonText}>Done</ThemedText>
              </Pressable>
            </View>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={styles.modalContent}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.progressSection}>
              <ThemedText style={[styles.progressLabel, { color: theme.textSecondary }]}>
                Question {currentIndex + 1} of {lessons.length}
              </ThemedText>
              <ProgressBar 
                progress={(currentIndex + 1) / lessons.length} 
                color={subject.color}
                style={styles.progressBar}
              />
            </View>

            <Animated.View style={cardAnimatedStyle}>
              <View style={[styles.lessonCard, { backgroundColor: theme.backgroundDefault }]}>
                <View style={[styles.subjectBadge, { backgroundColor: subject.color + "20" }]}>
                  <Feather name={subject.icon as any} size={20} color={subject.color} />
                  <ThemedText style={[styles.subjectLabel, { color: subject.color }]}>
                    {subject.name}
                  </ThemedText>
                </View>
                
                <ThemedText type="headline" style={styles.questionText}>
                  {currentLesson.question}
                </ThemedText>

                <TextInput
                  ref={inputRef}
                  style={[
                    styles.answerInput,
                    {
                      backgroundColor: theme.backgroundSecondary,
                      color: theme.text,
                      borderColor: hasChecked
                        ? isCorrect
                          ? theme.success
                          : theme.error
                        : "transparent",
                    },
                  ]}
                  placeholder="Type your answer..."
                  placeholderTextColor={theme.textSecondary}
                  value={userAnswer}
                  onChangeText={setUserAnswer}
                  onSubmitEditing={hasChecked ? goToNext : checkAnswer}
                  editable={!hasChecked}
                  autoCapitalize="none"
                  autoCorrect={false}
                />

                {hasChecked ? (
                  <View style={styles.feedbackSection}>
                    <Animated.View style={feedbackAnimatedStyle}>
                      <View
                        style={[
                          styles.feedbackBadge,
                          { backgroundColor: isCorrect ? theme.success : theme.error },
                        ]}
                      >
                        <Feather
                          name={isCorrect ? "check" : "x"}
                          size={20}
                          color="white"
                        />
                        <ThemedText style={styles.feedbackText}>
                          {isCorrect ? "Correct!" : "Not quite..."}
                        </ThemedText>
                      </View>
                    </Animated.View>
                    
                    {!isCorrect ? (
                      <ThemedText style={[styles.correctAnswer, { color: theme.textSecondary }]}>
                        The answer is: {currentLesson.answer}
                      </ThemedText>
                    ) : null}

                    <Pressable
                      onPress={goToNext}
                      style={[styles.nextButton, { backgroundColor: subject.color }]}
                    >
                      <ThemedText style={styles.nextButtonText}>
                        {currentIndex < lessons.length - 1 ? "Next Question" : "See Results"}
                      </ThemedText>
                      <Feather name="arrow-right" size={20} color="white" />
                    </Pressable>
                  </View>
                ) : (
                  <Pressable
                    onPress={checkAnswer}
                    style={[
                      styles.checkButton,
                      { 
                        backgroundColor: userAnswer.trim() ? subject.color : theme.backgroundSecondary,
                        opacity: userAnswer.trim() ? 1 : 0.5,
                      },
                    ]}
                    disabled={!userAnswer.trim()}
                  >
                    <ThemedText style={[
                      styles.checkButtonText,
                      { color: userAnswer.trim() ? "white" : theme.textSecondary }
                    ]}>
                      Check Answer
                    </ThemedText>
                  </Pressable>
                )}
              </View>
            </Animated.View>
          </ScrollView>
        )}
      </KeyboardAvoidingView>
    </Modal>
  );
}

type NavigationProp = NativeStackNavigationProp<LessonsStackParamList>;

export default function LessonsScreen() {
  const { theme } = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const { getLevelInfo, getGraduationProgress, progress, getTodayStats } = useProgress();
  const { getGlobalProgress } = useSchool();
  const [selectedSubject, setSelectedSubject] = useState<SubjectInfo | null>(null);
  const [showModal, setShowModal] = useState(false);

  const levelInfo = getLevelInfo();
  const graduationProgress = getGraduationProgress();
  const todayStats = getTodayStats();
  const schoolProgress = getGlobalProgress();

  const coreSubjects = Object.values(SUBJECTS).filter(s => s.category === "core");
  const electiveSubjects = Object.values(SUBJECTS).filter(s => s.category === "elective");

  const startLesson = (subject: SubjectInfo) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedSubject(subject);
    setShowModal(true);
  };

  const navigateToSchool = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    navigation.navigate("SchoolDashboard");
  };

  return (
    <ScreenScrollView>
      <ThemedView style={styles.container}>
        <Pressable 
          onPress={navigateToSchool}
          style={[styles.schoolCard, { backgroundColor: theme.info + "15" }]}
        >
          <View style={styles.schoolCardContent}>
            <View style={[styles.schoolIcon, { backgroundColor: theme.info }]}>
              <Feather name="book" size={28} color="white" />
            </View>
            <View style={styles.schoolInfo}>
              <ThemedText type="headline" style={{ color: theme.info }}>
                Online School
              </ThemedText>
              <ThemedText style={[styles.schoolDesc, { color: theme.textSecondary }]}>
                160 levels with 50 stars each - Learn at your pace
              </ThemedText>
              <View style={styles.schoolStats}>
                <View style={styles.schoolStat}>
                  <Feather name="star" size={14} color={theme.warning} />
                  <ThemedText style={{ color: theme.warning, fontSize: 13, marginLeft: 4 }}>
                    {schoolProgress.totalStars} stars
                  </ThemedText>
                </View>
                <View style={styles.schoolStat}>
                  <Feather name="trending-up" size={14} color={theme.success} />
                  <ThemedText style={{ color: theme.success, fontSize: 13, marginLeft: 4 }}>
                    Level {schoolProgress.level}
                  </ThemedText>
                </View>
              </View>
            </View>
            <Feather name="chevron-right" size={24} color={theme.info} />
          </View>
          <ProgressBar 
            progress={schoolProgress.overallProgress} 
            color={theme.info}
            style={styles.schoolProgressBar}
          />
        </Pressable>

        <View style={[styles.levelCard, { backgroundColor: levelInfo.gradeInfo.color + "15" }]}>
          <View style={styles.levelHeader}>
            <View style={[styles.rankBadge, { backgroundColor: levelInfo.gradeInfo.color }]}>
              <Feather name="award" size={24} color="white" />
            </View>
            <View style={styles.levelInfo}>
              <ThemedText type="headline" style={{ color: levelInfo.gradeInfo.color }}>
                {levelInfo.rank}
              </ThemedText>
              <ThemedText style={[styles.gradeText, { color: theme.textSecondary }]}>
                {levelInfo.gradeInfo.name} - Level {levelInfo.gradeLevel}
              </ThemedText>
            </View>
            <View style={styles.globalLevel}>
              <ThemedText style={[styles.globalLevelNumber, { color: levelInfo.gradeInfo.color }]}>
                {levelInfo.globalLevel}
              </ThemedText>
              <ThemedText style={[styles.globalLevelLabel, { color: theme.textSecondary }]}>
                Level
              </ThemedText>
            </View>
          </View>
          
          <View style={styles.xpSection}>
            <View style={styles.xpRow}>
              <Feather name="zap" size={16} color={levelInfo.gradeInfo.color} />
              <ThemedText style={[styles.xpText, { color: theme.textSecondary }]}>
                {levelInfo.xpProgress.current} / {levelInfo.xpProgress.required} XP to next level
              </ThemedText>
            </View>
            <ProgressBar 
              progress={levelInfo.xpProgress.progress} 
              color={levelInfo.gradeInfo.color}
              style={styles.xpBar}
            />
          </View>
        </View>

        <View style={[styles.statsBar, { backgroundColor: theme.backgroundDefault }]}>
          <View style={styles.statItem}>
            <Feather name="book" size={20} color={theme.success} />
            <ThemedText style={[styles.statValue, { color: theme.success }]}>
              {todayStats?.lessonsCompleted || 0}
            </ThemedText>
            <ThemedText style={[styles.statLabel, { color: theme.textSecondary }]}>
              Today
            </ThemedText>
          </View>
          <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
          <View style={styles.statItem}>
            <Feather name="target" size={20} color={theme.secondary} />
            <ThemedText style={[styles.statValue, { color: theme.secondary }]}>
              {progress.lessonsXp}
            </ThemedText>
            <ThemedText style={[styles.statLabel, { color: theme.textSecondary }]}>
              Total XP
            </ThemedText>
          </View>
          <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
          <View style={styles.statItem}>
            <Feather name="check-circle" size={20} color={theme.primary} />
            <ThemedText style={[styles.statValue, { color: theme.primary }]}>
              {Math.round(graduationProgress.overallProgress * 100)}%
            </ThemedText>
            <ThemedText style={[styles.statLabel, { color: theme.textSecondary }]}>
              Progress
            </ThemedText>
          </View>
        </View>

        <ThemedText type="headline" style={styles.sectionTitle}>
          Core Subjects
        </ThemedText>

        <View style={styles.subjectsGrid}>
          {coreSubjects.map((subject) => (
            <Pressable
              key={subject.id}
              onPress={() => startLesson(subject)}
              style={[
                styles.subjectCard,
                { backgroundColor: subject.color + "15" },
              ]}
            >
              <View style={[styles.subjectIcon, { backgroundColor: subject.color + "30" }]}>
                <Feather name={subject.icon as any} size={28} color={subject.color} />
              </View>
              <ThemedText type="headline" style={[styles.subjectName, { color: subject.color }]}>
                {subject.name}
              </ThemedText>
              <ThemedText style={[styles.subjectDesc, { color: theme.textSecondary }]}>
                {subject.description}
              </ThemedText>
            </Pressable>
          ))}
        </View>

        <ThemedText type="headline" style={styles.sectionTitle}>
          Electives & Activities
        </ThemedText>

        <View style={styles.subjectsGrid}>
          {electiveSubjects.map((subject) => (
            <Pressable
              key={subject.id}
              onPress={() => startLesson(subject)}
              style={[
                styles.subjectCard,
                { backgroundColor: subject.color + "15" },
              ]}
            >
              <View style={[styles.subjectIcon, { backgroundColor: subject.color + "30" }]}>
                <Feather name={subject.icon as any} size={28} color={subject.color} />
              </View>
              <ThemedText type="headline" style={[styles.subjectName, { color: subject.color }]}>
                {subject.name}
              </ThemedText>
              <ThemedText style={[styles.subjectDesc, { color: theme.textSecondary }]}>
                {subject.description}
              </ThemedText>
            </Pressable>
          ))}
        </View>

        <View style={[styles.graduationCard, { backgroundColor: theme.backgroundDefault }]}>
          <ThemedText type="headline" style={styles.graduationTitle}>
            Graduation Requirements
          </ThemedText>
          <ThemedText style={[styles.graduationSubtitle, { color: theme.textSecondary }]}>
            Complete all areas to advance
          </ThemedText>
          
          <View style={styles.requirementRow}>
            <Feather name="book" size={18} color={graduationProgress.requirements.lessons.met ? theme.success : theme.textSecondary} />
            <View style={styles.requirementInfo}>
              <ThemedText>Lessons XP</ThemedText>
              <ProgressBar 
                progress={Math.min(1, graduationProgress.requirements.lessons.current / graduationProgress.requirements.lessons.required)}
                color={graduationProgress.requirements.lessons.met ? theme.success : theme.primary}
                style={styles.requirementBar}
              />
            </View>
            <ThemedText style={{ color: theme.textSecondary }}>
              {graduationProgress.requirements.lessons.current}/{graduationProgress.requirements.lessons.required}
            </ThemedText>
          </View>
          
          <View style={styles.requirementRow}>
            <Feather name="check-circle" size={18} color={graduationProgress.requirements.chores.met ? theme.success : theme.textSecondary} />
            <View style={styles.requirementInfo}>
              <ThemedText>Chores</ThemedText>
              <ProgressBar 
                progress={Math.min(1, graduationProgress.requirements.chores.current / graduationProgress.requirements.chores.required)}
                color={graduationProgress.requirements.chores.met ? theme.success : theme.secondary}
                style={styles.requirementBar}
              />
            </View>
            <ThemedText style={{ color: theme.textSecondary }}>
              {graduationProgress.requirements.chores.current}/{graduationProgress.requirements.chores.required}
            </ThemedText>
          </View>
          
          <View style={styles.requirementRow}>
            <Feather name="sun" size={18} color={graduationProgress.requirements.outdoor.met ? theme.success : theme.textSecondary} />
            <View style={styles.requirementInfo}>
              <ThemedText>Outdoor Activities</ThemedText>
              <ProgressBar 
                progress={Math.min(1, graduationProgress.requirements.outdoor.current / graduationProgress.requirements.outdoor.required)}
                color={graduationProgress.requirements.outdoor.met ? theme.success : "#84CC16"}
                style={styles.requirementBar}
              />
            </View>
            <ThemedText style={{ color: theme.textSecondary }}>
              {graduationProgress.requirements.outdoor.current}/{graduationProgress.requirements.outdoor.required}
            </ThemedText>
          </View>
          
          <View style={styles.requirementRow}>
            <Feather name="heart" size={18} color={graduationProgress.requirements.affirmations.met ? theme.success : theme.textSecondary} />
            <View style={styles.requirementInfo}>
              <ThemedText>Affirmations</ThemedText>
              <ProgressBar 
                progress={Math.min(1, graduationProgress.requirements.affirmations.current / graduationProgress.requirements.affirmations.required)}
                color={graduationProgress.requirements.affirmations.met ? theme.success : theme.error}
                style={styles.requirementBar}
              />
            </View>
            <ThemedText style={{ color: theme.textSecondary }}>
              {graduationProgress.requirements.affirmations.current}/{graduationProgress.requirements.affirmations.required}
            </ThemedText>
          </View>
        </View>
      </ThemedView>

      <LessonPracticeModal
        visible={showModal}
        subject={selectedSubject}
        grade={levelInfo.grade}
        onClose={() => setShowModal(false)}
      />
    </ScreenScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.lg,
  },
  schoolCard: {
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  schoolCardContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  schoolIcon: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  schoolInfo: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  schoolDesc: {
    fontSize: 12,
    marginTop: 2,
  },
  schoolStats: {
    flexDirection: "row",
    gap: Spacing.md,
    marginTop: Spacing.sm,
  },
  schoolStat: {
    flexDirection: "row",
    alignItems: "center",
  },
  schoolProgressBar: {
    height: 4,
    marginTop: Spacing.md,
    borderRadius: 2,
  },
  levelCard: {
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  levelHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  rankBadge: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  levelInfo: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  gradeText: {
    fontSize: 14,
    marginTop: 2,
  },
  globalLevel: {
    alignItems: "center",
  },
  globalLevelNumber: {
    fontSize: 28,
    fontWeight: "700",
  },
  globalLevelLabel: {
    fontSize: 12,
  },
  xpSection: {
    marginTop: Spacing.sm,
  },
  xpRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  xpText: {
    fontSize: 13,
  },
  xpBar: {
    height: 8,
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
  sectionTitle: {
    marginBottom: Spacing.md,
    marginTop: Spacing.sm,
  },
  subjectsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  subjectCard: {
    width: (SCREEN_WIDTH - Spacing.lg * 2 - Spacing.md) / 2,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    alignItems: "center",
  },
  subjectIcon: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.sm,
  },
  subjectName: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: Spacing.xs,
  },
  subjectDesc: {
    fontSize: 11,
    textAlign: "center",
  },
  graduationCard: {
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  graduationTitle: {
    marginBottom: Spacing.xs,
  },
  graduationSubtitle: {
    fontSize: 14,
    marginBottom: Spacing.lg,
  },
  requirementRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  requirementInfo: {
    flex: 1,
  },
  requirementBar: {
    height: 6,
    marginTop: Spacing.xs,
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.1)",
  },
  gradeBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.xs,
  },
  gradeBadgeText: {
    color: "white",
    fontWeight: "600",
    fontSize: 13,
  },
  closeButton: {
    padding: Spacing.sm,
  },
  modalContent: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  progressSection: {
    marginBottom: Spacing.lg,
  },
  progressLabel: {
    fontSize: 14,
    marginBottom: Spacing.xs,
    textAlign: "center",
  },
  progressBar: {
    height: 8,
  },
  lessonCard: {
    borderRadius: BorderRadius.md,
    padding: Spacing.xl,
    alignItems: "center",
  },
  subjectBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.xs,
    gap: Spacing.xs,
    marginBottom: Spacing.lg,
  },
  subjectLabel: {
    fontWeight: "600",
    fontSize: 14,
  },
  questionText: {
    textAlign: "center",
    marginBottom: Spacing.xl,
    lineHeight: 28,
  },
  answerInput: {
    width: "100%",
    borderRadius: BorderRadius.sm,
    padding: Spacing.lg,
    fontSize: 18,
    borderWidth: 2,
    textAlign: "center",
    marginBottom: Spacing.lg,
  },
  checkButton: {
    width: "100%",
    borderRadius: BorderRadius.sm,
    padding: Spacing.lg,
    alignItems: "center",
  },
  checkButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  feedbackSection: {
    width: "100%",
    alignItems: "center",
  },
  feedbackBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  feedbackText: {
    color: "white",
    fontWeight: "600",
    fontSize: 16,
  },
  correctAnswer: {
    fontSize: 14,
    marginBottom: Spacing.lg,
  },
  nextButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    borderRadius: BorderRadius.sm,
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  nextButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  resultsContainer: {
    flex: 1,
    padding: Spacing.lg,
    justifyContent: "center",
  },
  resultsCard: {
    borderRadius: BorderRadius.md,
    padding: Spacing.xxl,
    alignItems: "center",
  },
  resultsTitle: {
    marginTop: Spacing.lg,
    textAlign: "center",
  },
  resultsScore: {
    marginTop: Spacing.md,
    fontSize: 16,
  },
  resultsPoints: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: Spacing.lg,
    gap: Spacing.xs,
  },
  pointsText: {
    fontSize: 18,
    fontWeight: "600",
  },
  doneButton: {
    marginTop: Spacing.xl,
    paddingHorizontal: Spacing.xxl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.sm,
  },
  doneButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  noLessonsContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.xl,
  },
  noLessonsText: {
    textAlign: "center",
    marginTop: Spacing.lg,
  },
  noLessonsSubtext: {
    textAlign: "center",
    marginTop: Spacing.sm,
  },
});
