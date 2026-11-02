import { addDays } from '../lib/dates';
import { closeWeeks, goalCounts, openDays, startOfDay } from './lifecycle';
import { emptyState, generateDayRecord } from './template';
import type { AppState } from './types';

/** Each weekday has one gym item `g` and one plain item `x`. */
function routine(): AppState {
  const s = emptyState();
  s.template.days.forEach((d) => {
    d.items = [
      { id: 'g', block: 'morning', title: 'Item G', goal: 'gym' },
      { id: 'x', block: 'evening', title: 'Item X' },
    ];
  });
  return s;
}

describe('openDays', () => {
  test('creates Monday through today, and only those', () => {
    const s = openDays(routine(), '2026-11-04');
    expect(Object.keys(s.days).sort()).toEqual(['2026-11-02', '2026-11-03', '2026-11-04']);
    expect(s.days['2026-11-04'].items.map((i) => i.id)).toEqual(['g', 'x']);
  });

  test('returns the same state when nothing is missing', () => {
    const s = openDays(routine(), '2026-11-04');
    expect(openDays(s, '2026-11-04')).toBe(s);
  });

  test('a template edit keeps today and earlier as they were and reaches later days', () => {
    const s = openDays(routine(), '2026-11-04');
    const template = { days: s.template.days.map((d) => ({ ...d, items: [{ id: 'n', block: 'morning' as const, title: 'New item' }] })) };
    const edited = openDays({ ...s, template }, '2026-11-04');
    expect(edited.days['2026-11-04'].items[0].title).toBe('Item G');
    const thursday = openDays(edited, '2026-11-05');
    expect(thursday.days['2026-11-05'].items[0].title).toBe('New item');
    expect(thursday.days['2026-11-04'].items[0].title).toBe('Item G');
  });
});

describe('closeWeeks', () => {
  test('a fresh install marks last week closed without backfilling', () => {
    const s = closeWeeks(routine(), '2026-11-04');
    expect(s.settings.lastWeekClosed).toBe('2026-10-26');
    expect(s.days).toEqual({});
    expect(s.weeks).toEqual({});
  });

  test('closes a missed week once: days filled, not-checked-in marked, goals saved', () => {
    const base = routine();
    const checked = generateDayRecord(base.template, '2026-10-27');
    checked.ticks = { g: '2026-10-27T12:00:00.000Z' };
    checked.checkin = { at: '2026-10-28T02:00:00.000Z', answers: { morning: 'done' }, outcomes: { g: 'done', x: 'missed' }, unplannedTasks: [] };
    const s0: AppState = {
      ...base,
      settings: { ...base.settings, lastWeekClosed: '2026-10-19' },
      days: { '2026-10-27': checked },
    };
    const s = closeWeeks(s0, '2026-11-04');
    const week = Array.from({ length: 7 }, (_, i) => addDays('2026-10-26', i));
    expect(week.every((d) => s.days[d])).toBe(true);
    expect(week.filter((d) => s.days[d].notCheckedIn)).toHaveLength(6);
    expect(s.days['2026-10-27']).toBe(checked);
    expect(s.weeks['2026-10-26']).toEqual({
      weekStart: '2026-10-26',
      goals: { gym: { count: 1, target: 3 }, trading: { count: 0, target: 2 }, cardio: { count: 0, target: 3 } },
    });
    expect(s.settings.lastWeekClosed).toBe('2026-10-26');
    expect(closeWeeks(s, '2026-11-04')).toBe(s);
    expect(s.days['2026-11-02']).toBeUndefined(); // the current week is left to openDays
  });

  test('catches up at most 8 weeks', () => {
    const base = routine();
    const s = closeWeeks({ ...base, settings: { ...base.settings, lastWeekClosed: addDays('2026-11-02', -140) } }, '2026-11-04');
    const weeks = Object.keys(s.weeks).sort();
    expect(weeks).toHaveLength(8);
    expect(weeks[0]).toBe('2026-09-07');
    expect(weeks[7]).toBe('2026-10-26');
  });
});

describe('goalCounts', () => {
  test('counts ticked goal items, and a moved item once where it was done', () => {
    const s0 = openDays(routine(), '2026-11-05');
    const mon = s0.days['2026-11-02'];
    const tue = s0.days['2026-11-03'];
    const thu = s0.days['2026-11-05'];
    const s: AppState = {
      ...s0,
      moves: { m1: { id: 'm1', fromDate: '2026-11-04', itemId: 'g', toDate: '2026-11-05', toBlock: 'morning', at: '2026-11-05T01:00:00.000Z' } },
      days: {
        ...s0.days,
        '2026-11-02': { ...mon, ticks: { g: 't', x: 't' } },
        '2026-11-03': { ...tue, ticks: { g: 't' } },
        '2026-11-05': { ...thu, ticks: { 'move:m1': 't' } },
      },
    };
    expect(goalCounts(s, '2026-11-02')).toEqual({ gym: 3, trading: 0, cardio: 0 });
    expect(goalCounts(s, '2026-11-09')).toEqual({ gym: 0, trading: 0, cardio: 0 });
  });
});

test('startOfDay closes past weeks and opens this one', () => {
  const base = routine();
  const s = startOfDay({ ...base, settings: { ...base.settings, lastWeekClosed: '2026-10-19' } }, '2026-11-03');
  expect(s.weeks['2026-10-26']).toBeDefined();
  expect(s.days['2026-11-03']).toBeDefined();
  expect(startOfDay(s, '2026-11-03')).toBe(s);
});
