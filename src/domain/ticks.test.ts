import { routineState } from '../test/fixtures';
import { openDays } from './lifecycle';
import { canTick, toggleEntry } from './ticks';
import type { AppState } from './types';

const now = new Date(2026, 10, 4, 12, 0); // Wednesday
const base = (): AppState => openDays(routineState(), '2026-11-04');

test('ticking is allowed for today and earlier days of this week only', () => {
  const s = base();
  expect(canTick(s, '2026-11-04', '2026-11-04')).toBe(true);
  expect(canTick(s, '2026-11-02', '2026-11-04')).toBe(true);
  expect(canTick(s, '2026-11-05', '2026-11-04')).toBe(false);
  expect(canTick(s, '2026-11-01', '2026-11-04')).toBe(false);
});

test('a checked-in day is read-only', () => {
  const s = base();
  s.days['2026-11-02'] = { ...s.days['2026-11-02'], checkin: { at: 'x', answers: {}, outcomes: {}, unplannedTasks: [] } };
  expect(canTick(s, '2026-11-02', '2026-11-04')).toBe(false);
  expect(toggleEntry(s, '2026-11-02', 'm', now)).toBe(s);
});

test('routine and moved items tick on and off in the day record', () => {
  const s1 = toggleEntry(base(), '2026-11-02', 'm', now);
  expect(s1.days['2026-11-02'].ticks.m).toBe(now.toISOString());
  const s2 = toggleEntry(s1, '2026-11-02', 'm', now);
  expect(s2.days['2026-11-02'].ticks.m).toBeUndefined();
  const s3 = toggleEntry(s2, '2026-11-04', 'move:m1', now);
  expect(s3.days['2026-11-04'].ticks['move:m1']).toBe(now.toISOString());
});

test('a task ticks done and back', () => {
  const s0 = base();
  s0.tasks = { t1: { id: 't1', title: 'Task 1', urgency: 'now', tag: 'life', inProgress: false, note: '', createdAt: 'x', planned: { date: '2026-11-04' } } };
  const s1 = toggleEntry(s0, '2026-11-04', 'task:t1', now);
  expect(s1.tasks.t1.doneAt).toBe(now.toISOString());
  expect(toggleEntry(s1, '2026-11-04', 'task:t1', now).tasks.t1.doneAt).toBeUndefined();
});

test('a future date refuses ticks', () => {
  const s = base();
  expect(toggleEntry(s, '2026-11-06', 'm', now)).toBe(s);
});
