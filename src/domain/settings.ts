// Settings changes (spec §4 Settings) as pure functions over the state.
import type { ParseResult } from '../data/backup';
import { plural } from '../lib/format';
import type { AppState, Background, CardColor, GoalId } from './types';

export function setBackground(s: AppState, background: Background): AppState {
  return { ...s, settings: { ...s.settings, background } };
}

export function setCards(s: AppState, cards: CardColor): AppState {
  return { ...s, settings: { ...s.settings, cards } };
}

export function setCharcoalInDark(s: AppState, charcoalInDark: boolean): AppState {
  return { ...s, settings: { ...s.settings, charcoalInDark } };
}

export const MAX_GOAL_TARGET = 14;

export function setGoalTarget(s: AppState, goal: GoalId, n: number): AppState {
  const target = Math.min(MAX_GOAL_TARGET, Math.max(0, Math.round(n)));
  return { ...s, goalTargets: { ...s.goalTargets, [goal]: target } };
}

export type RestoreStep =
  | { kind: 'cancelled' }
  | { kind: 'error'; message: string }
  | { kind: 'confirm'; state: AppState; summary: string };

/** What to do with a picked file: nothing, show its error, or ask before replacing everything. */
export function restoreFlow(result: ParseResult | null): RestoreStep {
  if (result === null) return { kind: 'cancelled' };
  if (!result.ok) return { kind: 'error', message: result.error };
  const s = result.state;
  const summary = [
    plural(Object.keys(s.tasks).length, 'task'),
    plural(Object.keys(s.plans).length, 'plan'),
    plural(Object.keys(s.notes).length, 'note'),
  ].join(', ');
  return { kind: 'confirm', state: s, summary };
}
