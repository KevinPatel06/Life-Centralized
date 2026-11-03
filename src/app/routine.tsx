// Settings → Routine blocks: the weekly template, one weekday at a time. Edits apply from today on.
import DateTimePicker from '@react-native-community/datetimepicker';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { useAppState, useStore } from '../data/StoreContext';
import {
  addItem,
  addStandingPlan,
  editRoutine,
  removeStandingPlan,
  sameTimesEveryDay,
  setBedtime,
  setBlockLabel,
  setBlockStart,
  setDayInfo,
} from '../domain/routine';
import type { AppState, BlockId, Minutes, TemplateItem } from '../domain/types';
import { toISODate } from '../lib/dates';
import { BLOCK_NAME, clock } from '../lib/format';
import { Icon } from '../ui/Icon';
import { BackLink, Card, Field, Label, PillButton, Screen } from '../ui/kit';
import { useTheme } from '../ui/ThemeContext';
import { Txt } from '../ui/Txt';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const GOAL_NAME = { gym: 'Gym', trading: 'Trading', cardio: 'Cardio' } as const;
const toDate = (m: Minutes) => new Date(2000, 0, 1, Math.floor(m / 60), m % 60);
const toMinutes = (d: Date) => d.getHours() * 60 + d.getMinutes();

export default function RoutineScreen() {
  const t = useTheme();
  const s = useAppState();
  const store = useStore();
  const [weekday, setWeekday] = useState(() => (new Date().getDay() + 6) % 7);
  const day = s.template.days[weekday];
  const dark = t.dark || s.settings.cards === 'cocoa';

  /** Apply an edit; returns false when the rules refused it. */
  const edit = (fn: (st: AppState) => AppState): boolean => {
    const before = store.getState();
    store.update((st) => editRoutine(st, toISODate(new Date()), fn));
    return store.getState() !== before;
  };

  return (
    <Screen tabBar={false}>
      <BackLink label="Settings" onPress={() => router.back()} />
      <Txt kind="display" weight={700} size={34} accessibilityRole="header">
        Routine blocks
      </Txt>
      <Txt size={14} color={t.onBgMuted}>
        Changes apply from today on. Past days keep what they had.
      </Txt>

      <View style={styles.days}>
        {DAYS.map((name, i) => (
          <PillButton key={name} label={name} selected={weekday === i} onPress={() => setWeekday(i)} style={styles.dayChip} />
        ))}
      </View>

      <DayInfo key={`info-${weekday}`} label={day.label ?? ''} note={day.note ?? ''} onSave={(info) => edit((st) => setDayInfo(st, weekday, info))} />

      <Card>
        <Label>Blocks</Label>
        {day.blocks.map((b) => (
          <View key={b.id} style={[styles.blockRow, { borderTopColor: t.line }]}>
            <View style={styles.line}>
              <Txt size={15} weight={600} color={t.ink} style={{ flex: 1 }}>
                {BLOCK_NAME[b.id]}
              </Txt>
              <Txt size={13} color={t.muted}>
                starts
              </Txt>
              <DateTimePicker
                value={toDate(b.start)}
                mode="time"
                display="compact"
                minuteInterval={5}
                themeVariant={dark ? 'dark' : 'light'}
                onValueChange={(_, d) => {
                  if (!edit((st) => setBlockStart(st, weekday, b.id, toMinutes(d)))) {
                    Alert.alert('That time doesn’t fit', 'Each block has to start after the one before it and before the one after it.');
                  }
                }}
              />
            </View>
            <BlockLabel
              key={`label-${weekday}-${b.id}`}
              value={b.label ?? ''}
              onSave={(label) => edit((st) => setBlockLabel(st, weekday, b.id, label))}
            />
            {b.id === 'winddown' ? (
              <View style={styles.line}>
                <Txt size={15} color={t.ink} style={{ flex: 1 }}>
                  Bedtime
                </Txt>
                {b.end !== null ? (
                  <>
                    <DateTimePicker
                      value={toDate(Math.min(b.end, 1439))}
                      mode="time"
                      display="compact"
                      minuteInterval={5}
                      themeVariant={dark ? 'dark' : 'light'}
                      onValueChange={(_, d) => {
                        if (!edit((st) => setBedtime(st, weekday, toMinutes(d)))) {
                          Alert.alert('That time doesn’t fit', 'Bedtime has to be after Wind down starts.');
                        }
                      }}
                    />
                    <PillButton label="Clear" onPress={() => edit((st) => setBedtime(st, weekday, null))} />
                  </>
                ) : (
                  <PillButton label="Set" onPress={() => edit((st) => setBedtime(st, weekday, Math.min(b.start + 120, 1435)))} />
                )}
              </View>
            ) : null}
          </View>
        ))}
        <Pressable
          accessibilityRole="button"
          onPress={() =>
            Alert.alert('Use these times every day?', `Every day gets ${DAYS[weekday]}'s block times and labels. Items stay where they are.`, [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Use them', onPress: () => edit((st) => sameTimesEveryDay(st, weekday)) },
            ])
          }
          style={styles.textBtn}
        >
          <Txt size={14} weight={600} color={t.accent}>
            Use these times every day
          </Txt>
        </Pressable>
      </Card>

      {day.blocks.map((b) => (
        <ItemsCard key={`${weekday}-${b.id}`} weekday={weekday} block={b.id} items={day.items.filter((i) => i.block === b.id)} edit={edit} />
      ))}

      <StandingPlans key={`plans-${weekday}`} weekday={weekday} plans={day.plans} edit={edit} />
    </Screen>
  );
}

