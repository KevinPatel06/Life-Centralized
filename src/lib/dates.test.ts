import { startOfWeek, planningWindow } from './dates';

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
