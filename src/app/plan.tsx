// Add a plan / edit a plan (spec §4 Add a plan). Opens as a sheet.
import DateTimePicker from '@react-native-community/datetimepicker';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { pushPlan } from '../data/calendarSync';
import { useAppState, useStore } from '../data/StoreContext';
import {
  QUICK_PICKS,
  type PlanDraft,
  canSavePlan,
  draftFromPlan,
  newDraft,
  pickQuick,
  planWindow,
  savePlan,
  typeTitle,
} from '../domain/plans';
import type { BlockId, Minutes, When } from '../domain/types';
import { addDays, daysBetween, toISODate, weekStartOf } from '../lib/dates';
import { BLOCK_NAME, clockAmPm, weekRange, weekdayLetter, whenLabel } from '../lib/format';
import { Icon } from '../ui/Icon';
import { Field, Label, PillButton, PrimaryButton, Switch } from '../ui/kit';
import { Press } from '../ui/Press';
import { confirmDeletePlan } from '../ui/planActions';
import { useTheme } from '../ui/ThemeContext';
import { Txt } from '../ui/Txt';

const BLOCKS: BlockId[] = ['morning', 'afternoon', 'evening'];
const toDate = (m: Minutes) => new Date(2000, 0, 1, Math.floor(m / 60), m % 60);
const toMinutes = (d: Date) => d.getHours() * 60 + d.getMinutes();

export default function PlanSheet() {
  const t = useTheme();
  const s = useAppState();
  const store = useStore();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id?: string; date?: string; title?: string; fromNoteId?: string }>();
  const today = toISODate(new Date());
  const editing = params.id ? s.plans[params.id] : undefined;
  const window = planWindow(today);

  const [draft, setDraft] = useState<PlanDraft>(() => {
    if (editing) return draftFromPlan(editing);
    const start = params.date && params.date >= today ? params.date : today;
    return { ...newDraft(start, params.title ?? ''), ...(params.fromNoteId ? { fromNoteId: params.fromNoteId } : {}) };
  });
  const [offset, setOffset] = useState(() => Math.max(0, Math.floor(daysBetween(window.first, weekStartOf(draft.date)) / 7)));
  const [panelOpen, setPanelOpen] = useState(draft.when !== null && draft.when.kind !== 'block');

  const weekStart = addDays(window.first, offset * 7);
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);
  const pick = QUICK_PICKS.find((p) => p.kind === draft.kind);
  const timed = draft.when && draft.when.kind !== 'block' ? draft.when : null;
  const update = (patch: Partial<PlanDraft>) => setDraft((d) => ({ ...d, ...patch }));

  function openClock() {
    if (!timed) update({ when: { kind: 'at', time: 20 * 60 } });
    setPanelOpen((open) => !open || !timed);
  }

  function setMode(mode: 'at' | 'range') {
    const start = timed ? (timed.kind === 'at' ? timed.time : timed.start) : 20 * 60;
    const when: When = mode === 'at' ? { kind: 'at', time: start } : { kind: 'range', start, end: Math.min(start + 120, 23 * 60 + 55) };
    update({ when });
  }

  function save() {
    let savedId = '';
    store.update((st) => {
      const saved = savePlan(st, draft, new Date(), editing?.id);
      savedId = saved.id;
      return saved.state;
    });
    pushPlan(store, savedId).catch((e) => console.warn('Could not update the iPhone calendar', e));
    router.back();
  }

  function remove() {
    if (!editing) return;
    confirmDeletePlan(store, editing.id, () => router.back());
  }

  return (
    <ScrollView
      style={{ backgroundColor: t.card }}
      contentContainerStyle={[styles.sheet, { paddingBottom: insets.bottom + 24 }]}
      keyboardShouldPersistTaps="handled"
    >
      <Txt kind="display" weight={600} size={24} color={t.ink} accessibilityRole="header">
        {editing ? 'Edit plan' : 'New plan'}
      </Txt>

      <View style={styles.fld}>
        <Label>What&apos;s the plan?</Label>
        <View style={styles.three}>
          {QUICK_PICKS.map((p) => (
            <PillButton key={p.kind} label={p.title} selected={draft.kind === p.kind && draft.title === p.title} onPress={() => setDraft((d) => pickQuick(d, p))} style={{ flex: 1 }} />
          ))}
        </View>
        <Field
          value={draft.title === pick?.title ? '' : draft.title}
          onChangeText={(text) => setDraft((d) => typeTitle(d, text))}
          placeholder="Or type your own"
          returnKeyType="done"
          accessibilityLabel="Plan title"
        />
      </View>

      <View style={styles.fld}>
        <Label>Day</Label>
        <View style={styles.miniNav}>
          <RoundButton icon="left" label="Previous week" disabled={offset === 0} onPress={() => setOffset((o) => o - 1)} />
          <Txt size={14} weight={600} color={t.ink}>
            {weekRange(weekStart)}
          </Txt>
          <RoundButton icon="right" label="Next week" disabled={offset === 8} onPress={() => setOffset((o) => o + 1)} />
        </View>
        <View style={styles.days7}>
          {days.map((d) => {
            const on = draft.date === d;
            const disabled = d < today || d > window.last;
            return (
              <Press
                key={d}
                accessibilityRole="button"
                accessibilityState={{ selected: on, disabled }}
                accessibilityLabel={d}
                disabled={disabled}
                onPress={() => update({ date: d })}
                style={[styles.day, { backgroundColor: on ? t.accent : t.fieldBg, opacity: disabled ? 0.35 : 1 }]}
              >
                <Txt size={10.5} weight={600} color={on ? t.ringInk : t.muted}>
                  {weekdayLetter(d)}
                </Txt>
                <Txt kind="display" weight={600} size={17} color={on ? t.ringInk : t.ink}>
                  {Number(d.slice(8))}
                </Txt>
              </Press>
            );
          })}
        </View>
      </View>

      <View style={styles.fld}>
        <Label>When</Label>
        <View style={styles.three}>
          {BLOCKS.map((b) => (
            <PillButton
              key={b}
              label={BLOCK_NAME[b]}
              selected={draft.when?.kind === 'block' && draft.when.block === b}
              onPress={() => {
                update({ when: { kind: 'block', block: b } });
                setPanelOpen(false);
              }}
              style={{ flex: 1 }}
            />
          ))}
        </View>
        <PillButton icon="clock" label={timed ? whenLabel(timed) : 'Pick a time'} selected={!!timed} onPress={openClock} />
        {panelOpen && timed ? (
          <View style={[styles.timebox, { backgroundColor: t.fieldBg }]}>
            <View style={[styles.seg, { backgroundColor: t.card }]}>
              {(['at', 'range'] as const).map((mode) => {
                const on = timed.kind === mode;
                return (
                  <Press
                    key={mode}
                    accessibilityRole="button"
                    accessibilityState={{ selected: on }}
                    onPress={() => setMode(mode)}
                    style={[styles.segBtn, on && { backgroundColor: t.accent }]}
                  >
                    <Txt size={14} weight={600} color={on ? t.ringInk : t.muted}>
                      {mode === 'at' ? 'At a time' : 'From – to'}
                    </Txt>
                  </Press>
                );
              })}
            </View>
            {timed.kind === 'at' ? (
              <Wheel label="At" value={timed.time} onChange={(time) => update({ when: { kind: 'at', time } })} dark={t.dark || s.settings.cards === 'cocoa'} />
            ) : (
              <>
                <Wheel label="From" value={timed.start} onChange={(start) => update({ when: { ...timed, start } })} dark={t.dark || s.settings.cards === 'cocoa'} />
                <Wheel label="To" value={timed.end} onChange={(end) => update({ when: { ...timed, end } })} dark={t.dark || s.settings.cards === 'cocoa'} />
                {timed.end <= timed.start ? (
                  <Txt size={12.5} color={t.muted}>
                    The end needs to be after {clockAmPm(timed.start)}.
                  </Txt>
                ) : null}
              </>
            )}
          </View>
        ) : null}
      </View>

      <View style={styles.row}>
        <Txt size={15} color={t.ink} style={{ flex: 1 }}>
          Also add to iPhone calendar
        </Txt>
        <Switch value={draft.addToCalendar} label="Also add to iPhone calendar" onChange={(addToCalendar) => update({ addToCalendar })} />
      </View>

      <View style={styles.fld}>
        <Label>Note</Label>
        <Field value={draft.note} onChangeText={(note) => update({ note })} placeholder="Bring snacks, who's coming…" multiline accessibilityLabel="Note" />
      </View>

      <PrimaryButton label={editing ? 'Save' : 'Add plan'} onPress={save} disabled={!canSavePlan(draft, today)} />
      {editing ? (
        <Press accessibilityRole="button" onPress={remove} style={styles.delete}>
          <Txt size={15} weight={600} color={t.cat.love}>
            Delete plan
          </Txt>
        </Press>
      ) : null}
    </ScrollView>
  );
}

