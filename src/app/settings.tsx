import { router } from 'expo-router';
import { type ReactNode, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { shareBackup, pickBackup } from '../data/backupFiles';
import { syncNow } from '../data/calendarSync';
import { useAppState, useStore } from '../data/StoreContext';
import { calendarGroups } from '../domain/calendar';
import { startOfDay } from '../domain/lifecycle';
import { restoreFlow, setBackground, setCards, setCharcoalInDark, setGoalTarget } from '../domain/settings';
import type { GoalId } from '../domain/types';
import { toISODate } from '../lib/dates';
import { haptic } from '../ui/haptics';
import { Icon } from '../ui/Icon';
import { BackLink, Card, Screen, Switch, shadow } from '../ui/kit';
import { Press } from '../ui/Press';
import { BACKGROUNDS, CARDS, resolveTheme } from '../ui/theme';
import { useTheme } from '../ui/ThemeContext';
import { Txt } from '../ui/Txt';

const GOALS: { id: GoalId; name: string }[] = [
  { id: 'gym', name: 'Gym' },
  { id: 'trading', name: 'Trading' },
  { id: 'cardio', name: 'Cardio' },
];

const message = (e: unknown) => (e instanceof Error ? e.message : String(e));

type SyncState = 'idle' | 'syncing' | 'synced' | 'denied' | 'failed';
const SYNC_DETAIL: Record<SyncState, string> = {
  idle: 'Pull in new iPhone events',
  syncing: 'Syncing…',
  synced: 'Synced just now',
  denied: 'No calendar access',
  failed: "Couldn't sync",
};

export default function Settings() {
  const t = useTheme();
  const s = useAppState();
  const store = useStore();
  const [goalsOpen, setGoalsOpen] = useState(false);
  const [sync, setSync] = useState<SyncState>('idle');
  const cardHex = resolveTheme(s.settings, 'light').card;

  async function syncCalendar() {
    if (sync === 'syncing') return;
    setSync('syncing');
    try {
      const result = await syncNow(store, new Date());
      setSync(result);
      if (result === 'synced') haptic.success();
    } catch (e) {
      console.warn('Calendar sync failed', e);
      setSync('failed');
    }
  }

  async function backUp() {
    try {
      await shareBackup(store.getState());
    } catch (e) {
      Alert.alert('Backup failed', message(e));
    }
  }

  async function restore() {
    let step;
    try {
      step = restoreFlow(await pickBackup());
    } catch (e) {
      Alert.alert('Not restored', message(e));
      return;
    }
    if (step.kind === 'cancelled') return;
    if (step.kind === 'error') {
      Alert.alert('Not restored', step.message);
      return;
    }
    const { state, summary } = step;
    Alert.alert('Restore this backup?', `Replace everything on this phone with this backup? It has ${summary}.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Replace',
        style: 'destructive',
        onPress: async () => {
          try {
            await store.replace(startOfDay(state, toISODate(new Date())));
            Alert.alert('Restored', `Loaded ${summary}.`);
          } catch (e) {
            Alert.alert('Restore failed', message(e));
          }
        },
      },
    ]);
  }

  return (
    <Screen tabBar={false}>
      <BackLink label="Today" onPress={() => router.back()} />
      <Txt kind="display" weight={700} size={40}>
        Settings
      </Txt>

      <Section>Theme</Section>
      <Card>
        <Txt size={13} weight={600} color={t.muted}>
          Background
        </Txt>
        <View style={styles.grid}>
          {BACKGROUNDS.map((b) => {
            const on = s.settings.background === b.id;
            return (
              <Press
                key={b.id}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                accessibilityLabel={`${b.name} background`}
                onPress={() => {
                  haptic.select();
                  store.update((st) => setBackground(st, b.id));
                }}
                style={[styles.swatch, { backgroundColor: t.fieldBg, borderColor: on ? t.accent : 'transparent' }]}
              >
                <View style={[styles.preview, { backgroundColor: b.swatch }]}>
                  <View style={[styles.bar, { backgroundColor: cardHex }]} />
                  <View style={[styles.bar, styles.barShort, { backgroundColor: cardHex }]} />
                </View>
                <Txt size={12.5} weight={600} color={t.ink}>
                  {b.name}
                </Txt>
              </Press>
            );
          })}
        </View>
        <Txt size={13} weight={600} color={t.muted}>
          Cards
        </Txt>
        <View style={styles.grid}>
          {CARDS.map((c) => {
            const on = s.settings.cards === c.id;
            return (
              <Press
                key={c.id}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                accessibilityLabel={`${c.name} cards`}
                onPress={() => {
                  haptic.select();
                  store.update((st) => setCards(st, c.id));
                }}
                style={[styles.swatch, styles.swatchRow, { backgroundColor: t.fieldBg, borderColor: on ? t.accent : 'transparent' }]}
              >
                <View style={[styles.cardDot, { backgroundColor: c.swatch, borderColor: c.accent }]} />
                <Txt size={14} weight={600} color={t.ink}>
                  {c.name}
                </Txt>
              </Press>
            );
          })}
        </View>
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Txt size={15} color={t.ink}>
              Use Charcoal in Dark Mode
            </Txt>
            <Txt size={12.5} color={t.muted}>
              Switches when your iPhone does
            </Txt>
          </View>
          <Switch
            value={s.settings.charcoalInDark}
            label="Use Charcoal when iPhone is in Dark Mode"
            onChange={(on) => store.update((st) => setCharcoalInDark(st, on))}
          />
        </View>
      </Card>

      <Section>More</Section>
      <View style={[styles.links, { backgroundColor: t.card }, shadow(t)]}>
        <LinkRow
          first
          label="Weekly goals"
          detail={GOALS.map((g) => `${g.name} ${s.goalTargets[g.id]}`).join(' · ')}
          onPress={() => {
            haptic.select();
            setGoalsOpen((o) => !o);
          }}
          expanded={goalsOpen}
        />
        {goalsOpen ? (
          <View style={{ paddingBottom: 8 }}>
            {GOALS.map((g) => (
              <View key={g.id} style={styles.stepRow}>
                <Txt size={15} color={t.ink} style={{ flex: 1 }}>
                  {g.name}
                </Txt>
                <StepButton label={`Fewer ${g.name}`} icon="minus" onPress={() => store.update((st) => setGoalTarget(st, g.id, st.goalTargets[g.id] - 1))} />
                <Txt kind="display" weight={600} size={22} color={t.ink} style={styles.stepValue}>
                  {s.goalTargets[g.id]}
                </Txt>
                <StepButton label={`More ${g.name}`} icon="plus" onPress={() => store.update((st) => setGoalTarget(st, g.id, st.goalTargets[g.id] + 1))} />
              </View>
            ))}
            <Txt size={12.5} color={t.muted}>
              Times per week, Monday to Sunday.
            </Txt>
          </View>
        ) : null}
        <LinkRow label="Routine blocks" detail="Mon – Sun" onPress={() => router.push('/routine')} />
        <LinkRow
          label="iPhone calendar"
          detail={s.calendar.imported ? `${calendarGroups(s).kept} events kept` : 'Not imported yet'}
          onPress={() => router.push('/calendar')}
        />
        {s.calendar.imported ? <LinkRow label="Sync iPhone calendar now" detail={SYNC_DETAIL[sync]} onPress={syncCalendar} icon="none" /> : null}
        <LinkRow label="Back up my data" detail="Save to Files" onPress={backUp} />
        <LinkRow label="Restore from a backup" detail="Replaces this phone's data" onPress={restore} />
      </View>
    </Screen>
  );
}

function Section({ children }: { children: ReactNode }) {
  const t = useTheme();
  return (
    <Txt size={12} weight={600} color={t.onBgMuted} style={styles.section}>
      {String(children).toUpperCase()}
    </Txt>
  );
}

function LinkRow({
  label,
  detail,
  onPress,
  first = false,
  expanded,
  icon = 'right',
}: {
  label: string;
  detail?: string;
  onPress: () => void;
  first?: boolean;
  expanded?: boolean;
  /** 'none' for rows that do something in place rather than open a page. */
  icon?: 'right' | 'none';
}) {
  const t = useTheme();
  return (
    <Press
      accessibilityRole="button"
      accessibilityState={expanded === undefined ? undefined : { expanded }}
      onPress={onPress}
      dip={0.98}
      style={[styles.link, { borderTopWidth: first ? 0 : 1, borderTopColor: t.line }]}
    >
      <Txt size={15} color={t.ink} style={{ flex: 1 }}>
        {label}
      </Txt>
      {detail ? (
        <Txt size={13} color={t.muted} numberOfLines={1} style={{ flexShrink: 1 }}>
          {detail}
        </Txt>
      ) : null}
      {icon === 'right' ? <Icon name="right" size={18} color={t.muted} /> : null}
    </Press>
  );
}

function StepButton({ label, icon, onPress }: { label: string; icon: 'minus' | 'plus'; onPress: () => void }) {
  const t = useTheme();
  return (
    <Press
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={() => {
        haptic.select();
        onPress();
      }}
      dip={0.88}
      style={[styles.step, { backgroundColor: t.fieldBg }]}
    >
      {icon === 'plus' ? (
        <Icon name="plus" size={18} color={t.ink} strokeWidth={2.4} />
      ) : (
        <View style={{ width: 14, height: 2.4, borderRadius: 2, backgroundColor: t.ink }} />
      )}
    </Press>
  );
}

const styles = StyleSheet.create({
  section: { marginTop: 6, marginBottom: -6, marginLeft: 4, letterSpacing: 0.7 },
  grid: { flexDirection: 'row', gap: 8 },
  swatch: { flex: 1, borderWidth: 2, borderRadius: 16, padding: 6, paddingBottom: 8, alignItems: 'center', gap: 6 },
  swatchRow: { flexDirection: 'row', minHeight: 52, paddingRight: 10, justifyContent: 'flex-start' },
  preview: { alignSelf: 'stretch', height: 52, borderRadius: 11, padding: 6, gap: 4, justifyContent: 'flex-end', borderWidth: 1, borderColor: 'rgba(0,0,0,0.12)' },
  bar: { height: 12, borderRadius: 5 },
  barShort: { width: '55%', height: 7 },
  cardDot: { width: 36, height: 36, borderRadius: 11, borderWidth: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 44 },
  links: { borderRadius: 22, paddingHorizontal: 14 },
  link: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 52 },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 48 },
  stepValue: { minWidth: 32, textAlign: 'center' },
  step: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
});
