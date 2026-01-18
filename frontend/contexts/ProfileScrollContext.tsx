import React, { createContext, useContext, useRef, useCallback } from 'react';

type ProfileScrollContextType = {
  triggerScrollToBottom: () => void;
  registerScrollFn: (fn: () => void) => void;
};

const ProfileScrollContext = createContext<ProfileScrollContextType | undefined>(undefined);

export function ProfileScrollProvider({ children }: { children: React.ReactNode }) {
  const scrollFnRef = useRef<(() => void) | null>(null);

  const triggerScrollToBottom = useCallback(() => {
    if (scrollFnRef.current) {
      scrollFnRef.current();
    }
  }, []);

  const registerScrollFn = useCallback((fn: () => void) => {
    scrollFnRef.current = fn;
  }, []);

  return (
    <ProfileScrollContext.Provider value={{ triggerScrollToBottom, registerScrollFn }}>
      {children}
    </ProfileScrollContext.Provider>
  );
}

export function useProfileScroll() {
  const context = useContext(ProfileScrollContext);
  if (!context) {
    throw new Error('useProfileScroll must be used inside ProfileScrollProvider');
  }
  return context;
}