// Plans made in the app (spec §3.5): quick picks, the 8-week window, add, edit, delete.
import { addDays, weekStartOf } from '../lib/dates';
import { newId } from '../lib/id';
import type { AppState, ISODate, Plan, PlanKind, When } from './types';

export interface QuickPick { title: string; kind: PlanKind; when: When }

export const QUICK_PICKS: QuickPick[] = [
  { title: 'Lunch', kind: 'lunch', when: { kind: 'block', block: 'afternoon' } },
  { title: 'Dinner', kind: 'dinner', when: { kind: 'block', block: 'evening' } },
  { title: 'Hangout', kind: 'hangout', when: { kind: 'block', block: 'evening' } },
];

/** This week plus 8 more. */
export const PLAN_WINDOW_DAYS = 63;

export interface PlanDraft {
  title: string;
  kind: PlanKind;
  date: ISODate;
  when: When | null;
  note: string;
  addToCalendar: boolean;
  fromNoteId?: string;
}

export function newDraft(date: ISODate, title = ''): PlanDraft {
  return { title, kind: 'other', date, when: null, note: '', addToCalendar: true };
}

export function draftFromPlan(p: Plan): PlanDraft {
  return {
    title: p.title,
    kind: p.kind,
    date: p.date,
    when: p.when,
    note: p.note,
    addToCalendar: p.addToCalendar,
    ...(p.fromNoteId ? { fromNoteId: p.fromNoteId } : {}),
  };
}

export function pickQuick(d: PlanDraft, pick: QuickPick): PlanDraft {
  return { ...d, title: pick.title, kind: pick.kind, when: pick.when };
}

/** A custom title clears the quick pick (the suggested time stays). */
export function typeTitle(d: PlanDraft, text: string): PlanDraft {
  const pick = QUICK_PICKS.find((p) => p.kind === d.kind);
  return { ...d, title: text, kind: pick && text === pick.title ? d.kind : 'other' };
}

export function planWindow(today: ISODate): { first: ISODate; last: ISODate } {
  const first = weekStartOf(today);
  return { first, last: addDays(first, PLAN_WINDOW_DAYS - 1) };
}

export function canSavePlan(d: PlanDraft, today: ISODate): boolean {
  if (!d.title.trim() || !d.when) return false;
  if (d.when.kind === 'range' && d.when.end <= d.when.start) return false;
  const { first, last } = planWindow(today);
  return d.date >= first && d.date <= last;
}

/** Create a plan, or update one in place (keeping its id, creation time and iPhone event). */
export function savePlan(s: AppState, d: PlanDraft, now: Date, id?: string): { state: AppState; id: string } {
  if (!d.when) throw new Error('A plan needs a time');
  const existing = id ? s.plans[id] : undefined;
  const planId = existing?.id ?? newId();
  const stamp = now.toISOString();
  const noteChanged = d.note.trim() !== '' && d.note !== (existing?.note ?? '');
  const plan: Plan = {
    id: planId,
    title: d.title.trim(),
    date: d.date,
    when: d.when,
    kind: d.kind,
    note: d.note,
    addToCalendar: d.addToCalendar,
    createdAt: existing?.createdAt ?? stamp,
    ...(existing?.calendarEventId ? { calendarEventId: existing.calendarEventId } : {}),
    ...(noteChanged ? { noteUpdatedAt: stamp } : existing?.noteUpdatedAt ? { noteUpdatedAt: existing.noteUpdatedAt } : {}),
    ...(d.fromNoteId ? { fromNoteId: d.fromNoteId } : {}),
  };
  let notes = s.notes;
  if (!existing && d.fromNoteId && s.notes[d.fromNoteId]) {
    notes = { ...s.notes, [d.fromNoteId]: { ...s.notes[d.fromNoteId], turnedInto: { kind: 'plan', id: planId } } };
  }
  return { state: { ...s, plans: { ...s.plans, [planId]: plan }, notes }, id: planId };
}

export function deletePlan(s: AppState, id: string): AppState {
  if (!s.plans[id]) return s;
  const plans = { ...s.plans };
  delete plans[id];
  return { ...s, plans };
}
