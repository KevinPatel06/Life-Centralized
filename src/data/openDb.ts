import { openDatabaseAsync } from 'expo-sqlite';

import { type Db, migrate } from './db';

/** The app's database on the phone. Kept apart from db.ts so tests never load the native module. */
export async function openAppDb(): Promise<Db> {
  const db = await openDatabaseAsync('life.db');
  await db.execAsync('PRAGMA journal_mode = WAL');
  await migrate(db);
  return db;
}
