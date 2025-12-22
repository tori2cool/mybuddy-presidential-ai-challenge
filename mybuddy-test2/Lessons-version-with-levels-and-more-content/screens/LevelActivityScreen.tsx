import { useState, useEffect } from "react";
import { View, StyleSheet, Pressable, Dimensions, Linking } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
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
import { useSchool } from "@/contexts/SchoolContext";
import { Spacing, BorderRadius } from "@/constants/theme";
import { 
  getSubjectById, 
  generateLevelContent,
  SchoolActivity,
  SchoolQuestion,
} from "@/constants/schoolData";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

type RootStackParamList = {
  SchoolDashboard: undefined;
  SubjectDetail: { subjectId: string };
  LevelActivity: { subjectId: string; level: number; starNumber: number };
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type ActivityRouteProp = RouteProp<RootStackParamList, "LevelActivity">;

export default function LevelActivityScreen() {
  const { theme } = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<ActivityRouteProp>();
  const { earnStar, isStarCompleted } = useSchool();
  
  const { subjectId, level, starNumber } = route.params;
  const subject = getSubjectById(subjectId);
  
  const [currentActivityIndex, setCurrentActivityIndex] = useState(0);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [showResults, setShowResults] = useState(false);
  const [readingComplete, setReadingComplete] = useState(false);
  
  const cardScale = useSharedValue(1);
  const successScale = useSharedValue(0);

  const starActivities = generateLevelContent(level, subjectId, subject?.subtopics[0]?.id || subjectId);
  const currentStarData = starActivities.find(s => s.starNumber === starNumber);
  const activities = currentStarData?.activities || [];
  const currentActivity = activities[currentActivityIndex];
  
  const alreadyCompleted = isStarCompleted(subjectId, level, starNumber);
  
  useEffect(() => {
    if (showResults && !alreadyCompleted) {
      const requiredCorrect = Math.ceil((currentActivity?.questions?.length || 3) * 0.6);
      if (correctAnswers >= requiredCorrect) {
        earnStar(subjectId, level, starNumber);
      }
    }
  }, [showResults]);

  const cardAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: cardScale.value }],
  }));

  const successAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: successScale.value }],
    opacity: successScale.value,
  }));

  if (!subject || !currentActivity) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText>Activity not found</ThemedText>
      </ThemedView>
    );
  }

  const handleAnswerSelect = (index: number) => {
    if (hasAnswered) return;
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedAnswer(index);
  };

  const checkAnswer = () => {
    if (selectedAnswer === null || !currentActivity.questions) return;
    
    const currentQuestion = currentActivity.questions[currentQuestionIndex];
    const isCorrect = selectedAnswer === currentQuestion.correctAnswer;
    
    setHasAnswered(true);
    
    if (isCorrect) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setCorrectAnswers(prev => prev + 1);
      successScale.value = withSequence(
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

  const goToNextQuestion = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    if (currentActivity.questions && currentQuestionIndex < currentActivity.questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setSelectedAnswer(null);
      setHasAnswered(false);
      successScale.value = 0;
    } else {
      if (currentActivityIndex < activities.length - 1) {
        goToNextActivity();
      } else {
        setShowResults(true);
      }
    }
  };

  const goToNextActivity = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCurrentActivityIndex(prev => prev + 1);
    setCurrentQuestionIndex(0);
    setSelectedAnswer(null);
    setHasAnswered(false);
    setReadingComplete(false);
    successScale.value = 0;
  };

  const handleComplete = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    navigation.goBack();
  };

  const openVideo = (url: string) => {
    Linking.openURL(url);
  };

  const renderReading = () => (
    <View style={[styles.activityCard, { backgroundColor: theme.backgroundDefault }]}>
      <View style={[styles.activityTypeBadge, { backgroundColor: "#3B82F6" + "20" }]}>
        <Feather name="book-open" size={18} color="#3B82F6" />
        <ThemedText style={{ color: "#3B82F6", marginLeft: Spacing.xs }}>Reading</ThemedText>
      </View>
      
      <ThemedText type="headline" style={styles.activityTitle}>
        {currentActivity.title}
      </ThemedText>
      
      <ThemedText style={[styles.readingContent, { color: theme.text }]}>
        {currentActivity.content}
      </ThemedText>
      
      <Pressable
        onPress={() => {
          setReadingComplete(true);
          if (currentActivityIndex < activities.length - 1) {
            goToNextActivity();
          } else {
            setShowResults(true);
          }
        }}
        style={[styles.continueButton, { backgroundColor: subject.color }]}
      >
        <ThemedText style={styles.continueButtonText}>Continue</ThemedText>
        <Feather name="arrow-right" size={20} color="white" />
      </Pressable>
    </View>
  );

  const renderQuiz = () => {
    const questions = currentActivity.questions || [];
    const currentQuestion = questions[currentQuestionIndex];
    
    if (!currentQuestion) return null;
    
    return (
      <Animated.View style={cardAnimatedStyle}>
        <View style={[styles.activityCard, { backgroundColor: theme.backgroundDefault }]}>
          <View style={[styles.activityTypeBadge, { backgroundColor: "#10B981" + "20" }]}>
            <Feather name="help-circle" size={18} color="#10B981" />
            <ThemedText style={{ color: "#10B981", marginLeft: Spacing.xs }}>Quiz</ThemedText>
          </View>
          
          <View style={styles.questionProgress}>
            <ThemedText style={[styles.questionCounter, { color: theme.textSecondary }]}>
              Question {currentQuestionIndex + 1} of {questions.length}
            </ThemedText>
            <ProgressBar 
              progress={(currentQuestionIndex + 1) / questions.length}
              color={subject.color}
              style={styles.questionProgressBar}
            />
          </View>
          
          <ThemedText type="headline" style={styles.questionText}>
            {currentQuestion.question}
          </ThemedText>
          
          <View style={styles.optionsContainer}>
            {currentQuestion.options.map((option, index) => {
              const isSelected = selectedAnswer === index;
              const isCorrect = index === currentQuestion.correctAnswer;
              const showCorrect = hasAnswered && isCorrect;
              const showWrong = hasAnswered && isSelected && !isCorrect;
              
              return (
                <Pressable
                  key={index}
                  onPress={() => handleAnswerSelect(index)}
                  style={[
                    styles.optionButton,
                    {
                      backgroundColor: showCorrect 
                        ? "#10B981" + "20"
                        : showWrong
                          ? "#EF4444" + "20"
                          : isSelected
                            ? subject.color + "20"
                            : theme.backgroundSecondary,
                      borderColor: showCorrect
                        ? "#10B981"
                        : showWrong
                          ? "#EF4444"
                          : isSelected
                            ? subject.color
                            : "transparent",
                    },
                  ]}
                >
                  <View style={[
                    styles.optionCircle,
                    {
                      backgroundColor: showCorrect
                        ? "#10B981"
                        : showWrong
                          ? "#EF4444"
                          : isSelected
                            ? subject.color
                            : theme.backgroundDefault,
                      borderColor: showCorrect || showWrong || isSelected 
                        ? "transparent" 
                        : theme.border,
                    },
                  ]}>
                    {showCorrect ? (
                      <Feather name="check" size={14} color="white" />
                    ) : showWrong ? (
                      <Feather name="x" size={14} color="white" />
                    ) : isSelected ? (
                      <View style={styles.selectedDot} />
                    ) : null}
                  </View>
                  <ThemedText style={styles.optionText}>{option}</ThemedText>
                </Pressable>
              );
            })}
          </View>
          
          {hasAnswered ? (
            <View style={styles.feedbackSection}>
              <Animated.View style={successAnimatedStyle}>
                <View style={[
                  styles.feedbackBadge,
                  { backgroundColor: selectedAnswer === currentQuestion.correctAnswer ? "#10B981" : "#EF4444" }
                ]}>
                  <Feather 
                    name={selectedAnswer === currentQuestion.correctAnswer ? "check" : "x"} 
                    size={18} 
                    color="white" 
                  />
                  <ThemedText style={styles.feedbackText}>
                    {selectedAnswer === currentQuestion.correctAnswer ? "Correct!" : "Not quite"}
                  </ThemedText>
                </View>
              </Animated.View>
              
              <ThemedText style={[styles.explanationText, { color: theme.textSecondary }]}>
                {currentQuestion.explanation}
              </ThemedText>
              
              <Pressable
                onPress={goToNextQuestion}
                style={[styles.continueButton, { backgroundColor: subject.color }]}
              >
                <ThemedText style={styles.continueButtonText}>
                  {currentQuestionIndex < questions.length - 1 ? "Next Question" : "Continue"}
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
                  backgroundColor: selectedAnswer !== null ? subject.color : theme.backgroundSecondary,
                  opacity: selectedAnswer !== null ? 1 : 0.5,
                },
              ]}
              disabled={selectedAnswer === null}
            >
              <ThemedText style={[
                styles.checkButtonText,
                { color: selectedAnswer !== null ? "white" : theme.textSecondary }
              ]}>
                Check Answer
              </ThemedText>
            </Pressable>
          )}
        </View>
      </Animated.View>
    );
  };

  const renderVideo = () => (
    <View style={[styles.activityCard, { backgroundColor: theme.backgroundDefault }]}>
      <View style={[styles.activityTypeBadge, { backgroundColor: "#EF4444" + "20" }]}>
        <Feather name="play-circle" size={18} color="#EF4444" />
        <ThemedText style={{ color: "#EF4444", marginLeft: Spacing.xs }}>Video</ThemedText>
      </View>
      
      <ThemedText type="headline" style={styles.activityTitle}>
        {currentActivity.title}
      </ThemedText>
      
      <ThemedText style={[styles.videoDescription, { color: theme.textSecondary }]}>
        {currentActivity.content}
      </ThemedText>
      
      <Pressable
        onPress={() => currentActivity.videoUrl && openVideo(currentActivity.videoUrl)}
        style={[styles.videoButton, { backgroundColor: "#EF4444" + "15" }]}
      >
        <View style={[styles.playIcon, { backgroundColor: "#EF4444" }]}>
          <Feather name="play" size={24} color="white" />
        </View>
        <ThemedText style={{ color: "#EF4444" }}>Watch Video</ThemedText>
      </Pressable>
      
      <ThemedText style={[styles.videoNote, { color: theme.textSecondary }]}>
        (Opens in your browser - placeholder video for now)
      </ThemedText>
      
      <Pressable
        onPress={() => {
          if (currentActivityIndex < activities.length - 1) {
            goToNextActivity();
          } else {
            setShowResults(true);
          }
        }}
        style={[styles.continueButton, { backgroundColor: subject.color }]}
      >
        <ThemedText style={styles.continueButtonText}>Continue</ThemedText>
        <Feather name="arrow-right" size={20} color="white" />
      </Pressable>
    </View>
  );

  const renderResults = () => {
    const totalQuestions = activities
      .filter(a => a.type === "quiz")
      .reduce((sum, a) => sum + (a.questions?.length || 0), 0);
    const passed = correctAnswers >= Math.ceil(totalQuestions * 0.6);
    
    return (
      <View style={[styles.resultsCard, { backgroundColor: theme.backgroundDefault }]}>
        <View style={[
          styles.resultsIcon, 
          { backgroundColor: passed ? "#10B981" + "20" : "#F59E0B" + "20" }
        ]}>
          <Feather 
            name={passed ? "award" : "refresh-cw"} 
            size={48} 
            color={passed ? "#10B981" : "#F59E0B"} 
          />
        </View>
        
        <ThemedText type="title" style={styles.resultsTitle}>
          {passed 
            ? alreadyCompleted 
              ? "Great Review!" 
              : "Star Earned!"
            : "Keep Practicing!"
          }
        </ThemedText>
        
        <ThemedText style={[styles.resultsMessage, { color: theme.textSecondary }]}>
          {passed
            ? `You got ${correctAnswers} out of ${totalQuestions} questions correct!`
            : `You need ${Math.ceil(totalQuestions * 0.6)} correct answers to earn this star. Try again!`
          }
        </ThemedText>
        
        {passed && !alreadyCompleted ? (
          <View style={[styles.starEarned, { backgroundColor: "#F59E0B" + "20" }]}>
            <Feather name="star" size={32} color="#F59E0B" />
            <ThemedText style={[styles.starEarnedText, { color: "#F59E0B" }]}>
              Star {starNumber} Complete!
            </ThemedText>
          </View>
        ) : null}
        
        <Pressable
          onPress={handleComplete}
          style={[styles.doneButton, { backgroundColor: subject.color }]}
        >
          <ThemedText style={styles.doneButtonText}>
            {passed ? "Continue Learning" : "Try Again"}
          </ThemedText>
        </Pressable>
      </View>
    );
  };

  const renderCurrentActivity = () => {
    if (showResults) return renderResults();
    
    switch (currentActivity.type) {
      case "reading":
        return renderReading();
      case "quiz":
        return renderQuiz();
      case "video":
        return renderVideo();
      default:
        return null;
    }
  };

  return (
    <ScreenScrollView>
      <ThemedView style={styles.container}>
        <View style={[styles.header, { backgroundColor: subject.color + "15" }]}>
          <View style={styles.headerTop}>
            <View style={[styles.levelBadge, { backgroundColor: subject.color }]}>
              <ThemedText style={styles.levelBadgeText}>Level {level}</ThemedText>
            </View>
            <View style={styles.starBadge}>
              <Feather name="star" size={16} color="#F59E0B" />
              <ThemedText style={styles.starBadgeText}>Star {starNumber}</ThemedText>
            </View>
          </View>
          <ThemedText type="headline" style={{ color: subject.color }}>
            {subject.name}
          </ThemedText>
          <View style={styles.activityProgress}>
            <ThemedText style={[styles.activityProgressText, { color: theme.textSecondary }]}>
              Activity {currentActivityIndex + 1} of {activities.length}
            </ThemedText>
            <ProgressBar 
              progress={(currentActivityIndex + 1) / activities.length}
              color={subject.color}
              style={styles.activityProgressBar}
            />
          </View>
        </View>

        {renderCurrentActivity()}
      </ThemedView>
    </ScreenScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  header: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.lg,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: Spacing.sm,
  },
  levelBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  levelBadgeText: {
    color: "white",
    fontWeight: "600",
    fontSize: 13,
  },
  starBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F59E0B" + "20",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  starBadgeText: {
    color: "#F59E0B",
    fontWeight: "600",
    fontSize: 13,
    marginLeft: Spacing.xs,
  },
  activityProgress: {
    marginTop: Spacing.md,
  },
  activityProgressText: {
    fontSize: 13,
    marginBottom: Spacing.xs,
  },
  activityProgressBar: {
    height: 4,
    borderRadius: 2,
  },
  activityCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
  },
  activityTypeBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.md,
  },
  activityTitle: {
    marginBottom: Spacing.md,
  },
  readingContent: {
    fontSize: 16,
    lineHeight: 26,
    marginBottom: Spacing.xl,
  },
  continueButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  continueButtonText: {
    color: "white",
    fontWeight: "600",
    fontSize: 16,
  },
  questionProgress: {
    marginBottom: Spacing.md,
  },
  questionCounter: {
    fontSize: 13,
    marginBottom: Spacing.xs,
  },
  questionProgressBar: {
    height: 4,
    borderRadius: 2,
  },
  questionText: {
    marginBottom: Spacing.lg,
  },
  optionsContainer: {
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  optionButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 2,
  },
  optionCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  selectedDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "white",
  },
  optionText: {
    flex: 1,
    fontSize: 15,
  },
  checkButton: {
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  checkButtonText: {
    fontWeight: "600",
    fontSize: 16,
  },
  feedbackSection: {
    alignItems: "center",
  },
  feedbackBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
  },
  feedbackText: {
    color: "white",
    fontWeight: "600",
    marginLeft: Spacing.sm,
  },
  explanationText: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: Spacing.lg,
  },
  videoButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    gap: Spacing.md,
    marginVertical: Spacing.md,
  },
  playIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  videoDescription: {
    fontSize: 14,
    marginBottom: Spacing.md,
  },
  videoNote: {
    fontSize: 12,
    textAlign: "center",
    marginBottom: Spacing.lg,
  },
  resultsCard: {
    padding: Spacing.xl,
    borderRadius: BorderRadius.lg,
    alignItems: "center",
  },
  resultsIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.lg,
  },
  resultsTitle: {
    marginBottom: Spacing.sm,
    textAlign: "center",
  },
  resultsMessage: {
    fontSize: 15,
    textAlign: "center",
    marginBottom: Spacing.lg,
  },
  starEarned: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.lg,
  },
  starEarnedText: {
    fontWeight: "bold",
    fontSize: 18,
    marginLeft: Spacing.sm,
  },
  doneButton: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    minWidth: 200,
    alignItems: "center",
  },
  doneButtonText: {
    color: "white",
    fontWeight: "600",
    fontSize: 16,
  },
});
