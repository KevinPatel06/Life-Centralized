import { routineState } from '../test/fixtures';
import {
  answerOf,
  buildCheckin,
  canOpenCheckin,
  canSaveCheckin,
  decide,
  promptOf,
  saveCheckin,
  setAnswer,
  toggleItem,
} from './checkin';
import { openDays } from './lifecycle';
import type { AppState, Task } from './types';

const MON = '2026-11-02';
const THU = '2026-11-05';
const at = (d: number, h = 21) => new Date(2026, 10, d, h, 0);
const task = (id: string, p: Partial<Task>): Task => ({ id, title: `Task ${id}`, urgency: 'soon', tag: 'life', inProgress: false, note: '', createdAt: 'x', ...p });
const on = (today: string): AppState => openDays(routineState(), today);

function checkInMonday(s: AppState, today: string, choice: 'move' | 'skip', now = at(2)) {
  const { view, draft } = buildCheckin(s, MON, today);
  return saveCheckin(s, view, decide(toggleItem(draft, 'm'), 'e', choice), now);
}

test("Monday's check-in on Monday: morning and evening, with a move prompt", () => {
  const { view, draft } = buildCheckin(on(MON), MON, MON);
  expect(view.title).toBe('How did today go?');
  expect(view.dateLabel).toBe('Nov 2nd');
  expect(view.reopening).toBe(false);
  expect(view.sections.map((x) => x.block)).toEqual(['morning', 'evening']);
  expect(view.sections[1].items[0]).toMatchObject({ key: 'e', kind: 'routine', prompt: 'move-or-skip', backup: { date: THU, block: 'evening', label: 'Thu' } });
  expect(draft.ticked).toEqual({ m: false, e: false });
});

test('once the backup day has passed, only Skip is offered', () => {
  const { view } = buildCheckin(on('2026-11-06'), MON, '2026-11-06');
  expect(view.title).toBe('How did Monday go?');
  expect(view.sections[1].items[0].prompt).toBe('skip-only');
});

test('answers and ticks stay in sync', () => {
  const s = on(MON);
  s.tasks = { t1: task('t1', { planned: { date: MON, block: 'morning' } }) };
  const { view, draft } = buildCheckin(s, MON, MON);
  const morning = view.sections[0];
  expect(morning.items.map((i) => i.key)).toEqual(['m', 'task:t1']);
  expect(answerOf(morning, draft)).toBe('skipped');
  const partly = setAnswer(morning, draft, 'partly');
  expect(partly.ticked).toMatchObject({ m: true, 'task:t1': false });
  expect(answerOf(morning, partly)).toBe('partly');
  const done = setAnswer(morning, draft, 'done');
  expect(answerOf(morning, done)).toBe('done');
  expect(setAnswer(morning, done, 'partly').ticked).toMatchObject({ m: true, 'task:t1': false });
  expect(answerOf(morning, setAnswer(morning, done, 'skipped'))).toBe('skipped');
});

test('Save waits for every move-or-skip prompt', () => {
  const { view, draft } = buildCheckin(on(MON), MON, MON);
  expect(canSaveCheckin(view, draft)).toBe(false);
  expect(canSaveCheckin(view, decide(draft, 'e', 'move'))).toBe(true);
  const ticked = toggleItem(draft, 'e');
  expect(promptOf(view.sections[1].items[0], ticked)).toBe('none');
  expect(canSaveCheckin(view, ticked)).toBe(true);
});

test('a skip-only prompt needs Skip', () => {
  const { view, draft } = buildCheckin(on('2026-11-06'), MON, '2026-11-06');
  expect(canSaveCheckin(view, decide(draft, 'e', 'move'))).toBe(false);
  expect(canSaveCheckin(view, decide(draft, 'e', 'skip'))).toBe(true);
});

test('saving records outcomes, answers, ticks and the move', () => {
  const s = checkInMonday(on(MON), MON, 'move');
  const day = s.days[MON];
  expect(day.checkin).toMatchObject({ answers: { morning: 'done', evening: 'skipped' }, outcomes: { m: 'done', e: 'moved' }, unplannedTasks: [] });
  expect(day.ticks.m).toBe(at(2).toISOString());
  const moves = Object.values(s.moves);
  expect(moves).toHaveLength(1);
  expect(moves[0]).toMatchObject({ fromDate: MON, itemId: 'e', toDate: THU, toBlock: 'evening' });
});

