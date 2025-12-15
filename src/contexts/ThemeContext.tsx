import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getColors, ColorPalette } from '../constants/colors';

export type ThemePreference = 'auto' | 'light' | 'dark';
export type ActiveTheme = 'light' | 'dark';

interface ThemeContextType {
  themePreference: ThemePreference;
  activeTheme: ActiveTheme;
  colors: ColorPalette;
  statusBarStyle: 'light-content' | 'dark-content';
  setThemePreference: (preference: ThemePreference) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = '@linkble_theme';

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const systemColorScheme = useColorScheme();
  // Default to dark theme as per client spec
  const [themePreference, setThemePreferenceState] = useState<ThemePreference>('dark');
  const [isLoading, setIsLoading] = useState(true);

  // Determine active theme based on preference and system setting
  const activeTheme: ActiveTheme =
    themePreference === 'auto'
      ? (systemColorScheme === 'light' ? 'light' : 'dark')
      : themePreference;

  // Get colors for active theme
  const colors: ColorPalette = getColors(activeTheme);

  // Status bar style based on theme
  const statusBarStyle = activeTheme === 'light' ? 'dark-content' : 'light-content';

  // Load saved preference on mount
  useEffect(() => {
    const loadThemePreference = async () => {
      try {
        const savedPreference = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (savedPreference && ['auto', 'light', 'dark'].includes(savedPreference)) {
          setThemePreferenceState(savedPreference as ThemePreference);
        }
      } catch (error) {
        // Silently fail and use default (dark)
      } finally {
        setIsLoading(false);
      }
    };

    loadThemePreference();
  }, []);

  // Save theme preference
  const setThemePreference = async (preference: ThemePreference) => {
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, preference);
      setThemePreferenceState(preference);
    } catch (error) {
      // Silently fail
    }
  };

  // Don't render children until theme is loaded
  if (isLoading) {
    return null;
  }

  return (
    <ThemeContext.Provider
      value={{
        themePreference,
        activeTheme,
        colors,
        statusBarStyle,
        setThemePreference,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
