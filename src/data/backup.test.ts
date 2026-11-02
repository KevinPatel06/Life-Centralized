import { emptyState } from '../domain/template';
import { fullState } from '../test/fixtures';
import { BACKUP_VERSION, makeBackup, parseBackup } from './backup';

const now = new Date('2026-11-02T22:00:00.000Z');

test('a backup restores to the same state', () => {
  const s = fullState();
  const file = makeBackup(s, now);
  expect(file).toMatchObject({ app: 'life-centralized', kind: 'backup', version: BACKUP_VERSION, exportedAt: now.toISOString() });
  expect(parseBackup(JSON.stringify(file))).toEqual({ ok: true, state: s });
});

test('a file that is not JSON is not a backup', () => {
  expect(parseBackup('not json {')).toEqual({ ok: false, error: "That file isn't a backup." });
  expect(parseBackup('null')).toEqual({ ok: false, error: "That file isn't a backup." });
});

test('other JSON, including the spike export, is not a Life Centralized backup', () => {
  const error = "That file isn't a Life Centralized backup.";
  expect(parseBackup(JSON.stringify({ app: 'life-centralized', kind: 'spike', build: '1' }))).toEqual({ ok: false, error });
  expect(parseBackup(JSON.stringify({ app: 'other', kind: 'backup', version: 1, data: {} }))).toEqual({ ok: false, error });
});

test('a backup from a newer app is refused', () => {
  const file = { ...makeBackup(fullState(), now), version: BACKUP_VERSION + 1 };
  expect(parseBackup(JSON.stringify(file))).toEqual({ ok: false, error: 'That backup is from a newer version of the app.' });
});

test('a backup whose routine does not have 7 days is refused', () => {
  const s = fullState();
  const file = makeBackup({ ...s, template: { days: s.template.days.slice(0, 6) } }, now);
  expect(parseBackup(JSON.stringify(file))).toEqual({ ok: false, error: "That backup's routine is damaged." });
});

test('an older backup missing newer parts gets the defaults', () => {
  const s = fullState();
  const file = makeBackup(s, now) as unknown as { data: Record<string, unknown> };
  delete file.data.eventNotes;
  delete file.data.calendar;
  file.data.settings = { background: 'beige' };
  const result = parseBackup(JSON.stringify(file));
  expect(result.ok).toBe(true);
  if (!result.ok) return;
  expect(result.state.eventNotes).toEqual({});
  expect(result.state.calendar).toEqual(emptyState().calendar);
  expect(result.state.settings).toEqual({ ...emptyState().settings, background: 'beige' });
  expect(result.state.tasks).toEqual(s.tasks);
});
