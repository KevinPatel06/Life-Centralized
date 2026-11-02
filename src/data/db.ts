export type BindValue = string | number | null;

/** The part of expo-sqlite's database the app uses. Tests supply a node:sqlite version. */
export interface Db {
  execAsync(sql: string): Promise<void>;
  runAsync(sql: string, ...params: BindValue[]): Promise<unknown>;
  getAllAsync<T>(sql: string, ...params: BindValue[]): Promise<T[]>;
  getFirstAsync<T>(sql: string, ...params: BindValue[]): Promise<T | null>;
  withTransactionAsync(task: () => Promise<void>): Promise<void>;
}

/**
 * One table holds everything: `kind` + `id` identify a record, `date` makes history
 * queries a single indexed range scan, `data` is the JSON payload.
 * Add new migrations at the end; never edit a shipped one.
 */
const MIGRATIONS: string[] = [
  `CREATE TABLE IF NOT EXISTS records (
     kind TEXT NOT NULL,
     id TEXT NOT NULL,
     date TEXT,
     data TEXT NOT NULL,
     PRIMARY KEY (kind, id)
   );
   CREATE INDEX IF NOT EXISTS records_kind_date ON records (kind, date);`,
];

export async function migrate(db: Db): Promise<void> {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  for (let v = row?.user_version ?? 0; v < MIGRATIONS.length; v++) {
    await db.withTransactionAsync(async () => {
      await db.execAsync(MIGRATIONS[v]);
      await db.execAsync(`PRAGMA user_version = ${v + 1}`);
    });
  }
}
