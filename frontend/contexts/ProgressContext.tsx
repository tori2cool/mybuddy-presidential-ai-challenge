import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { 
  GradeLevel, 
  SubjectId as CurriculumSubjectId, 
  GRADE_ORDER, 
  LEVELS_PER_GRADE, 
  GRADES,
  getLevelFromPoints,
  getRankForLevel,
  getXpForNextLevel,
  SUBJECTS
} from "@/constants/curriculum";

const STORAGE_KEY = "@mybuddy_progress";
const AFFIRMATIONS_STORAGE_KEY = "@mybuddy_affirmations";

export type DifficultyTier = "easy" | "medium" | "hard";
export type SubjectId = CurriculumSubjectId;

const SUBJECT_IDS: SubjectId[] = Object.keys(SUBJECTS) as SubjectId[];

const DIFFICULTY_THRESHOLDS = {
  easy: 0,
  medium: 20,
  hard: 40,
};

interface DailyStats {
  date: string;
  flashcardsCompleted: number;
  flashcardsCorrect: number;
  choresCompleted: number;
  outdoorActivities: number;
  affirmationsViewed: number;
  totalPoints: number;
}

interface WeeklyStats {
  weekStart: string;
  totalPoints: number;
  daysActive: number;
  flashcardsCompleted: number;
  choresCompleted: number;
  outdoorActivities: number;
}

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlockedAt: string | null;
  type: "daily" | "weekly" | "monthly" | "special";
}

interface SubjectStats {
  completed: number;
  correct: number;
  difficulty: DifficultyTier;
  recentResults: boolean[];
  currentGrade: GradeLevel;
  currentLevel: number;
}

interface GraduationRequirements {
  flashcardsXp: number;
  choresCompleted: number;
  outdoorCompleted: number;
  affirmationsViewed: number;
}

interface ProgressData {
  totalPoints: number;
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string | null;
  dailyStats: DailyStats[];
  weeklyStats: WeeklyStats[];
  achievements: Achievement[];
  flashcardsBySubject: Record<SubjectId, SubjectStats>;
  totalChoresCompleted: number;
  totalOutdoorActivities: number;
  totalAffirmationsViewed: number;
  completedChoreIds: string[];
  completedOutdoorIds: string[];
  currentGrade: GradeLevel;
  currentLevel: number;
  flashcardsXp: number;
}

const defaultSubjectStats: SubjectStats = {
  completed: 0,
  correct: 0,
  difficulty: "easy",
  recentResults: [],
  currentGrade: "preK",
  currentLevel: 1,
};

