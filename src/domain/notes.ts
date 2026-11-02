// Notes (spec §3.7) and Quick add (§3.8).
import { daysBetween, minutesOf, toISODate } from '../lib/dates';
import { clockAmPm, shortDate, weekdayName, weekdayShort, whenLabel } from '../lib/format';
import { newId } from '../lib/id';
import { TAG_NAME, addTask, deleteTask } from './tasks';
import type { AppState, ISODate, ImportedEvent, Note } from './types';

export function addNote(s: AppState, text: string, now: Date): { state: AppState; id: string } {
  const clean = text.trim();
  if (!clean) return { state: s, id: '' };
  const id = newId();
  const note: Note = { id, text: clean, createdAt: now.toISOString() };
  return { state: { ...s, notes: { ...s.notes, [id]: note } }, id };
}

export function deleteNote(s: AppState, id: string): AppState {
  if (!s.notes[id]) return s;
  const notes = { ...s.notes };
  delete notes[id];
  return { ...s, notes };
}

/** First non-empty line is the title; the rest is the note. */
function splitNote(text: string): { title: string; note: string } {
  const lines = text.split('\n');
  const first = lines.findIndex((l) => l.trim() !== '');
  if (first < 0) return { title: '', note: '' };
  return { title: lines[first].trim(), note: lines.slice(first + 1).join('\n').trim() };
}

export function noteToTask(s: AppState, noteId: string, now: Date): { state: AppState; taskId: string } {
  const note = s.notes[noteId];
  if (!note) return { state: s, taskId: '' };
  const { title, note: body } = splitNote(note.text);
  const made = addTask(s, { title, note: body, urgency: 'soon', tag: 'life' }, now);
  if (!made.id) return { state: s, taskId: '' };
  const notes = { ...made.state.notes, [noteId]: { ...note, turnedInto: { kind: 'task' as const, id: made.id } } };
  return { state: { ...made.state, notes }, taskId: made.id };
}

/** Undo "Make it a task": the task goes only if it is still exactly as made; the note always returns to the inbox. */
export function undoNoteToTask(s: AppState, noteId: string): AppState {
  const note = s.notes[noteId];
  if (!note?.turnedInto || note.turnedInto.kind !== 'task') return s;
  const task = s.tasks[note.turnedInto.id];
  const made = splitNote(note.text);
  const untouched = task && !task.doneAt && task.title === made.title && task.note === made.note;
  const { turnedInto: _t, ...rest } = note;
  const next = untouched ? deleteTask(s, task.id) : s;
  return { ...next, notes: { ...next.notes, [noteId]: rest } };
}

export function inboxNotes(s: AppState): Note[] {
  return Object.values(s.notes)
    .filter((n) => !n.turnedInto)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export interface AttachedNote {
  key: string;
  kind: 'task' | 'plan' | 'event';
  id: string;
  title: string;
  sub: string;
  text: string;
  at: string;
}

const dayLabel = (d: ISODate) => `${weekdayShort(d)}, ${shortDate(d)}`;

/** Every note on a task, plan or iPhone event, newest first ("On tasks & plans"). */
export function attachedNotes(s: AppState, _today: ISODate): AttachedNote[] {
  const out: AttachedNote[] = [];
  for (const t of Object.values(s.tasks)) {
    if (!t.note.trim()) continue;
    out.push({ key: `task:${t.id}`, kind: 'task', id: t.id, title: t.title, sub: `Task · ${TAG_NAME[t.tag]}`, text: t.note, at: t.noteUpdatedAt ?? t.createdAt });
  }
  for (const p of Object.values(s.plans)) {
    if (!p.note.trim()) continue;
    out.push({
      key: `plan:${p.id}`,
      kind: 'plan',
      id: p.id,
      title: p.title,
      sub: `Plan · ${dayLabel(p.date)} · ${whenLabel(p.when)}`,
      text: p.note,
      at: p.noteUpdatedAt ?? p.createdAt,
    });
  }
  for (const e of Object.values(s.eventNotes)) {
    out.push({ key: `event:${e.key}`, kind: 'event', id: e.key, title: e.title, sub: `iPhone · ${dayLabel(e.date)}`, text: e.text, at: e.updatedAt });
  }
  return out.sort((a, b) => b.at.localeCompare(a.at));
}

/** Attach a note to an imported iPhone event. Empty text removes it. */
export function setEventNote(s: AppState, e: ImportedEvent, text: string, now: Date): AppState {
  const eventNotes = { ...s.eventNotes };
  if (!text.trim()) delete eventNotes[e.key];
  else eventNotes[e.key] = { key: e.key, title: e.title, date: e.date, text, updatedAt: now.toISOString() };
  return { ...s, eventNotes };
}

/** "Today, 2:14 PM", "Yesterday", "Sunday", or "Oct 25th". */
export function noteWhen(iso: string, now: Date): string {
  const d = new Date(iso);
  const ago = daysBetween(toISODate(d), toISODate(now));
  if (ago <= 0) return `Today, ${clockAmPm(minutesOf(d))}`;
  if (ago === 1) return 'Yesterday';
  if (ago <= 6) return weekdayName(toISODate(d));
  return shortDate(toISODate(d));
}

/** The + sheet: save the text as a note (inbox) or a task (Soon). Plans go through the plan sheet. */
export function quickAdd(s: AppState, text: string, as: 'note' | 'task', now: Date): { state: AppState; id: string } {
  if (as === 'note') return addNote(s, text, now);
  return addTask(s, { title: text, urgency: 'soon', tag: 'life' }, now);
}

