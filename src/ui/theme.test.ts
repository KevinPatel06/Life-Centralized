import { emptyState } from '../domain/template';
import type { Settings } from '../domain/types';
import { BACKGROUNDS, CARDS, resolveTheme } from './theme';

const base = emptyState().settings;
const with_ = (p: Partial<Settings>): Settings => ({ ...base, ...p });

test('the default is Linen + Sage', () => {
  const t = resolveTheme(base, 'light');
  expect(t).toMatchObject({ bg: '#F8F4ED', onBg: '#2A241D', card: '#DCE6D5', accent: '#47705A', fabBg: '#2B2219', fabInk: '#F7F0E3', dark: false });
  expect(t.nowChip).toBe('#F2B04A');
  expect(t.nowChipInk).toBe('#2A1C00');
});

test('Charcoal + Cocoa uses the darker card override', () => {
  const t = resolveTheme(with_({ background: 'charcoal', cards: 'cocoa' }), 'light');
  expect(t).toMatchObject({ bg: '#1D1E1C', card: '#43352D', nowBg: '#4F3F35', tabBg: '#43352D', dark: true });
});

test('Oat + Cocoa keeps the regular cocoa card', () => {
  expect(resolveTheme(with_({ background: 'oat', cards: 'cocoa' }), 'light')).toMatchObject({
    bg: '#E2D5BF',
    card: '#3A2E28',
    fabBg: '#F2B866',
    accent: '#9C5420',
  });
});

test('Charcoal in Dark Mode applies only when the switch is on and the phone is dark', () => {
  expect(resolveTheme(with_({ charcoalInDark: true }), 'dark').bg).toBe('#1D1E1C');
  expect(resolveTheme(with_({ charcoalInDark: true }), 'light').bg).toBe('#F8F4ED');
  expect(resolveTheme(with_({ charcoalInDark: false }), 'dark').bg).toBe('#F8F4ED');
  expect(resolveTheme(with_({ charcoalInDark: true }), null).bg).toBe('#F8F4ED');
});

test('swatch lists follow the spec order', () => {
  expect(BACKGROUNDS.map((b) => b.name)).toEqual(['Linen', 'Beige', 'Oat', 'Charcoal']);
  expect(CARDS.map((c) => c.name)).toEqual(['Sage', 'Cocoa']);
});