const defaultProgress: ProgressData = {
  totalPoints: 0,
  currentStreak: 0,
  longestStreak: 0,
  lastActiveDate: null,
  dailyStats: [],
  weeklyStats: [],
  achievements: [
    { id: "first_flashcard", title: "Brain Starter", description: "Complete your first flashcard", icon: "zap", unlockedAt: null, type: "special" },
    { id: "first_chore", title: "Helper Bee", description: "Complete your first chore", icon: "check-circle", unlockedAt: null, type: "special" },
    { id: "first_outdoor", title: "Nature Explorer", description: "Complete your first outdoor activity", icon: "sun", unlockedAt: null, type: "special" },
    { id: "streak_3", title: "On Fire!", description: "Keep a 3-day streak", icon: "flame", unlockedAt: null, type: "daily" },
    { id: "streak_7", title: "Super Star", description: "Keep a 7-day streak", icon: "star", unlockedAt: null, type: "weekly" },
    { id: "streak_30", title: "Champion", description: "Keep a 30-day streak", icon: "award", unlockedAt: null, type: "monthly" },
    { id: "points_100", title: "Rising Star", description: "Earn 100 points", icon: "trending-up", unlockedAt: null, type: "daily" },
    { id: "points_500", title: "Superstar", description: "Earn 500 points", icon: "star", unlockedAt: null, type: "weekly" },
    { id: "points_2000", title: "Legend", description: "Earn 2000 points", icon: "award", unlockedAt: null, type: "monthly" },
    { id: "flashcards_10", title: "Quick Learner", description: "Complete 10 flashcards", icon: "book", unlockedAt: null, type: "daily" },
    { id: "flashcards_50", title: "Knowledge Seeker", description: "Complete 50 flashcards", icon: "book-open", unlockedAt: null, type: "weekly" },
    { id: "chores_7", title: "Tidy Champion", description: "Complete 7 chores", icon: "home", unlockedAt: null, type: "weekly" },
    { id: "outdoor_5", title: "Adventure Kid", description: "Complete 5 outdoor activities", icon: "compass", unlockedAt: null, type: "weekly" },
    { id: "perfect_day", title: "Perfect Day", description: "Complete activities in all categories in one day", icon: "sun", unlockedAt: null, type: "daily" },
    { id: "level_10", title: "First Rank Complete", description: "Reach Level 10", icon: "award", unlockedAt: null, type: "special" },
    { id: "grade_k", title: "Kindergarten Ready", description: "Graduate Pre-K", icon: "star", unlockedAt: null, type: "special" },
    { id: "balanced_learner", title: "Balanced Learner", description: "Study all 10 subjects", icon: "target", unlockedAt: null, type: "special" },
  ],
  flashcardsBySubject: Object.fromEntries(
    SUBJECT_IDS.map(id => [id, { ...defaultSubjectStats }])
  ) as Record<SubjectId, SubjectStats>,
  totalChoresCompleted: 0,
  totalOutdoorActivities: 0,
  totalAffirmationsViewed: 0,
  completedChoreIds: [],
  completedOutdoorIds: [],
  currentGrade: "preK",
  currentLevel: 1,
  flashcardsXp: 0,
};

interface LevelInfo {
  globalLevel: number;
  grade: GradeLevel;
  gradeLevel: number;
  rank: string;
  gradeInfo: typeof GRADES[GradeLevel];
  xpProgress: { current: number; required: number; progress: number };
}

interface GraduationProgress {
  canGraduate: boolean;
  requirements: {
    flashcards: { current: number; required: number; met: boolean };
    chores: { current: number; required: number; met: boolean };
    outdoor: { current: number; required: number; met: boolean };
    affirmations: { current: number; required: number; met: boolean };
  };
  overallProgress: number;
}

interface ProgressContextType {
  progress: ProgressData;
  isLoading: boolean;
  addflashcardResult: (subject: SubjectId, correct: boolean) => void;
  addChoreCompleted: (choreId?: string) => void;
  addOutdoorActivity: (activityId?: string) => void;
  addAffirmationViewed: () => void;
  getTodayStats: () => DailyStats | null;
  getThisWeekStats: () => WeeklyStats | null;
  getNewAchievements: () => Achievement[];
  getSubjectDifficulty: (subject: SubjectId) => DifficultyTier;
  getLevelInfo: () => LevelInfo;
  getGraduationProgress: () => GraduationProgress;
  isChoreCompleted: (choreId: string) => boolean;
  isOutdoorCompleted: (activityId: string) => boolean;
  toggleChore: (choreId: string, points: number) => void;
  toggleOutdoor: (activityId: string, points: number) => void;
  resetProgress: () => void;
  customAffirmations: string[];
  addCustomAffirmation: (text: string) => void;
  removeCustomAffirmation: (index: number) => void;
}

const ProgressContext = createContext<ProgressContextType | null>(null);

export function useProgress() {
  const context = useContext(ProgressContext);
  if (!context) {
    throw new Error("useProgress must be used within a ProgressProvider");
  }
  return context;
}

function getToday(): string {
  return new Date().toISOString().split("T")[0];
}

function getWeekStart(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day;
  const weekStart = new Date(now.setDate(diff));
  return weekStart.toISOString().split("T")[0];
}

function isYesterday(dateStr: string): boolean {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return dateStr === yesterday.toISOString().split("T")[0];
}

function calculateDifficulty(correct: number): DifficultyTier {
  if (correct >= DIFFICULTY_THRESHOLDS.hard) {
    return "hard";
  } else if (correct >= DIFFICULTY_THRESHOLDS.medium) {
    return "medium";
  }
  return "easy";
}

