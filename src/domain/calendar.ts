// iPhone calendar rules (spec §3.5 write-back, §3.6 import and keep, §4 heads-up). Pure; the phone calls live in src/data.
import { addDays, daysBetween, fromISODate, minutesOf, toISODate, weekStartOf } from '../lib/dates';
import { clockAmPm, shortDate, weekdayName, weekdayShort } from '../lib/format';
import { dayRecordFor, visibleEvents } from './day';
import type { AppState, DayRecord, EventSnapshot, ISODate, ImportedCalendar, ImportedEvent, Plan } from './types';

export const CENTRALIZED = 'Centralized';
const DEFAULT_COLOR = '#66707C';
/** How far ahead the birthday / anniversary heads-up looks. */
export const HEADS_UP_DAYS = 7;

export interface RawCalendar { id: string; title: string; color?: string; type?: string; allowsModifications?: boolean }
export interface RawEvent { id: string; calendarId: string; title: string; startDate: string | Date; endDate: string | Date; allDay: boolean }

const iso = (d: string | Date) => new Date(d).toISOString();

/** Replace the imported calendars and events with a fresh read, keeping the owner's keep choices. */
export function mergeImport(s: AppState, cals: RawCalendar[], events: RawEvent[], now: Date): AppState {
  const own = (c: RawCalendar) => c.title === CENTRALIZED || c.id === s.settings.centralizedCalendarId;
  const calendars: ImportedCalendar[] = cals
    .filter((c) => !own(c))
    .map((c) => ({ id: c.id, title: c.title, color: c.color || DEFAULT_COLOR, isBirthdays: c.type === 'birthdays' }));
  const known = new Set(calendars.map((c) => c.id));
  const imported: ImportedEvent[] = events
    .filter((e) => known.has(e.calendarId))
    .map((e) => {
      const start = iso(e.startDate);
      return {
        key: `${e.id}|${start}`,
        eventId: e.id,
        calendarId: e.calendarId,
        title: e.title,
        start,
        end: iso(e.endDate),
        allDay: e.allDay,
        date: toISODate(new Date(start)),
      };
    });
  const next: AppState = { ...s, calendar: { ...s.calendar, imported: true, calendars, events: imported, syncedAt: now.toISOString() } };
  return snapshotWeek(next, toISODate(now));
}

/** History: keep a copy of the kept events on this week's day records up to today. */
function snapshotWeek(s: AppState, today: ISODate): AppState {
  const titles = new Map(s.calendar.calendars.map((c) => [c.id, c.title]));
  let days: Record<ISODate, DayRecord> | null = null;
  for (let d = weekStartOf(today); d <= today; d = addDays(d, 1)) {
    const record = s.days[d];
    if (!record) continue;
    const events: EventSnapshot[] = visibleEvents(s, d).map((e) => ({
      key: e.key,
      title: e.title,
      start: e.start,
      end: e.end,
      allDay: e.allDay,
      calendarTitle: titles.get(e.calendarId) ?? '',
    }));
    if (JSON.stringify(record.events ?? []) === JSON.stringify(events)) continue;
    days = days ?? { ...s.days };
    days[d] = { ...record, events };
  }
  return days ? { ...s, days } : s;
}

const toggle = (list: string[], value: string, present: boolean) =>
  present ? (list.includes(value) ? list : [...list, value]) : list.filter((v) => v !== value);

export function setCalendarKept(s: AppState, calendarId: string, keep: boolean): AppState {
  return { ...s, calendar: { ...s.calendar, offCalendars: toggle(s.calendar.offCalendars, calendarId, !keep) } };
}

export function setEventKept(s: AppState, key: string, keep: boolean): AppState {
  return { ...s, calendar: { ...s.calendar, hidden: toggle(s.calendar.hidden, key, !keep) } };
}

export function eventWhen(e: ImportedEvent): string {
  const day = `${weekdayShort(e.date)}, ${shortDate(e.date)}`;
  return `${day} · ${e.allDay ? 'All day' : clockAmPm(minutesOf(new Date(e.start)))}`;
}

export interface CalendarGroup {
  id: string;
  title: string;
  color: string;
  on: boolean;
  kept: number;
  total: number;
  events: { key: string; title: string; when: string; kept: boolean }[];
}

/** The iPhone calendar screen: each calendar with its events and what is kept. */
export function calendarGroups(s: AppState): { groups: CalendarGroup[]; kept: number; total: number } {
  const off = new Set(s.calendar.offCalendars);
  const hidden = new Set(s.calendar.hidden);
  const groups = [...s.calendar.calendars]
    .sort((a, b) => a.title.localeCompare(b.title))
    .map((c) => {
      const on = !off.has(c.id);
      const evs = s.calendar.events
        .filter((e) => e.calendarId === c.id)
        .sort((a, b) => a.start.localeCompare(b.start))
        .map((e) => ({ key: e.key, title: e.title, when: eventWhen(e), kept: on && !hidden.has(e.key) }));
      return { id: c.id, title: c.title, color: c.color, on, kept: evs.filter((e) => e.kept).length, total: evs.length, events: evs };
    });
  return { groups, kept: groups.reduce((n, g) => n + g.kept, 0), total: groups.reduce((n, g) => n + g.total, 0) };
}

/** "Mom's birthday is Thursday · in 3 days" for the next kept birthday or anniversary within 7 days. */
export function headsUp(s: AppState, today: ISODate): string | undefined {
  const birthdayCals = new Set(s.calendar.calendars.filter((c) => c.isBirthdays).map((c) => c.id));
  for (let i = 0; i <= HEADS_UP_DAYS; i++) {
    const date = addDays(today, i);
    const hit = visibleEvents(s, date).find((e) => birthdayCals.has(e.calendarId) || (e.allDay && /anniversary/i.test(e.title)));
    if (!hit) continue;
    const ahead = daysBetween(today, date);
    const when = ahead === 0 ? 'today' : ahead === 1 ? 'tomorrow' : `${weekdayName(date)} · in ${ahead} days`;
    return `${hit.title} is ${when}`;
  }
  return undefined;
}

/** The start and end written to the Centralized calendar for a plan. */
export function planEventTimes(s: AppState, p: Plan): { start: Date; end: Date } {
  const day = fromISODate(p.date);
  const at = (m: number) => new Date(day.getFullYear(), day.getMonth(), day.getDate(), 0, m);
  if (p.when.kind === 'at') return { start: at(p.when.time), end: at(p.when.time + 60) };
  if (p.when.kind === 'range') return { start: at(p.when.start), end: at(p.when.end) };
  const block = p.when.block;
  const times = dayRecordFor(s, p.date).blocks.find((b) => b.id === block)!;
  return { start: at(times.start), end: at(times.end ?? 23 * 60 + 59) };
}

export function planPhoneAction(p: Plan): 'create' | 'update' | 'delete' | 'none' {
  if (p.addToCalendar) return p.calendarEventId ? 'update' : 'create';
  return p.calendarEventId ? 'delete' : 'none';
}
