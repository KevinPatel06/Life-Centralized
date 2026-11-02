// Turning dates into day records, and closing finished weeks into history (spec §3.3, §6).
import { addDays, weekStartOf } from '../lib/dates';
import { generateDayRecord } from './template';
import type { AppState, DayRecord, GoalId, ISODate } from './types';

/** How far back a long absence is filled in when the app opens again. */
export const CATCH_UP_WEEKS = 8;
const GOALS: GoalId[] = ['gym', 'trading', 'cardio'];

/** Make sure this week's days up to today exist, frozen from the current template. */
export function openDays(s: AppState, today: ISODate): AppState {
  let days = s.days;
  for (let d = weekStartOf(today); d <= today; d = addDays(d, 1)) {
    if (days[d]) continue;
    if (days === s.days) days = { ...s.days };
    days[d] = generateDayRecord(s.template, d);
  }
  return days === s.days ? s : { ...s, days };
}

/** Goal counts for one week: ticked routine items with a goal, plus moved items ticked where they landed. */
export function goalCounts(s: AppState, weekStart: ISODate): Record<GoalId, number> {
  const counts: Record<GoalId, number> = { gym: 0, trading: 0, cardio: 0 };
  for (let i = 0; i < 7; i++) {
    const day = s.days[addDays(weekStart, i)];
    if (!day) continue;
    for (const item of day.items) if (item.goal && day.ticks[item.id]) counts[item.goal]++;
    for (const key of Object.keys(day.ticks)) {
      if (!key.startsWith('move:')) continue;
      const move = s.moves[key.slice('move:'.length)];
      const goal = move && s.days[move.fromDate]?.items.find((it) => it.id === move.itemId)?.goal;
      if (goal) counts[goal]++;
    }
  }
  return counts;
}

/**
 * Close every finished week since the last one closed: fill in days the app never saw,
 * mark days never checked in, and save the goal counts against their targets.
 * Nothing moves. A fresh install starts closing from this week on.
 */
export function closeWeeks(s: AppState, today: ISODate): AppState {
  const lastWeek = addDays(weekStartOf(today), -7);
  const closed = s.settings.lastWeekClosed;
  if (!closed) return { ...s, settings: { ...s.settings, lastWeekClosed: lastWeek } };
  if (closed >= lastWeek) return s;

  const floor = addDays(lastWeek, -7 * (CATCH_UP_WEEKS - 1));
  const from = addDays(closed, 7) < floor ? floor : addDays(closed, 7);
  const days: Record<ISODate, DayRecord> = { ...s.days };
  const weeks = { ...s.weeks };
  for (let w = from; w <= lastWeek; w = addDays(w, 7)) {
    for (let i = 0; i < 7; i++) {
      const d = addDays(w, i);
      const day = days[d] ?? generateDayRecord(s.template, d);
      days[d] = day.checkin || day.notCheckedIn ? day : { ...day, notCheckedIn: true };
    }
    const counts = goalCounts({ ...s, days }, w);
    weeks[w] = {
      weekStart: w,
      goals: Object.fromEntries(GOALS.map((g) => [g, { count: counts[g], target: s.goalTargets[g] }])) as Record<
        GoalId,
        { count: number; target: number }
      >,
    };
  }
  return { ...s, days, weeks, settings: { ...s.settings, lastWeekClosed: lastWeek } };
}

/** Run on launch and whenever the app comes back to the foreground. */
export function startOfDay(s: AppState, today: ISODate): AppState {
  return openDays(closeWeeks(s, today), today);
}
