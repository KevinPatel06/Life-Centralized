// What belongs in each block of a date (spec §3.1, §3.5, §3.6). Today, Week and Check-in all read this.
import { minutesOf } from '../lib/dates';
import { blockAt, generateDayRecord } from './template';
import type {
  AppState,
  BlockId,
  BlockTimes,
  DayItem,
  DayRecord,
  ISODate,
  ImportedEvent,
  Minutes,
  Move,
  Plan,
  Task,
  TemplatePlan,
  When,
} from './types';

export type DayEntry =
  | { type: 'routine'; key: string; item: DayItem; done: boolean }
  | { type: 'moved'; key: string; item: DayItem; move: Move; done: boolean }
  | { type: 'task'; key: string; task: Task; done: boolean }
  | { type: 'plan'; key: string; plan: Plan; sort: number }
  | { type: 'recurring'; key: string; plan: TemplatePlan; sort: number }
  | { type: 'event'; key: string; event: ImportedEvent; sort: number };

export type TickEntry = Extract<DayEntry, { done: boolean }>;
export const isTickable = (e: DayEntry): e is TickEntry => 'done' in e;

export interface AssembledBlock { times: BlockTimes; entries: DayEntry[] }

/** The stored record, or one generated from the current template (not saved). */
export function dayRecordFor(s: AppState, date: ISODate): DayRecord {
  return s.days[date] ?? generateDayRecord(s.template, date);
}

export function isBirthday(s: AppState, e: ImportedEvent): boolean {
  return s.calendar.calendars.some((c) => c.id === e.calendarId && c.isBirthdays);
}

/** Kept iPhone events on that date: all-day first, then by start. */
export function visibleEvents(s: AppState, date: ISODate): ImportedEvent[] {
  const off = new Set(s.calendar.offCalendars);
  const hidden = new Set(s.calendar.hidden);
  return s.calendar.events
    .filter((e) => e.date === date && !off.has(e.calendarId) && !hidden.has(e.key))
    .sort((a, b) => (a.allDay === b.allDay ? a.start.localeCompare(b.start) : a.allDay ? -1 : 1));
}

const blockFor = (blocks: BlockTimes[], m: Minutes): BlockId => {
  const at = blockAt(blocks, m);
  return at === 'before' ? 'morning' : at === 'after' ? 'winddown' : at;
};

function placeWhen(blocks: BlockTimes[], w: When): { block: BlockId; sort: number } {
  if (w.kind === 'block') return { block: w.block, sort: blocks.find((b) => b.id === w.block)?.start ?? 0 };
  const start = w.kind === 'at' ? w.time : w.start;
  return { block: blockFor(blocks, start), sort: start };
}

export function assembleDay(s: AppState, date: ISODate): { record: DayRecord; blocks: AssembledBlock[]; allDay: DayEntry[] } {
  const record = dayRecordFor(s, date);
  const byBlock = new Map<BlockId, { ticks: DayEntry[]; timed: DayEntry[] }>(record.blocks.map((b) => [b.id, { ticks: [], timed: [] }]));
  const tick = (block: BlockId, e: DayEntry) => byBlock.get(block)?.ticks.push(e);
  const timed = (block: BlockId, e: DayEntry) => byBlock.get(block)?.timed.push(e);
  const allDay: DayEntry[] = [];

  for (const item of record.items) tick(item.block, { type: 'routine', key: item.id, item, done: !!record.ticks[item.id] });

  for (const move of Object.values(s.moves)) {
    if (move.toDate !== date) continue;
    const item = dayRecordFor(s, move.fromDate).items.find((i) => i.id === move.itemId);
    if (!item) continue;
    const key = `move:${move.id}`;
    tick(move.toBlock, { type: 'moved', key, item, move, done: !!record.ticks[key] });
  }

  for (const task of Object.values(s.tasks)) {
    if (task.planned?.date !== date) continue;
    tick(task.planned.block ?? 'morning', { type: 'task', key: `task:${task.id}`, task, done: !!task.doneAt });
  }

  for (const plan of record.plans) {
    const { block, sort } = placeWhen(record.blocks, plan.when);
    timed(block, { type: 'recurring', key: `rec:${plan.id}`, plan, sort });
  }
  for (const plan of Object.values(s.plans)) {
    if (plan.date !== date) continue;
    const { block, sort } = placeWhen(record.blocks, plan.when);
    timed(block, { type: 'plan', key: `plan:${plan.id}`, plan, sort });
  }

  for (const event of visibleEvents(s, date)) {
    const entry: DayEntry = { type: 'event', key: `event:${event.key}`, event, sort: 0 };
    if (event.allDay || isBirthday(s, event)) {
      allDay.push(entry);
      continue;
    }
    const start = minutesOf(new Date(event.start));
    timed(blockFor(record.blocks, start), { ...entry, sort: start });
  }

  const sortOf = (e: DayEntry) => ('sort' in e ? e.sort : 0);
  const blocks = record.blocks.map((times) => {
    const b = byBlock.get(times.id)!;
    return { times, entries: [...b.ticks, ...b.timed.sort((x, y) => sortOf(x) - sortOf(y))] };
  });
  return { record, blocks, allDay };
}
