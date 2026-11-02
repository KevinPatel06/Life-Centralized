// Maps the in-memory AppState to rows of the `records` table and back.
import { toISODate } from '../lib/dates';
import { emptyState } from '../domain/template';
import type { AppState } from '../domain/types';

export interface RecordRow { kind: string; id: string; date: string | null; data: string }

const SINGLETONS = ['settings', 'template', 'goalTargets', 'calendar'] as const;
type Singleton = (typeof SINGLETONS)[number];

const COLLECTIONS = {
  day: 'days',
  week: 'weeks',
  move: 'moves',
  task: 'tasks',
  plan: 'plans',
  note: 'notes',
  eventNote: 'eventNotes',
} as const;
type Kind = keyof typeof COLLECTIONS;
const KINDS = Object.keys(COLLECTIONS) as Kind[];

const localDate = (iso: string) => toISODate(new Date(iso));

/** The date a record is filed under, for history range queries. */
function dateOf(kind: Kind, s: AppState, id: string): string | null {
  switch (kind) {
    case 'day':
      return s.days[id].date;
    case 'week':
      return s.weeks[id].weekStart;
    case 'move':
      return s.moves[id].toDate;
    case 'task': {
      const doneAt = s.tasks[id].doneAt;
      return doneAt ? localDate(doneAt) : null;
    }
    case 'plan':
      return s.plans[id].date;
    case 'note':
      return localDate(s.notes[id].createdAt);
    case 'eventNote':
      return s.eventNotes[id].date;
  }
}

const metaRow = (s: AppState, id: Singleton): RecordRow => ({ kind: 'meta', id, date: null, data: JSON.stringify(s[id]) });
const entryRow = (s: AppState, kind: Kind, id: string): RecordRow => ({
  kind,
  id,
  date: dateOf(kind, s, id),
  data: JSON.stringify(s[COLLECTIONS[kind]][id]),
});

export function toRecords(s: AppState): RecordRow[] {
  const rows = SINGLETONS.map((id) => metaRow(s, id));
  for (const kind of KINDS) for (const id of Object.keys(s[COLLECTIONS[kind]])) rows.push(entryRow(s, kind, id));
  return rows;
}

export function fromRecords(rows: RecordRow[]): AppState {
  const s = emptyState();
  const defaults = emptyState();
  for (const row of rows) {
    if (row.kind === 'meta') {
      if (!(SINGLETONS as readonly string[]).includes(row.id)) continue;
      const value = JSON.parse(row.data);
      const id = row.id as Singleton;
      (s as unknown as Record<Singleton, unknown>)[id] =
        id === 'settings' ? { ...defaults.settings, ...value } : value;
    } else if (row.kind in COLLECTIONS) {
      (s[COLLECTIONS[row.kind as Kind]] as Record<string, unknown>)[row.id] = JSON.parse(row.data);
    }
  }
  return s;
}

/** What to write so the stored rows match `next`. Compares by reference, so updates must be immutable. */
export function diffRecords(prev: AppState, next: AppState): { put: RecordRow[]; del: { kind: string; id: string }[] } {
  const put: RecordRow[] = [];
  const del: { kind: string; id: string }[] = [];
  for (const id of SINGLETONS) if (prev[id] !== next[id]) put.push(metaRow(next, id));
  for (const kind of KINDS) {
    const key = COLLECTIONS[kind];
    const a = prev[key] as Record<string, unknown>;
    const b = next[key] as Record<string, unknown>;
    if (a === b) continue;
    for (const id of Object.keys(b)) if (a[id] !== b[id]) put.push(entryRow(next, kind, id));
    for (const id of Object.keys(a)) if (!(id in b)) del.push({ kind, id });
  }
  return { put, del };
}
