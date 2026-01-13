import React, { useCallback, useEffect, useState } from 'react';
import { LogBox } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as ExpoSplashScreen from 'expo-splash-screen';
import 'react-native-gesture-handler';
import Mapbox from '@rnmapbox/maps';

// Disable LogBox warnings in development
LogBox.ignoreAllLogs(true);
import { ThemeProvider, useTheme } from './src/contexts/ThemeContext';
import RootNavigator from './src/navigation/RootNavigator';
import { SplashScreen } from './src/components/SplashScreen';
import { MAPBOX_ACCESS_TOKEN } from './src/config/mapbox';
import { ONESIGNAL_APP_ID } from './src/config/onesignal';
import { pushNotificationService } from './src/services/pushNotifications';
import { configureGoogleSignIn } from './src/services/auth';

Mapbox.setAccessToken(MAPBOX_ACCESS_TOKEN);

// Initialize OneSignal
if (ONESIGNAL_APP_ID && ONESIGNAL_APP_ID !== 'YOUR_ONESIGNAL_APP_ID') {
  pushNotificationService.initialize(ONESIGNAL_APP_ID);
}

// Configure Google Sign In
configureGoogleSignIn();

ExpoSplashScreen.preventAutoHideAsync();

function AppContent() {
  const { statusBarStyle } = useTheme();
  const [showSplash, setShowSplash] = useState(true);
  const [appIsReady, setAppIsReady] = useState(false);

  useEffect(() => {
    async function prepare() {
      try {
        await ExpoSplashScreen.hideAsync();
      } finally {
        setAppIsReady(true);
      }
    }
    prepare();
  }, []);

  const handleSplashComplete = useCallback(() => {
    setShowSplash(false);
  }, []);

  if (!appIsReady) {
    return null;
  }

  return (
    <>
      <StatusBar style={statusBarStyle === 'light-content' ? 'light' : 'dark'} />
      <RootNavigator />
      {showSplash && <SplashScreen onAnimationComplete={handleSplashComplete} />}
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
