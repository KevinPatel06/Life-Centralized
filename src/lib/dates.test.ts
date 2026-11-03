import { addDays, daysBetween, fromISODate, importWindow, minutesOf, planningWindow, startOfWeek, toISODate, weekStartOf, weekdayOf } from './dates';

const at = (y: number, m: number, d: number, h = 0, min = 0) => new Date(y, m - 1, d, h, min);

test('startOfWeek returns Monday 00:00 for a Monday evening', () => {
  expect(startOfWeek(at(2026, 11, 2, 18, 40))).toEqual(at(2026, 11, 2));
});

test('startOfWeek treats Sunday night as the end of the Monday-start week', () => {
  expect(startOfWeek(at(2026, 11, 8, 23, 59))).toEqual(at(2026, 11, 2));
});

test('planningWindow covers this week plus 8 more (63 days, exclusive end)', () => {
  const w = planningWindow(at(2026, 11, 2, 18, 40));
  expect(w.start).toEqual(at(2026, 11, 2));
  expect(w.end).toEqual(at(2027, 1, 4));
});

test('planningWindow ends at local midnight across a DST change', () => {
  const w = planningWindow(at(2027, 3, 10, 12)); // US DST starts Mar 14 2027
  expect(w.start).toEqual(at(2027, 3, 8));
  expect(w.end).toEqual(at(2027, 5, 10));
  expect(w.end.getHours()).toBe(0);
});

describe('ISO date helpers (local calendar dates)', () => {

  test('toISODate uses the local date, not UTC', () => {
    expect(toISODate(at(2026, 11, 2, 23, 59))).toBe('2026-11-02');
    expect(toISODate(at(2026, 1, 5))).toBe('2026-01-05');
  });

  test('fromISODate is local midnight', () => {
    expect(fromISODate('2026-11-02')).toEqual(at(2026, 11, 2));
  });

  test('addDays steps calendar days across DST', () => {
    expect(addDays('2027-03-13', 1)).toBe('2027-03-14');
    expect(addDays('2027-03-14', 1)).toBe('2027-03-15');
    expect(addDays('2026-11-01', 1)).toBe('2026-11-02'); // DST ends Nov 1 2026
  });

  test('addDays crosses month and year ends, both directions', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
    expect(addDays('2026-11-02', -56)).toBe('2026-09-07');
  });

  test('weekStartOf and weekdayOf put Sunday at the end of the week', () => {
    expect(weekStartOf('2026-11-08')).toBe('2026-11-02');
    expect(weekStartOf('2026-11-02')).toBe('2026-11-02');
    expect(weekdayOf('2026-11-02')).toBe(0);
    expect(weekdayOf('2026-11-08')).toBe(6);
  });

  test('daysBetween counts whole days across DST', () => {
    expect(daysBetween('2027-03-08', '2027-03-15')).toBe(7);
    expect(daysBetween('2026-11-04', '2026-11-02')).toBe(-2);
  });

  test('minutesOf is minutes after local midnight', () => {
    expect(minutesOf(at(2026, 11, 2, 18, 40))).toBe(18 * 60 + 40);
  });
});

describe('importWindow', () => {
  test('runs from this Monday through one year after today', () => {
    const w = importWindow(at(2026, 11, 4, 15, 0));
    expect(w.start).toEqual(at(2026, 11, 2));
    expect(w.end).toEqual(at(2027, 11, 5)); // exclusive: includes all of Nov 4, 2027
  });

  test('a leap day rolls to March 1st next year', () => {
    expect(importWindow(at(2028, 2, 29, 9)).end).toEqual(at(2029, 3, 2));
  });
});
