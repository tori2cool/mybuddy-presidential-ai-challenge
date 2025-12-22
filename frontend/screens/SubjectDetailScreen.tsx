import { useState } from "react";
import { View, StyleSheet, Pressable, FlatList } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
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
  getSubjectById, 
  STARS_PER_LEVEL,
  TOTAL_SCHOOL_LEVELS,
  getLevelTier,
} from "@/constants/schoolData";

type RootStackParamList = {
  SchoolDashboard: undefined;
  SubjectDetail: { subjectId: string };
  LevelActivity: { subjectId: string; level: number; starNumber: number };
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type SubjectDetailRouteProp = RouteProp<RootStackParamList, "SubjectDetail">;

export default function SubjectDetailScreen() {
  const { theme } = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<SubjectDetailRouteProp>();
  const { getSubjectProgress, getSubjectLevelProgress, isStarCompleted } = useSchool();
  
  const { subjectId } = route.params;
  const subject = getSubjectById(subjectId);
  const subjectProgress = getSubjectProgress(subjectId);
  
  const [selectedLevel, setSelectedLevel] = useState(subjectProgress.currentLevel);
  
  if (!subject) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText>Subject not found</ThemedText>
      </ThemedView>
    );
  }

  const levelProgress = getSubjectLevelProgress(subjectId, selectedLevel);
  const levelTier = getLevelTier(selectedLevel);
  
  const levels = Array.from({ length: TOTAL_SCHOOL_LEVELS }, (_, i) => i + 1);
  
  const stars = Array.from({ length: STARS_PER_LEVEL }, (_, i) => i + 1);

  const navigateToActivity = (starNumber: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    navigation.navigate("LevelActivity", { 
      subjectId, 
      level: selectedLevel, 
      starNumber 
    });
  };

  const isLevelUnlocked = (level: number) => {
    if (level === 1) return true;
    const prevLevelProgress = getSubjectLevelProgress(subjectId, level - 1);
    return prevLevelProgress.starsEarned >= STARS_PER_LEVEL;
  };

  const isStarUnlocked = (starNumber: number) => {
    if (starNumber === 1) return isLevelUnlocked(selectedLevel);
    return isStarCompleted(subjectId, selectedLevel, starNumber - 1);
  };

  const renderLevelItem = ({ item: level }: { item: number }) => {
    const isUnlocked = isLevelUnlocked(level);
    const isSelected = level === selectedLevel;
    const levelProg = getSubjectLevelProgress(subjectId, level);
    const isComplete = levelProg.starsEarned >= STARS_PER_LEVEL;
    
    return (
      <Pressable
        onPress={() => {
          if (isUnlocked) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setSelectedLevel(level);
          }
        }}
        style={[
          styles.levelItem,
          { 
            backgroundColor: isSelected 
              ? subject.color 
              : isUnlocked 
                ? subject.color + "20" 
                : theme.backgroundSecondary,
            opacity: isUnlocked ? 1 : 0.5,
          },
        ]}
      >
        {isComplete ? (
          <Feather name="check-circle" size={16} color={isSelected ? "white" : subject.color} />
        ) : !isUnlocked ? (
          <Feather name="lock" size={16} color={theme.textSecondary} />
        ) : null}
        <ThemedText 
          style={[
            styles.levelNumber, 
            { color: isSelected ? "white" : isUnlocked ? subject.color : theme.textSecondary }
          ]}
        >
          {level}
        </ThemedText>
      </Pressable>
    );
  };

  const renderStarItem = (starNumber: number) => {
    const isCompleted = isStarCompleted(subjectId, selectedLevel, starNumber);
    const isUnlocked = isStarUnlocked(starNumber);
    
    return (
      <Pressable
        key={starNumber}
        onPress={() => {
          if (isUnlocked && !isCompleted) {
            navigateToActivity(starNumber);
          } else if (isCompleted) {
            navigateToActivity(starNumber);
          }
        }}
        style={[
          styles.starItem,
          {
            backgroundColor: isCompleted 
              ? "#F59E0B" + "30"
              : isUnlocked 
                ? subject.color + "15" 
                : theme.backgroundSecondary,
            borderColor: isCompleted 
              ? "#F59E0B" 
              : isUnlocked 
                ? subject.color + "50" 
                : "transparent",
            opacity: isUnlocked ? 1 : 0.5,
          },
        ]}
      >
        <Feather 
          name={isCompleted ? "star" : isUnlocked ? "star" : "lock"} 
          size={20} 
          color={isCompleted ? "#F59E0B" : isUnlocked ? subject.color : theme.textSecondary} 
        />
        <ThemedText 
          style={[
            styles.starNumber,
            { color: isCompleted ? "#F59E0B" : isUnlocked ? theme.text : theme.textSecondary }
          ]}
        >
          {starNumber}
        </ThemedText>
      </Pressable>
    );
  };

  return (
    <ScreenScrollView>
      <ThemedView style={styles.container}>
        <View style={[styles.headerCard, { backgroundColor: subject.color + "15" }]}>
          <View style={[styles.subjectIcon, { backgroundColor: subject.color + "30" }]}>
            <Feather name={subject.icon as any} size={32} color={subject.color} />
          </View>
          <View style={styles.headerInfo}>
            <ThemedText type="title" style={{ color: subject.color }}>
              {subject.name}
            </ThemedText>
            <ThemedText style={[styles.description, { color: theme.textSecondary }]}>
              {subject.description}
            </ThemedText>
          </View>
        </View>

        <View style={[styles.progressCard, { backgroundColor: theme.backgroundDefault }]}>
          <View style={styles.progressRow}>
            <View style={styles.progressStat}>
              <ThemedText style={[styles.statValue, { color: subject.color }]}>
                {subjectProgress.currentLevel}
              </ThemedText>
              <ThemedText style={[styles.statLabel, { color: theme.textSecondary }]}>
                Current Level
              </ThemedText>
            </View>
            <View style={[styles.divider, { backgroundColor: theme.border }]} />
            <View style={styles.progressStat}>
              <ThemedText style={[styles.statValue, { color: "#F59E0B" }]}>
                {subjectProgress.totalStarsEarned}
              </ThemedText>
              <ThemedText style={[styles.statLabel, { color: theme.textSecondary }]}>
                Total Stars
              </ThemedText>
            </View>
            <View style={[styles.divider, { backgroundColor: theme.border }]} />
            <View style={styles.progressStat}>
              <ThemedText style={[styles.statValue, { color: "#10B981" }]}>
                {Math.round((subjectProgress.totalStarsEarned / (STARS_PER_LEVEL * TOTAL_SCHOOL_LEVELS)) * 100)}%
              </ThemedText>
              <ThemedText style={[styles.statLabel, { color: theme.textSecondary }]}>
                Complete
              </ThemedText>
            </View>
          </View>
        </View>

        <ThemedText type="headline" style={styles.sectionTitle}>
          Select Level
        </ThemedText>
        
        <FlatList
          data={levels}
          renderItem={renderLevelItem}
          keyExtractor={(item) => item.toString()}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.levelsList}
        />

        <View style={[styles.levelInfoCard, { backgroundColor: subject.color + "10" }]}>
          <ThemedText type="headline" style={{ color: subject.color }}>
            Level {selectedLevel}
          </ThemedText>
          <ThemedText style={[styles.levelTierName, { color: theme.textSecondary }]}>
            {levelTier.name} - {levelTier.gradeEquivalent}
          </ThemedText>
          <View style={styles.levelProgressRow}>
            <ThemedText style={[styles.levelProgressText, { color: theme.textSecondary }]}>
              {levelProgress.starsEarned}/{STARS_PER_LEVEL} stars earned
            </ThemedText>
            <ProgressBar 
              progress={levelProgress.progress} 
              color={subject.color}
              style={styles.levelProgressBar}
            />
          </View>
        </View>

        <ThemedText type="headline" style={styles.sectionTitle}>
          Stars in Level {selectedLevel}
        </ThemedText>
        <ThemedText style={[styles.starsSubtitle, { color: theme.textSecondary }]}>
          Earn all 50 stars to unlock the next level
        </ThemedText>

        <View style={styles.starsGrid}>
          {stars.map(renderStarItem)}
        </View>

        {subject.subtopics.length > 0 ? (
          <>
            <ThemedText type="headline" style={styles.sectionTitle}>
              Topics Covered
            </ThemedText>
            <View style={styles.topicsList}>
              {subject.subtopics.map((topic) => (
                <View 
                  key={topic.id} 
                  style={[styles.topicItem, { backgroundColor: theme.backgroundDefault }]}
                >
                  <Feather name={topic.icon as any} size={18} color={subject.color} />
                  <View style={styles.topicInfo}>
                    <ThemedText style={{ fontWeight: "600" }}>{topic.name}</ThemedText>
                    <ThemedText style={[styles.topicDesc, { color: theme.textSecondary }]}>
                      {topic.description}
                    </ThemedText>
                  </View>
                </View>
              ))}
            </View>
          </>
        ) : null}
      </ThemedView>
    </ScreenScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.lg,
  },
  headerCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.lg,
  },
  subjectIcon: {
    width: 64,
    height: 64,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  headerInfo: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  description: {
    fontSize: 14,
    marginTop: Spacing.xs,
  },
  progressCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.lg,
  },
  progressRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
  },
  progressStat: {
    alignItems: "center",
  },
  statValue: {
    fontSize: 24,
    fontWeight: "bold",
  },
  statLabel: {
    fontSize: 12,
    marginTop: Spacing.xs,
  },
  divider: {
    width: 1,
    height: 40,
  },
  sectionTitle: {
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  levelsList: {
    paddingVertical: Spacing.sm,
  },
  levelItem: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.sm,
  },
  levelNumber: {
    fontSize: 14,
    fontWeight: "600",
  },
  levelInfoCard: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.md,
    marginBottom: Spacing.lg,
  },
  levelTierName: {
    fontSize: 13,
    marginTop: Spacing.xs,
  },
  levelProgressRow: {
    marginTop: Spacing.sm,
  },
  levelProgressText: {
    fontSize: 13,
    marginBottom: Spacing.xs,
  },
  levelProgressBar: {
    height: 6,
    borderRadius: 3,
  },
  starsSubtitle: {
    fontSize: 13,
    marginBottom: Spacing.md,
  },
  starsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  starItem: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  starNumber: {
    fontSize: 12,
    marginTop: 2,
  },
  topicsList: {
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  topicItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  topicInfo: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  topicDesc: {
    fontSize: 12,
    marginTop: 2,
  },
});
