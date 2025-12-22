import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BuddyAppearance, DEFAULT_APPEARANCE } from '@/constants/buddyCustomization';

const BUDDY_STORAGE_KEY = '@buddy_data';
const CONVERSATION_STORAGE_KEY = '@buddy_conversations';

interface UserProfile {
  name: string;
  age: number;
  interests: string[];
  goals: string[];
  personalityTraits: string[];
  favoriteSubjects: string[];
  dreams: string[];
}

interface DiaryEntry {
  id: string;
  date: string;
  content: string;
  mood: 'happy' | 'sad' | 'excited' | 'worried' | 'calm' | 'proud';
}

interface ConversationMessage {
  id: string;
  role: 'user' | 'buddy';
  content: string;
  timestamp: string;
}

interface BuddyData {
  userProfile: UserProfile;
  diaryEntries: DiaryEntry[];
  conversationHistory: ConversationMessage[];
  buddyName: string;
  lastInteraction: string | null;
  interactionCount: number;
  learnedFacts: string[];
  appearance: BuddyAppearance;
}

const defaultProfile: UserProfile = {
  name: '',
  age: 0,
  interests: [],
  goals: [],
  personalityTraits: [],
  favoriteSubjects: [],
  dreams: [],
};

const defaultBuddyData: BuddyData = {
  userProfile: defaultProfile,
  diaryEntries: [],
  conversationHistory: [],
  buddyName: 'Buddy',
  lastInteraction: null,
  interactionCount: 0,
  learnedFacts: [],
  appearance: DEFAULT_APPEARANCE,
};

interface BuddyContextType {
  buddyData: BuddyData;
  isVisible: boolean;
  isChatOpen: boolean;
  isLoading: boolean;
  setIsVisible: (visible: boolean) => void;
  setIsChatOpen: (open: boolean) => void;
  addMessage: (content: string, role: 'user' | 'buddy') => void;
  addDiaryEntry: (content: string, mood: DiaryEntry['mood']) => void;
  updateUserProfile: (updates: Partial<UserProfile>) => void;
  addLearnedFact: (fact: string) => void;
  getRecentMessages: (count?: number) => ConversationMessage[];
  clearConversation: () => void;
  setBuddyName: (name: string) => void;
  updateAppearance: (updates: Partial<BuddyAppearance>) => void;
  setIsCustomizerOpen: (open: boolean) => void;
  isCustomizerOpen: boolean;
}

const BuddyContext = createContext<BuddyContextType | null>(null);

export function useBuddy() {
  const context = useContext(BuddyContext);
  if (!context) {
    throw new Error('useBuddy must be used within a BuddyProvider');
  }
  return context;
}

interface BuddyProviderProps {
  children: ReactNode;
}

export function BuddyProvider({ children }: BuddyProviderProps) {
  const [buddyData, setBuddyData] = useState<BuddyData>(defaultBuddyData);
  const [isVisible, setIsVisible] = useState(true);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isCustomizerOpen, setIsCustomizerOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadBuddyData();
  }, []);

  useEffect(() => {
    if (!isLoading) {
      saveBuddyData();
    }
  }, [buddyData, isLoading]);

  const loadBuddyData = async () => {
    try {
      const storedData = await AsyncStorage.getItem(BUDDY_STORAGE_KEY);
      if (storedData) {
        const parsed = JSON.parse(storedData);
        setBuddyData({
          ...defaultBuddyData,
          ...parsed,
          appearance: { ...DEFAULT_APPEARANCE, ...(parsed.appearance || {}) },
          userProfile: { ...defaultProfile, ...(parsed.userProfile || {}) },
        });
      }
    } catch (error) {
      console.error('Failed to load buddy data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveBuddyData = async () => {
    try {
      await AsyncStorage.setItem(BUDDY_STORAGE_KEY, JSON.stringify(buddyData));
    } catch (error) {
      console.error('Failed to save buddy data:', error);
    }
  };

  const addMessage = useCallback((content: string, role: 'user' | 'buddy') => {
    const newMessage: ConversationMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      role,
      content,
      timestamp: new Date().toISOString(),
    };

    setBuddyData(prev => ({
      ...prev,
      conversationHistory: [...prev.conversationHistory.slice(-50), newMessage],
      lastInteraction: new Date().toISOString(),
      interactionCount: prev.interactionCount + 1,
    }));
  }, []);

  const addDiaryEntry = useCallback((content: string, mood: DiaryEntry['mood']) => {
    const newEntry: DiaryEntry = {
      id: `diary_${Date.now()}`,
      date: new Date().toISOString(),
      content,
      mood,
    };

    setBuddyData(prev => ({
      ...prev,
      diaryEntries: [...prev.diaryEntries, newEntry],
    }));
  }, []);

  const updateUserProfile = useCallback((updates: Partial<UserProfile>) => {
    setBuddyData(prev => ({
      ...prev,
      userProfile: { ...prev.userProfile, ...updates },
    }));
  }, []);

  const addLearnedFact = useCallback((fact: string) => {
    setBuddyData(prev => {
      if (prev.learnedFacts.includes(fact)) return prev;
      return {
        ...prev,
        learnedFacts: [...prev.learnedFacts.slice(-20), fact],
      };
    });
  }, []);

  const getRecentMessages = useCallback((count: number = 10) => {
    return buddyData.conversationHistory.slice(-count);
  }, [buddyData.conversationHistory]);

  const clearConversation = useCallback(() => {
    setBuddyData(prev => ({
      ...prev,
      conversationHistory: [],
    }));
  }, []);

  const setBuddyName = useCallback((name: string) => {
    setBuddyData(prev => ({
      ...prev,
      buddyName: name,
    }));
  }, []);

  const updateAppearance = useCallback((updates: Partial<BuddyAppearance>) => {
    setBuddyData(prev => ({
      ...prev,
      appearance: { ...prev.appearance, ...updates },
    }));
  }, []);

  const value: BuddyContextType = {
    buddyData,
    isVisible,
    isChatOpen,
    isLoading,
    setIsVisible,
    setIsChatOpen,
    addMessage,
    addDiaryEntry,
    updateUserProfile,
    addLearnedFact,
    getRecentMessages,
    clearConversation,
    setBuddyName,
    updateAppearance,
    setIsCustomizerOpen,
    isCustomizerOpen,
  };

  return (
    <BuddyContext.Provider value={value}>
      {children}
    </BuddyContext.Provider>
  );
}

export type { UserProfile, DiaryEntry, ConversationMessage, BuddyData, BuddyAppearance };
