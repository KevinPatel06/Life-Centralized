import { parseBackup } from '../data/backup';
import { fullState } from '../test/fixtures';
import { restoreFlow, setBackground, setCards, setCharcoalInDark, setGoalTarget } from './settings';
import { emptyState } from './template';

test('theme setters change only settings', () => {
  const s = fullState();
  const a = setBackground(s, 'charcoal');
  expect(a.settings.background).toBe('charcoal');
  expect(a.tasks).toBe(s.tasks);
  expect(setCards(s, 'cocoa').settings.cards).toBe('cocoa');
  expect(setCharcoalInDark(s, true).settings.charcoalInDark).toBe(true);
  expect(setCharcoalInDark(s, true).template).toBe(s.template);
});

test('goal targets are whole numbers from 0 to 14', () => {
  const s = emptyState();
  expect(setGoalTarget(s, 'gym', -1).goalTargets.gym).toBe(0);
  expect(setGoalTarget(s, 'gym', 20).goalTargets.gym).toBe(14);
  expect(setGoalTarget(s, 'trading', 2.6).goalTargets.trading).toBe(3);
  expect(setGoalTarget(s, 'cardio', 4).goalTargets).toEqual({ gym: 3, trading: 2, cardio: 4 });
});

test('a cancelled pick changes nothing', () => {
  expect(restoreFlow(null)).toEqual({ kind: 'cancelled' });
});

test('a file that is not a backup shows the plain error', () => {
  const result = parseBackup(JSON.stringify({ app: 'life-centralized', kind: 'spike' }));
  expect(restoreFlow(result)).toEqual({ kind: 'error', message: "That file isn't a Life Centralized backup." });
});

test('a good backup asks to confirm, with a short summary', () => {
  const s = fullState();
  expect(restoreFlow({ ok: true, state: s })).toEqual({ kind: 'confirm', state: s, summary: '2 tasks, 1 plan, 1 note' });
  expect(restoreFlow({ ok: true, state: emptyState() })).toMatchObject({ summary: '0 tasks, 0 plans, 0 notes' });
});
