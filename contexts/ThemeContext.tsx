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
  gradientFrom: string;
  gradientTo: string;
}

const lightColors: Colors = {
  background: '#F6F7FB',
  surface: '#FFFFFF',
  card: '#FFFFFF',
  text: '#111827',
  textSecondary: '#6B7280',
  textTertiary: '#9CA3AF',
  // 主色改为紫色，和截图一致（按钮/高亮）
  primary: '#8B5CF6',
  success: '#10B981',
  error: '#EF4444',
  border: '#E5E7EB',
  shadow: '#000000',
  income: '#10B981',
  expense: '#EF4444',
  tabBarBackground: '#FFFFFF',
  tabBarBorder: '#E5E7EB',
  modalBackground: '#F6F7FB',
  inputBackground: '#F3F4F6',
  sectionBackground: '#F3F4F6',
  // 渐变（紫粉）
  gradientFrom: '#FF3D9A',
  gradientTo: '#7C3AED',
};

const darkColors: Colors = {
  background: '#0F172A',
  surface: '#1E293B',
  card: '#334155',
  text: '#F8FAFC',
  textSecondary: '#CBD5E1',
  textTertiary: '#94A3B8',
  primary: '#8B5CF6',
  success: '#10B981',
  error: '#F87171',
  border: '#475569',
  shadow: '#000000',
  income: '#34D399',
  expense: '#F87171',
  tabBarBackground: '#111827',
  tabBarBorder: '#374151',
  modalBackground: '#0B1220',
  inputBackground: '#1F2937',
  sectionBackground: '#1F2937',
  gradientFrom: '#A855F7',
  gradientTo: '#EC4899',
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