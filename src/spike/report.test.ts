import { summarizeCalendars, calendarReadVerdict, pickCentralizedCalendar, persistenceVerdict, exportVerdict, formatSpikeReport } from './report';

const cals = [
  { id: 'a', title: 'Private Title One', type: 'caldav' },
  { id: 'b', title: 'Birthdays', type: 'birthdays', allowsModifications: false },
  { id: 'c', title: 'Private Title Two', type: 'local' },
];
const evs = [{ calendarId: 'a' }, { calendarId: 'b' }, { calendarId: 'b' }, { calendarId: 'c' }];

test('summarizeCalendars counts calendars, birthday calendars and events', () => {
  expect(summarizeCalendars(cals, evs)).toEqual({ calendarCount: 3, birthdayCalendarCount: 1, eventCount: 4, birthdayEventCount: 2 });
});

test('summary and report never contain calendar titles', () => {
  const s = summarizeCalendars(cals, evs);
  const r = calendarReadVerdict('granted', s);
  const text = formatSpikeReport([r], { build: '7', iosVersion: '18.1' });
  expect(JSON.stringify(s) + text).not.toMatch(/Private Title/);
});

test('calendarReadVerdict passes only with full access and a birthdays calendar', () => {
  expect(calendarReadVerdict('granted', summarizeCalendars(cals, evs)).status).toBe('pass');
  expect(calendarReadVerdict('granted', summarizeCalendars([cals[0]], [])).status).toBe('fail');
  const denied = calendarReadVerdict('denied', null);
  expect(denied.status).toBe('fail');
  expect(denied.detail).toContain('denied');
});

test('pickCentralizedCalendar reuses an existing writable Centralized calendar', () => {
  expect(pickCentralizedCalendar([...cals, { id: 'x', title: 'Centralized', allowsModifications: true }])).toBe('x');
  expect(pickCentralizedCalendar([{ id: 'r', title: 'Centralized', allowsModifications: false }, { id: 'w', title: 'Centralized' }])).toBe('w');
  expect(pickCentralizedCalendar([{ id: 'y', title: 'centralized ' }])).toBeNull();
});

test('persistenceVerdict needs a row written by an earlier build', () => {
  expect(persistenceVerdict([{ build: '7', at: 't1' }], '7').status).toBe('pending');
  expect(persistenceVerdict([{ build: '7', at: 't1' }, { build: '8', at: 't2' }], '8').status).toBe('pass');
  expect(persistenceVerdict([], '8').status).toBe('fail');
});

test('exportVerdict: cancel is not a failure; read-back must be the spike file', () => {
  expect(exportVerdict({ kind: 'cancelled' }).status).toBe('cancelled');
  expect(exportVerdict({ kind: 'error', message: 'boom' })).toMatchObject({ status: 'fail', detail: 'boom' });
  expect(exportVerdict({ kind: 'read', json: { app: 'life-centralized', kind: 'spike' } }).status).toBe('pass');
  expect(exportVerdict({ kind: 'read', json: { app: 'other' } }).status).toBe('fail');
});

test('formatSpikeReport lists checks in order with status words', () => {
  const text = formatSpikeReport(
    [{ id: 'export', status: 'pass', detail: '' }, { id: 'launch', status: 'pass', detail: '' }],
    { build: '7', iosVersion: '18.1' },
  );
  expect(text.split('\n')).toEqual([
    'Life Centralized spike · build 7 · iOS 18.1',
    '1. App launches: PASS',
    '2. Calendar read: PENDING',
    '3. Calendar write: PENDING',
    '4. Data survives update: PENDING',
    '5. Export to Files: PASS',
  ]);
});
