import { Redirect, Stack, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppProvider, useApp } from '@/store/AppProvider';
import { colors } from '@/theme';

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync().catch(() => undefined);
  }, []);

  return (
    <SafeAreaProvider>
      <AppProvider>
        <StatusBar style="dark" />
        <AppNavigator />
      </AppProvider>
    </SafeAreaProvider>
  );
}

function AppNavigator() {
  const { hydrated, account } = useApp();
  const segments = useSegments();

  if (!hydrated) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="small" color={colors.inkSoft} />
      </View>
    );
  }

  if (!account.onboardingCompleted && segments[0] !== 'onboarding') {
    return <Redirect href="/onboarding" />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.snow },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="ride/[id]" />
      <Stack.Screen name="apply/[id]" />
      <Stack.Screen name="owner/[id]" />
      <Stack.Screen name="notifications" />
      <Stack.Screen name="account" />
      <Stack.Screen name="onboarding" options={{ animation: 'fade' }} />
    </Stack>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.snow,
  },
});
