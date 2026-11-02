// Priority rules (spec §3.4).
import { addDays, daysBetween } from '../lib/dates';
import type { ISODate, Task, Urgency } from './types';

/** Days before the due date when a task is treated as Now. */
export const DUE_BUMP_DAYS = 7;

/** The urgency to show: a due date within 7 days (or past) makes it Now. The stored urgency is untouched. */
export function effectiveUrgency(t: Task, today: ISODate): { urgency: Urgency; overdue: boolean; bumpOn?: ISODate } {
  if (!t.due) return { urgency: t.urgency, overdue: false };
  const left = daysBetween(today, t.due);
  if (left < 0) return { urgency: 'now', overdue: true };
  if (left <= DUE_BUMP_DAYS) return { urgency: 'now', overdue: false };
  if (t.urgency === 'now') return { urgency: 'now', overdue: false };
  return { urgency: t.urgency, overdue: false, bumpOn: addDays(t.due, -DUE_BUMP_DAYS) };
}
