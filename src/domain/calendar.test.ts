import { localISO, routineState } from '../test/fixtures';
import {
  type RawCalendar,
  type RawEvent,
  calendarGroups,
  headsUp,
  mergeImport,
  planEventTimes,
  planPhoneAction,
  setCalendarKept,
  setEventKept,
} from './calendar';
import { visibleEvents } from './day';
import { openDays } from './lifecycle';
import type { AppState, Plan } from './types';

const now = new Date(2026, 10, 4, 12, 0); // Wednesday Nov 4
const cals: RawCalendar[] = [
  { id: 'a', title: 'Cal A', color: '#123456', type: 'local' },
  { id: 'bd', title: 'Birthdays', type: 'birthdays', allowsModifications: false },
  { id: 'c', title: 'Centralized', color: '#47705A' },
];
const ev = (id: string, calendarId: string, start: string, end: string, allDay = false, title = `Event ${id}`): RawEvent => ({
  id, calendarId, title, startDate: start, endDate: end, allDay,
});
const events: RawEvent[] = [
  ev('r', 'a', localISO(2026, 11, 4, 9), localISO(2026, 11, 4, 10)),
  ev('r', 'a', localISO(2026, 11, 11, 9), localISO(2026, 11, 11, 10)), // next occurrence of the same recurring event
  ev('x', 'a', localISO(2026, 11, 5, 19, 45), localISO(2026, 11, 5, 20, 30)),
  ev('b1', 'bd', localISO(2026, 11, 7), localISO(2026, 11, 8), true, "Person A's Birthday"),
  ev('own', 'c', localISO(2026, 11, 4, 20), localISO(2026, 11, 4, 21)),
];
const imported = (): AppState => mergeImport(openDays(routineState(), '2026-11-04'), cals, events, now);

test('import skips Centralized, marks Birthdays and keys each occurrence', () => {
  const s = imported();
  expect(s.calendar.imported).toBe(true);
  expect(s.calendar.syncedAt).toBe(now.toISOString());
  expect(s.calendar.calendars).toEqual([
    { id: 'a', title: 'Cal A', color: '#123456', isBirthdays: false },
    { id: 'bd', title: 'Birthdays', color: '#66707C', isBirthdays: true },
  ]);
  const keys = s.calendar.events.map((e) => e.key);
  expect(keys).toHaveLength(4);
  expect(new Set(keys).size).toBe(4);
  expect(keys.filter((k) => k.startsWith('r|'))).toHaveLength(2);
  expect(s.calendar.events.find((e) => e.eventId === 'b1')?.date).toBe('2026-11-07');
});

test('keep choices survive a re-import, and hiding one occurrence leaves the other', () => {
  const s0 = imported();
  const first = s0.calendar.events.find((e) => e.eventId === 'r' && e.date === '2026-11-04')!;
  const s1 = setCalendarKept(setEventKept(s0, first.key, false), 'bd', false);
  const again = mergeImport(s1, cals, events, now);
  expect(again.calendar.hidden).toEqual([first.key]);
  expect(again.calendar.offCalendars).toEqual(['bd']);
  expect(visibleEvents(again, '2026-11-04')).toEqual([]);
  expect(visibleEvents(again, '2026-11-11').map((e) => e.eventId)).toEqual(['r']);
  expect(visibleEvents(again, '2026-11-07')).toEqual([]);
  expect(setEventKept(again, first.key, true).calendar.hidden).toEqual([]);
  expect(setCalendarKept(again, 'bd', true).calendar.offCalendars).toEqual([]);
});

test("import snapshots today's kept events into history, not tomorrow's", () => {
  const s = imported();
  expect(s.days['2026-11-04'].events).toEqual([
    { key: expect.stringMatching(/^r\|/), title: 'Event r', start: localISO(2026, 11, 4, 9), end: localISO(2026, 11, 4, 10), allDay: false, calendarTitle: 'Cal A' },
  ]);
  expect(s.days['2026-11-05']).toBeUndefined();
});

