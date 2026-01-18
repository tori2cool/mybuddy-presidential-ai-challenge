import { createContext, useContext, useState, useMemo, ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import { Colors } from '@/constants/theme';

type ThemeMode = 'light' | 'dark' | 'system';

type ThemeContextType = {
  theme: typeof Colors.light;
  isDark: boolean;
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme(); // 'light' | 'dark' | null
  const [overrideMode, setOverrideMode] = useState<ThemeMode>('system');

  const effectiveMode = overrideMode === 'system' ? systemScheme : overrideMode;

  const theme = useMemo(() => {
    return Colors[effectiveMode ?? 'light'];
  }, [effectiveMode]);

  const isDark = effectiveMode === 'dark';

  const value = {
    theme,
    isDark,
    mode: overrideMode,
    setMode: setOverrideMode,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};