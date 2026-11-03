// Thin wrapper over expo-calendar (SDK 58 object API). The same calls passed the on-device spike.
import {
  ExpoCalendar,
  ExpoCalendarEvent,
  createCalendar,
  getCalendarPermissions,
  getCalendars,
  getDefaultCalendarSync,
  listEvents,
  requestCalendarPermissions,
} from 'expo-calendar';
import { EntityTypes } from 'expo-calendar/legacy';

import { CENTRALIZED, type RawCalendar, type RawEvent } from '../domain/calendar';

export type Permission = 'granted' | 'denied' | 'undetermined';

/** Calendar access. With `prompt`, iOS asks the first time; it never asks again once answered. */
export async function permission(prompt: boolean): Promise<Permission> {
  const res = prompt ? await requestCalendarPermissions() : await getCalendarPermissions();
  if (res.granted) return 'granted';
  return res.status === 'undetermined' ? 'undetermined' : 'denied';
}

export async function readPhone(start: Date, end: Date): Promise<{ cals: RawCalendar[]; events: RawEvent[] }> {
  const calendars = await getCalendars(EntityTypes.EVENT);
  const events = calendars.length ? await listEvents(calendars, start, end) : [];
  return {
    cals: calendars.map((c) => ({
      id: c.id,
      title: c.title,
      color: c.color ?? undefined,
      type: c.type ? String(c.type) : undefined,
      allowsModifications: c.allowsModifications,
    })),
    events: events.map((e) => ({
      id: e.id,
      calendarId: e.calendarId,
      title: e.title,
      startDate: e.startDate,
      endDate: e.endDate,
      allDay: e.allDay,
    })),
  };
}

/** The app's own calendar: the one we know, else one named Centralized, else a new one. */
export async function ensureCentralized(knownId?: string): Promise<string> {
  const calendars = await getCalendars(EntityTypes.EVENT);
  const writable = calendars.filter((c) => c.allowsModifications !== false);
  const known = knownId ? writable.find((c) => c.id === knownId) : undefined;
  if (known) return known.id;
  const named = writable.find((c) => c.title === CENTRALIZED);
  if (named) return named.id;
  const source = getDefaultCalendarSync().source;
  const created = await createCalendar({
    title: CENTRALIZED,
    color: '#47705A',
    entityType: EntityTypes.EVENT,
    sourceId: source.id,
    source,
    name: CENTRALIZED,
  });
  return created.id;
}

export interface EventDetails { title: string; startDate: Date; endDate: Date; notes: string }

/** Update the event if it still exists in that calendar; otherwise create it. Returns the event id. */
export async function upsertEvent(calendarId: string, eventId: string | undefined, details: EventDetails): Promise<string> {
  if (eventId) {
    try {
      const existing = await ExpoCalendarEvent.get(eventId);
      if (existing.calendarId === calendarId) {
        await existing.update(details);
        return existing.id;
      }
      await existing.delete();
    } catch {
      // Deleted in the Calendar app: fall through and recreate it.
    }
  }
  const calendar = await ExpoCalendar.get(calendarId);
  const created = await calendar.createEvent(details);
  return created.id;
}

export async function removeEvent(eventId: string): Promise<void> {
  try {
    const existing = await ExpoCalendarEvent.get(eventId);
    await existing.delete();
  } catch {
    // Already gone.
  }
}
