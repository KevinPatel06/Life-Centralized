import { Tabs, router } from 'expo-router';
import type { BottomTabBarProps } from 'expo-router/tabs';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon, type IconName } from '../../ui/Icon';
import { shadow } from '../../ui/kit';
import { useTheme } from '../../ui/ThemeContext';
import { Txt } from '../../ui/Txt';

const TABS: ({ name: string; label: string; icon: IconName } | 'add')[] = [
  { name: 'index', label: 'Today', icon: 'sun' },
  { name: 'priorities', label: 'Priorities', icon: 'list' },
  'add',
  { name: 'week', label: 'Week', icon: 'cal' },
  { name: 'notes', label: 'Notes', icon: 'note' },
];

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }} tabBar={(props) => <TabBar {...props} />}>
      <Tabs.Screen name="index" options={{ title: 'Today' }} />
      <Tabs.Screen name="priorities" options={{ title: 'Priorities' }} />
      <Tabs.Screen name="week" options={{ title: 'Week' }} />
      <Tabs.Screen name="notes" options={{ title: 'Notes' }} />
    </Tabs>
  );
}

/** The mockup's floating, rounded tab bar with the + in the middle. The + opens Quick add as a sheet. */
function TabBar({ state, navigateToTab }: BottomTabBarProps) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const current = state.routes[state.index]?.name;
  return (
    <View style={[styles.bar, { bottom: Math.max(insets.bottom - 8, 12), backgroundColor: t.tabBg }, shadow(t)]}>
      {TABS.map((tab) => {
        if (tab === 'add') {
          return (
            <View key="add" style={styles.slot}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Quick add"
                onPress={() => router.push('/quick-add')}
                style={({ pressed }) => [styles.fab, { backgroundColor: t.fabBg, opacity: pressed ? 0.85 : 1 }]}
              >
                <Icon name="plus" size={26} strokeWidth={2.6} color={t.fabInk} />
              </Pressable>
            </View>
          );
        }
        const on = current === tab.name;
        const color = on ? t.tabOn : t.tabInk;
        return (
          <Pressable
            key={tab.name}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            accessibilityLabel={tab.label}
            onPress={() => {
              const route = state.routes.find((r) => r.name === tab.name);
              if (!on && route) navigateToTab(route.key);
            }}
            style={styles.tab}
          >
            <Icon name={tab.icon} size={22} color={color} />
            <Txt size={11} weight={on ? 600 : 500} color={color}>
              {tab.label}
            </Txt>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { position: 'absolute', left: 12, right: 12, height: 74, borderRadius: 28, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 4 },
  tab: { flex: 1, minHeight: 52, alignItems: 'center', justifyContent: 'center', gap: 4 },
  slot: { width: 72, alignItems: 'center' },
  fab: { width: 56, height: 56, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
});
