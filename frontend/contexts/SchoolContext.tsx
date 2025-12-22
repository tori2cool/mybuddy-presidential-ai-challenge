import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { TOTAL_SCHOOL_LEVELS, STARS_PER_LEVEL, SCHOOL_CATEGORIES, getAllSubjects } from "@/constants/schoolData";

const STORAGE_KEY = "@mybuddy_school_progress";

export interface SubjectProgress {
  subjectId: string;
  currentLevel: number;
  currentStar: number;
  totalStarsEarned: number;
  completedStars: Record<number, number[]>;
  lastActivityDate: string | null;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlockedAt: string | null;
  type: "level" | "subject" | "streak" | "special";
}

export interface SchoolProgressData {
  globalLevel: number;
  totalStarsEarned: number;
  subjectProgress: Record<string, SubjectProgress>;
  badges: Badge[];
  currentStreak: number;
  lastActiveDate: string | null;
  completedLevels: number[];
  discussionPosts: DiscussionPost[];
  customLessons: CustomLesson[];
}

export interface DiscussionPost {
  id: string;
  authorName: string;
  content: string;
  timestamp: string;
  subjectId?: string;
  replies: DiscussionReply[];
}

export interface DiscussionReply {
  id: string;
  authorName: string;
  content: string;
  timestamp: string;
}

export interface CustomLesson {
  id: string;
  subjectId: string;
  level: number;
  title: string;
  content: string;
  questions: Array<{
    question: string;
    options: string[];
    correctAnswer: number;
  }>;
  createdAt: string;
}

const DEFAULT_BADGES: Badge[] = [
  { id: "first-star", name: "First Star", description: "Earned your first star!", icon: "star", unlockedAt: null, type: "special" },
  { id: "level-5", name: "Getting Started", description: "Reached Level 5", icon: "award", unlockedAt: null, type: "level" },
  { id: "level-10", name: "On Your Way", description: "Reached Level 10", icon: "award", unlockedAt: null, type: "level" },
  { id: "level-25", name: "Quarter Master", description: "Reached Level 25", icon: "award", unlockedAt: null, type: "level" },
  { id: "level-50", name: "Half Way Hero", description: "Reached Level 50", icon: "award", unlockedAt: null, type: "level" },
  { id: "level-100", name: "Century Scholar", description: "Reached Level 100", icon: "award", unlockedAt: null, type: "level" },
  { id: "level-160", name: "Grand Master", description: "Reached Level 160 - Maximum Level!", icon: "award", unlockedAt: null, type: "level" },
  { id: "math-master", name: "Math Master", description: "Completed 10 math levels", icon: "hash", unlockedAt: null, type: "subject" },
  { id: "science-star", name: "Science Star", description: "Completed 10 science levels", icon: "zap", unlockedAt: null, type: "subject" },
  { id: "streak-7", name: "Week Warrior", description: "7 day learning streak", icon: "calendar", unlockedAt: null, type: "streak" },
  { id: "streak-30", name: "Monthly Maven", description: "30 day learning streak", icon: "calendar", unlockedAt: null, type: "streak" },
  { id: "all-subjects", name: "Well Rounded", description: "Earned stars in all subjects", icon: "compass", unlockedAt: null, type: "special" },
];

const defaultSubjectProgress = (): SubjectProgress => ({
  subjectId: "",
  currentLevel: 1,
  currentStar: 1,
  totalStarsEarned: 0,
  completedStars: {},
  lastActivityDate: null,
});

const defaultProgress: SchoolProgressData = {
  globalLevel: 1,
  totalStarsEarned: 0,
  subjectProgress: {},
  badges: DEFAULT_BADGES,
  currentStreak: 0,
  lastActiveDate: null,
  completedLevels: [],
  discussionPosts: [],
  customLessons: [],
};

interface SchoolContextValue {
  progress: SchoolProgressData;
  getSubjectProgress: (subjectId: string) => SubjectProgress;
  earnStar: (subjectId: string, level: number, starNumber: number) => void;
  getGlobalProgress: () => { level: number; starsInLevel: number; totalStars: number; overallProgress: number };
  getSubjectLevelProgress: (subjectId: string, level: number) => { starsEarned: number; totalStars: number; progress: number };
  addDiscussionPost: (post: Omit<DiscussionPost, "id" | "timestamp" | "replies">) => void;
  addDiscussionReply: (postId: string, reply: Omit<DiscussionReply, "id" | "timestamp">) => void;
  addCustomLesson: (lesson: Omit<CustomLesson, "id" | "createdAt">) => void;
  updateCustomLesson: (lessonId: string, updates: Partial<CustomLesson>) => void;
  deleteCustomLesson: (lessonId: string) => void;
  isStarCompleted: (subjectId: string, level: number, starNumber: number) => boolean;
  getUnlockedBadges: () => Badge[];
  resetProgress: () => void;
}

