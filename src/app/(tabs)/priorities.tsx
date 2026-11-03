// Priorities (spec §4): Now / Soon / Someday, tag filters, and the done list.
// Hold an open task for its menu: move it, plan it, start or stop it, or change its tag.
import { Link, router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeOut, LayoutAnimationConfig, LinearTransition } from 'react-native-reanimated';

import { useAppState, useStore } from '../../data/StoreContext';
import { type PriorityRow, TAGS, URGENCIES, buildPriorities, effectiveUrgency, toggleTaskDone, updateTask, type TaskPatch } from '../../domain/tasks';
import type { Tag, Urgency } from '../../domain/types';
import { addDays, toISODate } from '../../lib/dates';
import { haptic } from '../../ui/haptics';
import { Icon } from '../../ui/Icon';
import { Screen, Tick, shadow } from '../../ui/kit';
import { Press } from '../../ui/Press';
import { TAG_COLOR, type Theme } from '../../ui/theme';
import { useTheme } from '../../ui/ThemeContext';
import { Txt } from '../../ui/Txt';
import { useUndo } from '../../ui/Undo';
import { useNow } from '../../ui/useNow';

const sectionDot = (id: Urgency, t: Theme) => (id === 'now' ? t.chipNowBg : id === 'soon' ? t.cat.trade : t.cat.work);
const move = LinearTransition.duration(220);

export default function PrioritiesScreen() {
  const t = useTheme();
  const s = useAppState();
  const store = useStore();
  const offerUndo = useUndo();
  const now = useNow(60_000);
  const [filter, setFilter] = useState<Tag | 'all'>('all');
  const [showDone, setShowDone] = useState(false);
  const today = toISODate(now);
  const v = useMemo(() => buildPriorities(s, today, filter), [s, today, filter]);

  const tick = (id: string) => {
    const wasDone = !!store.getState().tasks[id]?.doneAt;
    store.update((st) => toggleTaskDone(st, id, new Date()));
    if (!wasDone) {
      const title = store.getState().tasks[id]?.title ?? 'Task';
      offerUndo(`Done: ${title}`, () => store.update((st) => toggleTaskDone(st, id, new Date())));
    }
  };

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
            <Press
              key={f.id}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              onPress={() => {
                if (on) return;
                haptic.select();
                setFilter(f.id);
              }}
              style={[styles.filter, { backgroundColor: on ? t.accent : t.pillBg }, shadow(t)]}
            >
              <Txt size={14} weight={on ? 600 : 500} color={on ? t.ringInk : t.pillInk}>
                {f.name}
              </Txt>
            </Press>
          );
        })}
      </ScrollView>

      {/* Rows fade in when they arrive later (filters, undo), not when the tab first opens. */}
      <LayoutAnimationConfig skipEntering>
        {v.sections.length === 0 ? (
          <Animated.View entering={FadeIn} layout={move}>
            <Txt size={14} color={t.onBgMuted} style={{ textAlign: 'center', paddingVertical: 12 }}>
              Nothing here yet. Tap + to add a task.
            </Txt>
          </Animated.View>
        ) : null}

        {v.sections.map((section) => (
          <Animated.View key={section.id} entering={FadeIn} exiting={FadeOut.duration(160)} layout={move} style={{ gap: 8 }}>
            <View style={styles.head}>
              <View style={[styles.secDot, { backgroundColor: sectionDot(section.id, t) }]} />
              <Txt kind="display" weight={600} size={21}>
                {section.name}
              </Txt>
              <Txt size={13} color={t.onBgMuted}>
                {section.hint}
              </Txt>
            </View>
            <RowList rows={section.rows} onTick={tick} today={today} withMenu />
          </Animated.View>
        ))}

        <Animated.View layout={move}>
          <Press
            accessibilityRole="button"
            accessibilityState={{ expanded: showDone }}
            onPress={() => {
              haptic.select();
              setShowDone((x) => !x);
            }}
            dip={0.98}
            style={[styles.doneBtn, { borderColor: t.doneLine }]}
          >
            <Icon name="check" size={18} color={t.doneCheck} strokeWidth={3} />
            <Txt size={14} weight={600} color={t.onBgMuted}>
              Done · {v.done.length}
            </Txt>
          </Press>
        </Animated.View>
        {showDone && v.done.length > 0 ? (
          <Animated.View entering={FadeInDown.duration(220)} exiting={FadeOut.duration(150)} layout={move}>
            <RowList rows={v.done} onTick={tick} today={today} />
          </Animated.View>
        ) : null}
      </LayoutAnimationConfig>
    </Screen>
  );
}

