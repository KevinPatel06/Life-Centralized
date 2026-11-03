// iPhone calendar (spec §4): import, then keep or hide whole calendars and single events.
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { importFromPhone } from '../data/calendarSync';
import { useAppState, useStore } from '../data/StoreContext';
import { calendarGroups, setCalendarKept, setEventKept } from '../domain/calendar';
import { Icon } from '../ui/Icon';
import { BackLink, PrimaryButton, Switch } from '../ui/kit';
import { useTheme } from '../ui/ThemeContext';
import { Txt } from '../ui/Txt';

export default function CalendarScreen() {
  const t = useTheme();
  const s = useAppState();
  const store = useStore();
  const insets = useSafeAreaInsets();
  const [status, setStatus] = useState<'idle' | 'working' | 'denied'>('idle');
  const { groups, kept, total } = useMemo(() => calendarGroups(s), [s]);
  const imported = s.calendar.imported;

  async function doImport() {
    setStatus('working');
    try {
      const result = await importFromPhone(store, new Date());
      setStatus(result === 'denied' ? 'denied' : 'idle');
    } catch (e) {
      setStatus('idle');
      Alert.alert("Couldn't read your calendars", e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 16, paddingHorizontal: 18, paddingBottom: 140, gap: 14 }}>
        <BackLink label="Settings" onPress={() => router.back()} />
        <Txt kind="display" weight={700} size={34} accessibilityRole="header">
          iPhone calendar
        </Txt>
        <Txt size={14} color={t.onBgMuted}>
          Everything from this week and the next 8 is here. Turn off a whole calendar, or uncheck single events.
        </Txt>

        {status === 'denied' ? (
          <Txt size={14} color={t.ink} style={[styles.notice, { backgroundColor: t.card }]}>
            Calendar access is off. Turn it on in the iPhone Settings app under Life Centralized (or LiveContainer), then try again.
          </Txt>
        ) : null}

        {!imported || status === 'denied' ? (
          <PrimaryButton label={status === 'working' ? 'Reading your calendars…' : 'Import from iPhone'} onPress={doImport} disabled={status === 'working'} />
        ) : null}

        {groups.map((g) => (
          <View key={g.id} style={[styles.section, { borderTopColor: t.bgLine }]}>
            <View style={styles.head}>
              <View style={[styles.dot, { backgroundColor: g.color }]} />
              <Txt kind="display" weight={600} size={19} style={{ flex: 1 }} numberOfLines={1}>
                {g.title}
              </Txt>
              <Txt size={13} color={t.onBgMuted}>
                {g.kept} of {g.total}
              </Txt>
              <Switch value={g.on} label={`Keep ${g.title}`} onChange={(on) => store.update((st) => setCalendarKept(st, g.id, on))} />
            </View>
            {g.events.map((e) => (
              <Pressable
                key={e.key}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: e.kept, disabled: !g.on }}
                disabled={!g.on}
                onPress={() => store.update((st) => setEventKept(st, e.key, !e.kept))}
                style={[styles.row, { opacity: g.on ? 1 : 0.45 }]}
              >
                <View style={[styles.mk, { borderColor: e.kept ? t.doneCheck : t.onBgMuted, backgroundColor: e.kept ? t.doneCheck : 'transparent' }]}>
                  {e.kept ? <Icon name="check" size={12} color={t.dark ? '#1C2620' : '#FFFFFF'} strokeWidth={3.5} /> : null}
                </View>
                <View style={{ flex: 1 }}>
                  <Txt size={14.5} weight={500} color={e.kept ? t.onBg : t.onBgMuted}>
                    {e.title}
                  </Txt>
                  <Txt size={12.5} color={t.onBgMuted}>
                    {e.when}
                  </Txt>
                </View>
              </Pressable>
            ))}
            {g.events.length === 0 ? (
              <Txt size={13} color={t.onBgMuted}>
                Nothing in the next 8 weeks.
              </Txt>
            ) : null}
          </View>
        ))}

        {imported ? (
          <Txt size={13} color={t.onBgMuted}>
            New events in calendars you keep come in on their own. Your plans go to a calendar called Centralized, which isn&apos;t imported back.
          </Txt>
        ) : null}
      </ScrollView>

      {imported ? (
        <View style={[styles.keepBar, { paddingBottom: insets.bottom + 12, backgroundColor: t.bg }]}>
          <PrimaryButton label={`Keep ${kept} of ${total} events`} onPress={() => router.back()} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  notice: { borderRadius: 16, padding: 14, overflow: 'hidden' },
  section: { borderTopWidth: 2, paddingTop: 10, paddingBottom: 8, paddingHorizontal: 2 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 48 },
  dot: { width: 12, height: 12, borderRadius: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 48, paddingVertical: 4, paddingHorizontal: 2 },
  mk: { width: 20, height: 20, borderRadius: 7, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  keepBar: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 14, paddingTop: 12 },
});