const SchoolContext = createContext<SchoolContextValue | null>(null);

export function useSchool() {
  const context = useContext(SchoolContext);
  if (!context) {
    throw new Error("useSchool must be used within a SchoolProvider");
  }
  return context;
}

interface SchoolProviderProps {
  children: ReactNode;
}

export function SchoolProvider({ children }: SchoolProviderProps) {
  const [progress, setProgress] = useState<SchoolProgressData>(defaultProgress);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    loadProgress();
  }, []);

  useEffect(() => {
    if (isLoaded) {
      saveProgress();
    }
  }, [progress, isLoaded]);

  const loadProgress = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setProgress({ ...defaultProgress, ...parsed });
      }
    } catch (error) {
      console.error("Failed to load school progress:", error);
    }
    setIsLoaded(true);
  };

  const saveProgress = async () => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
    } catch (error) {
      console.error("Failed to save school progress:", error);
    }
  };

  const getSubjectProgress = useCallback((subjectId: string): SubjectProgress => {
    return progress.subjectProgress[subjectId] || { ...defaultSubjectProgress(), subjectId };
  }, [progress.subjectProgress]);

  const earnStar = useCallback((subjectId: string, level: number, starNumber: number) => {
    setProgress(prev => {
      const subjectProg = prev.subjectProgress[subjectId] || { ...defaultSubjectProgress(), subjectId };
      const completedStars = { ...subjectProg.completedStars };
      
      if (!completedStars[level]) {
        completedStars[level] = [];
      }
      
      if (completedStars[level].includes(starNumber)) {
        return prev;
      }
      
      completedStars[level] = [...completedStars[level], starNumber];
      
      const totalStarsEarned = subjectProg.totalStarsEarned + 1;
      const starsInCurrentLevel = completedStars[level]?.length || 0;
      
      let currentLevel = level;
      let currentStar = starNumber + 1;
      
      if (starsInCurrentLevel >= STARS_PER_LEVEL && level < TOTAL_SCHOOL_LEVELS) {
        currentLevel = level + 1;
        currentStar = 1;
      }
      
      const newGlobalTotalStars = prev.totalStarsEarned + 1;
      const newGlobalLevel = Math.floor(newGlobalTotalStars / STARS_PER_LEVEL) + 1;
      
      const today = new Date().toISOString().split("T")[0];
      const lastActive = prev.lastActiveDate;
      let newStreak = prev.currentStreak;
      
      if (lastActive) {
        const lastDate = new Date(lastActive);
        const todayDate = new Date(today);
        const diffDays = Math.floor((todayDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
        
        if (diffDays === 1) {
          newStreak = prev.currentStreak + 1;
        } else if (diffDays > 1) {
          newStreak = 1;
        }
      } else {
        newStreak = 1;
      }
      
      const newBadges = [...prev.badges];
      const now = new Date().toISOString();
      
      if (newGlobalTotalStars === 1) {
        const badge = newBadges.find(b => b.id === "first-star");
        if (badge && !badge.unlockedAt) badge.unlockedAt = now;
      }
      
      const levelBadges: Record<number, string> = {
        5: "level-5",
        10: "level-10",
        25: "level-25",
        50: "level-50",
        100: "level-100",
        160: "level-160",
      };
      
      if (levelBadges[newGlobalLevel]) {
        const badge = newBadges.find(b => b.id === levelBadges[newGlobalLevel]);
        if (badge && !badge.unlockedAt) badge.unlockedAt = now;
      }
      
      if (newStreak >= 7) {
        const badge = newBadges.find(b => b.id === "streak-7");
        if (badge && !badge.unlockedAt) badge.unlockedAt = now;
      }
      if (newStreak >= 30) {
        const badge = newBadges.find(b => b.id === "streak-30");
        if (badge && !badge.unlockedAt) badge.unlockedAt = now;
      }
      
      const allSubjects = getAllSubjects();
      const allHaveStars = allSubjects.every(s => {
        const sp = s.id === subjectId 
          ? { totalStarsEarned }
          : prev.subjectProgress[s.id];
        return sp && sp.totalStarsEarned > 0;
      });
      
      if (allHaveStars) {
        const badge = newBadges.find(b => b.id === "all-subjects");
        if (badge && !badge.unlockedAt) badge.unlockedAt = now;
      }
      
      return {
        ...prev,
        globalLevel: Math.min(newGlobalLevel, TOTAL_SCHOOL_LEVELS),
        totalStarsEarned: newGlobalTotalStars,
        currentStreak: newStreak,
        lastActiveDate: today,
        badges: newBadges,
        subjectProgress: {
          ...prev.subjectProgress,
          [subjectId]: {
            ...subjectProg,
            currentLevel,
            currentStar,
            totalStarsEarned,
            completedStars,
            lastActivityDate: today,
          },
        },
      };
    });
  }, []);

  const getGlobalProgress = useCallback(() => {
    const totalPossibleStars = TOTAL_SCHOOL_LEVELS * STARS_PER_LEVEL;
    const starsInLevel = progress.totalStarsEarned % STARS_PER_LEVEL;
    const overallProgress = progress.totalStarsEarned / totalPossibleStars;
    
    return {
      level: progress.globalLevel,
      starsInLevel,
      totalStars: progress.totalStarsEarned,
      overallProgress,
    };
  }, [progress.globalLevel, progress.totalStarsEarned]);

  const getSubjectLevelProgress = useCallback((subjectId: string, level: number) => {
    const subjectProg = progress.subjectProgress[subjectId];
    const starsEarned = subjectProg?.completedStars[level]?.length || 0;
    
    return {
      starsEarned,
      totalStars: STARS_PER_LEVEL,
      progress: starsEarned / STARS_PER_LEVEL,
    };
  }, [progress.subjectProgress]);

  const isStarCompleted = useCallback((subjectId: string, level: number, starNumber: number) => {
    const subjectProg = progress.subjectProgress[subjectId];
    return subjectProg?.completedStars[level]?.includes(starNumber) || false;
  }, [progress.subjectProgress]);

  const addDiscussionPost = useCallback((post: Omit<DiscussionPost, "id" | "timestamp" | "replies">) => {
    setProgress(prev => ({
      ...prev,
      discussionPosts: [
        {
          ...post,
          id: Date.now().toString(),
          timestamp: new Date().toISOString(),
          replies: [],
        },
        ...prev.discussionPosts,
      ],
    }));
  }, []);

  const addDiscussionReply = useCallback((postId: string, reply: Omit<DiscussionReply, "id" | "timestamp">) => {
    setProgress(prev => ({
      ...prev,
      discussionPosts: prev.discussionPosts.map(post => {
        if (post.id === postId) {
          return {
            ...post,
            replies: [
              ...post.replies,
              {
                ...reply,
                id: Date.now().toString(),
                timestamp: new Date().toISOString(),
              },
            ],
          };
        }
        return post;
      }),
    }));
  }, []);

  const addCustomLesson = useCallback((lesson: Omit<CustomLesson, "id" | "createdAt">) => {
    setProgress(prev => ({
      ...prev,
      customLessons: [
        {
          ...lesson,
          id: Date.now().toString(),
          createdAt: new Date().toISOString(),
        },
        ...prev.customLessons,
      ],
    }));
  }, []);

  const updateCustomLesson = useCallback((lessonId: string, updates: Partial<CustomLesson>) => {
    setProgress(prev => ({
      ...prev,
      customLessons: prev.customLessons.map(lesson => 
        lesson.id === lessonId ? { ...lesson, ...updates } : lesson
      ),
    }));
  }, []);

  const deleteCustomLesson = useCallback((lessonId: string) => {
    setProgress(prev => ({
      ...prev,
      customLessons: prev.customLessons.filter(l => l.id !== lessonId),
    }));
  }, []);

  const getUnlockedBadges = useCallback(() => {
    return progress.badges.filter(b => b.unlockedAt !== null);
  }, [progress.badges]);

  const resetProgress = useCallback(() => {
    setProgress(defaultProgress);
  }, []);

  const value: SchoolContextValue = {
    progress,
    getSubjectProgress,
    earnStar,
    getGlobalProgress,
    getSubjectLevelProgress,
    addDiscussionPost,
    addDiscussionReply,
    addCustomLesson,
    updateCustomLesson,
    deleteCustomLesson,
    isStarCompleted,
    getUnlockedBadges,
    resetProgress,
  };

  return (
    <SchoolContext.Provider value={value}>
      {children}
    </SchoolContext.Provider>
  );
}
