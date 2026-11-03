// A Pressable that dips slightly while held, so every tap feels answered.
import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export type PressProps = Omit<PressableProps, 'style'> & {
  style?: StyleProp<ViewStyle>;
  /** How far it shrinks while held. Big cards dip less than small buttons. */
  dip?: number;
};

export function Press({ style, dip = 0.96, onPressIn, onPressOut, disabled, ...rest }: PressProps) {
  const scale = useSharedValue(1);
  const look = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));
  return (
    <AnimatedPressable
      {...rest}
      disabled={disabled}
      onPressIn={(e) => {
        if (!disabled) scale.set(withTiming(dip, { duration: 90 }));
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        scale.set(withSpring(1, { damping: 14, stiffness: 320 }));
        onPressOut?.(e);
      }}
      style={[style, look]}
    />
  );
}
