// Test-only fixtures. Neutral words only: this repo is public.
import { emptyState, generateDayRecord } from '../domain/template';
import type { AppState } from '../domain/types';

/** A state holding one of every entity. */
export function fullState(): AppState {
  const s = emptyState();
  s.template.days[0].items.push({ id: 'i1', block: 'morning', title: 'Item A', goal: 'gym', backup: { weekday: 3, block: 'morning' } });
  s.template.days[0].label = 'Label A';
  const day = generateDayRecord(s.template, '2026-11-02');
  day.ticks = { i1: '2026-11-02T13:00:00.000Z' };
  day.events = [{ key: 'e1|2026-11-02', title: 'Event A', start: '2026-11-02T15:00:00.000Z', end: '2026-11-02T16:00:00.000Z', allDay: false, calendarTitle: 'Cal A' }];
  return {
    ...s,
    settings: { ...s.settings, background: 'oat', centralizedCalendarId: 'cal-c', lastWeekClosed: '2026-10-26' },
    days: { '2026-11-02': day },
    weeks: { '2026-10-26': { weekStart: '2026-10-26', goals: { gym: { count: 2, target: 3 }, trading: { count: 0, target: 2 }, cardio: { count: 1, target: 3 } } } },
    moves: { m1: { id: 'm1', fromDate: '2026-11-02', itemId: 'i1', toDate: '2026-11-05', toBlock: 'morning', at: '2026-11-03T02:00:00.000Z' } },
    tasks: {
      t1: { id: 't1', title: 'Task 1', urgency: 'now', tag: 'life', inProgress: true, note: 'Note 1', createdAt: '2026-11-01T12:00:00.000Z' },
      t2: { id: 't2', title: 'Task 2', urgency: 'someday', tag: 'projects', inProgress: false, note: '', createdAt: '2026-10-01T12:00:00.000Z', doneAt: '2026-11-03T02:30:00.000Z' },
    },
    plans: { p1: { id: 'p1', title: 'Plan 1', date: '2026-11-05', when: { kind: 'range', start: 1200, end: 1320 }, kind: 'dinner', note: '', addToCalendar: true, calendarEventId: 'ev-9', createdAt: '2026-11-02T12:00:00.000Z' } },
    notes: { n1: { id: 'n1', text: 'Note text', createdAt: '2026-11-02T19:00:00.000Z' } },
    eventNotes: { 'e1|2026-11-02': { key: 'e1|2026-11-02', title: 'Event A', date: '2026-11-02', text: 'Event note', updatedAt: '2026-11-02T20:00:00.000Z' } },
    calendar: {
      imported: true,
      offCalendars: ['cal-b'],
      hidden: ['e2|2026-11-04'],
      calendars: [{ id: 'cal-a', title: 'Cal A', color: '#336699', isBirthdays: false }],
      events: [{ key: 'e1|2026-11-02', eventId: 'e1', calendarId: 'cal-a', title: 'Event A', start: '2026-11-02T15:00:00.000Z', end: '2026-11-02T16:00:00.000Z', allDay: false, date: '2026-11-02' }],
      syncedAt: '2026-11-02T21:00:00.000Z',
    },
  };
}
