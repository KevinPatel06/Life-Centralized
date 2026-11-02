// The app's single source of truth: AppState in memory, saved to SQLite change by change.
import type { AppState } from '../domain/types';
import { type Db, migrate } from './db';
import { type RecordRow, diffRecords, fromRecords, toRecords } from './records';

export interface Store {
  getState(): AppState;
  subscribe(listener: () => void): () => void;
  /** Apply a pure change. Updates memory and listeners right away; the write is queued. */
  update(fn: (s: AppState) => AppState): void;
  /** Replace everything (restore). Rejects if the write fails. */
  replace(next: AppState): Promise<void>;
  /** Resolves when every queued write has finished. */
  flush(): Promise<void>;
}

const INSERT = 'INSERT OR REPLACE INTO records (kind, id, date, data) VALUES (?, ?, ?, ?)';
const DELETE = 'DELETE FROM records WHERE kind = ? AND id = ?';

export async function createStore(
  db: Db,
  onError: (e: unknown) => void = (e) => console.warn('Saving failed', e),
): Promise<Store> {
  await migrate(db);
  let state = fromRecords(await db.getAllAsync<RecordRow>('SELECT kind, id, date, data FROM records'));
  const listeners = new Set<() => void>();
  // One queue, so writes land in the order the changes were made.
  let queue: Promise<void> = Promise.resolve();

  const enqueue = (job: () => Promise<void>): Promise<void> => {
    const run = queue.then(job);
    queue = run.catch(onError);
    return run;
  };
  const insert = (r: RecordRow) => db.runAsync(INSERT, r.kind, r.id, r.date, r.data);
  const notify = () => listeners.forEach((l) => l());

  return {
    getState: () => state,
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    update(fn) {
      const next = fn(state);
      if (next === state) return;
      const { put, del } = diffRecords(state, next);
      state = next;
      notify();
      if (put.length === 0 && del.length === 0) return;
      enqueue(() =>
        db.withTransactionAsync(async () => {
          for (const r of put) await insert(r);
          for (const d of del) await db.runAsync(DELETE, d.kind, d.id);
        }),
      ).catch(() => {}); // already reported through onError
    },
    replace(next) {
      state = next;
      notify();
      const rows = toRecords(next);
      return enqueue(() =>
        db.withTransactionAsync(async () => {
          await db.runAsync('DELETE FROM records');
          for (const r of rows) await insert(r);
        }),
      );
    },
    flush: () => queue,
  };
}
