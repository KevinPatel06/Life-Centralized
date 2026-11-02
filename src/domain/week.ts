// The Week screen as data (spec §4 Week): this week and up to 8 ahead.
import { addDays, minutesOf, toISODate, weekStartOf } from '../lib/dates';
import { clock, clockAmPm, shortDate, weekRange, weekTitle, weekdayLetter, weekdayName, weekdayShort, whenLabel } from '../lib/format';
import { type DayEntry, assembleDay, dayRecordFor, isBirthday, isTickable } from './day';
import { goalCounts } from './lifecycle';
import { canTick } from './ticks';
import type { AppState, GoalId, ISODate, PlanKind } from './types';

export interface WeekRow { key: string; title: string; subtitle?: string; done: boolean; tickable: boolean }
export interface WeekCard {
  key: string;
  time: string;
  title: string;
  kind: PlanKind | 'event' | 'birthday';
  source: 'plan' | 'iphone' | 'routine';
  planId?: string;
  eventKey?: string;
}
export interface WeekDay {
  date: ISODate;
  letter: string;
  dayNum: number;
  name: string;
  dateLabel: string;
  isToday: boolean;
  label?: string;
  note?: string;
  backupTags: string[];
  hasPlans: boolean;
  cards: WeekCard[];
  rows: WeekRow[];
}
export interface WeekView {
  offset: number;
  title: string;
  range: string;
  start: ISODate;
  days: WeekDay[];
  goals: { id: GoalId; name: string; count: number; target: number }[];
}

export const MAX_WEEK_OFFSET = 8;
const GOALS: { id: GoalId; name: string }[] = [
  { id: 'gym', name: 'Gym' },
  { id: 'trading', name: 'Trading' },
  { id: 'cardio', name: 'Cardio' },
];

function toCard(s: AppState, e: DayEntry): WeekCard | null {
  if (e.type === 'plan') return { key: e.key, time: whenLabel(e.plan.when), title: e.plan.title, kind: e.plan.kind, source: 'plan', planId: e.plan.id };
  if (e.type === 'recurring') return { key: e.key, time: whenLabel(e.plan.when), title: e.plan.title, kind: e.plan.kind, source: 'routine' };
  if (e.type === 'event') {
    const ev = e.event;
    return {
      key: e.key,
      time: ev.allDay ? 'All day' : clockAmPm(minutesOf(new Date(ev.start))),
      title: ev.title,
      kind: isBirthday(s, ev) ? 'birthday' : 'event',
      source: 'iphone',
      eventKey: ev.key,
    };
  }
  return null;
}

export function buildWeek(s: AppState, now: Date, offset: number): WeekView {
  const today = toISODate(now);
  const off = Math.min(MAX_WEEK_OFFSET, Math.max(0, Math.round(offset)));
  const start = addDays(weekStartOf(today), 7 * off);
  const dates = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  const records = dates.map((d) => dayRecordFor(s, d));

  const days: WeekDay[] = dates.map((date, i) => {
    const day = assembleDay(s, date);
    const tickable = canTick(s, date, today);
    const entries = day.blocks.flatMap((b) => b.entries);
    const cards = [...day.allDay, ...entries].map((e) => toCard(s, e)).filter((c): c is WeekCard => !!c);
    const rows: WeekRow[] = entries.filter(isTickable).map((e) => {
      const title = e.type === 'task' ? e.task.title : e.item.title;
      const subtitle =
        e.type === 'moved'
          ? `Moved from ${weekdayShort(e.move.fromDate)}`
          : e.type === 'routine'
            ? [e.item.time !== undefined ? clock(e.item.time) : null, e.item.minimum].filter(Boolean).join(' · ')
            : '';
      return { key: e.key, title, ...(subtitle ? { subtitle } : {}), done: e.done, tickable };
    });
    const backupTags = records.flatMap((r) => r.items.filter((it) => it.backup?.date === date).map((it) => `${it.title} backup`));
    const record = records[i];
    return {
      date,
      letter: weekdayLetter(date),
      dayNum: Number(date.slice(8)),
      name: weekdayName(date),
      dateLabel: shortDate(date),
      isToday: date === today,
      ...(record.label ? { label: record.label } : {}),
      ...(record.note ? { note: record.note } : {}),
      backupTags,
      hasPlans: cards.length > 0,
      cards,
      rows,
    };
  });

  const counts = off === 0 ? goalCounts(s, start) : { gym: 0, trading: 0, cardio: 0 };
  return {
    offset: off,
    title: weekTitle(off),
    range: weekRange(start),
    start,
    days,
    goals: GOALS.map((g) => ({ ...g, count: counts[g.id], target: s.goalTargets[g.id] })),
  };
}
