// Priority rules (spec §3.4).
import { addDays, daysBetween, weekStartOf } from '../lib/dates';
import { BLOCK_NAME, shortDate, weekdayShort } from '../lib/format';
import { newId } from '../lib/id';
import type { AppState, BlockId, ISODate, Tag, Task, Urgency } from './types';

/** Days before the due date when a task is treated as Now. */
export const DUE_BUMP_DAYS = 7;

/** The urgency to show: a due date within 7 days (or past) makes it Now. The stored urgency is untouched. */
export function effectiveUrgency(t: Task, today: ISODate): { urgency: Urgency; overdue: boolean; bumpOn?: ISODate } {
  if (!t.due) return { urgency: t.urgency, overdue: false };
  const left = daysBetween(today, t.due);
  if (left < 0) return { urgency: 'now', overdue: true };
  if (left <= DUE_BUMP_DAYS) return { urgency: 'now', overdue: false };
  if (t.urgency === 'now') return { urgency: 'now', overdue: false };
  return { urgency: t.urgency, overdue: false, bumpOn: addDays(t.due, -DUE_BUMP_DAYS) };
}

export const TAGS: { id: Tag; name: string }[] = [
  { id: 'trading', name: 'Trading' },
  { id: 'health', name: 'Health' },
  { id: 'projects', name: 'Projects' },
  { id: 'life', name: 'Life' },
];
export const TAG_NAME = Object.fromEntries(TAGS.map((t) => [t.id, t.name])) as Record<Tag, string>;

export const URGENCIES: { id: Urgency; name: string; hint: string }[] = [
  { id: 'now', name: 'Now', hint: 'Do these first' },
  { id: 'soon', name: 'Soon', hint: 'Next week or two' },
  { id: 'someday', name: 'Someday', hint: "When there's room" },
];

export function addTask(
  s: AppState,
  input: { title: string; urgency?: Urgency; tag?: Tag; note?: string },
  now: Date,
): { state: AppState; id: string } {
  const title = input.title.trim();
  if (!title) return { state: s, id: '' };
  const id = newId();
  const note = input.note ?? '';
  const task: Task = {
    id,
    title,
    urgency: input.urgency ?? 'soon',
    tag: input.tag ?? 'life',
    inProgress: false,
    note,
    createdAt: now.toISOString(),
    ...(note.trim() ? { noteUpdatedAt: now.toISOString() } : {}),
  };
  return { state: { ...s, tasks: { ...s.tasks, [id]: task } }, id };
}

export interface TaskPatch {
  title?: string;
  urgency?: Urgency;
  tag?: Tag;
  inProgress?: boolean;
  note?: string;
  due?: ISODate | null;
  start?: ISODate | null;
  planned?: { date: ISODate; block?: BlockId } | null;
}

/** Edit a task. `null` clears due, start or planned. A changed, non-empty note is stamped. */
export function updateTask(s: AppState, id: string, patch: TaskPatch, now: Date): AppState {
  const old = s.tasks[id];
  if (!old) return s;
  const next: Task = { ...old };
  if (patch.title !== undefined && patch.title.trim()) next.title = patch.title.trim();
  if (patch.urgency) next.urgency = patch.urgency;
  if (patch.tag) next.tag = patch.tag;
  if (patch.inProgress !== undefined) next.inProgress = patch.inProgress;
  if (patch.note !== undefined && patch.note !== old.note) {
    next.note = patch.note;
    if (patch.note.trim()) next.noteUpdatedAt = now.toISOString();
  }
  for (const key of ['due', 'start', 'planned'] as const) {
    const value = patch[key];
    if (value === null) delete next[key];
    else if (value !== undefined) (next as unknown as Record<string, unknown>)[key] = value;
  }
  return { ...s, tasks: { ...s.tasks, [id]: next } };
}

export function toggleTaskDone(s: AppState, id: string, now: Date): AppState {
  const task = s.tasks[id];
  if (!task) return s;
  const { doneAt, ...rest } = task;
  return { ...s, tasks: { ...s.tasks, [id]: doneAt ? rest : { ...rest, doneAt: now.toISOString() } } };
}

