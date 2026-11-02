import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { AppState, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { bootState, refreshDay } from '../data/boot';
import { openAppDb } from '../data/openDb';
import { type Store, createStore } from '../data/store';
import { StoreProvider } from '../data/StoreContext';
import { toISODate } from '../lib/dates';
import { FONT_ASSETS } from '../ui/fonts';
import { useTheme } from '../ui/ThemeContext';

export default function RootLayout() {
  const [fontsLoaded] = useFonts(FONT_ASSETS);
  const [store, setStore] = useState<Store | null>(null);
  const [failure, setFailure] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const s = await createStore(await openAppDb());
        bootState(s, new Date());
        if (alive) setStore(s);
      } catch (e) {
        if (alive) setFailure(e instanceof Error ? e.message : String(e));
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!store) return;
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') refreshDay(store, new Date());
    });
    // Roll the day over at midnight even if the app stays open.
    let day = toISODate(new Date());
    const tick = setInterval(() => {
      const today = toISODate(new Date());
      if (today !== day) {
        day = today;
        refreshDay(store, new Date());
      }
    }, 60_000);
    return () => {
      sub.remove();
      clearInterval(tick);
    };
  }, [store]);

  if (failure) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', padding: 24, backgroundColor: '#F8F4ED' }}>
        <Text style={{ fontSize: 17, color: '#2A241D' }}>Life Centralized couldn&apos;t open its data.</Text>
        <Text style={{ marginTop: 8, color: '#6A6052' }}>{failure}</Text>
      </View>
    );
  }
  if (!fontsLoaded || !store) return null;

  return (
    <SafeAreaProvider>
      <StoreProvider store={store}>
        <AppStack />
      </StoreProvider>
    </SafeAreaProvider>
  );
}

function AppStack() {
  const t = useTheme();
  const sheet = {
    presentation: 'formSheet' as const,
    sheetGrabberVisible: true,
    sheetCornerRadius: 26,
    contentStyle: { backgroundColor: t.card },
  };
  return (
    <>
      <StatusBar style={t.dark ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: t.bg } }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="settings" />
        <Stack.Screen name="quick-add" options={{ ...sheet, sheetAllowedDetents: 'fitToContents' }} />
        <Stack.Screen name="plan" options={{ ...sheet, sheetAllowedDetents: [1] }} />
        <Stack.Screen name="checkin/[date]" options={{ ...sheet, sheetAllowedDetents: [1] }} />
      </Stack>
    </>
  );
}
