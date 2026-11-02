// Every entity the app stores. See spec §3 and §6. Timestamps are ISO strings; dates are local `YYYY-MM-DD`.
import type { ISODate } from '../lib/dates';

export type { ISODate };
/** Minutes after local midnight, 0–1440. */
export type Minutes = number;
export type BlockId = 'morning' | 'afternoon' | 'evening' | 'winddown';
export type GoalId = 'gym' | 'trading' | 'cardio';
export type Tag = 'trading' | 'health' | 'projects' | 'life';
export type Urgency = 'now' | 'soon' | 'someday';
export type PlanKind = 'lunch' | 'dinner' | 'hangout' | 'other';
export type Background = 'linen' | 'beige' | 'oat' | 'charcoal';
export type CardColor = 'sage' | 'cocoa';

/** A null end means the block runs until midnight (Wind down with no bedtime). */
export interface BlockTimes { id: BlockId; start: Minutes; end: Minutes | null }
/** A weekday (0 = Monday) and block, used for backup slots in the template. */
export interface Slot { weekday: number; block: BlockId }

export interface TemplateItem {
  id: string;
  block: BlockId;
  title: string;
  time?: Minutes;
  minimum?: string;
  goal?: GoalId;
  backup?: Slot;
  note?: string;
}
export type When =
  | { kind: 'block'; block: BlockId }
  | { kind: 'at'; time: Minutes }
  | { kind: 'range'; start: Minutes; end: Minutes };
export interface TemplatePlan { id: string; title: string; when: When; kind: PlanKind }
export interface TemplateDay { label?: string; note?: string; blocks: BlockTimes[]; items: TemplateItem[]; plans: TemplatePlan[] }
/** Seven days, index 0 = Monday. */
export interface Template { days: TemplateDay[] }

/** A routine item as generated for one date: its backup slot is resolved to a date in the same week. */
export interface DayItem extends Omit<TemplateItem, 'backup'> { backup?: { date: ISODate; block: BlockId } }
export type BlockAnswer = 'done' | 'partly' | 'skipped';
export type ItemOutcome = 'done' | 'missed' | 'moved' | 'skipped';
export interface Checkin {
  at: string;
  answers: Partial<Record<BlockId, BlockAnswer>>;
  /** Keyed like ticks: item id, or `move:<moveId>`. */
  outcomes: Record<string, ItemOutcome>;
  /** Tasks planned for the day that were not done; their "planned for" was cleared. */
  unplannedTasks: string[];
}
export interface EventSnapshot { key: string; title: string; start: string; end: string; allDay: boolean; calendarTitle: string }
/** One date, frozen from the template when it became today (or when its week was closed). */
export interface DayRecord {
  date: ISODate;
  label?: string;
  note?: string;
  blocks: BlockTimes[];
  items: DayItem[];
  plans: TemplatePlan[];
  /** Tick time by key: a routine item id, or `move:<moveId>` for an item moved into this day. */
  ticks: Record<string, string>;
  checkin?: Checkin;
  notCheckedIn?: boolean;
  events?: EventSnapshot[];
}
export interface Move { id: string; fromDate: ISODate; itemId: string; toDate: ISODate; toBlock: BlockId; at: string }

export interface Task {
  id: string;
  title: string;
  urgency: Urgency;
  tag: Tag;
  inProgress: boolean;
  due?: ISODate;
  start?: ISODate;
  planned?: { date: ISODate; block?: BlockId };
  note: string;
  noteUpdatedAt?: string;
  createdAt: string;
  doneAt?: string;
}
export interface Plan {
  id: string;
  title: string;
  date: ISODate;
  when: When;
  kind: PlanKind;
  note: string;
  noteUpdatedAt?: string;
  addToCalendar: boolean;
  calendarEventId?: string;
  createdAt: string;
  fromNoteId?: string;
}
export interface Note { id: string; text: string; createdAt: string; turnedInto?: { kind: 'task' | 'plan'; id: string } }
/** A note on an imported iPhone event, keyed by the event's key (event id + occurrence start). */
export interface EventNote { key: string; title: string; date: ISODate; text: string; updatedAt: string }

export interface ImportedCalendar { id: string; title: string; color: string; isBirthdays: boolean }
export interface ImportedEvent {
  key: string;
  eventId: string;
  calendarId: string;
  title: string;
  start: string;
  end: string;
  allDay: boolean;
  date: ISODate;
}
export interface CalendarState {
  imported: boolean;
  offCalendars: string[];
  hidden: string[];
  calendars: ImportedCalendar[];
  events: ImportedEvent[];
  syncedAt?: string;
}

export interface Settings {
  background: Background;
  cards: CardColor;
  charcoalInDark: boolean;
  centralizedCalendarId?: string;
  /** Monday of the newest week already closed into history. */
  lastWeekClosed?: ISODate;
}
export interface WeekRecord { weekStart: ISODate; goals: Record<GoalId, { count: number; target: number }> }

export interface AppState {
  settings: Settings;
  template: Template;
  goalTargets: Record<GoalId, number>;
  days: Record<ISODate, DayRecord>;
  weeks: Record<ISODate, WeekRecord>;
  moves: Record<string, Move>;
  tasks: Record<string, Task>;
  plans: Record<string, Plan>;
  notes: Record<string, Note>;
  eventNotes: Record<string, EventNote>;
  calendar: CalendarState;
}
