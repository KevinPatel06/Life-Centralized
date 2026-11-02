// Today's block pieces, after the mockup: finished blocks dashed, the current block open, later blocks compact.
import { Pressable, StyleSheet, View } from 'react-native';

import type { TodayBlock, TodayLine, TodayRow } from '../domain/today';
import type { BlockId } from '../domain/types';
import { Buddy } from './Buddy';
import { Icon, type IconName } from './Icon';
import { Chip, Tick, shadow } from './kit';
import { BLOCK_COLOR, type Theme } from './theme';
import { useTheme } from './ThemeContext';
import { Txt } from './Txt';

export const BLOCK_ICON: Record<BlockId, IconName> = { morning: 'sun', afternoon: 'clock', evening: 'chart', winddown: 'moon' };

export function DoneBlock({ block }: { block: TodayBlock }) {
  const t = useTheme();
  return (
    <View style={[styles.done, { borderColor: t.doneLine }]} accessibilityLabel={`${block.name}, finished. ${block.summary}`}>
      <View style={[styles.dot, { backgroundColor: t.cat[BLOCK_COLOR[block.id]] }]} />
      <Txt size={14} weight={600}>
        {block.name}
      </Txt>
      <Txt size={14} color={t.onBgMuted} numberOfLines={1} style={{ flex: 1 }}>
        {block.summary}
      </Txt>
      {block.mark === 'done' ? <Icon name="check" size={20} color={t.doneCheck} strokeWidth={3} /> : null}
      {block.mark === 'partly' ? (
        <Txt size={12} weight={600} color={t.onBgMuted}>
          Partly
        </Txt>
      ) : null}
    </View>
  );
}

export function NowBlock({
  block,
  canTick,
  onTick,
  onLine,
}: {
  block: TodayBlock;
  canTick: boolean;
  onTick: (key: string) => void;
  onLine: (line: TodayLine) => void;
}) {
  const t = useTheme();
  return (
    <View style={[styles.now, { backgroundColor: t.nowBg, borderColor: t.nowRing }, shadow(t)]}>
      <View style={styles.head}>
        <BlockIcon id={block.id} t={t} />
        <View style={{ flex: 1 }}>
          <Txt size={12} weight={600} color={t.nowKicker} style={{ letterSpacing: 1 }}>
            NOW
          </Txt>
          <Txt kind="display" weight={600} size={22} color={t.ink}>
            {block.name}
          </Txt>
        </View>
        <Txt size={14} weight={500} color={t.muted}>
          {block.range}
        </Txt>
      </View>
      {block.rows.length > 0 ? (
        <View style={[styles.tasks, { backgroundColor: t.taskBg }]}>
          {block.rows.map((row) => (
            <RowLine key={row.key} row={row} canTick={canTick} onTick={onTick} />
          ))}
        </View>
      ) : null}
      {block.lines.map((line) => (
        <Pressable
          key={line.key}
          disabled={!line.planId}
          onPress={() => onLine(line)}
          accessibilityRole={line.planId ? 'button' : 'text'}
          style={styles.event}
        >
          <Txt size={13.5} weight={600} color={t.ink}>
            {line.time}
          </Txt>
          <Txt size={13.5} color={t.muted} numberOfLines={1} style={{ flex: 1 }}>
            {line.title}
          </Txt>
          {line.source === 'iphone' ? (
            <Txt size={12} color={t.muted}>
              iPhone calendar
            </Txt>
          ) : null}
        </Pressable>
      ))}
    </View>
  );
}

function RowLine({ row, canTick, onTick }: { row: TodayRow; canTick: boolean; onTick: (key: string) => void }) {
  const t = useTheme();
  const chip =
    row.chip === 'now'
      ? { label: 'Now', bg: t.chipNowBg, ink: t.chipNowInk }
      : row.chip === 'routine'
        ? { label: 'Routine', bg: t.chipRtBg, ink: t.chipRtInk }
        : { label: row.chip === 'soon' ? 'Soon' : 'Someday', bg: t.chipSomeBg, ink: t.chipSomeInk };
  return (
    <View style={styles.row}>
      <Tick checked={row.done} onPress={() => onTick(row.key)} label={`Mark done: ${row.title}`} disabled={!canTick} />
      <View style={{ flex: 1 }}>
        <Txt
          size={15}
          weight={600}
          color={row.done ? t.muted : t.ink}
          style={row.done ? { textDecorationLine: 'line-through' } : undefined}
        >
          {row.title}
        </Txt>
        {row.subtitle ? (
          <Txt size={12.5} color={t.muted} style={{ marginTop: 2 }}>
            {row.subtitle}
          </Txt>
        ) : null}
      </View>
      <Chip label={chip.label} bg={chip.bg} color={chip.ink} />
    </View>
  );
}

export function LaterBlock({ block }: { block: TodayBlock }) {
  const t = useTheme();
  return (
    <View style={[styles.later, { backgroundColor: t.card }, shadow(t)]}>
      <BlockIcon id={block.id} t={t} />
      <View style={{ flex: 1 }}>
        <Txt kind="display" weight={600} size={18} color={t.ink}>
          {block.name}
        </Txt>
        <Txt size={13} color={t.muted} numberOfLines={2}>
          {block.summary}
        </Txt>
      </View>
      <Txt size={14} weight={500} color={t.muted}>
        {block.range}
      </Txt>
    </View>
  );
}

function BlockIcon({ id, t }: { id: BlockId; t: Theme }) {
  return (
    <View style={[styles.icon, { backgroundColor: t.icBg }]}>
      <Icon name={BLOCK_ICON[id]} size={22} color={t.cat[BLOCK_COLOR[id]]} />
    </View>
  );
}

/** The buddy and its one-line speech bubble. */
export function BuddySays({ text }: { text: string }) {
  const t = useTheme();
  return (
    <View style={styles.buddy}>
      <Buddy size={56} />
      <View style={[styles.bubble, { backgroundColor: t.bubbleBg }, shadow(t)]}>
        <Txt size={13.5} weight={500} color={t.bubbleInk}>
          {text}
        </Txt>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  done: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 11, paddingHorizontal: 14, borderRadius: 18, borderWidth: 2, borderStyle: 'dashed' },
  dot: { width: 12, height: 12, borderRadius: 4 },
  now: { borderWidth: 2, borderRadius: 26, paddingTop: 16, paddingHorizontal: 14, paddingBottom: 14, gap: 12 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  icon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  tasks: { borderRadius: 18, paddingVertical: 4, paddingLeft: 4, paddingRight: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 5 },
  event: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 4, minHeight: 32 },
  later: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 22, paddingVertical: 12, paddingHorizontal: 14 },
  buddy: { flexDirection: 'row', alignItems: 'flex-end', gap: 10 },
  bubble: { flex: 1, borderRadius: 18, borderBottomLeftRadius: 4, paddingVertical: 10, paddingHorizontal: 14, marginBottom: 6 },
});