function DayInfo({ label, note, onSave }: { label: string; note: string; onSave: (info: { label?: string; note?: string }) => void }) {
  const [l, setL] = useState(label);
  const [n, setN] = useState(note);
  return (
    <Card>
      <Label>Day label</Label>
      <Field value={l} onChangeText={setL} onEndEditing={() => onSave({ label: l })} placeholder="e.g. Office" accessibilityLabel="Day label" />
      <Label>Day note</Label>
      <Field value={n} onChangeText={setN} onEndEditing={() => onSave({ note: n })} placeholder="e.g. Catch-up day" accessibilityLabel="Day note" />
    </Card>
  );
}

function BlockLabel({ value, onSave }: { value: string; onSave: (label: string) => void }) {
  const [text, setText] = useState(value);
  return (
    <Field
      value={text}
      onChangeText={setText}
      onEndEditing={() => onSave(text)}
      placeholder="Label when nothing's planned, e.g. Work"
      accessibilityLabel="Block label"
      style={{ minHeight: 44, fontSize: 14 }}
    />
  );
}

function summary(item: TemplateItem): string {
  return [item.time !== undefined ? clock(item.time) : null, item.minimum, item.goal ? GOAL_NAME[item.goal] : null, item.backup ? `Backup ${DAYS[item.backup.weekday]}` : null]
    .filter(Boolean)
    .join(' · ');
}

function ItemsCard({ weekday, block, items, edit }: { weekday: number; block: BlockId; items: TemplateItem[]; edit: (fn: (s: AppState) => AppState) => boolean }) {
  const t = useTheme();
  const [title, setTitle] = useState('');
  const add = () => {
    if (!title.trim()) return;
    edit((st) => addItem(st, weekday, block, title).state);
    setTitle('');
  };
  return (
    <Card>
      <Label>{BLOCK_NAME[block]}</Label>
      {items.map((item) => (
        <Pressable
          key={item.id}
          accessibilityRole="button"
          accessibilityHint="Edit this item"
          onPress={() => router.push({ pathname: '/routine-item', params: { weekday: String(weekday), id: item.id } })}
          style={[styles.item, { backgroundColor: t.fieldBg }]}
        >
          <View style={{ flex: 1 }}>
            <Txt size={15} weight={600} color={t.ink}>
              {item.title}
            </Txt>
            {summary(item) ? (
              <Txt size={12.5} color={t.muted}>
                {summary(item)}
              </Txt>
            ) : null}
          </View>
          <Icon name="right" size={18} color={t.muted} />
        </Pressable>
      ))}
      <View style={styles.addRow}>
        <Field value={title} onChangeText={setTitle} onSubmitEditing={add} returnKeyType="done" placeholder={`Add to ${BLOCK_NAME[block]}`} style={{ flex: 1 }} accessibilityLabel={`New item for ${BLOCK_NAME[block]}`} />
        <Pressable accessibilityRole="button" accessibilityLabel={`Add to ${BLOCK_NAME[block]}`} onPress={add} style={[styles.addBtn, { backgroundColor: t.fabBg }]}>
          <Icon name="plus" size={20} color={t.fabInk} strokeWidth={2.6} />
        </Pressable>
      </View>
    </Card>
  );
}

function StandingPlans({
  weekday,
  plans,
  edit,
}: {
  weekday: number;
  plans: AppState['template']['days'][number]['plans'];
  edit: (fn: (s: AppState) => AppState) => boolean;
}) {
  const t = useTheme();
  const [title, setTitle] = useState('');
  const [block, setBlock] = useState<BlockId>('evening');
  const add = () => {
    if (!title.trim()) return;
    edit((st) => addStandingPlan(st, weekday, title, block, 'other').state);
    setTitle('');
  };
  return (
    <Card>
      <Label>Standing plans</Label>
      {plans.map((p) => (
        <View key={p.id} style={[styles.item, { backgroundColor: t.fieldBg }]}>
          <View style={{ flex: 1 }}>
            <Txt size={15} weight={600} color={t.ink}>
              {p.title}
            </Txt>
            <Txt size={12.5} color={t.muted}>
              {p.when.kind === 'block' ? BLOCK_NAME[p.when.block] : ''}
            </Txt>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel={`Remove ${p.title}`} onPress={() => edit((st) => removeStandingPlan(st, weekday, p.id))} hitSlop={8} style={styles.remove}>
            <View style={{ transform: [{ rotate: '45deg' }] }}>
              <Icon name="plus" size={18} color={t.muted} />
            </View>
          </Pressable>
        </View>
      ))}
      <Field value={title} onChangeText={setTitle} placeholder="Add a standing plan" accessibilityLabel="New standing plan" />
      <View style={styles.chips}>
        {(['morning', 'afternoon', 'evening'] as const).map((b) => (
          <PillButton key={b} label={BLOCK_NAME[b]} selected={block === b} onPress={() => setBlock(b)} style={{ flex: 1 }} />
        ))}
      </View>
      <PillButton label="Add plan" onPress={add} icon="plus" />
    </Card>
  );
}

const styles = StyleSheet.create({
  days: { flexDirection: 'row', gap: 4 },
  dayChip: { flex: 1, paddingHorizontal: 0 },
  blockRow: { borderTopWidth: 1, paddingTop: 8, gap: 6 },
  line: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44 },
  textBtn: { minHeight: 44, justifyContent: 'center' },
  item: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 14, paddingVertical: 10, paddingHorizontal: 12, minHeight: 48 },
  addRow: { flexDirection: 'row', gap: 8 },
  addBtn: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  remove: { width: 36, height: 44, alignItems: 'center', justifyContent: 'center' },
  chips: { flexDirection: 'row', gap: 8 },
});
