// Task details (spec §4): title, urgency, tag, dates, plan it for, in progress, notes.
import DateTimePicker from '@react-native-community/datetimepicker';
import { router, useLocalSearchParams } from 'expo-router';
import { type ReactNode, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAppState, useStore } from '../../data/StoreContext';
import { TAGS, URGENCIES, type TaskPatch, deleteTask, updateTask } from '../../domain/tasks';
import type { BlockId, ISODate } from '../../domain/types';
import { addDays, fromISODate, toISODate } from '../../lib/dates';
import { BLOCK_NAME } from '../../lib/format';
import { Icon } from '../../ui/Icon';
import { Field, Label, PillButton, PrimaryButton, Switch } from '../../ui/kit';
import { useTheme } from '../../ui/ThemeContext';
import { Txt } from '../../ui/Txt';

type Draft = Required<Pick<TaskPatch, 'title' | 'urgency' | 'tag' | 'inProgress' | 'note'>> & {
  due: ISODate | null;
  start: ISODate | null;
  planned: { date: ISODate; block?: BlockId } | null;
};

const PLAN_BLOCKS: (BlockId | null)[] = [null, 'morning', 'afternoon', 'evening'];

export default function TaskSheet() {
  const t = useTheme();
  const s = useAppState();
  const store = useStore();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const task = id ? s.tasks[id] : undefined;
  const today = toISODate(new Date());
  const [draft, setDraft] = useState<Draft | null>(() =>
    task
      ? {
          title: task.title,
          urgency: task.urgency,
          tag: task.tag,
          inProgress: task.inProgress,
          note: task.note,
          due: task.due ?? null,
          start: task.start ?? null,
          planned: task.planned ?? null,
        }
      : null,
  );

  if (!task || !draft) {
    return (
      <View style={[styles.sheet, { backgroundColor: t.card }]}>
        <Txt size={16} color={t.ink}>
          This task is gone.
        </Txt>
      </View>
    );
  }
  const update = (patch: Partial<Draft>) => setDraft((d) => (d ? { ...d, ...patch } : d));
  const dark = t.dark || s.settings.cards === 'cocoa';

  function save() {
    store.update((st) => updateTask(st, task!.id, draft!, new Date()));
    router.back();
  }

  function remove() {
    Alert.alert('Delete this task?', 'It will be gone for good.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          store.update((st) => deleteTask(st, task!.id));
          router.back();
        },
      },
    ]);
  }

  return (
    <ScrollView style={{ backgroundColor: t.card }} contentContainerStyle={[styles.sheet, { paddingBottom: insets.bottom + 24 }]} keyboardShouldPersistTaps="handled">
      <Field value={draft.title} onChangeText={(title) => update({ title })} accessibilityLabel="Task title" style={styles.title} />

      <View style={styles.fld}>
        <Label>How urgent?</Label>
        <View style={[styles.seg, { backgroundColor: t.fieldBg }]}>
          {URGENCIES.map((u) => {
            const on = draft.urgency === u.id;
            return (
              <Pressable
                key={u.id}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                onPress={() => update({ urgency: u.id })}
                style={[styles.segBtn, on && { backgroundColor: t.accent }]}
              >
                <Txt size={14} weight={600} color={on ? t.ringInk : t.muted}>
                  {u.name}
                </Txt>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.fld}>
        <Label>Tag</Label>
        <View style={styles.wrap}>
          {TAGS.map((tag) => (
            <PillButton key={tag.id} label={tag.name} selected={draft.tag === tag.id} onPress={() => update({ tag: tag.id })} />
          ))}
        </View>
      </View>

      <View style={[styles.rows, { borderColor: t.line }]}>
        <DateRow
          label="Due date"
          sub={draft.due ? 'Moves to Now a week before' : 'Optional'}
          value={draft.due}
          fallback={addDays(today, 7)}
          dark={dark}
          onChange={(due) => update({ due })}
        />
        <DateRow label="Starts" sub="Optional" value={draft.start} fallback={addDays(today, 1)} dark={dark} onChange={(start) => update({ start })} />
        <DateRow
          label="Plan it for"
          sub="Shows up on Today"
          value={draft.planned?.date ?? null}
          fallback={today}
          dark={dark}
          onChange={(date) => update({ planned: date ? { date, ...(draft.planned?.block ? { block: draft.planned.block } : {}) } : null })}
        >
          {draft.planned ? (
            <View style={styles.wrap}>
              {PLAN_BLOCKS.map((b) => (
                <PillButton
                  key={b ?? 'any'}
                  label={b ? BLOCK_NAME[b] : 'Any time'}
                  selected={(draft.planned?.block ?? null) === b}
                  onPress={() => update({ planned: { date: draft.planned!.date, ...(b ? { block: b } : {}) } })}
                />
              ))}
            </View>
          ) : null}
        </DateRow>
        <View style={[styles.row, { borderTopWidth: 1, borderTopColor: t.line }]}>
          <Txt size={15} color={t.ink} style={{ flex: 1 }}>
            In progress
          </Txt>
          <Switch value={draft.inProgress} label="In progress" onChange={(inProgress) => update({ inProgress })} />
        </View>
      </View>

      <View style={styles.fld}>
        <Label>Notes</Label>
        <Field value={draft.note} onChangeText={(note) => update({ note })} multiline placeholder="Anything worth remembering" accessibilityLabel="Notes" style={{ minHeight: 160 }} />
      </View>

      <PrimaryButton label="Save" onPress={save} disabled={!draft.title.trim()} />
      <Pressable accessibilityRole="button" onPress={remove} style={styles.delete}>
        <Txt size={15} weight={600} color={t.cat.love}>
          Delete task
        </Txt>
      </Pressable>
    </ScrollView>
  );
}

function DateRow({
  label,
  sub,
  value,
  fallback,
  dark,
  onChange,
  children,
}: {
  label: string;
  sub: string;
  value: ISODate | null;
  fallback: ISODate;
  dark: boolean;
  onChange: (d: ISODate | null) => void;
  children?: ReactNode;
}) {
  const t = useTheme();
  return (
    <View style={[styles.dateRow, { borderTopColor: t.line }]}>
      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Txt size={15} color={t.ink}>
            {label}
          </Txt>
          <Txt size={12.5} color={t.muted}>
            {sub}
          </Txt>
        </View>
        {value ? (
          <>
            <DateTimePicker
              value={fromISODate(value)}
              mode="date"
              display="compact"
              themeVariant={dark ? 'dark' : 'light'}
              onValueChange={(_, d) => onChange(toISODate(d))}
            />
            <Pressable accessibilityRole="button" accessibilityLabel={`Clear ${label}`} onPress={() => onChange(null)} hitSlop={8} style={styles.clear}>
              <View style={{ transform: [{ rotate: '45deg' }] }}>
                <Icon name="plus" size={18} color={t.muted} />
              </View>
            </Pressable>
          </>
        ) : (
          <PillButton label="Set" onPress={() => onChange(fallback)} accessibilityLabel={`Set ${label}`} />
        )}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: { paddingHorizontal: 18, paddingTop: 22, gap: 16 },
  title: { fontSize: 20, minHeight: 52 },
  fld: { gap: 8 },
  seg: { flexDirection: 'row', gap: 4, borderRadius: 14, padding: 4 },
  segBtn: { flex: 1, minHeight: 40, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  rows: { gap: 0 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 52 },
  dateRow: { borderTopWidth: 1, paddingBottom: 6, gap: 6 },
  clear: { width: 32, height: 44, alignItems: 'center', justifyContent: 'center' },
  delete: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
});
