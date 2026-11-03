import { router } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, type ScrollViewInstance, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAppState, useStore } from '../../data/StoreContext';
import { toggleEntry } from '../../domain/ticks';
import { MAX_WEEK_OFFSET, buildWeek } from '../../domain/week';
import { Icon } from '../../ui/Icon';
import { TAB_BAR_SPACE, shadow } from '../../ui/kit';
import { useTheme } from '../../ui/ThemeContext';
import { Txt } from '../../ui/Txt';
import { useNow } from '../../ui/useNow';
import { GoalPills, PlanCard, RoutineTick, SmallTag } from '../../ui/weekParts';

export default function WeekScreen() {
  const t = useTheme();
  const s = useAppState();
  const store = useStore();
  const now = useNow();
  const insets = useSafeAreaInsets();
  const [offset, setOffset] = useState(0);
  const v = useMemo(() => buildWeek(s, now, offset), [s, now, offset]);
  const scroll = useRef<ScrollViewInstance>(null);
  const dayY = useRef<Record<string, number>>({});

  const go = (next: number) => {
    setOffset(next);
    scroll.current?.scrollTo({ y: 0, animated: false });
  };

  return (
    <ScrollView
      ref={scroll}
      style={{ flex: 1, backgroundColor: t.bg }}
      contentContainerStyle={{ paddingBottom: TAB_BAR_SPACE }}
      stickyHeaderIndices={[0]}
    >
      <View
        style={[styles.sticky, { backgroundColor: t.bg, paddingTop: insets.top + 12 }]}
      >
        <View style={styles.nav}>
          <NavButton icon="left" label="Previous week" disabled={v.offset === 0} onPress={() => go(v.offset - 1)} />
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Txt kind="display" weight={700} size={28} accessibilityRole="header">
              {v.title}
            </Txt>
            <Txt size={14} color={t.onBgMuted} style={{ marginTop: 3 }}>
              {v.range}
            </Txt>
          </View>
          <NavButton icon="right" label="Next week" disabled={v.offset === MAX_WEEK_OFFSET} onPress={() => go(v.offset + 1)} />
        </View>
        <View style={styles.strip}>
          {v.days.map((d) => (
            <Pressable
              key={d.date}
              accessibilityRole="button"
              accessibilityLabel={`${d.name} ${d.dateLabel}${d.hasPlans ? ', has plans' : ''}`}
              onPress={() => scroll.current?.scrollTo({ y: (dayY.current[d.date] ?? 0) + 4, animated: true })}
              style={styles.stripDay}
            >
              <Txt size={11} weight={600} color={t.onBgMuted}>
                {d.letter}
              </Txt>
              <View style={[styles.dayNum, d.isToday && { backgroundColor: t.accent }]}>
                <Txt kind="display" weight={600} size={18} color={d.isToday ? t.ringInk : t.onBg}>
                  {d.dayNum}
                </Txt>
              </View>
              <View style={[styles.pd, { backgroundColor: d.hasPlans ? t.accent : 'transparent' }]} />
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.body}>
        <GoalPills goals={v.goals} />
        {v.days.map((d, i) => (
          <View
            key={d.date}
            onLayout={(e) => (dayY.current[d.date] = e.nativeEvent.layout.y)}
            style={[styles.day, { borderTopColor: i === 0 ? 'transparent' : t.bgLine, paddingTop: i === 0 ? 8 : 18 }]}
          >
            <View style={styles.dayHead}>
              <Txt kind="display" weight={600} size={20}>
                {d.name}
              </Txt>
              <Txt size={14} color={t.onBgMuted}>
                {d.dateLabel}
              </Txt>
              {d.isToday ? <SmallTag label="Today" today /> : null}
              {d.label ? <SmallTag label={d.label} /> : null}
              {d.checkin.state !== 'none' ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={d.checkin.state === 'pending' ? `Check in ${d.name}` : `${d.checkin.summary}. Change`}
                  onPress={() => router.push({ pathname: '/checkin/[date]', params: { date: d.date } })}
                  hitSlop={12}
                  style={[styles.ci, { backgroundColor: d.checkin.state === 'pending' ? t.nowChip : t.pillBg }]}
                >
                  <Txt size={11.5} weight={600} color={d.checkin.state === 'pending' ? t.nowChipInk : t.pillMuted}>
                    {d.checkin.state === 'pending' ? 'Check in' : d.checkin.summary.replace('Checked in · ', '✓ ')}
                  </Txt>
                </Pressable>
              ) : null}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Add a plan on ${d.name}`}
                onPress={() => router.push({ pathname: '/plan', params: { date: d.date } })}
                style={styles.addBtn}
              >
                <View style={[styles.addCircle, { backgroundColor: t.pillBg }, shadow(t)]}>
                  <Icon name="plus" size={18} color={t.pillInk} />
                </View>
              </Pressable>
            </View>
            {d.note || d.backupTags.length ? (
              <View style={styles.info}>
                {d.note ? (
                  <Txt size={13} color={t.onBgMuted}>
                    {d.note}
                  </Txt>
                ) : null}
                {d.backupTags.map((tag) => (
                  <View key={tag} style={[styles.bk, { backgroundColor: t.pillBg }]}>
                    <Txt size={10.5} weight={600} color={t.pillMuted}>
                      {tag}
                    </Txt>
                  </View>
                ))}
              </View>
            ) : null}
            {d.cards.map((c) => (
              <PlanCard
                key={c.key}
                card={c}
                onPress={
                  c.planId
                    ? () => router.push({ pathname: '/plan', params: { id: c.planId! } })
                    : c.eventKey
                      ? () => router.push({ pathname: '/event/[key]', params: { key: c.eventKey! } })
                      : undefined
                }
              />
            ))}
            {d.rows.map((r) => (
              <RoutineTick key={r.key} row={r} onPress={() => store.update((st) => toggleEntry(st, d.date, r.key, new Date()))} />
            ))}
            {d.cards.length === 0 && d.rows.length === 0 ? (
              <Txt size={13} color={t.onBgMuted}>
                Nothing planned yet.
              </Txt>
            ) : null}
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

function NavButton({ icon, label, disabled, onPress }: { icon: 'left' | 'right'; label: string; disabled: boolean; onPress: () => void }) {
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[styles.navBtn, { backgroundColor: t.pillBg, opacity: disabled ? 0.35 : 1 }, shadow(t)]}
    >
      <Icon name={icon} size={20} color={t.pillInk} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  sticky: { paddingHorizontal: 18, paddingBottom: 8, gap: 12 },
  nav: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  navBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  strip: { flexDirection: 'row', gap: 2 },
  stripDay: { flex: 1, alignItems: 'center', gap: 3, paddingVertical: 4, minHeight: 64, borderRadius: 14 },
  dayNum: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  pd: { width: 5, height: 5, borderRadius: 3 },
  body: { paddingHorizontal: 18, gap: 4, paddingTop: 8 },
  day: { borderTopWidth: 2, paddingBottom: 20, paddingHorizontal: 2, gap: 8 },
  dayHead: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44, flexWrap: 'wrap' },
  addBtn: { marginLeft: 'auto', width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  addCircle: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  info: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap', paddingHorizontal: 2 },
  bk: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 99 },
  ci: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 99 },
});
