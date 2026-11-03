// Shared building blocks, styled after the approved mockup.
import { type ReactNode, useEffect, useRef } from 'react';
import { ScrollView, StyleSheet, TextInput, type TextInputProps, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { font } from './fonts';
import { haptic } from './haptics';
import { Icon, type IconName } from './Icon';
import { Press } from './Press';
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
    <Press
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={accessibilityLabel ?? label}
      onPress={() => {
        haptic.select();
        onPress();
      }}
      style={[styles.pill, { backgroundColor: selected ? t.accent : t.fieldBg }, style]}
    >
      {icon ? <Icon name={icon} size={16} color={color} /> : null}
      <Txt size={14} weight={selected ? 600 : 500} color={color} numberOfLines={1}>
        {label}
      </Txt>
    </Press>
  );
}

export function PrimaryButton({ label, onPress, disabled = false }: { label: string; onPress: () => void; disabled?: boolean }) {
  const t = useTheme();
  return (
    <Press
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      dip={0.98}
      style={[styles.primary, { backgroundColor: t.fabBg, opacity: disabled ? 0.4 : 1 }]}
    >
      <Txt size={16} weight={600} color={t.fabInk}>
        {label}
      </Txt>
    </Press>
  );
}

/** Pops a view when `on` turns true (not on first render). Used by the tick boxes. */
export function usePop(on: boolean) {
  const scale = useSharedValue(1);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (on) scale.set(withSequence(withTiming(1.22, { duration: 110 }), withSpring(1, { damping: 9, stiffness: 280 })));
  }, [on, scale]);
  return useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));
}

/**
 * The rounded tick box. The whole 44pt square is the target.
 * Gives a light tap when pressed; pass `haptics={false}` when the caller picks its own feedback.
 */
export function Tick({
  checked,
  onPress,
  label,
  disabled = false,
  haptics = true,
}: {
  checked: boolean;
  onPress: () => void;
  label: string;
  disabled?: boolean;
  haptics?: boolean;
}) {
  const t = useTheme();
  const pop = usePop(checked);
  return (
    <Press
      accessibilityRole="checkbox"
      accessibilityState={{ checked, disabled }}
      accessibilityLabel={label}
      disabled={disabled}
      onPress={() => {
        if (haptics) haptic.tap();
        onPress();
      }}
      hitSlop={4}
      dip={0.88}
      style={styles.tick}
    >
      <Animated.View
        style={[
          styles.box,
          { borderColor: checked ? t.tickOn : t.tick, backgroundColor: checked ? t.tickOn : 'transparent', opacity: disabled ? 0.5 : 1 },
          pop,
        ]}
      >
        {checked ? <Icon name="check" size={16} color={t.tickMark} strokeWidth={3} /> : null}
      </Animated.View>
    </Press>
  );
}

/** The mockup's switch: 52×32 with a white knob, accent when on. */
export function Switch({ value, onChange, label }: { value: boolean; onChange: (v: boolean) => void; label: string }) {
  const t = useTheme();
  const x = useSharedValue(value ? 20 : 0);
  useEffect(() => {
    x.set(withSpring(value ? 20 : 0, { damping: 16, stiffness: 260 }));
  }, [value, x]);
  const knob = useAnimatedStyle(() => ({ transform: [{ translateX: x.get() }] }));
  return (
    <Press
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      accessibilityLabel={label}
      onPress={() => {
        haptic.select();
        onChange(!value);
      }}
      hitSlop={8}
      dip={0.94}
      style={[styles.switch, { backgroundColor: value ? t.accent : t.line }]}
    >
      <Animated.View style={[styles.knob, knob]} />
    </Press>
  );
}

/** A text field on a card, after the mockup's .field. */
export function Field({ style, multiline, ...rest }: TextInputProps) {
  const t = useTheme();
  return (
    <TextInput
      placeholderTextColor={t.muted}
      selectionColor={t.accent}
      multiline={multiline}
      {...rest}
      style={[
        { minHeight: multiline ? 120 : 48, borderRadius: 14, backgroundColor: t.fieldBg, color: t.ink, paddingHorizontal: 14, fontFamily: font('body', 500), fontSize: 16 },
        multiline ? { paddingTop: 12, paddingBottom: 12, textAlignVertical: 'top' } : null,
        style,
      ]}
    />
  );
}

/** A small uppercase-free field label inside sheets. */
export function Label({ children }: { children: ReactNode }) {
  const t = useTheme();
  return (
    <Txt size={13} weight={600} color={t.muted}>
      {children}
    </Txt>
  );
}

/** A back link at the top of pushed screens. */
export function BackLink({ label, onPress }: { label: string; onPress: () => void }) {
  const t = useTheme();
  return (
    <Press accessibilityRole="button" onPress={onPress} style={styles.back} hitSlop={8}>
      <Icon name="left" size={20} color={t.onBgMuted} />
      <Txt size={15} weight={500} color={t.onBgMuted}>
        {label}
      </Txt>
    </Press>
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
    left: 3,
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
