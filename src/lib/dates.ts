/** Weeks run Monday to Sunday in the device's local time. */
export function startOfWeek(d: Date): Date {
  const daysSinceMonday = (d.getDay() + 6) % 7;
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() - daysSinceMonday);
}

/** The planning window: this week plus 8 weeks ahead (63 days). `end` is exclusive, at local midnight. */
export function planningWindow(now: Date): { start: Date; end: Date } {
  const start = startOfWeek(now);
  const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 63);
  return { start, end };
}

/** A local calendar date, `YYYY-MM-DD`. */
export type ISODate = string;

const pad = (n: number) => String(n).padStart(2, '0');

/** The local calendar date of `d`. Never uses `toISOString`, which is UTC. */
export function toISODate(d: Date): ISODate {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Local midnight on that date. */
export function fromISODate(s: ISODate): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(s: ISODate, n: number): ISODate {
  const d = fromISODate(s);
  return toISODate(new Date(d.getFullYear(), d.getMonth(), d.getDate() + n));
}

/** 0 = Monday … 6 = Sunday. */
export function weekdayOf(s: ISODate): number {
  return (fromISODate(s).getDay() + 6) % 7;
}

/** The Monday of that date's week. */
export function weekStartOf(s: ISODate): ISODate {
  return addDays(s, -weekdayOf(s));
}

/** Whole days from `a` to `b` (negative when `b` is earlier). Rounds away DST hours. */
export function daysBetween(a: ISODate, b: ISODate): number {
  return Math.round((fromISODate(b).getTime() - fromISODate(a).getTime()) / 86_400_000);
}

/** Minutes after local midnight. */
export function minutesOf(d: Date): number {
  return d.getHours() * 60 + d.getMinutes();
}
