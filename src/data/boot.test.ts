import { createTestDb } from '../test/sqliteDb';
import { bootState, refreshDay } from './boot';
import type { Db } from './db';
import { createStore } from './store';

const at = (y: number, m: number, d: number, h: number, min: number) => new Date(y, m - 1, d, h, min);
const rowCount = async (db: Db) => (await db.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM records'))!.n;

test('the first boot on an empty database opens this week and marks last week closed', async () => {
  const store = await createStore(createTestDb());
  bootState(store, at(2026, 11, 4, 10, 0));
  const s = store.getState();
  expect(Object.keys(s.days).sort()).toEqual(['2026-11-02', '2026-11-03', '2026-11-04']);
  expect(s.settings.lastWeekClosed).toBe('2026-10-26');
});

test('booting again the same day changes nothing', async () => {
  const db = createTestDb();
  const first = await createStore(db);
  bootState(first, at(2026, 11, 4, 10, 0));
  await first.flush();
  const rows = await rowCount(db);
  const second = await createStore(db);
  const listener = jest.fn();
  second.subscribe(listener);
  bootState(second, at(2026, 11, 4, 18, 30));
  await second.flush();
  expect(listener).not.toHaveBeenCalled();
  expect(await rowCount(db)).toBe(rows);
});

test('coming back after midnight into a new week closes the old week and opens the new day', async () => {
  const store = await createStore(createTestDb());
  bootState(store, at(2026, 11, 4, 10, 0));
  refreshDay(store, at(2026, 11, 9, 0, 5));
  const s = store.getState();
  expect(s.weeks['2026-11-02']).toBeDefined();
  expect(s.days['2026-11-08'].notCheckedIn).toBe(true);
  expect(s.days['2026-11-09']).toBeDefined();
  expect(s.settings.lastWeekClosed).toBe('2026-11-02');
});