function Wheel({ label, value, onChange, dark }: { label: string; value: Minutes; onChange: (m: Minutes) => void; dark: boolean }) {
  const t = useTheme();
  return (
    <View>
      <Txt size={12} weight={600} color={t.muted}>
        {label}
      </Txt>
      <DateTimePicker
        value={toDate(value)}
        mode="time"
        display="spinner"
        minuteInterval={5}
        themeVariant={dark ? 'dark' : 'light'}
        onValueChange={(_, date) => onChange(toMinutes(date))}
        style={{ height: 150 }}
      />
    </View>
  );
}

function RoundButton({ icon, label, disabled, onPress }: { icon: 'left' | 'right'; label: string; disabled: boolean; onPress: () => void }) {
  const t = useTheme();
  return (
    <Press
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[styles.round, { backgroundColor: t.fieldBg, opacity: disabled ? 0.35 : 1 }]}
    >
      <Icon name={icon} size={18} color={t.ink} />
    </Press>
  );
}

const styles = StyleSheet.create({
  sheet: { paddingHorizontal: 18, paddingTop: 22, gap: 16 },
  fld: { gap: 8 },
  three: { flexDirection: 'row', gap: 8 },
  miniNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  round: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  days7: { flexDirection: 'row', gap: 4 },
  day: { flex: 1, minHeight: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center', gap: 1 },
  timebox: { borderRadius: 16, padding: 10, gap: 8 },
  seg: { flexDirection: 'row', gap: 4, borderRadius: 14, padding: 4 },
  segBtn: { flex: 1, minHeight: 40, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 44 },
  delete: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
});
