// How times, dates and labels read across the app (spec §4, mockup copy).
import type { BlockId, BlockTimes, Minutes, When } from '../domain/types';
import { type ISODate, addDays, fromISODate, weekdayOf } from './dates';

/** "1 task", "2 tasks". */
export function plural(n: number, word: string, many = `${word}s`): string {
  return `${n} ${n === 1 ? word : many}`;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export const BLOCK_NAME: Record<BlockId, string> = {
  morning: 'Morning',
  afternoon: 'Afternoon',
  evening: 'Evening',
  winddown: 'Wind down',
};

const parts = (m: Minutes) => {
  const total = ((m % 1440) + 1440) % 1440;
  const h = Math.floor(total / 60);
  return { h12: h % 12 === 0 ? 12 : h % 12, min: String(total % 60).padStart(2, '0'), pm: h >= 12 };
};

/** "6:00", "12:30": 12-hour, no suffix. */
export function clock(m: Minutes): string {
  const p = parts(m);
  return `${p.h12}:${p.min}`;
}

/** "7:45 PM". */
export function clockAmPm(m: Minutes): string {
  return `${clock(m)} ${parts(m).pm ? 'PM' : 'AM'}`;
}

/** "6:00–9:00", or "9:00" for a block with no end. */
export function blockRange(b: BlockTimes): string {
  return b.end === null ? clock(b.start) : `${clock(b.start)}–${clock(b.end)}`;
}

/** "8:00 – 11:00 PM", or "11:00 AM – 1:00 PM" when the halves of the day differ. */
export function timeRange(a: Minutes, b: Minutes): string {
  return parts(a).pm === parts(b).pm ? `${clock(a)} – ${clockAmPm(b)}` : `${clockAmPm(a)} – ${clockAmPm(b)}`;
}

export function whenLabel(w: When): string {
  if (w.kind === 'block') return BLOCK_NAME[w.block];
  if (w.kind === 'at') return clockAmPm(w.time);
  return timeRange(w.start, w.end);
}

export function ordinal(n: number): string {
  const tens = n % 100;
  if (tens >= 11 && tens <= 13) return `${n}th`;
  return `${n}${{ 1: 'st', 2: 'nd', 3: 'rd' }[n % 10] ?? 'th'}`;
}

/** "Nov 2nd". */
export function shortDate(d: ISODate): string {
  const date = fromISODate(d);
  return `${MONTHS[date.getMonth()]} ${ordinal(date.getDate())}`;
}

export const weekdayName = (d: ISODate) => DAYS[weekdayOf(d)];
export const weekdayShort = (d: ISODate) => DAYS[weekdayOf(d)].slice(0, 3);
export const weekdayLetter = (d: ISODate) => DAYS[weekdayOf(d)][0];

export function weekTitle(offset: number): string {
  if (offset === 0) return 'This week';
  if (offset === 1) return 'Next week';
  return `In ${offset} weeks`;
}

/** "Nov 2 – 8", or "Nov 30 – Dec 6" across a month. */
export function weekRange(start: ISODate): string {
  const a = fromISODate(start);
  const b = fromISODate(addDays(start, 6));
  const left = `${MONTHS[a.getMonth()]} ${a.getDate()}`;
  return a.getMonth() === b.getMonth() ? `${left} – ${b.getDate()}` : `${left} – ${MONTHS[b.getMonth()]} ${b.getDate()}`;
}
