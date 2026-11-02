import {
  BLOCK_NAME,
  blockRange,
  clock,
  clockAmPm,
  ordinal,
  plural,
  shortDate,
  timeRange,
  weekRange,
  weekTitle,
  weekdayLetter,
  weekdayName,
  weekdayShort,
  whenLabel,
} from './format';

test('plural', () => {
  expect(plural(1, 'task')).toBe('1 task');
  expect(plural(0, 'task')).toBe('0 tasks');
});

test('clock is 12-hour without a suffix', () => {
  expect(clock(6 * 60)).toBe('6:00');
  expect(clock(12 * 60 + 30)).toBe('12:30');
  expect(clock(21 * 60)).toBe('9:00');
  expect(clock(0)).toBe('12:00');
  expect(clock(7 * 60 + 5)).toBe('7:05');
});

test('clockAmPm adds AM or PM', () => {
  expect(clockAmPm(19 * 60 + 45)).toBe('7:45 PM');
  expect(clockAmPm(12 * 60)).toBe('12:00 PM');
  expect(clockAmPm(0)).toBe('12:00 AM');
  expect(clockAmPm(1440)).toBe('12:00 AM');
});

test('blockRange uses an en dash, or just the start when open-ended', () => {
  expect(blockRange({ id: 'evening', start: 18 * 60, end: 21 * 60 })).toBe('6:00–9:00');
  expect(blockRange({ id: 'winddown', start: 21 * 60, end: null })).toBe('9:00');
});

test('timeRange shares the suffix when it can', () => {
  expect(timeRange(20 * 60, 23 * 60)).toBe('8:00 – 11:00 PM');
  expect(timeRange(11 * 60, 13 * 60)).toBe('11:00 AM – 1:00 PM');
  expect(timeRange(12 * 60 + 30, 13 * 60 + 30)).toBe('12:30 – 1:30 PM');
});

test('whenLabel', () => {
  expect(whenLabel({ kind: 'block', block: 'evening' })).toBe('Evening');
  expect(whenLabel({ kind: 'block', block: 'winddown' })).toBe('Wind down');
  expect(whenLabel({ kind: 'at', time: 20 * 60 })).toBe('8:00 PM');
  expect(whenLabel({ kind: 'range', start: 19 * 60, end: 22 * 60 })).toBe('7:00 – 10:00 PM');
});

test('ordinal', () => {
  expect([1, 2, 3, 4, 11, 12, 13, 21, 22, 23, 30].map(ordinal)).toEqual([
    '1st', '2nd', '3rd', '4th', '11th', '12th', '13th', '21st', '22nd', '23rd', '30th',
  ]);
});

test('date and weekday labels', () => {
  expect(shortDate('2026-11-02')).toBe('Nov 2nd');
  expect(weekdayName('2026-11-02')).toBe('Monday');
  expect(weekdayShort('2026-11-08')).toBe('Sun');
  expect(weekdayLetter('2026-11-05')).toBe('T');
  expect(BLOCK_NAME.winddown).toBe('Wind down');
});

test('week titles and ranges', () => {
  expect(weekTitle(0)).toBe('This week');
  expect(weekTitle(1)).toBe('Next week');
  expect(weekTitle(8)).toBe('In 8 weeks');
  expect(weekRange('2026-11-02')).toBe('Nov 2 – 8');
  expect(weekRange('2026-11-30')).toBe('Nov 30 – Dec 6');
  expect(weekRange('2026-12-28')).toBe('Dec 28 – Jan 3');
});
