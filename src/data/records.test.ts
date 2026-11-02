import { createTestDb } from '../test/sqliteDb';
import { fullState } from '../test/fixtures';
import { migrate } from './db';
import { diffRecords, fromRecords, toRecords } from './records';

test('state survives a trip through records', () => {
  const s = fullState();
  expect(fromRecords(toRecords(s))).toEqual(s);
});

test('the same state has no changes', () => {
  const s = fullState();
  expect(diffRecords(s, s)).toEqual({ put: [], del: [] });
});

test('replacing one task puts exactly that task', () => {
  const s = fullState();
  const next = { ...s, tasks: { ...s.tasks, t1: { ...s.tasks.t1, title: 'Task 1b' } } };
  const d = diffRecords(s, next);
  expect(d.del).toEqual([]);
  expect(d.put).toHaveLength(1);
  expect(d.put[0]).toMatchObject({ kind: 'task', id: 't1', date: null });
});

test('removing a note deletes exactly that note', () => {
  const s = fullState();
  const next = { ...s, notes: {} };
  expect(diffRecords(s, next)).toEqual({ put: [], del: [{ kind: 'note', id: 'n1' }] });
});

test('a changed singleton is one meta row', () => {
  const s = fullState();
  const next = { ...s, settings: { ...s.settings, cards: 'cocoa' as const } };
  expect(diffRecords(s, next).put).toEqual([expect.objectContaining({ kind: 'meta', id: 'settings', date: null })]);
});

test('rows carry the date used for history queries', () => {
  const rows = toRecords(fullState());
  const date = (kind: string, id: string) => rows.find((r) => r.kind === kind && r.id === id)?.date;
  expect(date('task', 't2')).toBe('2026-11-02'); // doneAt 02:30Z is the evening of Nov 2 in New York
  expect(date('task', 't1')).toBeNull();
  expect(date('day', '2026-11-02')).toBe('2026-11-02');
  expect(date('move', 'm1')).toBe('2026-11-05');
  expect(date('plan', 'p1')).toBe('2026-11-05');
  expect(date('note', 'n1')).toBe('2026-11-02');
  expect(date('week', '2026-10-26')).toBe('2026-10-26');
  expect(date('eventNote', 'e1|2026-11-02')).toBe('2026-11-02');
});

test('unknown kinds are ignored and missing ones keep defaults', () => {
  const rows = toRecords(fullState()).filter((r) => r.kind !== 'eventNote');
  rows.push({ kind: 'future-kind', id: 'x', date: null, data: '{}' });
  const s = fromRecords(rows);
  expect(s.eventNotes).toEqual({});
  expect(s.tasks.t1.title).toBe('Task 1');
});

test('migrate is idempotent and creates the records table', async () => {
  const db = createTestDb();
  await migrate(db);
  await migrate(db);
  expect(await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version')).toEqual({ user_version: 1 });
  const tables = await db.getAllAsync<{ name: string }>("SELECT name FROM sqlite_master WHERE type IN ('table','index') AND name LIKE 'records%'");
  expect(tables.map((t) => t.name).sort()).toEqual(['records', 'records_kind_date']);
});

test('history is a date-range query over one kind', async () => {
  const db = createTestDb();
  await migrate(db);
  for (const date of ['2026-10-30', '2026-11-02', '2026-11-04', '2026-11-09']) {
    await db.runAsync('INSERT INTO records (kind, id, date, data) VALUES (?, ?, ?, ?)', 'day', date, date, '{}');
  }
  const rows = await db.getAllAsync<{ id: string }>(
    "SELECT id FROM records WHERE kind = 'day' AND date BETWEEN ? AND ? ORDER BY date",
    '2026-11-02',
    '2026-11-08',
  );
  expect(rows.map((r) => r.id)).toEqual(['2026-11-02', '2026-11-04']);
});