interface ProgressProviderProps {
  children: ReactNode;
}

export function ProgressProvider({ children }: ProgressProviderProps) {
  const [progress, setProgress] = useState<ProgressData>(defaultProgress);
  const [isLoading, setIsLoading] = useState(true);
  const [newAchievements, setNewAchievements] = useState<Achievement[]>([]);
  const [customAffirmations, setCustomAffirmations] = useState<string[]>([]);

  useEffect(() => {
    loadProgress();
    loadCustomAffirmations();
  }, []);

  const loadProgress = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        const merged = { ...defaultProgress, ...parsed };
        
        if (!merged.achievements || merged.achievements.length < defaultProgress.achievements.length) {
          merged.achievements = defaultProgress.achievements.map(defaultAch => {
            const existing = parsed.achievements?.find((a: Achievement) => a.id === defaultAch.id);
            return existing || defaultAch;
          });
        }
        
        if (!merged.flashcardsBySubject) {
          merged.flashcardsBySubject = defaultProgress.flashcardsBySubject;
        }
        
        SUBJECT_IDS.forEach(subject => {
          if (!merged.flashcardsBySubject[subject]) {
            merged.flashcardsBySubject[subject] = { ...defaultSubjectStats };
          } else {
            const existing = merged.flashcardsBySubject[subject];
            merged.flashcardsBySubject[subject] = {
              completed: existing.completed || 0,
              correct: existing.correct || 0,
              difficulty: existing.difficulty || calculateDifficulty(existing.correct || 0),
              recentResults: existing.recentResults || [],
              currentGrade: existing.currentGrade || "preK",
              currentLevel: existing.currentLevel || 1,
            };
          }
        });
        
        if (!merged.completedChoreIds) merged.completedChoreIds = [];
        if (!merged.completedOutdoorIds) merged.completedOutdoorIds = [];
        if (!merged.flashcardsXp) merged.flashcardsXp = 0;
        if (!merged.currentGrade) merged.currentGrade = "preK";
        if (!merged.currentLevel) merged.currentLevel = 1;
        
        setProgress(merged);
      }
    } catch (error) {
      console.error("Failed to load progress:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadCustomAffirmations = async () => {
    try {
      const stored = await AsyncStorage.getItem(AFFIRMATIONS_STORAGE_KEY);
      if (stored) {
        setCustomAffirmations(JSON.parse(stored));
      }
    } catch (error) {
      console.error("Failed to load custom affirmations:", error);
    }
  };

  const saveProgress = useCallback(async (newProgress: ProgressData) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newProgress));
    } catch (error) {
      console.error("Failed to save progress:", error);
    }
  }, []);

  const saveCustomAffirmations = useCallback(async (affirmations: string[]) => {
    try {
      await AsyncStorage.setItem(AFFIRMATIONS_STORAGE_KEY, JSON.stringify(affirmations));
    } catch (error) {
      console.error("Failed to save custom affirmations:", error);
    }
  }, []);

  const addCustomAffirmation = useCallback((text: string) => {
    setCustomAffirmations(prev => {
      const updated = [...prev, text];
      saveCustomAffirmations(updated);
      return updated;
    });
  }, [saveCustomAffirmations]);

  const removeCustomAffirmation = useCallback((index: number) => {
    setCustomAffirmations(prev => {
      const updated = prev.filter((_, i) => i !== index);
      saveCustomAffirmations(updated);
      return updated;
    });
  }, [saveCustomAffirmations]);

  const updateStreak = useCallback((currentProgress: ProgressData): ProgressData => {
    const today = getToday();
    const lastActive = currentProgress.lastActiveDate;

    let newStreak = currentProgress.currentStreak;

    if (lastActive === today) {
      return currentProgress;
    } else if (lastActive && isYesterday(lastActive)) {
      newStreak = currentProgress.currentStreak + 1;
    } else if (lastActive !== today) {
      newStreak = 1;
    }

    return {
      ...currentProgress,
      currentStreak: newStreak,
      longestStreak: Math.max(newStreak, currentProgress.longestStreak),
      lastActiveDate: today,
    };
  }, []);

  const updateDailyStats = useCallback((currentProgress: ProgressData, update: Partial<DailyStats>): ProgressData => {
    const today = getToday();
    const existingIndex = currentProgress.dailyStats.findIndex(s => s.date === today);
    
    let dailyStats = [...currentProgress.dailyStats];
    
    if (existingIndex >= 0) {
      const existing = dailyStats[existingIndex];
      dailyStats[existingIndex] = {
        ...existing,
        flashcardsCompleted: existing.flashcardsCompleted + (update.flashcardsCompleted || 0),
        flashcardsCorrect: existing.flashcardsCorrect + (update.flashcardsCorrect || 0),
        choresCompleted: existing.choresCompleted + (update.choresCompleted || 0),
        outdoorActivities: existing.outdoorActivities + (update.outdoorActivities || 0),
        affirmationsViewed: existing.affirmationsViewed + (update.affirmationsViewed || 0),
        totalPoints: existing.totalPoints + (update.totalPoints || 0),
      };
    } else {
      dailyStats.push({
        date: today,
        flashcardsCompleted: update.flashcardsCompleted || 0,
        flashcardsCorrect: update.flashcardsCorrect || 0,
        choresCompleted: update.choresCompleted || 0,
        outdoorActivities: update.outdoorActivities || 0,
        affirmationsViewed: update.affirmationsViewed || 0,
        totalPoints: update.totalPoints || 0,
      });
    }

    if (dailyStats.length > 90) {
      dailyStats = dailyStats.slice(-90);
    }

    return { ...currentProgress, dailyStats };
  }, []);

  const updateWeeklyStats = useCallback((currentProgress: ProgressData, points: number): ProgressData => {
    const weekStart = getWeekStart();
    const existingIndex = currentProgress.weeklyStats.findIndex(s => s.weekStart === weekStart);
    
    let weeklyStats = [...currentProgress.weeklyStats];
    const today = getToday();
    
    if (existingIndex >= 0) {
      const existing = weeklyStats[existingIndex];
      const isNewDay = !currentProgress.dailyStats.some(s => s.date === today && s.totalPoints > 0);
      
      weeklyStats[existingIndex] = {
        ...existing,
        totalPoints: existing.totalPoints + points,
        daysActive: isNewDay ? existing.daysActive + 1 : existing.daysActive,
        flashcardsCompleted: currentProgress.dailyStats
          .filter(s => s.date >= weekStart)
          .reduce((acc, s) => acc + s.flashcardsCompleted, 0),
        choresCompleted: currentProgress.dailyStats
          .filter(s => s.date >= weekStart)
          .reduce((acc, s) => acc + s.choresCompleted, 0),
        outdoorActivities: currentProgress.dailyStats
          .filter(s => s.date >= weekStart)
          .reduce((acc, s) => acc + s.outdoorActivities, 0),
      };
    } else {
      weeklyStats.push({
        weekStart,
        totalPoints: points,
        daysActive: 1,
        flashcardsCompleted: 0,
        choresCompleted: 0,
        outdoorActivities: 0,
      });
    }

    if (weeklyStats.length > 12) {
      weeklyStats = weeklyStats.slice(-12);
    }

    return { ...currentProgress, weeklyStats };
  }, []);

  const updateLevelFromXp = useCallback((currentProgress: ProgressData): ProgressData => {
    const levelInfo = getLevelFromPoints(currentProgress.flashcardsXp);
    return {
      ...currentProgress,
      currentGrade: levelInfo.grade,
      currentLevel: levelInfo.level,
    };
  }, []);

  const checkAchievements = useCallback((currentProgress: ProgressData): ProgressData => {
    const achievements = [...currentProgress.achievements];
    const today = getToday();
    const todayStats = currentProgress.dailyStats.find(s => s.date === today);
    const newlyUnlocked: Achievement[] = [];

    const checkAndUnlock = (id: string, condition: boolean) => {
      const achievement = achievements.find(a => a.id === id);
      if (achievement && !achievement.unlockedAt && condition) {
        achievement.unlockedAt = new Date().toISOString();
        newlyUnlocked.push(achievement);
      }
    };

    const totalflashcards = Object.values(currentProgress.flashcardsBySubject)
      .reduce((acc, s) => acc + s.completed, 0);

    checkAndUnlock("first_flashcard", totalflashcards >= 1);
    checkAndUnlock("first_chore", currentProgress.totalChoresCompleted >= 1);
    checkAndUnlock("first_outdoor", currentProgress.totalOutdoorActivities >= 1);
    checkAndUnlock("streak_3", currentProgress.currentStreak >= 3);
    checkAndUnlock("streak_7", currentProgress.currentStreak >= 7);
    checkAndUnlock("streak_30", currentProgress.currentStreak >= 30);
    checkAndUnlock("points_100", currentProgress.totalPoints >= 100);
    checkAndUnlock("points_500", currentProgress.totalPoints >= 500);
    checkAndUnlock("points_2000", currentProgress.totalPoints >= 2000);
    checkAndUnlock("flashcards_10", totalflashcards >= 10);
    checkAndUnlock("flashcards_50", totalflashcards >= 50);
    checkAndUnlock("chores_7", currentProgress.totalChoresCompleted >= 7);
    checkAndUnlock("outdoor_5", currentProgress.totalOutdoorActivities >= 5);
    
    if (todayStats) {
      checkAndUnlock("perfect_day", 
        todayStats.flashcardsCompleted > 0 && 
        todayStats.choresCompleted > 0 && 
        todayStats.outdoorActivities > 0
      );
    }

    const levelInfo = getLevelFromPoints(currentProgress.flashcardsXp);
    checkAndUnlock("level_10", levelInfo.globalLevel >= 10);
    checkAndUnlock("grade_k", GRADE_ORDER.indexOf(levelInfo.grade) >= 1);
    
    const subjectsStudied = SUBJECT_IDS.filter(s => currentProgress.flashcardsBySubject[s]?.completed > 0).length;
    checkAndUnlock("balanced_learner", subjectsStudied >= 10);

    if (newlyUnlocked.length > 0) {
      setNewAchievements(prev => [...prev, ...newlyUnlocked]);
    }

    return { ...currentProgress, achievements };
  }, []);

  const addflashcardResult = useCallback((subject: SubjectId, correct: boolean) => {
    setProgress(prev => {
      const points = correct ? 10 : 2;
      let updated = updateStreak(prev);
      
      const subjectStats = updated.flashcardsBySubject[subject] || { ...defaultSubjectStats };
      const newCorrect = subjectStats.correct + (correct ? 1 : 0);
      
      let recentResults = [...(subjectStats.recentResults || []), correct];
      if (recentResults.length > 10) {
        recentResults = recentResults.slice(-10);
      }
      
      const newDifficulty = calculateDifficulty(newCorrect);
      
      updated = {
        ...updated,
        totalPoints: updated.totalPoints + points,
        flashcardsXp: updated.flashcardsXp + points,
        flashcardsBySubject: {
          ...updated.flashcardsBySubject,
          [subject]: {
            completed: subjectStats.completed + 1,
            correct: newCorrect,
            difficulty: newDifficulty,
            recentResults,
            currentGrade: subjectStats.currentGrade,
            currentLevel: subjectStats.currentLevel,
          },
        },
      };

      updated = updateLevelFromXp(updated);

      updated = updateDailyStats(updated, {
        flashcardsCompleted: 1,
        flashcardsCorrect: correct ? 1 : 0,
        totalPoints: points,
      });

      updated = updateWeeklyStats(updated, points);
      updated = checkAchievements(updated);
      
      saveProgress(updated);
      return updated;
    });
  }, [updateStreak, updateDailyStats, updateWeeklyStats, updateLevelFromXp, checkAchievements, saveProgress]);

  const addChoreCompleted = useCallback((choreId?: string) => {
    setProgress(prev => {
      const points = 15;
      let updated = updateStreak(prev);
      
      updated = {
        ...updated,
        totalPoints: updated.totalPoints + points,
        totalChoresCompleted: updated.totalChoresCompleted + 1,
      };

      updated = updateDailyStats(updated, {
        choresCompleted: 1,
        totalPoints: points,
      });

      updated = updateWeeklyStats(updated, points);
      updated = checkAchievements(updated);
      
      saveProgress(updated);
      return updated;
    });
  }, [updateStreak, updateDailyStats, updateWeeklyStats, checkAchievements, saveProgress]);

  const addOutdoorActivity = useCallback((activityId?: string) => {
    setProgress(prev => {
      const points = 20;
      let updated = updateStreak(prev);
      
      updated = {
        ...updated,
        totalPoints: updated.totalPoints + points,
        totalOutdoorActivities: updated.totalOutdoorActivities + 1,
      };

      updated = updateDailyStats(updated, {
        outdoorActivities: 1,
        totalPoints: points,
      });

      updated = updateWeeklyStats(updated, points);
      updated = checkAchievements(updated);
      
      saveProgress(updated);
      return updated;
    });
  }, [updateStreak, updateDailyStats, updateWeeklyStats, checkAchievements, saveProgress]);

  const toggleChore = useCallback((choreId: string, points: number) => {
    setProgress(prev => {
      const isCompleted = prev.completedChoreIds.includes(choreId);
      let updated = { ...prev };
      
      if (isCompleted) {
        updated.completedChoreIds = prev.completedChoreIds.filter(id => id !== choreId);
        updated.totalPoints = Math.max(0, prev.totalPoints - points);
        updated.totalChoresCompleted = Math.max(0, prev.totalChoresCompleted - 1);
      } else {
        updated = updateStreak(prev);
        updated.completedChoreIds = [...prev.completedChoreIds, choreId];
        updated.totalPoints = prev.totalPoints + points;
        updated.totalChoresCompleted = prev.totalChoresCompleted + 1;
        
        updated = updateDailyStats(updated, {
          choresCompleted: 1,
          totalPoints: points,
        });
        updated = updateWeeklyStats(updated, points);
        updated = checkAchievements(updated);
      }
      
      saveProgress(updated);
      return updated;
    });
  }, [updateStreak, updateDailyStats, updateWeeklyStats, checkAchievements, saveProgress]);

  const toggleOutdoor = useCallback((activityId: string, points: number) => {
    setProgress(prev => {
      const isCompleted = prev.completedOutdoorIds.includes(activityId);
      let updated = { ...prev };
      
      if (isCompleted) {
        updated.completedOutdoorIds = prev.completedOutdoorIds.filter(id => id !== activityId);
        updated.totalPoints = Math.max(0, prev.totalPoints - points);
        updated.totalOutdoorActivities = Math.max(0, prev.totalOutdoorActivities - 1);
      } else {
        updated = updateStreak(prev);
        updated.completedOutdoorIds = [...prev.completedOutdoorIds, activityId];
        updated.totalPoints = prev.totalPoints + points;
        updated.totalOutdoorActivities = prev.totalOutdoorActivities + 1;
        
        updated = updateDailyStats(updated, {
          outdoorActivities: 1,
          totalPoints: points,
        });
        updated = updateWeeklyStats(updated, points);
        updated = checkAchievements(updated);
      }
      
      saveProgress(updated);
      return updated;
    });
  }, [updateStreak, updateDailyStats, updateWeeklyStats, checkAchievements, saveProgress]);

  const isChoreCompleted = useCallback((choreId: string): boolean => {
    return progress.completedChoreIds.includes(choreId);
  }, [progress.completedChoreIds]);

  const isOutdoorCompleted = useCallback((activityId: string): boolean => {
    return progress.completedOutdoorIds.includes(activityId);
  }, [progress.completedOutdoorIds]);

  const addAffirmationViewed = useCallback(() => {
    setProgress(prev => {
      const points = 5;
      let updated = updateStreak(prev);
      
      updated = {
        ...updated,
        totalPoints: updated.totalPoints + points,
        totalAffirmationsViewed: updated.totalAffirmationsViewed + 1,
      };

      updated = updateDailyStats(updated, {
        affirmationsViewed: 1,
        totalPoints: points,
      });

      updated = updateWeeklyStats(updated, points);
      updated = checkAchievements(updated);
      
      saveProgress(updated);
      return updated;
    });
  }, [updateStreak, updateDailyStats, updateWeeklyStats, checkAchievements, saveProgress]);

  const getTodayStats = useCallback((): DailyStats | null => {
    const today = getToday();
    return progress.dailyStats.find(s => s.date === today) || null;
  }, [progress.dailyStats]);

  const getThisWeekStats = useCallback((): WeeklyStats | null => {
    const weekStart = getWeekStart();
    return progress.weeklyStats.find(s => s.weekStart === weekStart) || null;
  }, [progress.weeklyStats]);

  const getNewAchievements = useCallback((): Achievement[] => {
    const achievements = [...newAchievements];
    setNewAchievements([]);
    return achievements;
  }, [newAchievements]);

  const getSubjectDifficulty = useCallback((subject: SubjectId): DifficultyTier => {
    return progress.flashcardsBySubject[subject]?.difficulty || "easy";
  }, [progress.flashcardsBySubject]);

  const getLevelInfo = useCallback((): LevelInfo => {
    const { grade, level, globalLevel } = getLevelFromPoints(progress.flashcardsXp);
    const gradeInfo = GRADES[grade];
    const rank = getRankForLevel(grade, level);
    const xpProgress = getXpForNextLevel(progress.flashcardsXp);
    
    return {
      globalLevel,
      grade,
      gradeLevel: level,
      rank,
      gradeInfo,
      xpProgress,
    };
  }, [progress.flashcardsXp]);

  const getGraduationProgress = useCallback((): GraduationProgress => {
    const levelInfo = getLevelInfo();
    const gradeIndex = GRADE_ORDER.indexOf(levelInfo.grade);
    
    const baseRequirements = {
      flashcards: (gradeIndex + 1) * 100,
      chores: (gradeIndex + 1) * 10,
      outdoor: (gradeIndex + 1) * 5,
      affirmations: (gradeIndex + 1) * 20,
    };
    
    const requirements = {
      flashcards: {
        current: progress.flashcardsXp,
        required: baseRequirements.flashcards,
        met: progress.flashcardsXp >= baseRequirements.flashcards,
      },
      chores: {
        current: progress.totalChoresCompleted,
        required: baseRequirements.chores,
        met: progress.totalChoresCompleted >= baseRequirements.chores,
      },
      outdoor: {
        current: progress.totalOutdoorActivities,
        required: baseRequirements.outdoor,
        met: progress.totalOutdoorActivities >= baseRequirements.outdoor,
      },
      affirmations: {
        current: progress.totalAffirmationsViewed,
        required: baseRequirements.affirmations,
        met: progress.totalAffirmationsViewed >= baseRequirements.affirmations,
      },
    };
    
    const progressValues = Object.values(requirements).map(r => 
      Math.min(1, r.current / r.required)
    );
    const overallProgress = progressValues.reduce((a, b) => a + b, 0) / progressValues.length;
    
    const canGraduate = Object.values(requirements).every(r => r.met);
    
    return { canGraduate, requirements, overallProgress };
  }, [progress, getLevelInfo]);

  const resetProgress = useCallback(() => {
    setProgress(defaultProgress);
    saveProgress(defaultProgress);
  }, [saveProgress]);

  const value: ProgressContextType = {
    progress,
    isLoading,
    addflashcardResult,
    addChoreCompleted,
    addOutdoorActivity,
    addAffirmationViewed,
    getTodayStats,
    getThisWeekStats,
    getNewAchievements,
    getSubjectDifficulty,
    getLevelInfo,
    getGraduationProgress,
    isChoreCompleted,
    isOutdoorCompleted,
    toggleChore,
    toggleOutdoor,
    resetProgress,
    customAffirmations,
    addCustomAffirmation,
    removeCustomAffirmation,
  };

  return (
    <ProgressContext.Provider value={value}>
      {children}
    </ProgressContext.Provider>
  );
}

export { DIFFICULTY_THRESHOLDS, SUBJECT_IDS as SUBJECTS };
