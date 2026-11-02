// Priorities (spec §4): Now / Soon / Someday, tag filters, and the done list.
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { useAppState, useStore } from '../../data/StoreContext';
import { type PriorityRow, TAGS, buildPriorities, toggleTaskDone } from '../../domain/tasks';
import type { Tag, Urgency } from '../../domain/types';
import { toISODate } from '../../lib/dates';
import { Icon } from '../../ui/Icon';
import { Screen, Tick, shadow } from '../../ui/kit';
import { TAG_COLOR, type Theme } from '../../ui/theme';
import { useTheme } from '../../ui/ThemeContext';
import { Txt } from '../../ui/Txt';
import { useNow } from '../../ui/useNow';

const sectionDot = (id: Urgency, t: Theme) => (id === 'now' ? t.chipNowBg : id === 'soon' ? t.cat.trade : t.cat.work);

export default function PrioritiesScreen() {
  const t = useTheme();
  const s = useAppState();
  const store = useStore();
  const now = useNow(60_000);
  const [filter, setFilter] = useState<Tag | 'all'>('all');
  const [showDone, setShowDone] = useState(false);
  const v = useMemo(() => buildPriorities(s, toISODate(now), filter), [s, now, filter]);
  const tick = (id: string) => store.update((st) => toggleTaskDone(st, id, new Date()));

  return (
    <Screen>
      <View>
        <Txt kind="display" weight={700} size={40} accessibilityRole="header">
          Priorities
        </Txt>
        <View style={styles.sub}>
          <Txt size={15} weight={600}>
            {v.open} open
          </Txt>
          <View style={[styles.dot, { backgroundColor: t.onBgMuted }]} />
          <Txt size={15} color={t.onBgMuted}>
            {v.inProgress} in progress
          </Txt>
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersScroll} contentContainerStyle={styles.filters}>
        {[{ id: 'all' as const, name: 'All' }, ...TAGS].map((f) => {
          const on = filter === f.id;
          return (
            <Pressable
              key={f.id}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              onPress={() => setFilter(f.id)}
              style={[styles.filter, { backgroundColor: on ? t.accent : t.pillBg }, shadow(t)]}
            >
              <Txt size={14} weight={on ? 600 : 500} color={on ? t.ringInk : t.pillInk}>
                {f.name}
              </Txt>
            </Pressable>
          );
        })}
      </ScrollView>

      {v.sections.length === 0 ? (
        <Txt size={14} color={t.onBgMuted} style={{ textAlign: 'center', paddingVertical: 12 }}>
          Nothing here yet. Tap + to add a task.
        </Txt>
      ) : null}

      {v.sections.map((section) => (
        <View key={section.id} style={{ gap: 8 }}>
          <View style={styles.head}>
            <View style={[styles.secDot, { backgroundColor: sectionDot(section.id, t) }]} />
            <Txt kind="display" weight={600} size={21}>
              {section.name}
            </Txt>
            <Txt size={13} color={t.onBgMuted}>
              {section.hint}
            </Txt>
          </View>
          <RowList rows={section.rows} onTick={tick} />
        </View>
      ))}

      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: showDone }}
        onPress={() => setShowDone((x) => !x)}
        style={[styles.doneBtn, { borderColor: t.doneLine }]}
      >
        <Icon name="check" size={18} color={t.doneCheck} strokeWidth={3} />
        <Txt size={14} weight={600} color={t.onBgMuted}>
          Done · {v.done.length}
        </Txt>
      </Pressable>
      {showDone && v.done.length > 0 ? <RowList rows={v.done} onTick={tick} /> : null}
    </Screen>
  );
}

function RowList({ rows, onTick }: { rows: PriorityRow[]; onTick: (id: string) => void }) {
  const t = useTheme();
  return (
    <View style={[styles.list, { backgroundColor: t.card }, shadow(t)]}>
      {rows.map((r, i) => (
        <View key={r.id} style={[styles.row, i > 0 && { borderTopWidth: 1, borderTopColor: t.line }]}>
          <Tick checked={r.done} onPress={() => onTick(r.id)} label={`${r.done ? 'Not done' : 'Mark done'}: ${r.title}`} />
          <Pressable accessibilityRole="button" accessibilityHint="Opens the task" onPress={() => router.push({ pathname: '/task/[id]', params: { id: r.id } })} style={styles.body}>
            <Txt size={15} weight={600} color={r.done ? t.muted : t.ink} style={r.done ? { textDecorationLine: 'line-through' } : undefined}>
              {r.title}
            </Txt>
            {r.notePreview ? (
              <Txt size={12.5} color={t.muted} numberOfLines={1}>
                {r.notePreview}
              </Txt>
            ) : null}
            <View style={styles.meta}>
              <Txt size={12} weight={600} color={t.cat[TAG_COLOR[r.tag]]}>
                {r.tagName}
              </Txt>
              {!r.done && r.inProgress ? <Meta label="In progress" bg={t.chipRtBg} ink={t.chipRtInk} /> : null}
              {!r.done && r.due ? <Meta label={r.due} bg={t.chipNowBg} ink={t.chipNowInk} /> : null}
              {!r.done && r.starts ? <Meta label={r.starts} bg={t.fieldBg} ink={t.muted} /> : null}
              {!r.done && r.planned ? <Meta label={r.planned} bg={t.fieldBg} ink={t.muted} icon /> : null}
              {r.hasNote ? (
                <View style={[styles.mchip, { backgroundColor: t.fieldBg }]} accessibilityLabel="Has notes">
                  <Icon name="note" size={12} color={t.muted} />
                </View>
              ) : null}
            </View>
            {!r.done && r.bump ? (
              <View style={styles.bump}>
                <Icon name="chart" size={14} color={t.muted} />
                <Txt size={12} color={t.muted}>
                  {r.bump}
                </Txt>
              </View>
            ) : null}
          </Pressable>
        </View>
      ))}
    </View>
  );
}

function Meta({ label, bg, ink, icon = false }: { label: string; bg: string; ink: string; icon?: boolean }) {
  return (
    <View style={[styles.mchip, { backgroundColor: bg }]}>
      {icon ? <Icon name="cal" size={12} color={ink} /> : null}
      <Txt size={11} weight={600} color={ink}>
        {label}
      </Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  sub: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 6 },
  dot: { width: 5, height: 5, borderRadius: 3 },
  filtersScroll: { marginHorizontal: -18, flexGrow: 0 },
  filters: { gap: 8, paddingHorizontal: 18, paddingTop: 2, paddingBottom: 6 },
  filter: { minHeight: 40, borderRadius: 99, paddingHorizontal: 14, justifyContent: 'center' },
  head: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 4 },
  secDot: { width: 10, height: 10, borderRadius: 5 },
  list: { borderRadius: 20, paddingVertical: 2, paddingLeft: 4, paddingRight: 12 },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, paddingVertical: 8 },
  body: { flex: 1, gap: 3, paddingVertical: 2, minHeight: 44 },
  meta: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginTop: 2 },
  mchip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 99 },
  bump: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  doneBtn: { minHeight: 48, borderRadius: 18, borderWidth: 2, borderStyle: 'dashed', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
});
