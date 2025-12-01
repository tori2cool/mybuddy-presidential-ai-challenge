import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { DifficultyTier, SubjectId } from "@/types/models";

const STORAGE_KEY = "@mybuddy_progress";

const SUBJECTS: SubjectId[] = ["math", "science", "reading", "history"];

const DIFFICULTY_THRESHOLDS = {
  easy: 0,
  medium: 20,
  hard: 40,
};

const LEVEL_THRESHOLDS = {
  "New Kid": 0,
  "Good Kid": 50,
  "Great Kid": 200,
  "Awesome Kid": 500,
  "Amazing Kid": 1000,
  "Super Star Kid": 2000,
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
}

interface BalancedProgress {
  canLevelUp: boolean;
  currentLevel: string;
  nextLevel: string | null;
  requiredPerSubject: number;
  subjectProgress: Record<SubjectId, { current: number; required: number; met: boolean }>;
  lowestSubject: SubjectId | null;
  message: string;
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
}

const defaultSubjectStats: SubjectStats = {
  completed: 0,
  correct: 0,
  difficulty: "easy",
  recentResults: [],
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
    { id: "medium_math", title: "Math Whiz", description: "Reach Medium difficulty in Math", icon: "grid", unlockedAt: null, type: "special" },
    { id: "medium_science", title: "Science Star", description: "Reach Medium difficulty in Science", icon: "zap", unlockedAt: null, type: "special" },
    { id: "medium_reading", title: "Bookworm", description: "Reach Medium difficulty in Reading", icon: "book-open", unlockedAt: null, type: "special" },
    { id: "medium_history", title: "History Buff", description: "Reach Medium difficulty in History", icon: "globe", unlockedAt: null, type: "special" },
    { id: "hard_unlocked", title: "Master Student", description: "Reach Hard difficulty in any subject", icon: "award", unlockedAt: null, type: "special" },
    { id: "balanced_learner", title: "Balanced Learner", description: "Get 10+ correct in all subjects", icon: "target", unlockedAt: null, type: "special" },
  ],
  flashcardsBySubject: {
    math: { ...defaultSubjectStats },
    science: { ...defaultSubjectStats },
    reading: { ...defaultSubjectStats },
    history: { ...defaultSubjectStats },
  },
  totalChoresCompleted: 0,
  totalOutdoorActivities: 0,
  totalAffirmationsViewed: 0,
};

interface ProgressContextType {
  progress: ProgressData;
  isLoading: boolean;
  addFlashcardResult: (subject: string, correct: boolean) => void;
  addChoreCompleted: () => void;
  addOutdoorActivity: () => void;
  addAffirmationViewed: () => void;
  getTodayStats: () => DailyStats | null;
  getThisWeekStats: () => WeeklyStats | null;
  getNewAchievements: () => Achievement[];
  getSubjectDifficulty: (subject: SubjectId) => DifficultyTier;
  getBalancedProgress: () => BalancedProgress;
  getRewardLevel: () => { level: string; icon: string; color: string; nextAt: number | null; progress: number };
  resetProgress: () => void;
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

function calculateDifficulty(correct: number, recentResults: boolean[]): DifficultyTier {
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

  useEffect(() => {
    loadProgress();
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
        
        SUBJECTS.forEach(subject => {
          if (!merged.flashcardsBySubject[subject]) {
            merged.flashcardsBySubject[subject] = { ...defaultSubjectStats };
          } else {
            const existing = merged.flashcardsBySubject[subject];
            merged.flashcardsBySubject[subject] = {
              completed: existing.completed || 0,
              correct: existing.correct || 0,
              difficulty: existing.difficulty || calculateDifficulty(existing.correct || 0, []),
              recentResults: existing.recentResults || [],
            };
          }
        });
        
        setProgress(merged);
      }
    } catch (error) {
      console.error("Failed to load progress:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveProgress = useCallback(async (newProgress: ProgressData) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newProgress));
    } catch (error) {
      console.error("Failed to save progress:", error);
    }
  }, []);

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

    const totalFlashcards = Object.values(currentProgress.flashcardsBySubject)
      .reduce((acc, s) => acc + s.completed, 0);

