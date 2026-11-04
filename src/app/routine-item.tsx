// One routine item in the weekly template: title, block, time, minimum, goal, backup slot, note.
import DateTimePicker from '@react-native-community/datetimepicker';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAppState, useStore } from '../data/StoreContext';
import { type ItemPatch, editRoutine, removeItem, updateItem } from '../domain/routine';
import type { BlockId, GoalId, Minutes, Slot } from '../domain/types';
import { toISODate } from '../lib/dates';
import { BLOCK_NAME } from '../lib/format';
import { FormScroll, Field, Label, PillButton, PrimaryButton } from '../ui/kit';
import { Press } from '../ui/Press';
import { useTheme } from '../ui/ThemeContext';
import { Txt } from '../ui/Txt';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const BLOCKS: BlockId[] = ['morning', 'afternoon', 'evening', 'winddown'];
const GOALS: { id: GoalId | null; name: string }[] = [
  { id: null, name: 'None' },
  { id: 'gym', name: 'Gym' },
  { id: 'trading', name: 'Trading' },
  { id: 'cardio', name: 'Cardio' },
];
const toDate = (m: Minutes) => new Date(2000, 0, 1, Math.floor(m / 60), m % 60);
const toMinutes = (d: Date) => d.getHours() * 60 + d.getMinutes();

interface Draft { title: string; block: BlockId; time: Minutes | null; minimum: string; goal: GoalId | null; backup: Slot | null; note: string }

export default function RoutineItemSheet() {
  const t = useTheme();
  const s = useAppState();
  const store = useStore();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ weekday: string; id: string }>();
  const weekday = Number(params.weekday);
  const item = s.template.days[weekday]?.items.find((i) => i.id === params.id);
  const [d, setD] = useState<Draft | null>(() =>
    item
      ? {
          title: item.title,
          block: item.block,
          time: item.time ?? null,
          minimum: item.minimum ?? '',
          goal: item.goal ?? null,
          backup: item.backup ?? null,
          note: item.note ?? '',
        }
      : null,
  );

  if (!item || !d) {
    return (
      <View style={[styles.sheet, { backgroundColor: t.card }]}>
        <Txt size={16} color={t.ink}>
          This item is gone.
        </Txt>
      </View>
    );
  }
  const update = (patch: Partial<Draft>) => setD((x) => (x ? { ...x, ...patch } : x));
  const dark = t.dark || s.settings.cards === 'cocoa';
  const today = () => toISODate(new Date());

  function save() {
    const patch: ItemPatch = { title: d!.title, block: d!.block, time: d!.time, minimum: d!.minimum, goal: d!.goal, backup: d!.backup, note: d!.note };
    store.update((st) => editRoutine(st, today(), (x) => updateItem(x, weekday, item!.id, patch)));
    router.back();
  }

  function remove() {
    Alert.alert('Remove this item?', `It leaves the routine from today on. Past days keep it.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => {
          store.update((st) => editRoutine(st, today(), (x) => removeItem(x, weekday, item!.id)));
          router.back();
        },
      },
    ]);
  }

  return (
    <FormScroll style={{ backgroundColor: t.card }} contentContainerStyle={[styles.sheet, { paddingBottom: insets.bottom + 24 }]}>
      <Txt kind="display" weight={600} size={22} color={t.ink} accessibilityRole="header">
        {DAYS[weekday]} routine item
      </Txt>
      <Field value={d.title} onChangeText={(title) => update({ title })} accessibilityLabel="Title" />

      <Label>Block</Label>
      <View style={styles.wrap}>
        {BLOCKS.map((b) => (
          <PillButton key={b} label={BLOCK_NAME[b]} selected={d.block === b} onPress={() => update({ block: b })} />
        ))}
      </View>

      <View style={styles.line}>
        <Txt size={15} color={t.ink} style={{ flex: 1 }}>
          Time
        </Txt>
        {d.time !== null ? (
          <>
            <DateTimePicker
              value={toDate(d.time)}
              mode="time"
              display="compact"
              minuteInterval={5}
              themeVariant={dark ? 'dark' : 'light'}
              onValueChange={(_, date) => update({ time: toMinutes(date) })}
            />
            <PillButton label="Clear" onPress={() => update({ time: null })} />
          </>
        ) : (
          <PillButton label="Set" onPress={() => update({ time: 7 * 60 })} />
        )}
      </View>

      <Label>Minimum</Label>
      <Field value={d.minimum} onChangeText={(minimum) => update({ minimum })} placeholder="e.g. 5 minutes" accessibilityLabel="Minimum" />

      <Label>Counts toward</Label>
      <View style={styles.wrap}>
        {GOALS.map((g) => (
          <PillButton key={g.name} label={g.name} selected={d.goal === g.id} onPress={() => update({ goal: g.id })} />
        ))}
      </View>

      <Label>Backup slot</Label>
      <View style={styles.wrap}>
        <PillButton label="None" selected={d.backup === null} onPress={() => update({ backup: null })} />
        {DAYS.map((name, i) => (
          <PillButton
            key={name}
            label={name}
            selected={d.backup?.weekday === i}
            onPress={() => update({ backup: { weekday: i, block: d.backup?.block ?? d.block } })}
            style={{ paddingHorizontal: 10 }}
          />
        ))}
      </View>
      {d.backup ? (
        <View style={styles.wrap}>
          {BLOCKS.map((b) => (
            <PillButton key={b} label={BLOCK_NAME[b]} selected={d.backup?.block === b} onPress={() => update({ backup: { weekday: d.backup!.weekday, block: b } })} />
          ))}
        </View>
      ) : null}
      {d.backup && d.backup.weekday <= weekday ? (
        <Txt size={12.5} color={t.muted}>
          A backup earlier in the week than {DAYS[weekday]} will never be offered.
        </Txt>
      ) : null}

      <Label>Note</Label>
      <Field value={d.note} onChangeText={(note) => update({ note })} multiline placeholder="Optional" accessibilityLabel="Note" />

      <PrimaryButton label="Save" onPress={save} disabled={!d.title.trim()} />
      <Press accessibilityRole="button" onPress={remove} style={styles.delete}>
        <Txt size={15} weight={600} color={t.cat.love}>
          Remove item
        </Txt>
      </Press>
    </FormScroll>
  );
}

const styles = StyleSheet.create({
  sheet: { paddingHorizontal: 18, paddingTop: 22, gap: 10 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  line: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 48 },
  delete: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
});
