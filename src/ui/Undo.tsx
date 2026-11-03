// The Undo bar: a short message with an Undo button that floats above the tab bar for a few seconds.
import { type ReactNode, createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { haptic } from './haptics';
import { Icon } from './Icon';
import { shadow } from './kit';
import { Press } from './Press';
import { useTheme } from './ThemeContext';
import { Txt } from './Txt';

/** How long the bar stays up. */
const SHOW_MS = 5000;

type OfferUndo = (message: string, undo: () => void) => void;
interface Offer {
  id: number;
  message: string;
  undo: () => void;
}

const UndoContext = createContext<OfferUndo>(() => {});

/** Show "message · Undo". A newer offer replaces the one on screen. */
export const useUndo = (): OfferUndo => useContext(UndoContext);

export function UndoProvider({ children }: { children: ReactNode }) {
  const [offer, setOffer] = useState<Offer | null>(null);
  const seq = useRef(0);

  const offerUndo = useCallback<OfferUndo>((message, undo) => {
    seq.current += 1;
    setOffer({ id: seq.current, message, undo });
    AccessibilityInfo.announceForAccessibility(`${message}. Undo available.`);
  }, []);

  useEffect(() => {
    if (!offer) return;
    const id = setTimeout(() => setOffer(null), SHOW_MS);
    return () => clearTimeout(id);
  }, [offer]);

  return (
    <UndoContext.Provider value={offerUndo}>
      {children}
      {offer ? (
        <UndoBar
          key={offer.id}
          message={offer.message}
          onUndo={() => {
            haptic.tap();
            offer.undo();
            setOffer(null);
          }}
        />
      ) : null}
    </UndoContext.Provider>
  );
}

function UndoBar({ message, onUndo }: { message: string; onUndo: () => void }) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  // Sits just above the floating tab bar (74 tall, see the tabs layout).
  const bottom = Math.max(insets.bottom - 8, 12) + 74 + 10;
  return (
    <Animated.View
      entering={FadeInDown.duration(220)}
      exiting={FadeOutDown.duration(180)}
      pointerEvents="box-none"
      style={[styles.wrap, { bottom }]}
    >
      <View style={[styles.bar, { backgroundColor: t.fabBg }, shadow(t)]}>
        <Icon name="check" size={18} color={t.fabInk} strokeWidth={3} />
        <Txt size={14} weight={500} color={t.fabInk} numberOfLines={1} style={{ flex: 1 }}>
          {message}
        </Txt>
        <Press accessibilityRole="button" onPress={onUndo} hitSlop={6} style={styles.undo}>
          <Txt size={14} weight={700} color={t.fabInk}>
            Undo
          </Txt>
        </Press>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 16, right: 16 },
  bar: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 52, borderRadius: 18, paddingLeft: 14, paddingRight: 4 },
  undo: { minHeight: 44, paddingHorizontal: 14, justifyContent: 'center' },
});
