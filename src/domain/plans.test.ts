import { emptyState } from './template';
import { QUICK_PICKS, canSavePlan, deletePlan, draftFromPlan, newDraft, pickQuick, savePlan, typeTitle } from './plans';

const today = '2026-11-04'; // Wednesday; this week starts Nov 2
const now = new Date(2026, 10, 4, 12, 0);
const dinner = QUICK_PICKS.find((p) => p.title === 'Dinner')!;

test('quick picks set the title, kind and a suggested time', () => {
  expect(QUICK_PICKS.map((p) => [p.title, p.kind, p.when])).toEqual([
    ['Lunch', 'lunch', { kind: 'block', block: 'afternoon' }],
    ['Dinner', 'dinner', { kind: 'block', block: 'evening' }],
    ['Hangout', 'hangout', { kind: 'block', block: 'evening' }],
  ]);
  const d = pickQuick(newDraft(today), dinner);
  expect(d).toMatchObject({ title: 'Dinner', kind: 'dinner', when: { kind: 'block', block: 'evening' }, addToCalendar: true });
});

test('typing a custom title clears the pick but keeps the time', () => {
  const d = typeTitle(pickQuick(newDraft(today), dinner), 'Dinner at home');
  expect(d).toMatchObject({ title: 'Dinner at home', kind: 'other', when: { kind: 'block', block: 'evening' } });
  expect(typeTitle(pickQuick(newDraft(today), dinner), 'Dinner').kind).toBe('dinner');
});

test('a plan needs a title, a time and a day inside the window', () => {
  const ok = { ...newDraft(today, 'Plan'), when: { kind: 'at' as const, time: 20 * 60 } };
  expect(canSavePlan(ok, today)).toBe(true);
  expect(canSavePlan({ ...ok, title: '   ' }, today)).toBe(false);
  expect(canSavePlan({ ...ok, when: null }, today)).toBe(false);
  expect(canSavePlan({ ...ok, date: '2027-01-04' }, today)).toBe(false); // 63 days after Monday Nov 2
  expect(canSavePlan({ ...ok, date: '2027-01-03' }, today)).toBe(true);
  expect(canSavePlan({ ...ok, date: '2026-11-01' }, today)).toBe(false);
  expect(canSavePlan({ ...ok, when: { kind: 'range', start: 20 * 60, end: 20 * 60 } }, today)).toBe(false);
  expect(canSavePlan({ ...ok, when: { kind: 'range', start: 20 * 60, end: 23 * 60 } }, today)).toBe(true);
});

test('saving creates a plan, and editing keeps its identity and calendar event', () => {
  const draft = { ...pickQuick(newDraft('2026-11-05'), dinner), note: 'Bring something' };
  const { state, id } = savePlan(emptyState(), draft, now);
  const created = state.plans[id];
  expect(created).toMatchObject({ id, title: 'Dinner', date: '2026-11-05', kind: 'dinner', note: 'Bring something', addToCalendar: true, createdAt: now.toISOString(), noteUpdatedAt: now.toISOString() });
  const linked = { ...state, plans: { [id]: { ...created, calendarEventId: 'ev-1' } } };
  const later = new Date(2026, 10, 4, 13, 0);
  const edited = savePlan(linked, { ...draftFromPlan(linked.plans[id]), title: 'Dinner out' }, later, id);
  expect(edited.id).toBe(id);
  expect(edited.state.plans[id]).toMatchObject({ title: 'Dinner out', createdAt: now.toISOString(), calendarEventId: 'ev-1', noteUpdatedAt: now.toISOString() });
});

test('a plan made from a note marks the note', () => {
  const s = emptyState();
  s.notes = { n1: { id: 'n1', text: 'Note text', createdAt: 'x' } };
  const { state, id } = savePlan(s, { ...newDraft(today, 'Note text'), when: { kind: 'at', time: 600 }, fromNoteId: 'n1' }, now);
  expect(state.notes.n1.turnedInto).toEqual({ kind: 'plan', id });
  expect(state.plans[id].fromNoteId).toBe('n1');
});

test('deletePlan removes it', () => {
  const { state, id } = savePlan(emptyState(), { ...newDraft(today, 'Plan'), when: { kind: 'at', time: 600 } }, now);
  expect(deletePlan(state, id).plans[id]).toBeUndefined();
});
