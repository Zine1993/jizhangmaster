import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemeMode = 'light' | 'dark' | 'system';
export type ActiveTheme = 'light' | 'dark';

interface Colors {
  background: string;
  surface: string;
  card: string;
  text: string;
  textSecondary: string;
  textTertiary: string;
  primary: string;
  success: string;
  error: string;
  border: string;
  shadow: string;
  income: string;
  expense: string;
  tabBarBackground: string;
  tabBarBorder: string;
  modalBackground: string;
  inputBackground: string;
  sectionBackground: string;
}

const lightColors: Colors = {
  background: '#F9FAFB',
  surface: '#FFFFFF',
  card: '#FFFFFF',
  text: '#111827',
  textSecondary: '#6B7280',
  textTertiary: '#9CA3AF',
  primary: '#10B981',
  success: '#10B981',
  error: '#EF4444',
  border: '#E5E7EB',
  shadow: '#000000',
  income: '#10B981',
  expense: '#EF4444',
  tabBarBackground: '#FFFFFF',
  tabBarBorder: '#E5E7EB',
  modalBackground: '#F9FAFB',
  inputBackground: '#FFFFFF',
  sectionBackground: '#F3F4F6',
};

const darkColors: Colors = {
  background: '#111827',
  surface: '#1F2937',
  card: '#374151',
  text: '#F9FAFB',
  textSecondary: '#D1D5DB',
  textTertiary: '#9CA3AF',
  primary: '#10B981',
  success: '#10B981',
  error: '#F87171',
  border: '#4B5563',
  shadow: '#000000',
  income: '#34D399',
  expense: '#F87171',
  tabBarBackground: '#1F2937',
  tabBarBorder: '#374151',
  modalBackground: '#111827',
  inputBackground: '#374151',
  sectionBackground: '#374151',
};

interface ThemeContextType {
  themeMode: ThemeMode;
  activeTheme: ActiveTheme;
  colors: Colors;
  setThemeMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = '@expense_tracker_theme';

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const systemColorScheme = useColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>('system');

  // Load theme from storage
  useEffect(() => {
    loadTheme();
  }, []);

  // Save theme to storage whenever it changes
  useEffect(() => {
    saveTheme();
  }, [themeMode]);

  const loadTheme = async () => {
    try {
      const stored = await AsyncStorage.getItem(THEME_STORAGE_KEY);
      if (stored && ['light', 'dark', 'system'].includes(stored)) {
        setThemeModeState(stored as ThemeMode);
      }
    } catch (error) {
      console.error('Failed to load theme:', error);
    }
  };

  const saveTheme = async () => {
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, themeMode);
    } catch (error) {
      console.error('Failed to save theme:', error);
    }
  };

  const setThemeMode = (mode: ThemeMode) => {
    setThemeModeState(mode);
  };

  // Determine active theme based on mode and system preference
  const activeTheme: ActiveTheme = 
    themeMode === 'system' 
      ? (systemColorScheme === 'dark' ? 'dark' : 'light')
      : themeMode === 'dark' 
        ? 'dark' 
        : 'light';

  const colors = activeTheme === 'dark' ? darkColors : lightColors;

  return (
    <ThemeContext.Provider 
      value={{ 
        themeMode, 
        activeTheme, 
        colors, 
        setThemeMode 
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}