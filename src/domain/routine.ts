// Editing the weekly template (spec §3.1, §4 Settings → Routine blocks). Edits apply from today on.
import { newId } from '../lib/id';
import { generateDayRecord } from './template';
import type { AppState, BlockId, GoalId, ISODate, Minutes, PlanKind, Slot, TemplateDay, TemplateItem } from './types';

function withDay(s: AppState, weekday: number, fn: (d: TemplateDay) => TemplateDay | null): AppState {
  const day = s.template.days[weekday];
  if (!day) return s;
  const next = fn(day);
  if (!next || next === day) return s;
  const days = [...s.template.days];
  days[weekday] = next;
  return { ...s, template: { ...s.template, days } };
}

/** Move where a block starts; the block before it now ends there. Refused if it would break the order. */
export function setBlockStart(s: AppState, weekday: number, block: BlockId, m: Minutes): AppState {
  return withDay(s, weekday, (d) => {
    const i = d.blocks.findIndex((b) => b.id === block);
    if (i < 0) return null;
    const lower = i > 0 ? d.blocks[i - 1].start : -1;
    const upper = d.blocks[i + 1]?.start ?? d.blocks[i].end ?? 1440;
    if (m <= lower || m >= upper || m < 0) return null;
    const blocks = d.blocks.map((b) => ({ ...b }));
    blocks[i].start = m;
    if (i > 0) blocks[i - 1].end = m;
    return { ...d, blocks };
  });
}

/** Bedtime is Wind down's end. Null means no bedtime. */
export function setBedtime(s: AppState, weekday: number, m: Minutes | null): AppState {
  return withDay(s, weekday, (d) => {
    const last = d.blocks[d.blocks.length - 1];
    if (m !== null && (m <= last.start || m > 1440)) return null;
    return { ...d, blocks: d.blocks.map((b, i) => (i === d.blocks.length - 1 ? { ...b, end: m } : b)) };
  });
}

export function setBlockLabel(s: AppState, weekday: number, block: BlockId, label: string): AppState {
  return withDay(s, weekday, (d) => ({
    ...d,
    blocks: d.blocks.map((b) => {
      if (b.id !== block) return b;
      const { label: _old, ...rest } = b;
      return label.trim() ? { ...rest, label: label.trim() } : rest;
    }),
  }));
}

export function setDayInfo(s: AppState, weekday: number, info: { label?: string; note?: string }): AppState {
  return withDay(s, weekday, (d) => {
    const next: TemplateDay = { ...d };
    for (const key of ['label', 'note'] as const) {
      const value = info[key];
      if (value === undefined) continue;
      if (value.trim()) next[key] = value.trim();
      else delete next[key];
    }
    return next;
  });
}

/** Copy one day's block times and labels to every day. Items stay where they are. */
export function sameTimesEveryDay(s: AppState, fromWeekday: number): AppState {
  const from = s.template.days[fromWeekday];
  if (!from) return s;
  return { ...s, template: { ...s.template, days: s.template.days.map((d) => ({ ...d, blocks: from.blocks.map((b) => ({ ...b })) })) } };
}

export function addItem(s: AppState, weekday: number, block: BlockId, title: string): { state: AppState; id: string } {
  const clean = title.trim();
  if (!clean || !s.template.days[weekday]) return { state: s, id: '' };
  const id = newId();
  return { state: withDay(s, weekday, (d) => ({ ...d, items: [...d.items, { id, block, title: clean }] })), id };
}

export interface ItemPatch {
  title?: string;
  block?: BlockId;
  time?: Minutes | null;
  minimum?: string | null;
  goal?: GoalId | null;
  backup?: Slot | null;
  note?: string | null;
}

export function updateItem(s: AppState, weekday: number, id: string, patch: ItemPatch): AppState {
  return withDay(s, weekday, (d) => {
    const i = d.items.findIndex((it) => it.id === id);
    if (i < 0) return null;
    const item: TemplateItem = { ...d.items[i] };
    if (patch.title !== undefined && patch.title.trim()) item.title = patch.title.trim();
    if (patch.block) item.block = patch.block;
    for (const key of ['time', 'minimum', 'goal', 'backup', 'note'] as const) {
      const value = patch[key];
      if (value === undefined) continue;
      if (value === null || (typeof value === 'string' && !value.trim())) delete item[key];
      else (item as unknown as Record<string, unknown>)[key] = typeof value === 'string' ? value.trim() : value;
    }
    const items = [...d.items];
    items[i] = item;
    return { ...d, items };
  });
}

export function removeItem(s: AppState, weekday: number, id: string): AppState {
  return withDay(s, weekday, (d) => (d.items.some((it) => it.id === id) ? { ...d, items: d.items.filter((it) => it.id !== id) } : null));
}

export function moveItem(s: AppState, weekday: number, id: string, dir: -1 | 1): AppState {
  return withDay(s, weekday, (d) => {
    const i = d.items.findIndex((it) => it.id === id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= d.items.length) return null;
    const items = [...d.items];
    [items[i], items[j]] = [items[j], items[i]];
    return { ...d, items };
  });
}

export function addStandingPlan(s: AppState, weekday: number, title: string, block: BlockId, kind: PlanKind): { state: AppState; id: string } {
  const clean = title.trim();
  if (!clean || !s.template.days[weekday]) return { state: s, id: '' };
  const id = newId();
  return { state: withDay(s, weekday, (d) => ({ ...d, plans: [...d.plans, { id, title: clean, when: { kind: 'block', block }, kind }] })), id };
}

export function removeStandingPlan(s: AppState, weekday: number, id: string): AppState {
  return withDay(s, weekday, (d) => (d.plans.some((p) => p.id === id) ? { ...d, plans: d.plans.filter((p) => p.id !== id) } : null));
}

/** Re-freeze today's record from the template (unless today is checked in), keeping ticks that still apply. */
export function applyTemplateToToday(s: AppState, today: ISODate): AppState {
  const record = s.days[today];
  if (!record || record.checkin) return s;
  const fresh = generateDayRecord(s.template, today);
  const ids = new Set(fresh.items.map((i) => i.id));
  const ticks = Object.fromEntries(Object.entries(record.ticks).filter(([k]) => ids.has(k) || k.startsWith('move:')));
  return {
    ...s,
    days: {
      ...s.days,
      [today]: { ...fresh, ticks, ...(record.events ? { events: record.events } : {}), ...(record.notCheckedIn ? { notCheckedIn: true } : {}) },
    },
  };
}

/** The one entry point the editor screens use. */
export function editRoutine(s: AppState, today: ISODate, fn: (s: AppState) => AppState): AppState {
  const next = fn(s);
  return next === s ? s : applyTemplateToToday(next, today);
}
