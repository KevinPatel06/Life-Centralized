// The daily check-in sheet (spec §4 Check-in): one per day, grouped by block.
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAppState, useStore } from '../../data/StoreContext';
import {
  type CheckinItem,
  answerOf,
  buildCheckin,
  canOpenCheckin,
  canSaveCheckin,
  decide,
  promptOf,
  saveCheckin,
  setAnswer,
  toggleItem,
} from '../../domain/checkin';
import type { BlockAnswer } from '../../domain/types';
import { toISODate } from '../../lib/dates';
import { BLOCK_NAME, weekdayName } from '../../lib/format';
import { Buddy } from '../../ui/Buddy';
import { haptic } from '../../ui/haptics';
import { FormScroll, PillButton, PrimaryButton, Tick } from '../../ui/kit';
import { Press } from '../../ui/Press';
import { useTheme } from '../../ui/ThemeContext';
import { Txt } from '../../ui/Txt';

const ANSWERS: { id: BlockAnswer; label: string }[] = [
  { id: 'done', label: 'Done' },
  { id: 'partly', label: 'Partly' },
  { id: 'skipped', label: 'Skipped' },
];

export default function CheckinSheet() {
  const t = useTheme();
  const s = useAppState();
  const store = useStore();
  const insets = useSafeAreaInsets();
  const { date } = useLocalSearchParams<{ date: string }>();
  const today = toISODate(new Date());
  const allowed = typeof date === 'string' && canOpenCheckin(s, date, today);
  const [initial] = useState(() => (allowed ? buildCheckin(s, date, today) : null));
  const [draft, setDraft] = useState(initial?.draft);

  if (!initial || !draft) {
    return (
      <View style={[styles.sheet, { backgroundColor: t.card }]}>
        <Txt size={16} color={t.ink}>
          This day can&apos;t be checked in anymore.
        </Txt>
      </View>
    );
  }
  const { view } = initial;

  function save() {
    store.update((st) => saveCheckin(st, view, draft!, new Date()));
    haptic.success();
    router.back();
  }

  return (
    <FormScroll style={{ backgroundColor: t.card }} contentContainerStyle={[styles.sheet, { paddingBottom: insets.bottom + 24 }]}>
      <View style={styles.head}>
        <Buddy size={48} />
        <View style={{ flex: 1 }}>
          <Txt kind="display" weight={600} size={22} color={t.ink} accessibilityRole="header">
            {view.title}
          </Txt>
          <Txt size={13.5} color={t.muted}>
            {view.dateLabel}
            {view.reopening ? ' · Changing your check-in' : ''}
          </Txt>
        </View>
      </View>

      {view.sections.length === 0 ? (
        <Txt size={15} color={t.muted}>
          Nothing to tick today.
        </Txt>
      ) : null}

      {view.sections.map((section) => {
        const answer = answerOf(section, draft);
        return (
          <View key={section.block} style={[styles.section, { backgroundColor: t.fieldBg }]}>
            <View style={styles.sectionHead}>
              <Txt kind="display" weight={600} size={18} color={t.ink} style={{ flex: 1 }}>
                {section.name}
              </Txt>
              <Txt size={13} color={t.muted}>
                {section.range}
              </Txt>
            </View>
            <View style={styles.answers}>
              {ANSWERS.map((a) => (
                <PillButton
                  key={a.id}
                  label={a.label}
                  selected={answer === a.id}
                  onPress={() => setDraft((d) => setAnswer(section, d!, a.id))}
                  style={[styles.answer, answer !== a.id && { backgroundColor: t.card }]}
                />
              ))}
            </View>
            <Txt size={13} weight={600} color={t.muted}>
              What got done?
            </Txt>
            {section.items.map((item) => (
              <ItemRow
                key={item.key}
                item={item}
                checked={!!draft.ticked[item.key]}
                prompt={promptOf(item, draft)}
                decision={draft.decisions[item.key]}
                onTick={() => setDraft((d) => toggleItem(d!, item.key))}
                onDecide={(choice) => setDraft((d) => decide(d!, item.key, choice))}
              />
            ))}
          </View>
        );
      })}

      <PrimaryButton label="Save" onPress={save} disabled={!canSaveCheckin(view, draft)} />
    </FormScroll>
  );
}

function ItemRow({
  item,
  checked,
  prompt,
  decision,
  onTick,
  onDecide,
}: {
  item: CheckinItem;
  checked: boolean;
  prompt: CheckinItem['prompt'];
  decision?: 'move' | 'skip';
  onTick: () => void;
  onDecide: (choice: 'move' | 'skip') => void;
}) {
  const t = useTheme();
  return (
    <View>
      <View style={styles.item}>
        <Tick checked={checked} onPress={onTick} label={`Done: ${item.title}`} />
        <View style={{ flex: 1 }}>
          <Txt size={14.5} weight={500} color={checked ? t.ink : t.muted}>
            {item.title}
          </Txt>
          {item.kind === 'moved' ? (
            <Txt size={12.5} color={t.muted}>
              Moved here from its usual day
            </Txt>
          ) : null}
        </View>
      </View>
      {prompt === 'move-or-skip' && item.backup ? (
        <View style={styles.prompt}>
          <Txt size={13} color={t.muted}>
            Not done. Its backup is {weekdayName(item.backup.date)} {BLOCK_NAME[item.backup.block].toLowerCase()}.
          </Txt>
          <View style={styles.choices}>
            <Choice label={`Move to ${item.backup.label}`} selected={decision === 'move'} onPress={() => onDecide('move')} />
            <Choice label="Skip this week" selected={decision === 'skip'} onPress={() => onDecide('skip')} />
          </View>
        </View>
      ) : null}
      {prompt === 'skip-only' ? (
        <View style={styles.prompt}>
          <Txt size={13} color={t.muted}>
            Backup has passed.
          </Txt>
          <View style={styles.choices}>
            <Choice label="Skip this week" selected={decision === 'skip'} onPress={() => onDecide('skip')} />
          </View>
        </View>
      ) : null}
      {prompt === 'stays-in-priorities' ? (
        <Txt size={13} color={t.muted} style={styles.prompt}>
          No backup slot, so it stays in Priorities.
        </Txt>
      ) : null}
    </View>
  );
}

function Choice({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  const t = useTheme();
  return (
    <Press
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={() => {
        haptic.select();
        onPress();
      }}
      dip={0.96}
      style={[styles.choice, { borderColor: selected ? t.accent : t.line, backgroundColor: selected ? t.card : 'transparent' }]}
    >
      <Txt size={13.5} weight={600} color={t.ink}>
        {label}
      </Txt>
    </Press>
  );
}

const styles = StyleSheet.create({
  sheet: { paddingHorizontal: 18, paddingTop: 22, gap: 14 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  section: { borderRadius: 20, padding: 12, gap: 8 },
  sectionHead: { flexDirection: 'row', alignItems: 'center' },
  answers: { flexDirection: 'row', gap: 6 },
  answer: { flex: 1, minHeight: 48 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  prompt: { marginLeft: 50, marginBottom: 8, gap: 8 },
  choices: { flexDirection: 'row', gap: 6 },
  choice: { flex: 1, minHeight: 44, borderRadius: 99, borderWidth: 2, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
});
