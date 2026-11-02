import { localISO, routineState } from '../test/fixtures';
import { assembleDay, visibleEvents } from './day';
import { openDays } from './lifecycle';
import type { AppState, ImportedEvent, Plan, Task, When } from './types';

const plan = (id: string, when: When, date = '2026-11-02'): Plan => ({
  id, title: `Plan ${id}`, date, when, kind: 'other', note: '', addToCalendar: false, createdAt: 'x',
});
const event = (key: string, p: Partial<ImportedEvent>): ImportedEvent => ({
  key, eventId: key, calendarId: 'cal-a', title: `Event ${key}`, start: localISO(2026, 11, 2, 19, 45), end: localISO(2026, 11, 2, 20, 30),
  allDay: false, date: '2026-11-02', ...p,
});
const task = (id: string, p: Partial<Task>): Task => ({ id, title: `Task ${id}`, urgency: 'now', tag: 'life', inProgress: false, note: '', createdAt: 'x', ...p });

const keysIn = (s: AppState, date: string, block: string) =>
  assembleDay(s, date).blocks.find((b) => b.times.id === block)!.entries.map((e) => e.key);

test('plans land in the block of their start time, edges included', () => {
  const s = openDays(routineState(), '2026-11-02');
  s.plans = {
    six: plan('six', { kind: 'at', time: 18 * 60 }),
    early: plan('early', { kind: 'at', time: 5 * 60 }),
    late: plan('late', { kind: 'at', time: 23 * 60 + 30 }),
    range: plan('range', { kind: 'range', start: 17 * 60 + 30, end: 19 * 60 }),
    blk: plan('blk', { kind: 'block', block: 'afternoon' }),
  };
  expect(keysIn(s, '2026-11-02', 'evening')).toEqual(['e', 'plan:six']);
  expect(keysIn(s, '2026-11-02', 'morning')).toEqual(['m', 'plan:early']);
  expect(keysIn(s, '2026-11-02', 'winddown')).toEqual(['plan:late']);
  expect(keysIn(s, '2026-11-02', 'afternoon')).toEqual(['plan:blk', 'plan:range']);
});

test('a moved item shows in its new block and is ticked there', () => {
  const base = openDays(routineState(), '2026-11-05');
  const s: AppState = {
    ...base,
    moves: { m1: { id: 'm1', fromDate: '2026-11-02', itemId: 'e', toDate: '2026-11-05', toBlock: 'evening', at: 'x' } },
    days: { ...base.days, '2026-11-05': { ...base.days['2026-11-05'], ticks: { 'move:m1': 'x' } } },
  };
  const evening = assembleDay(s, '2026-11-05').blocks.find((b) => b.times.id === 'evening')!;
  expect(evening.entries).toHaveLength(1);
  expect(evening.entries[0]).toMatchObject({ type: 'moved', key: 'move:m1', done: true, item: { title: 'Item E' } });
  const monday = assembleDay(s, '2026-11-02').blocks.find((b) => b.times.id === 'evening')!;
  expect(monday.entries[0]).toMatchObject({ key: 'e', done: false });
});

test('planned tasks go to their block, or to Morning when only the date is set', () => {
  const s = openDays(routineState(), '2026-11-02');
  s.tasks = {
    a: task('a', { planned: { date: '2026-11-02', block: 'evening' } }),
    b: task('b', { planned: { date: '2026-11-02' } }),
    c: task('c', { planned: { date: '2026-11-03', block: 'evening' } }),
  };
  expect(keysIn(s, '2026-11-02', 'evening')).toEqual(['e', 'task:a']);
  expect(keysIn(s, '2026-11-02', 'morning')).toEqual(['m', 'task:b']);
});

test('a future date is generated from the template without being saved', () => {
  const s = routineState();
  const day = assembleDay(s, '2026-11-16');
  expect(day.record.items.map((i) => i.id)).toEqual(['m', 'e']);
  expect(s.days['2026-11-16']).toBeUndefined();
});

test('timed events sit in their block; all-day and birthday events do not', () => {
  const s = openDays(routineState(), '2026-11-02');
  s.calendar = {
    ...s.calendar,
    calendars: [
      { id: 'cal-a', title: 'Cal A', color: '#000', isBirthdays: false },
      { id: 'bday', title: 'Birthdays', color: '#000', isBirthdays: true },
    ],
    events: [
      event('ev1', {}),
      event('ev2', { allDay: true, start: localISO(2026, 11, 2), end: localISO(2026, 11, 3) }),
      event('bd', { calendarId: 'bday', allDay: false, start: localISO(2026, 11, 2, 9), end: localISO(2026, 11, 2, 10) }),
    ],
  };
  const day = assembleDay(s, '2026-11-02');
  expect(day.blocks.find((b) => b.times.id === 'evening')!.entries.map((e) => e.key)).toEqual(['e', 'event:ev1']);
  expect(day.blocks.find((b) => b.times.id === 'morning')!.entries.map((e) => e.key)).toEqual(['m']);
  expect(day.allDay.map((e) => e.key)).toEqual(['event:ev2', 'event:bd']);
});

test('visibleEvents drops hidden events and switched-off calendars, all-day first', () => {
  const s = routineState();
  s.calendar = {
    ...s.calendar,
    offCalendars: ['cal-off'],
    hidden: ['hid'],
    events: [
      event('late', { start: localISO(2026, 11, 2, 20), end: localISO(2026, 11, 2, 21) }),
      event('early', { start: localISO(2026, 11, 2, 8), end: localISO(2026, 11, 2, 9) }),
      event('allday', { allDay: true, start: localISO(2026, 11, 2), end: localISO(2026, 11, 3) }),
      event('hid', {}),
      event('off', { calendarId: 'cal-off' }),
      event('other-day', { date: '2026-11-03' }),
    ],
  };
  expect(visibleEvents(s, '2026-11-02').map((e) => e.key)).toEqual(['allday', 'early', 'late']);
});