test('saving twice with Move keeps one move', () => {
  const once = checkInMonday(on(MON), MON, 'move');
  const twice = checkInMonday(once, MON, 'move');
  expect(Object.keys(twice.moves)).toHaveLength(1);
});

test('reopening and choosing Skip removes the moved item and its tick', () => {
  const moved = checkInMonday(on(MON), MON, 'move');
  const moveId = Object.keys(moved.moves)[0];
  const thu = openDays(moved, THU);
  thu.days[THU] = { ...thu.days[THU], ticks: { [`move:${moveId}`]: 'x' } };
  const { view, draft } = buildCheckin(thu, MON, THU);
  expect(view.reopening).toBe(true);
  expect(draft.decisions).toEqual({ e: 'move' });
  const skipped = saveCheckin(thu, view, decide(draft, 'e', 'skip'), at(5));
  expect(skipped.moves).toEqual({});
  expect(skipped.days[THU].ticks).toEqual({});
  expect(skipped.days[MON].checkin?.outcomes.e).toBe('skipped');
});

test('a moved item missed again is skipped with no prompt', () => {
  const moved = openDays(checkInMonday(on(MON), MON, 'move'), THU);
  const { view, draft } = buildCheckin(moved, THU, THU);
  const item = view.sections.find((x) => x.block === 'evening')!.items[0];
  expect(item).toMatchObject({ kind: 'moved', prompt: 'none', title: 'Item E' });
  expect(canSaveCheckin(view, draft)).toBe(true);
  expect(saveCheckin(moved, view, draft, at(5)).days[THU].checkin?.outcomes).toEqual({ [item.key]: 'skipped' });
});

test('an unticked planned task stays in Priorities; reopened and ticked, it is done', () => {
  const s0 = on(MON);
  s0.tasks = { t1: task('t1', { planned: { date: MON, block: 'evening' }, urgency: 'now' }) };
  const first = buildCheckin(s0, MON, MON);
  expect(first.view.sections[1].items[1]).toMatchObject({ key: 'task:t1', prompt: 'stays-in-priorities' });
  const s1 = saveCheckin(s0, first.view, decide(first.draft, 'e', 'skip'), at(2));
  expect(s1.tasks.t1.planned).toBeUndefined();
  expect(s1.tasks.t1.urgency).toBe('now');
  expect(s1.days[MON].checkin?.unplannedTasks).toEqual(['t1']);
  const again = buildCheckin(s1, MON, MON);
  expect(again.view.sections[0].items.map((i) => i.key)).toContain('task:t1');
  const s2 = saveCheckin(s1, again.view, toggleItem(again.draft, 'task:t1'), at(2, 22));
  expect(s2.tasks.t1.doneAt).toBe(at(2, 22).toISOString());
  expect(s2.days[MON].checkin?.unplannedTasks).toEqual([]);
});

test('a day with only Wind-down items has nothing to check in, and still saves', () => {
  const s = routineState();
  s.template.days[1].items = [{ id: 'w', block: 'winddown', title: 'Item W' }];
  const tue = openDays(s, '2026-11-03');
  const { view, draft } = buildCheckin(tue, '2026-11-03', '2026-11-03');
  expect(view.sections).toEqual([]);
  expect(canSaveCheckin(view, draft)).toBe(true);
  expect(saveCheckin(tue, view, draft, at(3)).days['2026-11-03'].checkin).toMatchObject({ answers: {}, outcomes: {} });
});

test('check-ins open for today and earlier this week only', () => {
  const s = on('2026-11-04');
  expect(canOpenCheckin(s, MON, '2026-11-04')).toBe(true);
  expect(canOpenCheckin(s, '2026-11-04', '2026-11-04')).toBe(true);
  expect(canOpenCheckin(s, THU, '2026-11-04')).toBe(false);
  expect(canOpenCheckin(s, '2026-11-01', '2026-11-04')).toBe(false);
});

test('saving clears the not-checked-in flag', () => {
  const s = on(MON);
  s.days[MON] = { ...s.days[MON], notCheckedIn: true };
  expect(checkInMonday(s, MON, 'skip').days[MON].notCheckedIn).toBeUndefined();
});
