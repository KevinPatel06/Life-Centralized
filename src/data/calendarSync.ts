// Moving data between the phone's calendars and the store (spec §3.5, §3.6).
import { mergeImport, planEventTimes, planPhoneAction, setPlanEventId } from '../domain/calendar';
import { importWindow } from '../lib/dates';
import { ensureCentralized, permission, readPhone, removeEvent, upsertEvent } from './phoneCalendar';
import type { Store } from './store';

async function read(store: Store, now: Date): Promise<void> {
  const { start, end } = importWindow(now);
  const { cals, events } = await readPhone(start, end);
  store.update((s) => mergeImport(s, cals, events, now));
}

/** On launch and on return to the foreground: re-read, but only after the owner imported once. Never prompts. */
export async function syncFromPhone(store: Store, now: Date): Promise<void> {
  if (!store.getState().calendar.imported) return;
  if ((await permission(false)) !== 'granted') return;
  await read(store, now);
}

/** The Import button on the iPhone calendar screen. Asks for access the first time. */
export async function importFromPhone(store: Store, now: Date): Promise<'granted' | 'denied'> {
  if ((await permission(true)) !== 'granted') return 'denied';
  await read(store, now);
  return 'granted';
}

/** After a plan is saved: create, update or remove its event in the Centralized calendar. */
export async function pushPlan(store: Store, planId: string): Promise<void> {
  const plan = store.getState().plans[planId];
  if (!plan) return;
  const action = planPhoneAction(plan);
  if (action === 'none') return;
  if ((await permission(true)) !== 'granted') return;
  if (action === 'delete') {
    await removeEvent(plan.calendarEventId!);
    store.update((s) => setPlanEventId(s, planId, undefined));
    return;
  }
  const known = store.getState().settings.centralizedCalendarId;
  const calendarId = await ensureCentralized(known);
  if (calendarId !== known) store.update((s) => ({ ...s, settings: { ...s.settings, centralizedCalendarId: calendarId } }));
  const { start, end } = planEventTimes(store.getState(), plan);
  const eventId = await upsertEvent(calendarId, plan.calendarEventId, { title: plan.title, startDate: start, endDate: end, notes: plan.note });
  store.update((s) => setPlanEventId(s, planId, eventId));
}

/** After a plan is deleted. */
export async function removePlanEvent(eventId: string): Promise<void> {
  if ((await permission(false)) !== 'granted') return;
  await removeEvent(eventId);
}
