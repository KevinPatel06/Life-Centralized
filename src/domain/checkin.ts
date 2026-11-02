// The daily check-in (spec §3.3). Pure: building a draft, editing it, and saving it into history.
// How a check-in gets opened (End my day, the Week marker) lives in the screens, so other triggers can be added.
import { weekStartOf } from '../lib/dates';
import { newId } from '../lib/id';
import { BLOCK_NAME, blockRange, shortDate, weekdayName, weekdayShort } from '../lib/format';
import { type TickEntry, assembleDay, dayRecordFor, isTickable } from './day';
import type { AppState, BlockAnswer, BlockId, DayRecord, ISODate, ItemOutcome, Move, Task } from './types';

export interface CheckinItem {
  key: string;
  title: string;
  kind: 'routine' | 'moved' | 'task';
  prompt: 'none' | 'move-or-skip' | 'skip-only' | 'stays-in-priorities';
  backup?: { date: ISODate; block: BlockId; label: string };
}
export interface CheckinSection { block: BlockId; name: string; range: string; items: CheckinItem[] }
export interface CheckinDraft { date: ISODate; ticked: Record<string, boolean>; decisions: Record<string, 'move' | 'skip'> }
export interface CheckinView { date: ISODate; title: string; dateLabel: string; reopening: boolean; sections: CheckinSection[] }

export function canOpenCheckin(_s: AppState, date: ISODate, today: ISODate): boolean {
  return date <= today && weekStartOf(date) === weekStartOf(today);
}

function toItem(e: TickEntry, date: ISODate, today: ISODate): CheckinItem {
  if (e.type === 'task') return { key: e.key, title: e.task.title, kind: 'task', prompt: 'stays-in-priorities' };
  if (e.type === 'moved') return { key: e.key, title: e.item.title, kind: 'moved', prompt: 'none' };
  const backup = e.item.backup;
  if (!backup || backup.date <= date) return { key: e.key, title: e.item.title, kind: 'routine', prompt: 'none' };
  return {
    key: e.key,
    title: e.item.title,
    kind: 'routine',
    prompt: backup.date >= today ? 'move-or-skip' : 'skip-only',
    backup: { ...backup, label: weekdayShort(backup.date) },
  };
}

const taskItem = (t: Task): CheckinItem => ({ key: `task:${t.id}`, title: t.title, kind: 'task', prompt: 'stays-in-priorities' });

export function buildCheckin(s: AppState, date: ISODate, today: ISODate): { view: CheckinView; draft: CheckinDraft } {
  const day = assembleDay(s, date);
  const previous = day.record.checkin;
  const sections: CheckinSection[] = day.blocks
    .filter((b) => b.times.id !== 'winddown')
    .map((b) => ({
      block: b.times.id,
      name: BLOCK_NAME[b.times.id],
      range: blockRange(b.times),
      items: b.entries.filter(isTickable).map((e) => toItem(e, date, today)),
    }))
    .filter((x) => x.items.length > 0);

  // Reopening: tasks the first check-in sent back to Priorities come back so they can still be ticked.
  if (previous) {
    const back = previous.unplannedTasks
      .map((id) => s.tasks[id])
      .filter((t): t is Task => !!t && t.planned?.date !== date)
      .map(taskItem);
    if (back.length) {
      let morning = sections.find((x) => x.block === 'morning');
      if (!morning) {
        const times = day.record.blocks.find((b) => b.id === 'morning')!;
        morning = { block: 'morning', name: BLOCK_NAME.morning, range: blockRange(times), items: [] };
        sections.unshift(morning);
      }
      morning.items.push(...back);
    }
  }

  const ticked: Record<string, boolean> = {};
  const decisions: Record<string, 'move' | 'skip'> = {};
  for (const item of sections.flatMap((x) => x.items)) {
    ticked[item.key] = item.kind === 'task' ? !!s.tasks[item.key.slice('task:'.length)]?.doneAt : !!day.record.ticks[item.key];
    const outcome = previous?.outcomes[item.key];
    if (item.backup && outcome === 'moved') decisions[item.key] = 'move';
    if (item.backup && outcome === 'skipped') decisions[item.key] = 'skip';
  }

  return {
    view: {
      date,
      title: date === today ? 'How did today go?' : `How did ${weekdayName(date)} go?`,
      dateLabel: shortDate(date),
      reopening: !!previous,
      sections,
    },
    draft: { date, ticked, decisions },
  };
}

