import { router } from 'expo-router';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn, LayoutAnimationConfig, LinearTransition } from 'react-native-reanimated';

import { useAppState, useStore } from '../../data/StoreContext';
import { canTick, toggleEntry } from '../../domain/ticks';
import { buildToday } from '../../domain/today';
import { plural } from '../../lib/format';
import { DoneBlock, LaterBlock, NowBlock, BuddySays } from '../../ui/blocks';
import { haptic } from '../../ui/haptics';
import { Icon } from '../../ui/Icon';
import { Screen, shadow } from '../../ui/kit';
import { Press } from '../../ui/Press';
import { useTheme } from '../../ui/ThemeContext';
import { Txt } from '../../ui/Txt';
import { useNow } from '../../ui/useNow';

export default function TodayScreen() {
  const t = useTheme();
  const s = useAppState();
  const store = useStore();
  const now = useNow();
  const v = useMemo(() => buildToday(s, now), [s, now]);
  const tickable = canTick(s, v.date, v.date);

  /** A light tap per tick; a success buzz when it finishes the current block. */
  function tick(key: string) {
    const block = v.blocks.find((b) => b.state === 'now');
    const row = block?.rows.find((r) => r.key === key);
    const finishes = !!block && !!row && !row.done && block.rows.every((r) => r.key === key || r.done);
    if (finishes) haptic.success();
    else haptic.tap();
    store.update((st) => toggleEntry(st, v.date, key, new Date()));
  }

  return (
    <Screen>
      <View>
        <View style={styles.titleRow}>
          <Txt kind="display" weight={700} size={44} style={{ flex: 1 }} accessibilityRole="header">
            {v.weekday}
          </Txt>
          <Press accessibilityRole="button" accessibilityLabel="Settings" onPress={() => router.push('/settings')} hitSlop={8} dip={0.88} style={styles.gear}>
            <Icon name="gear" size={24} color={t.onBgMuted} />
          </Press>
        </View>
        <View style={styles.sub}>
          <Txt size={15} color={t.onBgMuted}>
            {v.dateLabel}
          </Txt>
          <View style={[styles.dot, { backgroundColor: t.onBgMuted }]} />
          <Txt size={15} weight={600}>
            {v.blocksToGo > 0 ? `${plural(v.blocksToGo, 'block')} to go` : "Day's done"}
          </Txt>
        </View>
      </View>

      {v.headsUp ? (
        <View style={[styles.heads, { backgroundColor: t.card }, shadow(t)]}>
          <View style={[styles.headsPic, { backgroundColor: t.icBg }]}>
            <Icon name="cake" size={17} color={t.cat.love} />
          </View>
          <Txt size={14} color={t.ink} style={{ flex: 1 }}>
            {v.headsUp}
          </Txt>
        </View>
      ) : null}

      <LayoutAnimationConfig skipEntering>
        <View style={{ gap: 10 }}>
          {v.blocks.map((b) => (
            // Keyed by block and state, so a block that changes state fades into its new look.
            <Animated.View key={`${b.id}:${b.state}`} entering={FadeIn.duration(260)} layout={LinearTransition.duration(240)}>
              {b.state === 'done' ? (
                <DoneBlock block={b} />
              ) : b.state === 'now' ? (
                <NowBlock
                  block={b}
                  canTick={tickable}
                  onTick={tick}
                  onLine={(line) => line.planId && router.push({ pathname: '/plan', params: { id: line.planId } })}
                  onOpenTask={(id) => router.push({ pathname: '/task/[id]', params: { id } })}
                />
              ) : (
                <LaterBlock block={b} />
              )}
            </Animated.View>
          ))}
        </View>
      </LayoutAnimationConfig>

      {v.checkin.state === 'pending' ? (
        <Press
          accessibilityRole="button"
          onPress={() => router.push({ pathname: '/checkin/[date]', params: { date: v.date } })}
          dip={0.98}
          style={[styles.endDay, { borderColor: t.bgLine }]}
        >
          <Icon name="moon" size={18} color={t.onBg} />
          <Txt size={15} weight={600}>
            End my day
          </Txt>
        </Press>
      ) : null}
      {v.checkin.state === 'done' ? (
        <Press
          accessibilityRole="button"
          accessibilityHint="Opens your check-in to change it"
          onPress={() => router.push({ pathname: '/checkin/[date]', params: { date: v.date } })}
          dip={0.98}
          style={styles.checkedIn}
        >
          <Icon name="check" size={18} color={t.doneCheck} strokeWidth={3} />
          <Txt size={14} color={t.onBgMuted}>
            {v.checkin.summary.replace('Checked in', 'Day checked in')}
          </Txt>
        </Press>
      ) : null}

      {v.tomorrow ? (
        <Txt size={14} color={t.onBgMuted} style={{ paddingHorizontal: 4 }}>
          {v.tomorrow}
        </Txt>
      ) : null}

      <BuddySays text={v.buddy} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  titleRow: { flexDirection: 'row', alignItems: 'flex-start' },
  gear: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginTop: -4, marginRight: -6 },
  sub: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 },
  dot: { width: 5, height: 5, borderRadius: 3 },
  heads: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, paddingLeft: 8, paddingRight: 12, borderRadius: 16 },
  headsPic: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  endDay: { minHeight: 52, borderRadius: 99, borderWidth: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  checkedIn: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
});
