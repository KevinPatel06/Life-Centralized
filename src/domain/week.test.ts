import { localISO, routineState } from '../test/fixtures';
import { openDays } from './lifecycle';
import type { AppState } from './types';
import { buildWeek } from './week';

const wednesday = new Date(2026, 10, 4, 12, 0);

function state(): AppState {
  const s = routineState();
  s.template.days[1].items = [{ id: 'tu', block: 'morning', title: 'Item T' }];
  s.template.days[3].items = [{ id: 'th', block: 'morning', title: 'Item H' }];
  s.template.days[4].plans = [{ id: 'fr', title: 'Recurring F', when: { kind: 'block', block: 'evening' }, kind: 'hangout' }];
  return openDays(s, '2026-11-04');
}

test('titles and ranges, with the offset kept within 8 weeks', () => {
  const s = state();
  expect(buildWeek(s, wednesday, 0)).toMatchObject({ title: 'This week', range: 'Nov 2 – 8', start: '2026-11-02', offset: 0 });
  expect(buildWeek(s, wednesday, 9)).toMatchObject({ title: 'In 8 weeks', offset: 8, start: '2026-12-28' });
  expect(buildWeek(s, wednesday, -1).offset).toBe(0);
});

test('day cards list all-day first, then by time', () => {
  const s = state();
  s.plans = { p1: { id: 'p1', title: 'Plan 1', date: '2026-11-03', when: { kind: 'at', time: 20 * 60 }, kind: 'dinner', note: '', addToCalendar: false, createdAt: 'x' } };
  s.calendar = {
    ...s.calendar,
    calendars: [{ id: 'cal-a', title: 'Cal A', color: '#000', isBirthdays: false }],
    events: [{ key: 'ad', eventId: 'ad', calendarId: 'cal-a', title: 'All-day A', start: localISO(2026, 11, 3), end: localISO(2026, 11, 4), allDay: true, date: '2026-11-03' }],
  };
  const tuesday = buildWeek(s, wednesday, 0).days[1];
  expect(tuesday.cards).toEqual([
    { key: 'event:ad', time: 'All day', title: 'All-day A', kind: 'event', source: 'iphone', eventKey: 'ad' },
    { key: 'plan:p1', time: '8:00 PM', title: 'Plan 1', kind: 'dinner', source: 'plan', planId: 'p1' },
  ]);
  expect(tuesday.hasPlans).toBe(true);
});

test('a backup slot shows a tag on its day', () => {
  const days = buildWeek(state(), wednesday, 0).days;
  expect(days[3].backupTags).toEqual(['Item E backup']);
  expect(days[0].backupTags).toEqual([]);
});

test('rows can be ticked only for today and earlier this week', () => {
  const s = state();
  const week = buildWeek(s, wednesday, 0);
  expect(week.days[1].rows).toEqual([{ key: 'tu', title: 'Item T', done: false, tickable: true }]);
  expect(week.days[3].rows[0].tickable).toBe(false);
  expect(week.days[2].isToday).toBe(true);
  expect(buildWeek(s, wednesday, 1).days.flatMap((d) => d.rows).every((r) => !r.tickable)).toBe(true);
});

test('future weeks show the template with goals at zero and save nothing', () => {
  const s = state();
  s.days['2026-11-02'] = { ...s.days['2026-11-02'], ticks: { m: 'x' } };
  expect(buildWeek(s, wednesday, 0).goals).toEqual([
    { id: 'gym', name: 'Gym', count: 1, target: 3 },
    { id: 'trading', name: 'Trading', count: 0, target: 2 },
    { id: 'cardio', name: 'Cardio', count: 0, target: 3 },
  ]);
  const next = buildWeek(s, wednesday, 1);
  expect(next.goals.map((g) => g.count)).toEqual([0, 0, 0]);
  expect(next.days[0].rows.map((r) => r.title)).toEqual(['Item M', 'Item E']);
  expect(s.days['2026-11-09']).toBeUndefined();
});

test('a day with only a recurring plan has plans', () => {
  const friday = buildWeek(state(), wednesday, 0).days[4];
  expect(friday.hasPlans).toBe(true);
  expect(friday.cards).toEqual([{ key: 'rec:fr', time: 'Evening', title: 'Recurring F', kind: 'hangout', source: 'routine' }]);
});

test('days carry their check-in status', () => {
  const days = buildWeek(state(), wednesday, 0).days;
  expect(days[0].checkin).toEqual({ state: 'pending' });
  expect(days[3].checkin).toEqual({ state: 'none' });
});
