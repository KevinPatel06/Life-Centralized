// Test-only: an in-memory node:sqlite database behind the app's Db interface.
import { DatabaseSync } from 'node:sqlite';

import type { BindValue, Db } from '../data/db';

export function createTestDb(): Db & { raw: DatabaseSync } {
  const raw = new DatabaseSync(':memory:');
  return {
    raw,
    async execAsync(sql: string) {
      raw.exec(sql);
    },
    async runAsync(sql: string, ...params: BindValue[]) {
      return raw.prepare(sql).run(...params);
    },
    async getAllAsync<T>(sql: string, ...params: BindValue[]) {
      return raw.prepare(sql).all(...params) as T[];
    },
    async getFirstAsync<T>(sql: string, ...params: BindValue[]) {
      return (raw.prepare(sql).get(...params) ?? null) as T | null;
    },
    async withTransactionAsync(task: () => Promise<void>) {
      raw.exec('BEGIN');
      try {
        await task();
        raw.exec('COMMIT');
      } catch (e) {
        raw.exec('ROLLBACK');
        throw e;
      }
    },
  };
}
