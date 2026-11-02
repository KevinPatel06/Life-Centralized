import { Text, type TextProps } from 'react-native';

import { type Weight, font } from './fonts';
import { useTheme } from './ThemeContext';

export type TxtProps = TextProps & {
  kind?: 'display' | 'body';
  weight?: Weight;
  size?: number;
  color?: string;
};

/** All text in the app goes through here, so nothing falls back to the system font. */
export function Txt({ kind = 'body', weight = 400, size = 15, color, style, ...rest }: TxtProps) {
  const t = useTheme();
  return <Text {...rest} style={[{ fontFamily: font(kind, weight), fontSize: size, color: color ?? t.onBg }, style]} />;
}
