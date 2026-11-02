import { localISO, routineState } from '../test/fixtures';
import { openDays } from './lifecycle';
import { buildToday } from './today';
import type { AppState, Task } from './types';

const task = (id: string, p: Partial<Task>): Task => ({ id, title: `Task ${id}`, urgency: 'now', tag: 'life', inProgress: false, note: '', createdAt: 'x', ...p });

/** Monday: morning item ticked, an evening item with a Thursday backup, a 7:45 PM iPhone event, a planned Now task. */
function monday(): AppState {
  const s = openDays(routineState(), '2026-11-02');
  s.days['2026-11-02'] = { ...s.days['2026-11-02'], ticks: { m: 'x' } };
  s.tasks = { t1: task('t1', { planned: { date: '2026-11-02', block: 'evening' }, note: 'First line\nSecond line' }) };
  s.calendar = {
    ...s.calendar,
    calendars: [{ id: 'cal-a', title: 'Cal A', color: '#000', isBirthdays: false }],
    events: [
      { key: 'ev1', eventId: 'ev1', calendarId: 'cal-a', title: 'Event 1', start: localISO(2026, 11, 2, 19, 45), end: localISO(2026, 11, 2, 20, 30), allDay: false, date: '2026-11-02' },
    ],
  };
  return s;
}

test('Monday evening: two blocks to go, the evening block open', () => {
  const v = buildToday(monday(), new Date(2026, 10, 2, 18, 40));
  expect(v).toMatchObject({ weekday: 'Monday', dateLabel: 'Nov 2nd', blocksToGo: 2, phase: 'during' });
  expect(v.blocks.map((b) => b.state)).toEqual(['done', 'done', 'now', 'later']);
  expect(v.blocks[0]).toMatchObject({ name: 'Morning', summary: 'Item M', mark: 'done' });
  expect(v.blocks[1]).toMatchObject({ summary: 'Work' });
  expect(v.blocks[1].mark).toBeUndefined();
  const evening = v.blocks[2];
  expect(evening.range).toBe('6:00–9:00');
  expect(evening.rows).toEqual([
    { key: 'e', title: 'Item E', subtitle: 'Backup is Thursday', done: false, chip: 'routine' },
    { key: 'task:t1', title: 'Task t1', subtitle: 'First line', done: false, chip: 'now' },
  ]);
  expect(evening.lines).toEqual([{ key: 'event:ev1', time: '7:45 PM', title: 'Event 1', source: 'iphone', kind: 'event' }]);
  expect(v.blocks[3]).toMatchObject({ name: 'Wind down', summary: 'Bed by 11:00', state: 'later' });
  expect(v.buddy).toBe('Item E first. If it slips, Thursday is the backup.');
});

test('routine subtitles show the time', () => {
  const v = buildToday(monday(), new Date(2026, 10, 2, 8, 0));
  expect(v.blocks[0].rows[0]).toMatchObject({ title: 'Item M', subtitle: '7:10', done: true });
});

test('before the first block', () => {
  const v = buildToday(monday(), new Date(2026, 10, 2, 5, 0));
  expect(v.phase).toBe('before');
  expect(v.blocksToGo).toBe(4);
  expect(v.blocks.every((b) => b.state === 'later')).toBe(true);
  expect(v.buddy).toBe('Morning starts at 6:00. Easy start.');
});

test('after bedtime, with tomorrow at a glance', () => {
  const v = buildToday(monday(), new Date(2026, 10, 2, 23, 30));
  expect(v.phase).toBe('after');
  expect(v.blocksToGo).toBe(0);
  expect(v.buddy).toBe("Day's done. Rest up.");
  expect(v.tomorrow).toBe('Tomorrow: Morning at 6:00');
  const sunday = buildToday(openDays(routineState(), '2026-11-08'), new Date(2026, 10, 8, 23, 30));
  expect(sunday.buddy).toBe("Day's done. Rest up. Tomorrow starts with Item M.");
  expect(sunday.tomorrow).toBe('Tomorrow: Morning at 6:00 · Item M');
});

test('a date-only planned task joins the current block', () => {
  const s = monday();
  s.tasks.t2 = task('t2', { planned: { date: '2026-11-02' }, urgency: 'soon' });
  const v = buildToday(s, new Date(2026, 10, 2, 18, 40));
  expect(v.blocks[2].rows.map((r) => r.key)).toEqual(['e', 'task:t1', 'task:t2']);
  expect(v.blocks[0].rows.map((r) => r.key)).toEqual(['m']);
});

test('with the block all done, the buddy suggests an unplanned Now task', () => {
  const s = monday();
  s.days['2026-11-02'] = { ...s.days['2026-11-02'], ticks: { m: 'x', e: 'x' } };
  s.tasks.t1 = { ...s.tasks.t1, doneAt: 'x' };
  s.tasks.t3 = task('t3', { title: 'Loose end' });
  expect(buildToday(s, new Date(2026, 10, 2, 18, 40)).buddy).toBe('Room for one more? Loose end.');
  delete s.tasks.t3;
  expect(buildToday(s, new Date(2026, 10, 2, 18, 40)).buddy).toBe('Evening is done. Nice.');
});

test('an empty current block uses its label', () => {
  expect(buildToday(monday(), new Date(2026, 10, 2, 13, 0)).buddy).toBe('Work time.');
});

test('a checked-in block shows its answer as the mark', () => {
  const s = monday();
  s.days['2026-11-02'] = { ...s.days['2026-11-02'], checkin: { at: 'x', answers: { morning: 'partly' }, outcomes: {}, unplannedTasks: [] } };
  expect(buildToday(s, new Date(2026, 10, 2, 18, 40)).blocks[0].mark).toBe('partly');
});
