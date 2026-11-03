// The app's three kinds of physical feedback. Fire-and-forget: a phone without a haptic engine just stays quiet.
import * as Haptics from 'expo-haptics';

const quiet = (p: Promise<void>) => {
  p.catch(() => {});
};

export const haptic = {
  /** Ticking something off, pressing +, Undo. */
  tap: () => quiet(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  /** Switching tabs, filters, segments, switches and choice pills. */
  select: () => quiet(Haptics.selectionAsync()),
  /** Finishing a block or saving a check-in. */
  success: () => quiet(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
};
