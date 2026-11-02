// The mockup's line icons, drawn with react-native-svg.
import type { ReactNode } from 'react';
import Svg, { Circle, G, Path, Rect } from 'react-native-svg';

const SUN = (
  <>
    <Circle cx="12" cy="12" r="4" />
    <Path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </>
);

const ICONS = {
  today: SUN,
  sun: SUN,
  list: (
    <>
      <Path d="M9 6h11M9 12h11M9 18h11" />
      <Circle cx="4.5" cy="6" r="1" />
      <Circle cx="4.5" cy="12" r="1" />
      <Circle cx="4.5" cy="18" r="1" />
    </>
  ),
  cal: (
    <>
      <Rect x="3" y="5" width="18" height="16" rx="3" />
      <Path d="M3 10h18M8 3v4M16 3v4" />
    </>
  ),
  note: (
    <>
      <Path d="M5 3h10l4 4v14H5z" />
      <Path d="M15 3v4h4M8 12h8M8 16h6" />
    </>
  ),
  plus: <Path d="M12 5v14M5 12h14" />,
  chart: (
    <>
      <Path d="M3 17l6-6 4 4 8-8" />
      <Path d="M15 7h6v6" />
    </>
  ),
  moon: <Path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" />,
  check: <Path d="M5 12.5l4.5 4.5L19 7.5" />,
  phone: (
    <>
      <Rect x="7" y="2" width="10" height="20" rx="2.5" />
      <Path d="M11 18h2" />
    </>
  ),
  heart: <Path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" />,
  fork: <Path d="M6 3v6a2 2 0 0 0 4 0V3M8 11v10M16 21V3c2.2 1.2 3 3.4 3 6.5S18 14 16 14" />,
  dice: (
    <>
      <Rect x="4" y="4" width="16" height="16" rx="4" />
      <Circle cx="9" cy="9" r="1" />
      <Circle cx="15" cy="9" r="1" />
      <Circle cx="9" cy="15" r="1" />
      <Circle cx="15" cy="15" r="1" />
    </>
  ),
  users: (
    <>
      <Circle cx="9" cy="8" r="3" />
      <Path d="M3 20c0-3 2.7-5 6-5s6 2 6 5" />
      <Circle cx="17" cy="9" r="2.5" />
      <Path d="M16.5 14.5c2.6.2 4.5 2 4.5 4.5" />
    </>
  ),
  gear: (
    <>
      <Circle cx="12" cy="12" r="3" />
      <Path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
    </>
  ),
  cake: (
    <>
      <Path d="M4 21h16M5 21v-7a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v7" />
      <Path d="M5 16.5c1.5 1 3 1 4.5 0s3-1 4.5 0 3 1 4.5 0" />
      <Path d="M12 12V8.5" />
      <Path d="M12 6c.9-.9.9-1.9 0-3-.9 1.1-.9 2.1 0 3z" />
    </>
  ),
  star: <Path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z" />,
  clock: (
    <>
      <Circle cx="12" cy="12" r="9" />
      <Path d="M12 7v5l3 2" />
    </>
  ),
  left: <Path d="M15 6l-6 6 6 6" />,
  right: <Path d="M9 6l6 6-6 6" />,
} satisfies Record<string, ReactNode>;

export type IconName = keyof typeof ICONS;

export function Icon({ name, size = 20, color = '#000', strokeWidth = 2 }: { name: IconName; size?: number; color?: string; strokeWidth?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <G fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
        {ICONS[name]}
      </G>
    </Svg>
  );
}