    checkAndUnlock("first_flashcard", totalFlashcards >= 1);
    checkAndUnlock("first_chore", currentProgress.totalChoresCompleted >= 1);
    checkAndUnlock("first_outdoor", currentProgress.totalOutdoorActivities >= 1);
    checkAndUnlock("streak_3", currentProgress.currentStreak >= 3);
    checkAndUnlock("streak_7", currentProgress.currentStreak >= 7);
    checkAndUnlock("streak_30", currentProgress.currentStreak >= 30);
    checkAndUnlock("points_100", currentProgress.totalPoints >= 100);
    checkAndUnlock("points_500", currentProgress.totalPoints >= 500);
    checkAndUnlock("points_2000", currentProgress.totalPoints >= 2000);
    checkAndUnlock("flashcards_10", totalFlashcards >= 10);
    checkAndUnlock("flashcards_50", totalFlashcards >= 50);
    checkAndUnlock("chores_7", currentProgress.totalChoresCompleted >= 7);
    checkAndUnlock("outdoor_5", currentProgress.totalOutdoorActivities >= 5);
    
    if (todayStats) {
      checkAndUnlock("perfect_day", 
        todayStats.flashcardsCompleted > 0 && 
        todayStats.choresCompleted > 0 && 
        todayStats.outdoorActivities > 0
      );
    }

    checkAndUnlock("medium_math", currentProgress.flashcardsBySubject.math?.difficulty === "medium" || currentProgress.flashcardsBySubject.math?.difficulty === "hard");
    checkAndUnlock("medium_science", currentProgress.flashcardsBySubject.science?.difficulty === "medium" || currentProgress.flashcardsBySubject.science?.difficulty === "hard");
    checkAndUnlock("medium_reading", currentProgress.flashcardsBySubject.reading?.difficulty === "medium" || currentProgress.flashcardsBySubject.reading?.difficulty === "hard");
    checkAndUnlock("medium_history", currentProgress.flashcardsBySubject.history?.difficulty === "medium" || currentProgress.flashcardsBySubject.history?.difficulty === "hard");
    
    const anyHard = SUBJECTS.some(s => currentProgress.flashcardsBySubject[s]?.difficulty === "hard");
    checkAndUnlock("hard_unlocked", anyHard);
    
    const allSubjectsMin10 = SUBJECTS.every(s => (currentProgress.flashcardsBySubject[s]?.correct || 0) >= 10);
    checkAndUnlock("balanced_learner", allSubjectsMin10);

    if (newlyUnlocked.length > 0) {
      setNewAchievements(prev => [...prev, ...newlyUnlocked]);
    }

