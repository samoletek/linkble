import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import 'react-native-gesture-handler';
import Mapbox from '@rnmapbox/maps';
import { ThemeProvider, useTheme } from './src/contexts/ThemeContext';
import RootNavigator from './src/navigation/RootNavigator';
import { MAPBOX_ACCESS_TOKEN } from './src/config/mapbox';

Mapbox.setAccessToken(MAPBOX_ACCESS_TOKEN);

function AppContent() {
  const { statusBarStyle } = useTheme();

  return (
    <>
      <StatusBar style={statusBarStyle === 'light-content' ? 'light' : 'dark'} />
      <RootNavigator />
    </>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
