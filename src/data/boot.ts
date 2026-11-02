import { toISODate } from '../lib/dates';
import { startOfDay } from '../domain/lifecycle';
import type { Store } from './store';

/** On launch: close finished weeks into history and open today's record. */
export function bootState(store: Store, now: Date): void {
  store.update((s) => startOfDay(s, toISODate(now)));
}

/** On return to the foreground: the date may have moved on while the app slept. */
export const refreshDay = bootState;
