import 'react-native-gesture-handler';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Stack, useRouter, useSegments } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useMemo } from 'react';
import { useTheme } from '@/features/theme/themeStore';
import { StyleSheet, View, ActivityIndicator } from 'react-native';
import { useInitLock } from '@/features/security/hooks';
import { useLockStore } from '@/features/security/lockStore';
import { configureChannel } from '@/services/notifications';
import * as RecurringRepo from '@/features/recurring/repository';
import { AppState } from 'react-native';
import { useSmsAutoDetect } from '@/features/sms-import/auto-detect';
import { useInitTheme } from '@/features/theme/hooks';

export default function RootLayout() {
  const client = useMemo(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            retry: 0,
            refetchOnWindowFocus: false,
            networkMode: 'always',
          },
          mutations: { networkMode: 'always', retry: 0 },
        },
      }),
    [],
  );

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <QueryClientProvider client={client}>
          <RootGuard />
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function RootGuard() {
  const { ready, settings } = useInitLock();
  const isLocked = useLockStore((s) => s.isLocked);
  const router = useRouter();
  const segments = useSegments();
  const { resolved, palette: p } = useTheme();
  const statusBarStyle = resolved === 'dark' ? 'light' : 'dark';

  useInitTheme();
  useSmsAutoDetect();

  useEffect(() => {
    void configureChannel();
    void RecurringRepo.sweepDue();
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') void RecurringRepo.sweepDue();
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (!ready || !settings) return;
    const inOnboarding = segments[0] === '(onboarding)';
    const inLock = segments[0] === 'lock';
    const onboarded = !!settings.onboardedAt;

    if (!onboarded && !inOnboarding) {
      router.replace('/(onboarding)/welcome');
      return;
    }
    if (onboarded && isLocked && !inLock) {
      router.replace('/lock');
      return;
    }
    if (onboarded && !isLocked && inLock) {
      router.replace('/(tabs)/home');
      return;
    }
    if (onboarded && inOnboarding) {
      router.replace('/(tabs)/home');
    }
  }, [ready, settings, isLocked, segments, router]);

  if (!ready) {
    return (
      <View style={[styles.center, { backgroundColor: p.background }]}>
        <ActivityIndicator color={p.primary} />
      </View>
    );
  }

  return (
    <>
      <StatusBar style={statusBarStyle} backgroundColor={p.background} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: p.background },
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
