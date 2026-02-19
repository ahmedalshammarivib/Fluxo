import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { enableFreeze } from 'react-native-screens';
import * as SplashScreen from 'expo-splash-screen';

// Disable enableFreeze to fix "Expected static flag was missing" error in React 19
// caused by conflict with react-native-screens optimization
enableFreeze(false);
import { ErrorBoundary } from '@/components/ErrorBoundary';
import LanguageManager from '@/utils/languageManager';
import NotificationManager from '@/utils/notificationManager';
import FirstLaunchManager from '@/utils/firstLaunchManager';
import { useBrowserStore } from '@/store/browserStore';
import { logger } from '@/utils/logger';
import { initializeGlobalErrorHandling } from '@/utils/GlobalErrorHandler';
import '@/utils/i18n'; // Initialize i18n system
import { router } from 'expo-router';

// Prevent splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

// Initialize global error handling as early as possible
initializeGlobalErrorHandling();

export default function RootLayout() {
  useFrameworkReady();

  // Initialize language and notification systems on app startup
  useEffect(() => {
    const initializeSystems = async () => {
      try {
        await LanguageManager.initialize();
        // Initialize notification handler (safe, no permission request)
        await NotificationManager.initialize();
        
        // Check for first launch
        const hasOnboarded = await FirstLaunchManager.hasCompletedOnboarding();
        if (!hasOnboarded) {
          // Use setTimeout to ensure navigation is ready
          setTimeout(() => {
            router.replace('/onboarding');
          }, 100);
        }
        
        // Hide splash screen after initialization
        await SplashScreen.hideAsync();
      } catch (error) {
        logger.error('Failed to initialize app systems', error);
        // Hide splash screen even if initialization fails
        await SplashScreen.hideAsync();
      }
    };

    initializeSystems();
  }, []);

  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="onboarding" options={{ headerShown: false, animation: 'fade' }} />
          <Stack.Screen name="+not-found" />
        </Stack>
        <StatusBar style="auto" />
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}