export function deleteTask(s: AppState, id: string): AppState {
  if (!s.tasks[id]) return s;
  const tasks = { ...s.tasks };
  delete tasks[id];
  return { ...s, tasks };
}

/** Undo a delete: put the task back exactly as it was. */
export function restoreTask(s: AppState, task: Task): AppState {
  return { ...s, tasks: { ...s.tasks, [task.id]: task } };
}

/** "Today", "Tomorrow · Evening", "Sat", or "Nov 10th". */
export function plannedLabel(p: { date: ISODate; block?: BlockId }, today: ISODate): string {
  const day =
    p.date === today
      ? 'Today'
      : p.date === addDays(today, 1)
        ? 'Tomorrow'
        : weekStartOf(p.date) === weekStartOf(today)
          ? weekdayShort(p.date)
          : shortDate(p.date);
  return p.block ? `${day} · ${BLOCK_NAME[p.block]}` : day;
}

export interface PriorityRow {
  id: string;
  title: string;
  notePreview?: string;
  tag: Tag;
  tagName: string;
  inProgress: boolean;
  due?: string;
  overdue: boolean;
  starts?: string;
  planned?: string;
  hasNote: boolean;
  bump?: string;
  done: boolean;
}
export interface PrioritiesView {
  open: number;
  inProgress: number;
  sections: { id: Urgency; name: string; hint: string; rows: PriorityRow[] }[];
  done: PriorityRow[];
}

function toPriorityRow(t: Task, today: ISODate): PriorityRow & { urgency: Urgency } {
  const eff = effectiveUrgency(t, today);
  const preview = t.note.split('\n')[0].trim();
  const row: PriorityRow & { urgency: Urgency } = {
    id: t.id,
    title: t.title,
    tag: t.tag,
    tagName: TAG_NAME[t.tag],
    inProgress: t.inProgress,
    overdue: eff.overdue,
    hasNote: t.note.trim() !== '',
    done: !!t.doneAt,
    urgency: eff.urgency,
  };
  if (preview) row.notePreview = preview;
  if (t.due) row.due = eff.overdue ? `Overdue · ${shortDate(t.due)}` : `Due ${shortDate(t.due)}`;
  if (t.start && t.start > today) row.starts = t.start === addDays(today, 1) ? 'Starts tomorrow' : `Starts ${shortDate(t.start)}`;
  if (t.planned && t.planned.date >= today) row.planned = plannedLabel(t.planned, today);
  if (eff.bumpOn) row.bump = `Moves to Now on ${shortDate(eff.bumpOn)}`;
  return row;
}

export function buildPriorities(s: AppState, today: ISODate, filter: Tag | 'all'): PrioritiesView {
  const all = Object.values(s.tasks);
  const open = all.filter((t) => !t.doneAt);
  const shown = (t: Task) => filter === 'all' || t.tag === filter;
  const rank = (t: Task) => {
    const eff = effectiveUrgency(t, today);
    return [eff.overdue ? 0 : 1, t.due ?? '9999-99-99', t.inProgress ? 0 : 1, t.createdAt] as const;
  };
  const byRank = (a: Task, b: Task) => {
    const x = rank(a);
    const y = rank(b);
    for (let i = 0; i < x.length; i++) if (x[i] !== y[i]) return x[i] < y[i] ? -1 : 1;
    return 0;
  };
  const rows = open.filter(shown).sort(byRank).map((t) => toPriorityRow(t, today));
  const sections = URGENCIES.map((u) => ({
    ...u,
    rows: rows.filter((r) => r.urgency === u.id).map(({ urgency: _u, ...r }) => r),
  })).filter((x) => x.rows.length > 0);
  const done = all
    .filter((t) => t.doneAt && shown(t))
    .sort((a, b) => b.doneAt!.localeCompare(a.doneAt!))
    .map((t) => {
      const { urgency: _u, ...r } = toPriorityRow(t, today);
      return r;
    });
  return { open: open.length, inProgress: open.filter((t) => t.inProgress).length, sections, done };
}
