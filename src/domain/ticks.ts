// Ticking items on Today and Week (spec §3.2: today and earlier this week; future days read-only).
import { toISODate, weekStartOf } from '../lib/dates';
import { dayRecordFor } from './day';
import type { AppState, ISODate } from './types';

export function canTick(s: AppState, date: ISODate, today: ISODate): boolean {
  if (date > today || weekStartOf(date) !== weekStartOf(today)) return false;
  return !s.days[date]?.checkin;
}

/** Tick or untick one entry: a routine item id, `move:<id>`, or `task:<id>`. */
export function toggleEntry(s: AppState, date: ISODate, key: string, now: Date): AppState {
  if (!canTick(s, date, toISODate(now))) return s;
  if (key.startsWith('task:')) {
    const id = key.slice('task:'.length);
    const task = s.tasks[id];
    if (!task) return s;
    const { doneAt, ...rest } = task;
    return { ...s, tasks: { ...s.tasks, [id]: doneAt ? rest : { ...rest, doneAt: now.toISOString() } } };
  }
  const record = dayRecordFor(s, date);
  const ticks = { ...record.ticks };
  if (ticks[key]) delete ticks[key];
  else ticks[key] = now.toISOString();
  return { ...s, days: { ...s.days, [date]: { ...record, ticks } } };
}
