// Week page pieces, after the mockup: goal pills, plan cards and the small routine ticks.
import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import type { WeekCard, WeekRow, WeekView } from '../domain/week';
import { haptic } from './haptics';
import { Icon, type IconName } from './Icon';
import { shadow, usePop } from './kit';
import { Press } from './Press';
import { PLAN_COLOR, type Theme } from './theme';
import { useTheme } from './ThemeContext';
import { Txt } from './Txt';

export function cardLook(kind: WeekCard['kind'], t: Theme): { icon: IconName; color: string } {
  if (kind === 'birthday') return { icon: 'cake', color: t.cat.love };
  if (kind === 'event') return { icon: 'cal', color: t.cat.work };
  const icon: IconName = kind === 'lunch' || kind === 'dinner' ? 'fork' : kind === 'hangout' ? 'users' : 'star';
  return { icon, color: t.cat[PLAN_COLOR[kind]] };
}

export function GoalPills({ goals }: { goals: WeekView['goals'] }) {
  const t = useTheme();
  return (
    <View style={styles.goals}>
      {goals.map((g) => (
        <View key={g.id} style={[styles.goal, { backgroundColor: t.pillBg }, shadow(t)]} accessibilityLabel={`${g.name}: ${g.count} of ${g.target}`}>
          <Txt size={12.5} color={t.pillMuted}>
            {g.name}{' '}
            <Txt size={12.5} weight={600} color={t.pillInk}>
              {g.count}/{g.target}
            </Txt>
          </Txt>
          <View style={[styles.mini, { backgroundColor: t.miniTrack }]}>
            <View style={{ height: '100%', width: `${g.target > 0 ? Math.min(100, (g.count / g.target) * 100) : 0}%`, backgroundColor: t.cat.free }} />
          </View>
        </View>
      ))}
    </View>
  );
}

/** A plan, event or birthday on Week. Inside a Link, the Link passes its own `onPress` through `link`. */
export function PlanCard({ card, ...link }: { card: WeekCard; onPress?: () => void }) {
  const t = useTheme();
  const look = cardLook(card.kind, t);
  const tappable = !!link.onPress;
  return (
    <Press
      {...link}
      disabled={!tappable}
      accessibilityRole={tappable ? 'button' : 'text'}
      dip={0.98}
      style={[styles.plan, { backgroundColor: t.card }, shadow(t)]}
    >
      <View style={[styles.pic, { backgroundColor: t.icBg }]}>
        <Icon name={look.icon} size={18} color={look.color} />
      </View>
      <View style={{ flex: 1 }}>
        <Txt size={14.5} weight={600} color={t.ink} numberOfLines={2}>
          {card.title}
        </Txt>
        <Txt size={12.5} color={t.muted}>
          {card.time}
        </Txt>
      </View>
      {card.source === 'iphone' ? (
        <View style={styles.src}>
          <Icon name="phone" size={13} color={t.muted} />
          <Txt size={11.5} color={t.muted}>
            iPhone
          </Txt>
        </View>
      ) : null}
    </Press>
  );
}

export function RoutineTick({ row, onPress }: { row: WeekRow; onPress: () => void }) {
  const t = useTheme();
  const mark = t.dark ? '#1C2620' : '#FFFFFF';
  const pop = usePop(row.done);
  return (
    <Press
      accessibilityRole="checkbox"
      accessibilityState={{ checked: row.done, disabled: !row.tickable }}
      accessibilityLabel={row.title}
      disabled={!row.tickable}
      onPress={() => {
        haptic.tap();
        onPress();
      }}
      dip={0.98}
      style={styles.td}
    >
      <Animated.View style={[styles.mk, { borderColor: row.done ? t.doneCheck : t.onBgMuted, backgroundColor: row.done ? t.doneCheck : 'transparent' }, pop]}>
        {row.done ? <Icon name="check" size={12} color={mark} strokeWidth={3.5} /> : null}
      </Animated.View>
      <View style={{ flex: 1 }}>
        <Txt size={14} color={row.done ? t.onBgMuted : t.onBg} style={row.done ? { textDecorationLine: 'line-through' } : undefined}>
          {row.title}
        </Txt>
        {row.subtitle ? (
          <Txt size={12} color={t.onBgMuted}>
            {row.subtitle}
          </Txt>
        ) : null}
      </View>
    </Press>
  );
}

export function SmallTag({ label, today = false }: { label: string; today?: boolean }) {
  const t = useTheme();
  return (
    <View style={[styles.tag, { backgroundColor: today ? t.accent : t.pillBg }]}>
      <Txt size={10.5} weight={600} color={today ? t.ringInk : t.pillMuted} style={{ letterSpacing: 0.6 }}>
        {label.toUpperCase()}
      </Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  goals: { flexDirection: 'row', gap: 8 },
  goal: { flex: 1, borderRadius: 99, paddingTop: 8, paddingBottom: 10, paddingHorizontal: 6, alignItems: 'center', overflow: 'hidden' },
  mini: { position: 'absolute', left: 16, right: 16, bottom: 4, height: 3, borderRadius: 2, overflow: 'hidden' },
  plan: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 14, paddingVertical: 8, paddingLeft: 8, paddingRight: 12 },
  pic: { width: 36, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  src: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  td: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44, paddingHorizontal: 2 },
  mk: { width: 20, height: 20, borderRadius: 7, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  tag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 99 },
});