export function answerOf(section: CheckinSection, d: CheckinDraft): BlockAnswer {
  const done = section.items.filter((i) => d.ticked[i.key]).length;
  return done === section.items.length ? 'done' : done === 0 ? 'skipped' : 'partly';
}

export function setAnswer(section: CheckinSection, d: CheckinDraft, a: BlockAnswer): CheckinDraft {
  const ticked = { ...d.ticked };
  const keys = section.items.map((i) => i.key);
  if (a === 'done') keys.forEach((k) => (ticked[k] = true));
  else if (a === 'skipped') keys.forEach((k) => (ticked[k] = false));
  else {
    const current = answerOf(section, d);
    if (current === 'done') ticked[keys[keys.length - 1]] = false;
    if (current === 'skipped') ticked[keys[0]] = true;
  }
  return { ...d, ticked };
}

export function toggleItem(d: CheckinDraft, key: string): CheckinDraft {
  return { ...d, ticked: { ...d.ticked, [key]: !d.ticked[key] } };
}

export function decide(d: CheckinDraft, key: string, choice: 'move' | 'skip'): CheckinDraft {
  return { ...d, decisions: { ...d.decisions, [key]: choice } };
}

export function promptOf(item: CheckinItem, d: CheckinDraft): CheckinItem['prompt'] {
  return d.ticked[item.key] ? 'none' : item.prompt;
}

export function canSaveCheckin(view: CheckinView, d: CheckinDraft): boolean {
  return view.sections.every((x) =>
    x.items.every((item) => {
      const prompt = promptOf(item, d);
      if (prompt === 'move-or-skip') return d.decisions[item.key] !== undefined;
      if (prompt === 'skip-only') return d.decisions[item.key] === 'skip';
      return true;
    }),
  );
}

/** Finalize the day: ticks, outcomes, moves to backup slots, done and unplanned tasks. */
export function saveCheckin(s: AppState, view: CheckinView, d: CheckinDraft, now: Date): AppState {
  const date = view.date;
  const stamp = now.toISOString();
  const days: Record<ISODate, DayRecord> = { ...s.days };
  const moves: Record<string, Move> = { ...s.moves };
  const tasks: Record<string, Task> = { ...s.tasks };
  const record = dayRecordFor(s, date);
  const ticks = { ...record.ticks };
  const outcomes: Record<string, ItemOutcome> = {};
  const answers: Partial<Record<BlockId, BlockAnswer>> = {};
  const unplannedTasks: string[] = [];

  const removeMove = (m: Move) => {
    delete moves[m.id];
    const key = `move:${m.id}`;
    const to = days[m.toDate];
    if (to?.ticks[key]) {
      const rest = { ...to.ticks };
      delete rest[key];
      days[m.toDate] = { ...to, ticks: rest };
    }
  };

  for (const section of view.sections) {
    answers[section.block] = answerOf(section, d);
    for (const item of section.items) {
      const on = !!d.ticked[item.key];
      if (item.kind === 'task') {
        const id = item.key.slice('task:'.length);
        const t = tasks[id];
        if (!t) continue;
        if (on) {
          if (!t.doneAt) tasks[id] = { ...t, doneAt: stamp };
        } else {
          const { planned: _planned, ...rest } = t;
          tasks[id] = rest;
          unplannedTasks.push(id);
        }
        continue;
      }

      if (on) ticks[item.key] = ticks[item.key] ?? stamp;
      else delete ticks[item.key];

      if (item.kind === 'moved') {
        outcomes[item.key] = on ? 'done' : 'skipped';
        continue;
      }

      const existing = Object.values(moves).find((m) => m.fromDate === date && m.itemId === item.key);
      const decision = d.decisions[item.key];
      if (on) {
        outcomes[item.key] = 'done';
        if (existing) removeMove(existing);
      } else if (item.prompt === 'move-or-skip' && decision === 'move' && item.backup) {
        outcomes[item.key] = 'moved';
        if (!existing) {
          const id = newId();
          moves[id] = { id, fromDate: date, itemId: item.key, toDate: item.backup.date, toBlock: item.backup.block, at: stamp };
        }
      } else if (item.prompt === 'move-or-skip' || item.prompt === 'skip-only') {
        outcomes[item.key] = 'skipped';
        if (existing) removeMove(existing);
      } else {
        outcomes[item.key] = 'missed';
        if (existing) removeMove(existing);
      }
    }
  }

  const { notCheckedIn: _notCheckedIn, ...base } = days[date] ?? record;
  days[date] = { ...base, ticks, checkin: { at: stamp, answers, outcomes, unplannedTasks } };
  return { ...s, days, moves, tasks };
}
