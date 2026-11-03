import { routineState } from '../test/fixtures';
import { assembleDay } from './day';
import { openDays } from './lifecycle';
import {
  addItem,
  addStandingPlan,
  editRoutine,
  moveItem,
  removeItem,
  removeStandingPlan,
  sameTimesEveryDay,
  setBedtime,
  setBlockLabel,
  setBlockStart,
  setDayInfo,
  updateItem,
} from './routine';
import type { AppState } from './types';

const times = (s: AppState, weekday: number) => s.template.days[weekday].blocks.map((b) => [b.id, b.start, b.end]);

test('moving a block start also moves where the previous block ends', () => {
  const s = setBlockStart(routineState(), 0, 'evening', 17 * 60 + 30);
  expect(times(s, 0)).toEqual([
    ['morning', 360, 720],
    ['afternoon', 720, 1050],
    ['evening', 1050, 1260],
    ['winddown', 1260, 1380],
  ]);
  expect(setBlockStart(s, 0, 'morning', 330).template.days[0].blocks[0].start).toBe(330);
});

test('a block start that breaks the order is refused', () => {
  const s = routineState();
  expect(setBlockStart(s, 0, 'evening', 11 * 60)).toBe(s);
  expect(setBlockStart(s, 0, 'afternoon', 21 * 60)).toBe(s);
  expect(setBlockStart(s, 0, 'morning', 12 * 60)).toBe(s);
});

test('bedtime must come after Wind down starts, and can be cleared', () => {
  const s = routineState();
  expect(setBedtime(s, 0, 21 * 60)).toBe(s);
  expect(setBedtime(s, 0, 23 * 60 + 30).template.days[0].blocks[3].end).toBe(23 * 60 + 30);
  expect(setBedtime(s, 0, null).template.days[0].blocks[3].end).toBeNull();
});

test('labels and day info; empty text clears', () => {
  const s1 = setDayInfo(setBlockLabel(routineState(), 2, 'afternoon', 'Label B'), 2, { label: 'Day L', note: 'Day N' });
  expect(s1.template.days[2]).toMatchObject({ label: 'Day L', note: 'Day N' });
  expect(s1.template.days[2].blocks[1].label).toBe('Label B');
  const s2 = setDayInfo(setBlockLabel(s1, 2, 'afternoon', ''), 2, { label: '' });
  expect(s2.template.days[2]).not.toHaveProperty('label');
  expect(s2.template.days[2].note).toBe('Day N');
  expect(s2.template.days[2].blocks[1]).not.toHaveProperty('label');
});

test('same times every day copies blocks but not items', () => {
  const s = sameTimesEveryDay(setBlockStart(routineState(), 0, 'evening', 17 * 60), 0);
  expect(s.template.days.every((d) => d.blocks[2].start === 17 * 60)).toBe(true);
  expect(s.template.days[0].items).toHaveLength(2);
  expect(s.template.days[1].items).toHaveLength(0);
});

test('items: add, update with null clearing, reorder, remove', () => {
  const s0 = routineState();
  expect(addItem(s0, 0, 'morning', '  ')).toEqual({ state: s0, id: '' });
  const { state, id } = addItem(s0, 0, 'evening', ' Item N ');
  expect(state.template.days[0].items.find((i) => i.id === id)).toEqual({ id, block: 'evening', title: 'Item N' });
  const updated = updateItem(state, 0, 'm', { time: null, goal: null, backup: { weekday: 3, block: 'evening' }, minimum: '5 min' });
  const m = updated.template.days[0].items.find((i) => i.id === 'm')!;
  expect(m).not.toHaveProperty('time');
  expect(m).not.toHaveProperty('goal');
  expect(m).toMatchObject({ backup: { weekday: 3, block: 'evening' }, minimum: '5 min', title: 'Item M' });
  expect(moveItem(updated, 0, id, -1).template.days[0].items.map((i) => i.id)).toEqual(['m', id, 'e']);
  expect(removeItem(updated, 0, 'e').template.days[0].items.map((i) => i.id)).toEqual(['m', id]);
});

test('standing plans', () => {
  const { state, id } = addStandingPlan(routineState(), 4, 'Plan F', 'evening', 'hangout');
  expect(state.template.days[4].plans).toEqual([{ id, title: 'Plan F', when: { kind: 'block', block: 'evening' }, kind: 'hangout' }]);
  expect(removeStandingPlan(state, 4, id).template.days[4].plans).toEqual([]);
});

test("editing applies to today's record, keeping ticks on items that remain", () => {
  const s = openDays(routineState(), '2026-11-02');
  s.days['2026-11-02'] = { ...s.days['2026-11-02'], ticks: { m: 'x', e: 'x', 'move:z': 'x' } };
  const edited = editRoutine(s, '2026-11-02', (st) => {
    const added = addItem(removeItem(st, 0, 'e'), 0, 'evening', 'Item N');
    return added.state;
  });
  const today = edited.days['2026-11-02'];
  expect(today.items.map((i) => i.title)).toEqual(['Item M', 'Item N']);
  expect(today.ticks).toEqual({ m: 'x', 'move:z': 'x' });
});

test('a checked-in today and earlier days keep what they had', () => {
  const s = openDays(routineState(), '2026-11-09');
  s.days['2026-11-09'] = { ...s.days['2026-11-09'], checkin: { at: 'x', answers: {}, outcomes: {}, unplannedTasks: [] } };
  const edited = editRoutine(s, '2026-11-09', (st) => removeItem(st, 0, 'm'));
  expect(edited.days['2026-11-09']).toBe(s.days['2026-11-09']);
  const tue = openDays(routineState(), '2026-11-03');
  const after = editRoutine(tue, '2026-11-03', (st) => removeItem(st, 0, 'm'));
  expect(after.days['2026-11-02']).toBe(tue.days['2026-11-02']);
});

test('removing an item keeps an earlier move of it', () => {
  const s = openDays(routineState(), '2026-11-05');
  s.moves = { mv: { id: 'mv', fromDate: '2026-11-02', itemId: 'e', toDate: '2026-11-05', toBlock: 'evening', at: 'x' } };
  const edited = editRoutine(s, '2026-11-05', (st) => removeItem(st, 0, 'e'));
  expect(edited.moves.mv).toBeDefined();
  const evening = assembleDay(edited, '2026-11-05').blocks.find((b) => b.times.id === 'evening')!;
  expect(evening.entries.map((e) => e.key)).toEqual(['move:mv']);
});