function RowList({ rows, onTick, today, withMenu = false }: { rows: PriorityRow[]; onTick: (id: string) => void; today: string; withMenu?: boolean }) {
  const t = useTheme();
  return (
    <Animated.View layout={move} style={[styles.list, { backgroundColor: t.card }, shadow(t)]}>
      {rows.map((r, i) => (
        <Animated.View key={r.id} entering={FadeIn.duration(200)} exiting={FadeOut.duration(160)} layout={move}>
          {i > 0 ? <View style={[styles.rule, { backgroundColor: t.line }]} /> : null}
          {withMenu ? <MenuRow row={r} onTick={onTick} today={today} /> : <Row row={r} onTick={onTick} onPress={() => openTask(r.id)} />}
        </Animated.View>
      ))}
    </Animated.View>
  );
}

const openTask = (id: string) => router.push({ pathname: '/task/[id]', params: { id } });

/** An open task: tap opens it, hold lifts it with the task menu. */
function MenuRow({ row, onTick, today }: { row: PriorityRow; onTick: (id: string) => void; today: string }) {
  const s = useAppState();
  const store = useStore();
  const task = s.tasks[row.id];
  if (!task) return null;
  const edit = (patch: TaskPatch) => store.update((st) => updateTask(st, row.id, patch, new Date()));
  const tomorrow = addDays(today, 1);
  const plannedOn = task.planned?.date;
  const stuckInNow = !!task.due && task.urgency !== 'now' && effectiveUrgency(task, today).urgency === 'now';

  return (
    <Link href={{ pathname: '/task/[id]', params: { id: row.id } }} asChild>
      <Link.Trigger>
        <Row row={row} onTick={onTick} />
      </Link.Trigger>
      <Link.Menu>
        <Link.Menu title="Move to" icon="arrow.up.arrow.down" subtitle={stuckInNow ? 'Its due date keeps it in Now' : undefined}>
          {URGENCIES.map((u) => (
            <Link.MenuAction key={u.id} title={u.name} isOn={task.urgency === u.id} onPress={() => edit({ urgency: u.id })} />
          ))}
        </Link.Menu>
        <Link.Menu title="Plan for" icon="calendar">
          <Link.MenuAction title="Today" icon="sun.max" isOn={plannedOn === today} onPress={() => edit({ planned: { date: today } })} />
          <Link.MenuAction title="Tomorrow" icon="sunrise" isOn={plannedOn === tomorrow} onPress={() => edit({ planned: { date: tomorrow } })} />
          <Link.MenuAction title="Pick a day…" icon="calendar.badge.plus" onPress={() => openTask(row.id)} />
          {plannedOn ? <Link.MenuAction title="Not planned" icon="calendar.badge.minus" onPress={() => edit({ planned: null })} /> : null}
        </Link.Menu>
        <Link.MenuAction
          title={task.inProgress ? 'Stop' : 'Start'}
          subtitle={task.inProgress ? 'Not in progress any more' : 'Mark it in progress'}
          icon={task.inProgress ? 'pause.circle' : 'play.circle'}
          onPress={() => edit({ inProgress: !task.inProgress })}
        />
        <Link.Menu title="Change tag" icon="tag">
          {TAGS.map((tag) => (
            <Link.MenuAction key={tag.id} title={tag.name} isOn={task.tag === tag.id} onPress={() => edit({ tag: tag.id })} />
          ))}
        </Link.Menu>
      </Link.Menu>
    </Link>
  );
}

/**
 * One task row. It has its own card colour and corners because iOS lifts exactly this view when the menu opens.
 * Inside a Link, the Link passes its own `onPress` (and href) through `link`.
 */
function Row({ row: r, onTick, ...link }: { row: PriorityRow; onTick: (id: string) => void; onPress?: () => void }) {
  const t = useTheme();
  return (
    <Press {...link} accessibilityRole="button" accessibilityHint="Opens the task" dip={0.98} style={[styles.row, { backgroundColor: t.card }]}>
      <Tick checked={r.done} onPress={() => onTick(r.id)} label={`${r.done ? 'Not done' : 'Mark done'}: ${r.title}`} />
      <View style={styles.body}>
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
      </View>
    </Press>
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
  list: { borderRadius: 20, paddingVertical: 2, paddingHorizontal: 2 },
  rule: { height: 1, marginLeft: 50, marginRight: 12 },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, paddingVertical: 8, paddingLeft: 2, paddingRight: 10, borderRadius: 18 },
  body: { flex: 1, gap: 3, paddingVertical: 2, minHeight: 44 },
  meta: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginTop: 2 },
  mchip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 99 },
  bump: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  doneBtn: { minHeight: 48, borderRadius: 18, borderWidth: 2, borderStyle: 'dashed', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
});