test('calendar groups count kept events and label each one', () => {
  const s0 = imported();
  const x = s0.calendar.events.find((e) => e.eventId === 'x')!;
  const { groups, kept, total } = calendarGroups(setEventKept(s0, x.key, false));
  expect(groups.map((g) => [g.title, g.kept, g.total, g.on])).toEqual([
    ['Birthdays', 1, 1, true],
    ['Cal A', 2, 3, true],
  ]);
  expect(kept).toBe(3);
  expect(total).toBe(4);
  expect(groups[0].events[0]).toEqual({ key: expect.any(String), title: "Person A's Birthday", when: 'Sat, Nov 7th · All day', kept: true });
  expect(groups[1].events.find((e) => !e.kept)?.when).toBe('Thu, Nov 5th · 7:45 PM');
});

test('the heads-up names the next birthday or anniversary within 7 days', () => {
  const s = imported();
  expect(headsUp(s, '2026-11-04')).toBe("Person A's Birthday is Saturday · in 3 days");
  expect(headsUp(s, '2026-11-06')).toBe("Person A's Birthday is tomorrow");
  expect(headsUp(s, '2026-11-07')).toBe("Person A's Birthday is today");
  expect(headsUp(s, '2026-10-30')).toBeUndefined(); // 8 days out
  expect(headsUp(setCalendarKept(s, 'bd', false), '2026-11-04')).toBeUndefined();
});

test('anniversaries match case-insensitively, across the week boundary', () => {
  const s = mergeImport(routineState(), cals, [
    ev('an', 'a', localISO(2026, 11, 10), localISO(2026, 11, 11), true, 'Our ANNIVERSARY'),
    ev('n', 'a', localISO(2026, 11, 9), localISO(2026, 11, 10), true, 'Day off'),
  ], new Date(2026, 10, 8, 12));
  expect(headsUp(s, '2026-11-08')).toBe('Our ANNIVERSARY is Tuesday · in 2 days');
});

test('plan event times for each kind of When', () => {
  const s = routineState();
  const plan = (when: Plan['when']): Plan => ({ id: 'p', title: 'Plan', date: '2026-11-05', when, kind: 'other', note: '', addToCalendar: true, createdAt: 'x' });
  expect(planEventTimes(s, plan({ kind: 'at', time: 20 * 60 }))).toEqual({ start: new Date(2026, 10, 5, 20), end: new Date(2026, 10, 5, 21) });
  expect(planEventTimes(s, plan({ kind: 'range', start: 19 * 60, end: 22 * 60 + 30 }))).toEqual({ start: new Date(2026, 10, 5, 19), end: new Date(2026, 10, 5, 22, 30) });
  expect(planEventTimes(s, plan({ kind: 'block', block: 'evening' }))).toEqual({ start: new Date(2026, 10, 5, 18), end: new Date(2026, 10, 5, 21) });
  const open = { ...s, template: { days: s.template.days.map((d) => ({ ...d, blocks: d.blocks.map((b) => (b.id === 'winddown' ? { ...b, end: null } : b)) })) } };
  expect(planEventTimes(open, plan({ kind: 'block', block: 'winddown' })).end).toEqual(new Date(2026, 10, 5, 23, 59));
});

test('what a plan needs on the phone', () => {
  const p: Plan = { id: 'p', title: 'Plan', date: '2026-11-05', when: { kind: 'at', time: 600 }, kind: 'other', note: '', addToCalendar: true, createdAt: 'x' };
  expect(planPhoneAction(p)).toBe('create');
  expect(planPhoneAction({ ...p, calendarEventId: 'e' })).toBe('update');
  expect(planPhoneAction({ ...p, addToCalendar: false, calendarEventId: 'e' })).toBe('delete');
  expect(planPhoneAction({ ...p, addToCalendar: false })).toBe('none');
});
