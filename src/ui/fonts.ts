// Fredoka for display, Lexend for the app body (spec §5). The font files ship inside the app bundle.
import { Fredoka_600SemiBold } from '@expo-google-fonts/fredoka/600SemiBold';
import { Fredoka_700Bold } from '@expo-google-fonts/fredoka/700Bold';
import { Lexend_400Regular } from '@expo-google-fonts/lexend/400Regular';
import { Lexend_500Medium } from '@expo-google-fonts/lexend/500Medium';
import { Lexend_600SemiBold } from '@expo-google-fonts/lexend/600SemiBold';
import { Lexend_700Bold } from '@expo-google-fonts/lexend/700Bold';

export const FONT_ASSETS = {
  Fredoka_600SemiBold,
  Fredoka_700Bold,
  Lexend_400Regular,
  Lexend_500Medium,
  Lexend_600SemiBold,
  Lexend_700Bold,
};

export type Weight = 400 | 500 | 600 | 700;

/** Static font files: the weight is chosen by family name, not fontWeight. */
export function font(kind: 'display' | 'body', weight: Weight): string {
  if (kind === 'display') return weight >= 700 ? 'Fredoka_700Bold' : 'Fredoka_600SemiBold';
  return { 400: 'Lexend_400Regular', 500: 'Lexend_500Medium', 600: 'Lexend_600SemiBold', 700: 'Lexend_700Bold' }[weight];
}
