import React from 'react';
import { StatusBar } from 'react-native';
import { NavigationContainer, DarkTheme, DefaultTheme } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import AuthNavigator from './AuthNavigator';
import MainNavigator from './MainNavigator';
import { useTheme } from '../contexts/ThemeContext';
import type { RootStackParamList } from '../types';

const Stack = createStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  // FIXME: Hardcoded for testing. Replace with auth store when Supabase is connected
  const isAuthenticated = true;
  const { colors, activeTheme } = useTheme();

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
