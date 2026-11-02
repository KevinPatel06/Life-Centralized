import type { Task } from './types';
import { effectiveUrgency } from './tasks';

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
