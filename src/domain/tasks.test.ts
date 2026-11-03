import { addTask, buildPriorities, deleteTask, effectiveUrgency, plannedLabel, restoreTask, toggleTaskDone, updateTask } from './tasks';
import { emptyState } from './template';
import type { Task } from './types';

const task = (p: Partial<Task>): Task => ({ id: 't', title: 'Task', urgency: 'soon', tag: 'life', inProgress: false, note: '', createdAt: 'x', ...p });

test('a due date moves a task to Now 7 days before', () => {
  expect(effectiveUrgency(task({ due: '2026-11-10' }), '2026-11-02')).toEqual({ urgency: 'soon', overdue: false, bumpOn: '2026-11-03' });
  expect(effectiveUrgency(task({ due: '2026-11-09' }), '2026-11-02')).toEqual({ urgency: 'now', overdue: false });
  expect(effectiveUrgency(task({ due: '2026-11-01' }), '2026-11-02')).toEqual({ urgency: 'now', overdue: true });
});

test('without a due date the stored urgency stands', () => {
  expect(effectiveUrgency(task({ urgency: 'someday' }), '2026-11-02')).toEqual({ urgency: 'someday', overdue: false });
});

test('a Now task with a far due date has no bump date', () => {
  expect(effectiveUrgency(task({ urgency: 'now', due: '2026-12-01' }), '2026-11-02')).toEqual({ urgency: 'now', overdue: false });
});

describe('editing tasks', () => {
  const now = new Date(2026, 10, 4, 12, 0);

  test('adding defaults to Soon and Life, and needs a title', () => {
    const { state, id } = addTask(emptyState(), { title: '  Task A  ' }, now);
    expect(state.tasks[id]).toMatchObject({ title: 'Task A', urgency: 'soon', tag: 'life', inProgress: false, note: '', createdAt: now.toISOString() });
    const s = emptyState();
    expect(addTask(s, { title: '   ' }, now)).toEqual({ state: s, id: '' });
  });

  test('null clears due, start and planned; a new note is stamped', () => {
    const { state, id } = addTask(emptyState(), { title: 'Task A' }, now);
    const set = updateTask(state, id, { due: '2026-11-20', start: '2026-11-05', planned: { date: '2026-11-06', block: 'evening' }, note: 'Note' }, now);
    expect(set.tasks[id]).toMatchObject({ due: '2026-11-20', start: '2026-11-05', planned: { date: '2026-11-06', block: 'evening' }, noteUpdatedAt: now.toISOString() });
    const cleared = updateTask(set, id, { due: null, start: null, planned: null, urgency: 'now' }, now);
    expect(cleared.tasks[id]).not.toHaveProperty('due');
    expect(cleared.tasks[id]).not.toHaveProperty('start');
    expect(cleared.tasks[id]).not.toHaveProperty('planned');
    expect(cleared.tasks[id]).toMatchObject({ urgency: 'now', note: 'Note', title: 'Task A' });
  });

  test('done toggles and delete removes', () => {
    const { state, id } = addTask(emptyState(), { title: 'Task A' }, now);
    expect(toggleTaskDone(state, id, now).tasks[id].doneAt).toBe(now.toISOString());
    expect(toggleTaskDone(toggleTaskDone(state, id, now), id, now).tasks[id].doneAt).toBeUndefined();
    expect(deleteTask(state, id).tasks[id]).toBeUndefined();
  });

  test('a deleted task can be put back exactly as it was', () => {
    const { state, id } = addTask(emptyState(), { title: 'Task A', note: 'Note A' }, now);
    const before = state.tasks[id];
    expect(restoreTask(deleteTask(state, id), before).tasks[id]).toEqual(before);
  });
});

describe('the Priorities view', () => {
  const WED = '2026-11-04';

  test('planned-for labels', () => {
    expect(plannedLabel({ date: WED }, WED)).toBe('Today');
    expect(plannedLabel({ date: '2026-11-05', block: 'evening' }, WED)).toBe('Tomorrow · Evening');
    expect(plannedLabel({ date: '2026-11-07' }, WED)).toBe('Sat');
    expect(plannedLabel({ date: '2026-11-10' }, WED)).toBe('Nov 10th');
  });

  function sample() {
    const s = emptyState();
    s.tasks = {
      a: task({ id: 'a', title: 'Due soon', urgency: 'soon', tag: 'trading', due: '2026-11-07', createdAt: '1' }),
      b: task({ id: 'b', title: 'Due later', urgency: 'soon', tag: 'life', due: '2026-11-24', createdAt: '2' }),
      c: task({ id: 'c', title: 'Overdue', urgency: 'someday', tag: 'trading', due: '2026-11-01', createdAt: '3' }),
      d: task({ id: 'd', title: 'Busy', urgency: 'now', tag: 'projects', inProgress: true, createdAt: '4', note: 'Line 1\nLine 2' }),
      e: task({ id: 'e', title: 'Later start', urgency: 'someday', tag: 'life', start: '2026-11-05', createdAt: '5' }),
      f: task({ id: 'f', title: 'Done old', tag: 'trading', doneAt: '2026-11-01T10:00:00.000Z' }),
      g: task({ id: 'g', title: 'Done new', tag: 'life', doneAt: '2026-11-03T10:00:00.000Z' }),
    };
    return s;
  }

  test('due dates pull tasks into Now, overdue first, with labels', () => {
    const v = buildPriorities(sample(), WED, 'all');
    expect(v.open).toBe(5);
    expect(v.inProgress).toBe(1);
    expect(v.sections.map((x) => [x.id, x.rows.map((r) => r.id)])).toEqual([
      ['now', ['c', 'a', 'd']],
      ['soon', ['b']],
      ['someday', ['e']],
    ]);
    const now = v.sections[0];
    expect(now).toMatchObject({ name: 'Now', hint: 'Do these first' });
    expect(now.rows[0]).toMatchObject({ overdue: true, due: 'Overdue · Nov 1st' });
    expect(now.rows[1]).toMatchObject({ due: 'Due Nov 7th', tagName: 'Trading' });
    expect(now.rows[2]).toMatchObject({ notePreview: 'Line 1', hasNote: true, inProgress: true });
    expect(v.sections[1].rows[0]).toMatchObject({ bump: 'Moves to Now on Nov 17th', due: 'Due Nov 24th' });
    expect(v.sections[2].rows[0].starts).toBe('Starts tomorrow');
    expect(v.done.map((r) => r.id)).toEqual(['g', 'f']);
  });

  test('a tag filter narrows the lists but not the counts', () => {
    const v = buildPriorities(sample(), WED, 'trading');
    expect(v.open).toBe(5);
    expect(v.sections.map((x) => x.id)).toEqual(['now']);
    expect(v.sections[0].rows.map((r) => r.id)).toEqual(['c', 'a']);
    expect(v.done.map((r) => r.id)).toEqual(['f']);
    expect(buildPriorities(sample(), WED, 'health').sections).toEqual([]);
  });
});
