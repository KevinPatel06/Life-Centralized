// Shared building blocks, styled after the approved mockup.
import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon, type IconName } from './Icon';
import type { Theme } from './theme';
import { useTheme } from './ThemeContext';
import { Txt } from './Txt';

/** Room left under scrolling content for the floating tab bar. */
export const TAB_BAR_SPACE = 120;

export function shadow(t: Theme): ViewStyle {
  return t.dark
    ? { shadowColor: '#000', shadowOpacity: 0.6, shadowRadius: 12, shadowOffset: { width: 0, height: 10 } }
    : { shadowColor: '#46321E', shadowOpacity: 0.18, shadowRadius: 12, shadowOffset: { width: 0, height: 8 } };
}

/** A page on the theme background. Scrolls by default and leaves room for the tab bar. */
export function Screen({
  children,
  scroll = true,
  tabBar = true,
  contentStyle,
}: {
  children: ReactNode;
  scroll?: boolean;
  tabBar?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
}) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const pad: ViewStyle = { paddingTop: insets.top + 16, paddingHorizontal: 18, paddingBottom: tabBar ? TAB_BAR_SPACE : insets.bottom + 24, gap: 16 };
  if (!scroll) return <View style={[{ flex: 1, backgroundColor: t.bg }, pad, contentStyle]}>{children}</View>;
  return (
    <ScrollView style={{ flex: 1, backgroundColor: t.bg }} contentContainerStyle={[pad, contentStyle]} keyboardShouldPersistTaps="handled">
      {children}
    </ScrollView>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const t = useTheme();
  return <View style={[{ backgroundColor: t.card, borderRadius: 22, padding: 14, gap: 12 }, shadow(t), style]}>{children}</View>;
}

export function Chip({ label, bg, color, icon }: { label: string; bg: string; color: string; icon?: IconName }) {
  return (
    <View style={[styles.chip, { backgroundColor: bg }]}>
      {icon ? <Icon name={icon} size={12} color={color} strokeWidth={2.4} /> : null}
      <Txt size={11.5} weight={600} color={color} numberOfLines={1}>
        {label}
      </Txt>
    </View>
  );
}

/** A rounded choice button; filled with the accent when selected. */
export function PillButton({
  label,
  selected = false,
  onPress,
  icon,
  style,
  accessibilityLabel,
}: {
  label: string;
  selected?: boolean;
  onPress: () => void;
  icon?: IconName;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}) {
  const t = useTheme();
  const color = selected ? t.ringInk : t.ink;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={accessibilityLabel ?? label}
      onPress={onPress}
      style={({ pressed }) => [styles.pill, { backgroundColor: selected ? t.accent : t.fieldBg, opacity: pressed ? 0.75 : 1 }, style]}
    >
      {icon ? <Icon name={icon} size={16} color={color} /> : null}
      <Txt size={14} weight={selected ? 600 : 500} color={color} numberOfLines={1}>
        {label}
      </Txt>
    </Pressable>
  );
}

export function PrimaryButton({ label, onPress, disabled = false }: { label: string; onPress: () => void; disabled?: boolean }) {
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.primary, { backgroundColor: t.fabBg, opacity: disabled ? 0.4 : pressed ? 0.8 : 1 }]}
    >
      <Txt size={16} weight={600} color={t.fabInk}>
        {label}
      </Txt>
    </Pressable>
  );
}

/** The rounded tick box. The whole 44pt square is the target. */
export function Tick({ checked, onPress, label, disabled = false }: { checked: boolean; onPress: () => void; label: string; disabled?: boolean }) {
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked, disabled }}
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      hitSlop={4}
      style={styles.tick}
    >
      <View
        style={[
          styles.box,
          { borderColor: checked ? t.tickOn : t.tick, backgroundColor: checked ? t.tickOn : 'transparent', opacity: disabled ? 0.5 : 1 },
        ]}
      >
        {checked ? <Icon name="check" size={16} color={t.tickMark} strokeWidth={3} /> : null}
      </View>
    </Pressable>
  );
}

/** The mockup's switch: 52×32 with a white knob, accent when on. */
export function Switch({ value, onChange, label }: { value: boolean; onChange: (v: boolean) => void; label: string }) {
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      accessibilityLabel={label}
      onPress={() => onChange(!value)}
      hitSlop={8}
      style={[styles.switch, { backgroundColor: value ? t.accent : t.line }]}
    >
      <View style={[styles.knob, { left: value ? 23 : 3 }]} />
    </Pressable>
  );
}

/** A back link at the top of pushed screens. */
export function BackLink({ label, onPress }: { label: string; onPress: () => void }) {
  const t = useTheme();
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.back} hitSlop={8}>
      <Icon name="left" size={20} color={t.onBgMuted} />
      <Txt size={15} weight={500} color={t.onBgMuted}>
        {label}
      </Txt>
    </Pressable>
  );
}

export const styles = StyleSheet.create({
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 99, alignSelf: 'flex-start' },
  pill: { minHeight: 44, borderRadius: 99, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  primary: { minHeight: 54, borderRadius: 18, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  tick: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  box: { width: 26, height: 26, borderRadius: 9, borderWidth: 2.5, alignItems: 'center', justifyContent: 'center' },
  switch: { width: 52, height: 32, borderRadius: 99 },
  knob: {
    position: 'absolute',
    top: 3,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
  },
  back: { flexDirection: 'row', alignItems: 'center', gap: 2, minHeight: 44, alignSelf: 'flex-start', marginLeft: -6 },
});
