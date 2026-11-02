import { emptyState } from '../domain/template';
import type { AppState, Task } from '../domain/types';
import { fullState } from '../test/fixtures';
import { createTestDb } from '../test/sqliteDb';
import type { Db } from './db';
import { createStore } from './store';

const task = (id: string, title = 'Task'): Task => ({
  id,
  title,
  urgency: 'soon',
  tag: 'life',
  inProgress: false,
  note: '',
  createdAt: '2026-11-02T12:00:00.000Z',
});
const withTask = (t: Task) => (s: AppState): AppState => ({ ...s, tasks: { ...s.tasks, [t.id]: t } });
const rowCount = async (db: Db) => (await db.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM records'))!.n;

test('a new database loads the empty state', async () => {
  const store = await createStore(createTestDb());
  expect(store.getState()).toEqual(emptyState());
});

test('updates are saved and load again', async () => {
  const db = createTestDb();
  const store = await createStore(db);
  store.update(withTask(task('t1', 'Task 1')));
  await store.flush();
  const again = await createStore(db);
  expect(again.getState().tasks.t1.title).toBe('Task 1');
});

test('an update that returns the same state neither notifies nor writes', async () => {
  const db = createTestDb();
  const store = await createStore(db);
  const listener = jest.fn();
  store.subscribe(listener);
  store.update((s) => s);
  await store.flush();
  expect(listener).not.toHaveBeenCalled();
  expect(await rowCount(db)).toBe(0);
});

test('listeners hear each change and can unsubscribe', async () => {
  const store = await createStore(createTestDb());
  const listener = jest.fn();
  const off = store.subscribe(listener);
  store.update(withTask(task('t1')));
  off();
  store.update(withTask(task('t2')));
  expect(listener).toHaveBeenCalledTimes(1);
});

test('quick updates are written in order, so the last one wins', async () => {
  const db = createTestDb();
  const store = await createStore(db);
  for (const title of ['A', 'B', 'C']) store.update(withTask(task('t1', title)));
  await store.flush();
  expect((await createStore(db)).getState().tasks.t1.title).toBe('C');
});

test('replace leaves only the new state', async () => {
  const db = createTestDb();
  const store = await createStore(db);
  store.update(withTask(task('old')));
  await store.replace(fullState());
  expect(store.getState()).toEqual(fullState());
  const again = (await createStore(db)).getState();
  expect(again.tasks.old).toBeUndefined();
  expect(again).toEqual(fullState());
});

test('a failed write is reported, and later writes still land', async () => {
  const db = createTestDb();
  await createStore(db); // migrates
  const onError = jest.fn();
  const flaky: Db = {
    ...db,
    withTransactionAsync: (() => {
      let failed = false;
      return async (fn: () => Promise<void>) => {
        if (!failed) {
          failed = true;
          throw new Error('disk full');
        }
        return db.withTransactionAsync(fn);
      };
    })(),
  };
  const s2 = await createStore(flaky, onError); // migrate is a no-op here, so the first transaction is the first write
  s2.update(withTask(task('t1')));
  s2.update(withTask(task('t2')));
  await s2.flush();
  expect(onError).toHaveBeenCalledTimes(1);
  const stored = (await createStore(db)).getState();
  expect(stored.tasks.t1).toBeUndefined();
  expect(stored.tasks.t2).toBeDefined();
});

test('a failed replace rejects so restore can say so', async () => {
  const db = createTestDb();
  await createStore(db);
  const broken: Db = { ...db, withTransactionAsync: async () => Promise.reject(new Error('disk full')) };
  const store = await createStore(broken, () => {});
  await expect(store.replace(fullState())).rejects.toThrow('disk full');
});