    return { ...currentProgress, achievements };
  }, []);

  const addFlashcardResult = useCallback((subject: string, correct: boolean) => {
    const subjectId = subject as SubjectId;
    
    setProgress(prev => {
      const points = correct ? 10 : 2;
      let updated = updateStreak(prev);
      
      const subjectStats = updated.flashcardsBySubject[subjectId] || { ...defaultSubjectStats };
      const newCorrect = subjectStats.correct + (correct ? 1 : 0);
      
      let recentResults = [...(subjectStats.recentResults || []), correct];
      if (recentResults.length > 10) {
        recentResults = recentResults.slice(-10);
      }
      
      const newDifficulty = calculateDifficulty(newCorrect, recentResults);
      
      updated = {
        ...updated,
        totalPoints: updated.totalPoints + points,
        flashcardsBySubject: {
          ...updated.flashcardsBySubject,
          [subjectId]: {
            completed: subjectStats.completed + 1,
            correct: newCorrect,
            difficulty: newDifficulty,
            recentResults,
          },
        },
      };

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
  }, [updateStreak, updateDailyStats, updateWeeklyStats, checkAchievements, saveProgress]);

  const addChoreCompleted = useCallback(() => {
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

  const addOutdoorActivity = useCallback(() => {
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

  const getBalancedProgress = useCallback((): BalancedProgress => {
    const subjectCorrects = SUBJECTS.map(s => progress.flashcardsBySubject[s]?.correct || 0);
    const minCorrect = Math.min(...subjectCorrects);
    const totalCorrect = subjectCorrects.reduce((a, b) => a + b, 0);
    
    const levels = Object.entries(LEVEL_THRESHOLDS).sort((a, b) => b[1] - a[1]);
    let currentLevel = "New Kid";
    let nextLevel: string | null = null;
    let nextThreshold = LEVEL_THRESHOLDS["Good Kid"];
    
    for (let i = levels.length - 1; i >= 0; i--) {
      const [levelName, threshold] = levels[i];
      const requiredPerSubject = Math.ceil(threshold / SUBJECTS.length);
      
      if (minCorrect >= requiredPerSubject) {
        currentLevel = levelName;
        if (i > 0) {
          nextLevel = levels[i - 1][0];
          nextThreshold = levels[i - 1][1];
        } else {
          nextLevel = null;
          nextThreshold = 0;
        }
      }
    }
    
    const requiredPerSubject = nextLevel ? Math.ceil(nextThreshold / SUBJECTS.length) : 0;
    
    const subjectProgress: Record<SubjectId, { current: number; required: number; met: boolean }> = {} as any;
    let lowestSubject: SubjectId | null = null;
    let lowestValue = Infinity;
    
    SUBJECTS.forEach(subject => {
      const current = progress.flashcardsBySubject[subject]?.correct || 0;
      const met = current >= requiredPerSubject;
      subjectProgress[subject] = { current, required: requiredPerSubject, met };
      
      if (current < lowestValue) {
        lowestValue = current;
        lowestSubject = subject;
      }
    });
    
    const canLevelUp = nextLevel === null || SUBJECTS.every(s => subjectProgress[s].met);
    
    let message = "";
    if (nextLevel === null) {
      message = "You've reached the highest level!";
    } else if (canLevelUp) {
      message = `Ready to become ${nextLevel}!`;
    } else {
      const subjectsNeeded = SUBJECTS.filter(s => !subjectProgress[s].met);
      const subjectNames = subjectsNeeded.map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(", ");
      message = `Need more correct answers in: ${subjectNames}`;
    }
    
    return {
      canLevelUp,
      currentLevel,
      nextLevel,
      requiredPerSubject,
      subjectProgress,
      lowestSubject,
      message,
    };
  }, [progress.flashcardsBySubject]);

  const getRewardLevel = useCallback(() => {
    const balancedProgress = getBalancedProgress();
    const levelColors: Record<string, { icon: string; color: string }> = {
      "Super Star Kid": { icon: "star", color: "#F59E0B" },
      "Amazing Kid": { icon: "award", color: "#8B5CF6" },
      "Awesome Kid": { icon: "sun", color: "#3B82F6" },
      "Great Kid": { icon: "thumbs-up", color: "#10B981" },
      "Good Kid": { icon: "smile", color: "#FB923C" },
      "New Kid": { icon: "user", color: "#9CA3AF" },
    };
    
    const { icon, color } = levelColors[balancedProgress.currentLevel] || levelColors["New Kid"];
    const nextAt = balancedProgress.nextLevel ? LEVEL_THRESHOLDS[balancedProgress.nextLevel as keyof typeof LEVEL_THRESHOLDS] : null;
    const currentThreshold = LEVEL_THRESHOLDS[balancedProgress.currentLevel as keyof typeof LEVEL_THRESHOLDS] || 0;
    
    const minCorrect = Math.min(...SUBJECTS.map(s => progress.flashcardsBySubject[s]?.correct || 0));
    const effectiveProgress = minCorrect * SUBJECTS.length;
    
    let progressPercent = 0;
    if (nextAt !== null) {
      progressPercent = Math.min(((effectiveProgress - currentThreshold) / (nextAt - currentThreshold)) * 100, 100);
    } else {
      progressPercent = 100;
    }
    
    return {
      level: balancedProgress.currentLevel,
      icon,
      color,
      nextAt,
      progress: progressPercent,
    };
  }, [getBalancedProgress, progress.flashcardsBySubject]);

  const resetProgress = useCallback(async () => {
    setProgress(defaultProgress);
    await AsyncStorage.removeItem(STORAGE_KEY);
  }, []);

  return (
    <ProgressContext.Provider
      value={{
        progress,
        isLoading,
        addFlashcardResult,
        addChoreCompleted,
        addOutdoorActivity,
        addAffirmationViewed,
        getTodayStats,
        getThisWeekStats,
        getNewAchievements,
        getSubjectDifficulty,
        getBalancedProgress,
        getRewardLevel,
        resetProgress,
      }}
    >
      {children}
    </ProgressContext.Provider>
  );
}

export { DifficultyTier, SubjectId, SUBJECTS, DIFFICULTY_THRESHOLDS };
