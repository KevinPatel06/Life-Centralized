// Throwaway: pure logic behind the on-device spike (spec §9). Deleted in the next plan.
// Reports carry counts only, never calendar or event titles (the repo and chat are not private).

export type CheckId = 'launch' | 'calendarRead' | 'calendarWrite' | 'persistence' | 'export';
export type CheckStatus = 'pending' | 'pass' | 'fail' | 'cancelled';
export interface CheckResult {
  id: CheckId;
  status: CheckStatus;
  detail: string;
}
export interface CalendarLike {
  id: string;
  title: string;
  type?: string;
  allowsModifications?: boolean;
}
export interface EventLike {
  calendarId: string;
}
export interface CalendarSummary {
  calendarCount: number;
  birthdayCalendarCount: number;
  eventCount: number;
  birthdayEventCount: number;
}

export const CHECK_ORDER: CheckId[] = ['launch', 'calendarRead', 'calendarWrite', 'persistence', 'export'];

export const CHECK_LABELS: Record<CheckId, string> = {
  launch: 'App launches',
  calendarRead: 'Calendar read',
  calendarWrite: 'Calendar write',
  persistence: 'Data survives update',
  export: 'Export to Files',
};

const CENTRALIZED_TITLE = 'Centralized';

export function summarizeCalendars(calendars: CalendarLike[], events: EventLike[]): CalendarSummary {
  const birthdayIds = new Set(calendars.filter((c) => c.type === 'birthdays').map((c) => c.id));
  return {
    calendarCount: calendars.length,
    birthdayCalendarCount: birthdayIds.size,
    eventCount: events.length,
    birthdayEventCount: events.filter((e) => birthdayIds.has(e.calendarId)).length,
  };
}

export function calendarReadVerdict(permission: string, summary: CalendarSummary | null): CheckResult {
  if (permission !== 'granted' || summary === null) {
    return { id: 'calendarRead', status: 'fail', detail: `permission ${permission}` };
  }
  if (summary.birthdayCalendarCount === 0) {
    return { id: 'calendarRead', status: 'fail', detail: 'no Birthdays calendar' };
  }
  const s = summary;
  return {
    id: 'calendarRead',
    status: 'pass',
    detail: `${s.calendarCount} calendars (${s.birthdayCalendarCount} birthdays), ${s.eventCount} events (${s.birthdayEventCount} birthdays)`,
  };
}

export function pickCentralizedCalendar(calendars: CalendarLike[]): string | null {
  const named = calendars.filter((c) => c.title === CENTRALIZED_TITLE);
  const writable = named.find((c) => c.allowsModifications !== false);
  return writable ? writable.id : null;
}

export function persistenceVerdict(runs: { build: string; at: string }[], currentBuild: string): CheckResult {
  if (runs.length === 0) {
    return { id: 'persistence', status: 'fail', detail: 'No saved launches found' };
  }
  const earlier = runs.filter((r) => r.build !== currentBuild);
  if (earlier.length === 0) {
    return { id: 'persistence', status: 'pending', detail: 'Install a newer build over this one, then reopen' };
  }
  return { id: 'persistence', status: 'pass', detail: `Found data from build ${earlier[0].build}` };
}

export function exportVerdict(
  outcome: { kind: 'cancelled' } | { kind: 'error'; message: string } | { kind: 'read'; json: unknown },
): CheckResult {
  if (outcome.kind === 'cancelled') {
    return { id: 'export', status: 'cancelled', detail: 'Cancelled, try again' };
  }
  if (outcome.kind === 'error') {
    return { id: 'export', status: 'fail', detail: outcome.message };
  }
  const json = outcome.json as { app?: unknown; kind?: unknown } | null;
  const ok = json !== null && typeof json === 'object' && json.app === 'life-centralized' && json.kind === 'spike';
  return ok
    ? { id: 'export', status: 'pass', detail: 'Saved to Files and read back' }
    : { id: 'export', status: 'fail', detail: 'Picked file is not the spike export' };
}

export function formatSpikeReport(results: CheckResult[], meta: { build: string; iosVersion: string }): string {
  const byId = new Map(results.map((r) => [r.id, r]));
  const lines = CHECK_ORDER.map((id, i) => {
    const r = byId.get(id);
    const status = (r?.status ?? 'pending').toUpperCase();
    const detail = r?.detail ? ` (${r.detail})` : '';
    return `${i + 1}. ${CHECK_LABELS[id]}: ${status}${detail}`;
  });
  return [`Life Centralized spike · build ${meta.build} · iOS ${meta.iosVersion}`, ...lines].join('\n');
}
