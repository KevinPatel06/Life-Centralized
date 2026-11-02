import type { BlockTimes, Template } from './types';
import { BLOCK_ORDER, DEFAULT_BLOCKS, blockAt, emptyState, emptyTemplate, generateDayRecord } from './template';

test('blocks run morning, afternoon, evening, wind down', () => {
  expect(BLOCK_ORDER).toEqual(['morning', 'afternoon', 'evening', 'winddown']);
  expect(DEFAULT_BLOCKS.map((b) => b.id)).toEqual(BLOCK_ORDER);
});

test('blockAt finds the block for a time, with before and after', () => {
  expect(blockAt(DEFAULT_BLOCKS, 5 * 60)).toBe('before');
  expect(blockAt(DEFAULT_BLOCKS, 6 * 60)).toBe('morning');
  expect(blockAt(DEFAULT_BLOCKS, 12 * 60)).toBe('afternoon');
  expect(blockAt(DEFAULT_BLOCKS, 23 * 60 + 59)).toBe('winddown');
  const bedtime: BlockTimes[] = DEFAULT_BLOCKS.map((b) => (b.id === 'winddown' ? { ...b, end: 23 * 60 } : b));
  expect(blockAt(bedtime, 22 * 60 + 59)).toBe('winddown');
  expect(blockAt(bedtime, 23 * 60)).toBe('after');
});

test('blockAt gives a gap between blocks to the block before it', () => {
  const gap: BlockTimes[] = DEFAULT_BLOCKS.map((b) => (b.id === 'morning' ? { ...b, end: 11 * 60 } : b));
  expect(blockAt(gap, 11 * 60 + 30)).toBe('morning');
});

function templateWithWednesdayItem(): Template {
  const t = emptyTemplate();
  t.days[2] = {
    ...t.days[2],
    label: 'Label A',
    items: [{ id: 'i1', block: 'morning', title: 'Item A', goal: 'gym', backup: { weekday: 5, block: 'morning' } }],
    plans: [{ id: 'p1', title: 'Plan A', when: { kind: 'block', block: 'evening' }, kind: 'other' }],
  };
  return t;
}

test('generateDayRecord resolves the backup slot to a date in the same week', () => {
  const day = generateDayRecord(templateWithWednesdayItem(), '2026-11-04');
  expect(day.date).toBe('2026-11-04');
  expect(day.label).toBe('Label A');
  expect(day.items[0].backup).toEqual({ date: '2026-11-07', block: 'morning' });
  expect(day.plans).toHaveLength(1);
  expect(day.ticks).toEqual({});
  expect(day.blocks.map((b) => b.id)).toEqual(BLOCK_ORDER);
});

test('generateDayRecord copies, so later template edits do not reach the day', () => {
  const t = templateWithWednesdayItem();
  const day = generateDayRecord(t, '2026-11-04');
  t.days[2].items[0].title = 'Edited';
  t.days[2].blocks[0].start = 0;
  t.days[2].plans[0].title = 'Edited';
  expect(day.items[0].title).toBe('Item A');
  expect(day.blocks[0].start).toBe(6 * 60);
  expect(day.plans[0].title).toBe('Plan A');
});

test('emptyTemplate has 7 days with default blocks and nothing in them', () => {
  const t = emptyTemplate();
  expect(t.days).toHaveLength(7);
  expect(t.days.every((d) => d.items.length === 0 && d.plans.length === 0)).toBe(true);
});

test('emptyState starts on Linen + Sage with the default goal targets', () => {
  const s = emptyState();
  expect(s.settings).toEqual({ background: 'linen', cards: 'sage', charcoalInDark: false });
  expect(s.goalTargets).toEqual({ gym: 3, trading: 2, cardio: 3 });
  expect(s.calendar.imported).toBe(false);
  expect(Object.keys(s.tasks)).toHaveLength(0);
});
