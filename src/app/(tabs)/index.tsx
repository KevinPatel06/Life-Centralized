import { router } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { useAppState, useStore } from '../../data/StoreContext';
import { canTick, toggleEntry } from '../../domain/ticks';
import { buildToday } from '../../domain/today';
import { plural } from '../../lib/format';
import { DoneBlock, LaterBlock, NowBlock, BuddySays } from '../../ui/blocks';
import { Icon } from '../../ui/Icon';
import { Screen } from '../../ui/kit';
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

  return (
    <Screen>
      <View>
        <View style={styles.titleRow}>
          <Txt kind="display" weight={700} size={44} style={{ flex: 1 }} accessibilityRole="header">
            {v.weekday}
          </Txt>
          <Pressable accessibilityRole="button" accessibilityLabel="Settings" onPress={() => router.push('/settings')} hitSlop={8} style={styles.gear}>
            <Icon name="gear" size={24} color={t.onBgMuted} />
          </Pressable>
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

      <View style={{ gap: 10 }}>
        {v.blocks.map((b) =>
          b.state === 'done' ? (
            <DoneBlock key={b.id} block={b} />
          ) : b.state === 'now' ? (
            <NowBlock
              key={b.id}
              block={b}
              canTick={tickable}
              onTick={(key) => store.update((st) => toggleEntry(st, v.date, key, new Date()))}
              onLine={(line) => line.planId && router.push({ pathname: '/plan', params: { id: line.planId } })}
            />
          ) : (
            <LaterBlock key={b.id} block={b} />
          ),
        )}
      </View>

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
});
