import { Link, router } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { ScrollView, type ScrollViewInstance, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInLeft, FadeInRight } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAppState, useStore } from '../../data/StoreContext';
import { toggleEntry } from '../../domain/ticks';
import { MAX_WEEK_OFFSET, type WeekCard, buildWeek } from '../../domain/week';
import { haptic } from '../../ui/haptics';
import { Icon } from '../../ui/Icon';
import { TAB_BAR_SPACE, shadow } from '../../ui/kit';
import { confirmDeletePlan } from '../../ui/planActions';
import { Press } from '../../ui/Press';
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
  // Which way the last week change went, so the new week slides in from that side. 0 = first open, no slide.
  const [dir, setDir] = useState<-1 | 0 | 1>(0);
  const v = useMemo(() => buildWeek(s, now, offset), [s, now, offset]);
  const scroll = useRef<ScrollViewInstance>(null);
  const dayY = useRef<Record<string, number>>({});

  const go = (next: number) => {
    haptic.select();
    setDir(next > offset ? 1 : -1);
    setOffset(next);
    scroll.current?.scrollTo({ y: 0, animated: false });
  };
  const slideIn = dir === 0 ? undefined : (dir > 0 ? FadeInRight : FadeInLeft).duration(240);

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
          <Animated.View key={v.offset} entering={dir === 0 ? undefined : FadeIn.duration(200)} style={{ flex: 1, alignItems: 'center' }}>
            <Txt kind="display" weight={700} size={28} accessibilityRole="header">
              {v.title}
            </Txt>
            <Txt size={14} color={t.onBgMuted} style={{ marginTop: 3 }}>
              {v.range}
            </Txt>
          </Animated.View>
          <NavButton icon="right" label="Next week" disabled={v.offset === MAX_WEEK_OFFSET} onPress={() => go(v.offset + 1)} />
        </View>
        <View style={styles.strip}>
          {v.days.map((d) => (
            <Press
              key={d.date}
              accessibilityRole="button"
              accessibilityLabel={`${d.name} ${d.dateLabel}${d.hasPlans ? ', has plans' : ''}`}
              onPress={() => {
                haptic.select();
                scroll.current?.scrollTo({ y: (dayY.current[d.date] ?? 0) + 4, animated: true });
              }}
              dip={0.9}
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
            </Press>
          ))}
        </View>
      </View>

      <Animated.View key={v.offset} entering={slideIn} style={styles.body}>
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
                <Press
                  accessibilityRole="button"
                  accessibilityLabel={d.checkin.state === 'pending' ? `Check in ${d.name}` : `${d.checkin.summary}. Change`}
                  onPress={() => router.push({ pathname: '/checkin/[date]', params: { date: d.date } })}
                  hitSlop={12}
                  dip={0.92}
                  style={[styles.ci, { backgroundColor: d.checkin.state === 'pending' ? t.nowChip : t.pillBg }]}
                >
                  <Txt size={11.5} weight={600} color={d.checkin.state === 'pending' ? t.nowChipInk : t.pillMuted}>
                    {d.checkin.state === 'pending' ? 'Check in' : d.checkin.summary.replace('Checked in · ', '✓ ')}
                  </Txt>
                </Press>
              ) : null}
              <Press
                accessibilityRole="button"
                accessibilityLabel={`Add a plan on ${d.name}`}
                onPress={() => router.push({ pathname: '/plan', params: { date: d.date } })}
                dip={0.88}
                style={styles.addBtn}
              >
                <View style={[styles.addCircle, { backgroundColor: t.pillBg }, shadow(t)]}>
                  <Icon name="plus" size={18} color={t.pillInk} />
                </View>
              </Press>
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
            {d.cards.map((c) => (c.planId ? <PlanWithMenu key={c.key} card={c} planId={c.planId} /> : <OtherCard key={c.key} card={c} />))}
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
      </Animated.View>
    </ScrollView>
  );
}

/** One of your plans: tap opens it, hold lifts it with Edit and Delete. */
function PlanWithMenu({ card, planId }: { card: WeekCard; planId: string }) {
  const store = useStore();
  const href = { pathname: '/plan', params: { id: planId } } as const;
  return (
    <Link href={href} asChild>
      <Link.Trigger>
        <PlanCard card={card} />
      </Link.Trigger>
      <Link.Menu>
        <Link.MenuAction title="Edit" icon="pencil" onPress={() => router.push(href)} />
        <Link.MenuAction title="Delete" icon="trash" destructive onPress={() => confirmDeletePlan(store, planId)} />
      </Link.Menu>
    </Link>
  );
}

/** iPhone events open their notes sheet; birthdays and routine plans just show. */
function OtherCard({ card }: { card: WeekCard }) {
  const key = card.eventKey;
  return <PlanCard card={card} onPress={key ? () => router.push({ pathname: '/event/[key]', params: { key } }) : undefined} />;
}

function NavButton({ icon, label, disabled, onPress }: { icon: 'left' | 'right'; label: string; disabled: boolean; onPress: () => void }) {
  const t = useTheme();
  return (
    <Press
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      dip={0.88}
      style={[styles.navBtn, { backgroundColor: t.pillBg, opacity: disabled ? 0.35 : 1 }, shadow(t)]}
    >
      <Icon name={icon} size={20} color={t.pillInk} />
    </Press>
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
