import React, { useEffect } from 'react';
import { StatusBar, ActivityIndicator, View, StyleSheet } from 'react-native';
import { NavigationContainer, DarkTheme, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AuthNavigator from './AuthNavigator';
import MainNavigator from './MainNavigator';
import { useTheme } from '../contexts/ThemeContext';
import { useAuthStore } from '../stores/authStore';
import { useUserStore } from '../stores/userStore';
import type { RootStackParamList } from '../types';

// DEV: Set to true to skip authentication during development
const DEV_SKIP_AUTH = false;

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  const { colors, activeTheme } = useTheme();

  // Auth store
  const session = useAuthStore((state) => state.session);
  const isInitialized = useAuthStore((state) => state.isInitialized);
  const initialize = useAuthStore((state) => state.initialize);

  // User store
  const loadProfile = useUserStore((state) => state.loadProfile);

  // Initialize auth on mount
  useEffect(() => {
    initialize();
  }, []);

  // Load profile when session changes
  useEffect(() => {
    if (session?.user) {
      loadProfile(session.user.id);
    }
  }, [session]);

  // Custom theme matching app colors
  const navigationTheme = activeTheme === 'light'
    ? {
        ...DefaultTheme,
        colors: {
          ...DefaultTheme.colors,
          primary: colors.accent.primary,
          background: colors.background.primary,
          card: colors.background.tertiary,
          text: colors.text.primary,
          border: colors.border.primary,
          notification: colors.accent.primary,
        },
      }
    : {
        ...DarkTheme,
        colors: {
          ...DarkTheme.colors,
          primary: colors.accent.primary,
          background: colors.background.primary,
          card: colors.background.tertiary,
          text: colors.text.primary,
          border: colors.border.primary,
          notification: colors.accent.primary,
        },
      };

  // Show loading while initializing auth
  if (!isInitialized) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background.primary }]}>
        <ActivityIndicator size="large" color={colors.accent.primary} />
      </View>
    );
  }

  const isAuthenticated = DEV_SKIP_AUTH || !!session;

  return (
    <>
      <StatusBar barStyle={activeTheme === 'dark' ? 'light-content' : 'dark-content'} />
      <NavigationContainer theme={navigationTheme}>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {isAuthenticated ? (
            <Stack.Screen name="Main" component={MainNavigator} />
          ) : (
            <Stack.Screen name="Auth" component={AuthNavigator} />
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
