// The alien buddy from the mockup: a mint blob with two eyes, a smile and pink cheeks.
import Svg, { Circle, Path } from 'react-native-svg';

export function Buddy({ size = 56 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Path d="M32 6c14 0 24 10 24 24v20c0 4-3 7-7 7H15c-4 0-7-3-7-7V30C8 16 18 6 32 6z" fill="#45D6A4" />
      <Circle cx="24" cy="30" r="4.2" fill="#121831" />
      <Circle cx="40" cy="30" r="4.2" fill="#121831" />
      <Circle cx="25.6" cy="28.4" r="1.4" fill="#fff" />
      <Circle cx="41.6" cy="28.4" r="1.4" fill="#fff" />
      <Path d="M26.5 39.5c3 3 8 3 11 0" stroke="#121831" strokeWidth={3} fill="none" strokeLinecap="round" />
      <Circle cx="17" cy="38" r="3.2" fill="#FF7AA8" opacity={0.7} />
      <Circle cx="47" cy="38" r="3.2" fill="#FF7AA8" opacity={0.7} />
    </Svg>
  );
}
