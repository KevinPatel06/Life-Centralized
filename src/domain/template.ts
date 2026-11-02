import { addDays, weekStartOf, weekdayOf } from '../lib/dates';
import type { AppState, BlockId, BlockTimes, DayRecord, ISODate, Minutes, Template } from './types';

export const BLOCK_ORDER: BlockId[] = ['morning', 'afternoon', 'evening', 'winddown'];

export const DEFAULT_BLOCKS: BlockTimes[] = [
  { id: 'morning', start: 6 * 60, end: 12 * 60 },
  { id: 'afternoon', start: 12 * 60, end: 18 * 60 },
  { id: 'evening', start: 18 * 60, end: 21 * 60 },
  { id: 'winddown', start: 21 * 60, end: null },
];

export function emptyTemplate(): Template {
  return { days: Array.from({ length: 7 }, () => ({ blocks: DEFAULT_BLOCKS.map((b) => ({ ...b })), items: [], plans: [] })) };
}

export function emptyState(): AppState {
  return {
    settings: { background: 'linen', cards: 'sage', charcoalInDark: false },
    template: emptyTemplate(),
    goalTargets: { gym: 3, trading: 2, cardio: 3 },
    days: {},
    weeks: {},
    moves: {},
    tasks: {},
    plans: {},
    notes: {},
    eventNotes: {},
    calendar: { imported: false, offCalendars: [], hidden: [], calendars: [], events: [] },
  };
}

/** Which block a time falls in. Gaps between blocks belong to the block before. */
export function blockAt(blocks: BlockTimes[], m: Minutes): BlockId | 'before' | 'after' {
  if (blocks.length === 0 || m < blocks[0].start) return 'before';
  const last = blocks[blocks.length - 1];
  if (m >= (last.end ?? 1440)) return 'after';
  let found = blocks[0].id;
  for (const b of blocks) if (b.start <= m) found = b.id;
  return found;
}

/** Freeze that weekday's template into a record for one date. A deep copy: later template edits do not reach it. */
export function generateDayRecord(t: Template, date: ISODate): DayRecord {
  const td = t.days[weekdayOf(date)];
  const monday = weekStartOf(date);
  const record: DayRecord = {
    date,
    blocks: td.blocks.map((b) => ({ ...b })),
    items: td.items.map(({ backup, ...item }) => ({
      ...item,
      ...(backup ? { backup: { date: addDays(monday, backup.weekday), block: backup.block } } : {}),
    })),
    plans: td.plans.map((p) => ({ ...p, when: { ...p.when } })),
    ticks: {},
  };
  if (td.label) record.label = td.label;
  if (td.note) record.note = td.note;
  return record;
}
