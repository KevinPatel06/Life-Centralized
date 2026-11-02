import {
  addNote,
  attachedNotes,
  deleteNote,
  inboxNotes,
  noteToTask,
  noteWhen,
  quickAdd,
  setEventNote,
  undoNoteToTask,
} from './notes';
import { updateTask } from './tasks';
import { emptyState } from './template';
import type { ImportedEvent } from './types';

const now = new Date(2026, 10, 4, 14, 14); // Wed Nov 4, 2:14 PM
const later = (min: number) => new Date(now.getTime() + min * 60_000);

test('blank notes are not saved; others land in the inbox, newest first', () => {
  const s = emptyState();
  expect(addNote(s, '   \n ', now)).toEqual({ state: s, id: '' });
  const a = addNote(s, 'Note A', now);
  const b = addNote(a.state, '  Note B  ', later(1));
  expect(b.state.notes[b.id].text).toBe('Note B');
  expect(inboxNotes(b.state).map((n) => n.text)).toEqual(['Note B', 'Note A']);
  expect(inboxNotes(deleteNote(b.state, a.id)).map((n) => n.text)).toEqual(['Note B']);
});

test('making a note a task: first line is the title, the rest the note, in Soon', () => {
  const { state, id } = addNote(emptyState(), 'Line one\nLine two\n', now);
  const made = noteToTask(state, id, later(1));
  expect(made.state.tasks[made.taskId]).toMatchObject({ title: 'Line one', note: 'Line two', urgency: 'soon', tag: 'life' });
  expect(made.state.notes[id].turnedInto).toEqual({ kind: 'task', id: made.taskId });
  expect(inboxNotes(made.state)).toEqual([]);
  const single = addNote(emptyState(), 'Just one line', now);
  const one = noteToTask(single.state, single.id, now);
  expect(one.state.tasks[one.taskId]).toMatchObject({ title: 'Just one line', note: '' });
});

test('undo removes an untouched task, or just unlinks an edited one', () => {
  const { state, id } = addNote(emptyState(), 'Line one\nLine two', now);
  const made = noteToTask(state, id, now);
  const undone = undoNoteToTask(made.state, id);
  expect(undone.tasks[made.taskId]).toBeUndefined();
  expect(inboxNotes(undone).map((n) => n.id)).toEqual([id]);
  const edited = updateTask(made.state, made.taskId, { title: 'Changed' }, now);
  const kept = undoNoteToTask(edited, id);
  expect(kept.tasks[made.taskId].title).toBe('Changed');
  expect(kept.notes[id].turnedInto).toBeUndefined();
});

test('notes on tasks, plans and iPhone events, newest first', () => {
  const s = emptyState();
  s.tasks = {
    t1: { id: 't1', title: 'Task 1', urgency: 'soon', tag: 'trading', inProgress: false, note: 'Task note', noteUpdatedAt: '2026-11-03T10:00:00.000Z', createdAt: '2026-11-01T10:00:00.000Z' },
    t2: { id: 't2', title: 'Task 2', urgency: 'soon', tag: 'life', inProgress: false, note: '  ', createdAt: '2026-11-04T10:00:00.000Z' },
  };
  s.plans = {
    p1: { id: 'p1', title: 'Plan 1', date: '2026-11-05', when: { kind: 'at', time: 20 * 60 }, kind: 'other', note: 'Plan note', noteUpdatedAt: '2026-11-04T09:00:00.000Z', addToCalendar: false, createdAt: 'x' },
  };
  s.eventNotes = { 'e1|x': { key: 'e1|x', title: 'Event 1', date: '2026-11-05', text: 'Event note', updatedAt: '2026-11-02T09:00:00.000Z' } };
  expect(attachedNotes(s, '2026-11-04')).toEqual([
    { key: 'plan:p1', kind: 'plan', id: 'p1', title: 'Plan 1', sub: 'Plan · Thu, Nov 5th · 8:00 PM', text: 'Plan note', at: '2026-11-04T09:00:00.000Z' },
    { key: 'task:t1', kind: 'task', id: 't1', title: 'Task 1', sub: 'Task · Trading', text: 'Task note', at: '2026-11-03T10:00:00.000Z' },
    { key: 'event:e1|x', kind: 'event', id: 'e1|x', title: 'Event 1', sub: 'iPhone · Thu, Nov 5th', text: 'Event note', at: '2026-11-02T09:00:00.000Z' },
  ]);
});

test('note timestamps read naturally', () => {
  expect(noteWhen(now.toISOString(), later(5))).toBe('Today, 2:14 PM');
  expect(noteWhen(new Date(2026, 10, 3, 9, 0).toISOString(), now)).toBe('Yesterday');
  expect(noteWhen(new Date(2026, 10, 1, 9, 0).toISOString(), now)).toBe('Sunday');
  expect(noteWhen(new Date(2026, 9, 25, 9, 0).toISOString(), now)).toBe('Oct 25th');
});

test('event notes are set, and cleared by empty text', () => {
  const ev: ImportedEvent = { key: 'e1|x', eventId: 'e1', calendarId: 'c', title: 'Event 1', start: 's', end: 'e', allDay: true, date: '2026-11-05' };
  const set = setEventNote(emptyState(), ev, 'Hello', now);
  expect(set.eventNotes['e1|x']).toEqual({ key: 'e1|x', title: 'Event 1', date: '2026-11-05', text: 'Hello', updatedAt: now.toISOString() });
  expect(setEventNote(set, ev, '  ', now).eventNotes).toEqual({});
});

test('quick add saves a note or a Soon task', () => {
  const asNote = quickAdd(emptyState(), 'Thing', 'note', now);
  expect(asNote.state.notes[asNote.id].text).toBe('Thing');
  const asTask = quickAdd(emptyState(), 'Thing', 'task', now);
  expect(asTask.state.tasks[asTask.id]).toMatchObject({ title: 'Thing', urgency: 'soon' });
});
