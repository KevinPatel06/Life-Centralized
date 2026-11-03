// The Today screen as data (spec §4 Today): the current block in full, everything else compact.
import { addDays, minutesOf, toISODate } from '../lib/dates';
import { BLOCK_NAME, clock, clockAmPm, plural, shortDate, weekdayName, weekdayShort, whenLabel } from '../lib/format';
import { headsUp } from './calendar';
import { type CheckinStatus, checkinStatus } from './checkin';
import { type AssembledBlock, type DayEntry, type TickEntry, assembleDay, isTickable } from './day';
import { effectiveUrgency } from './tasks';
import { blockAt } from './template';
import type { AppState, BlockId, ISODate, PlanKind } from './types';

export interface TodayRow {
  key: string;
  title: string;
  subtitle?: string;
  done: boolean;
  chip: 'routine' | 'now' | 'soon' | 'someday';
  /** Set on task rows, so tapping the row can open the task. */
  taskId?: string;
}
export interface TodayLine { key: string; time: string; title: string; source: 'plan' | 'iphone'; kind: PlanKind | 'event'; planId?: string }
export interface TodayBlock {
  id: BlockId;
  name: string;
  range: string;
  state: 'done' | 'now' | 'later';
  summary: string;
  mark?: 'done' | 'partly';
  rows: TodayRow[];
  lines: TodayLine[];
}
export interface TodayView {
  date: ISODate;
  weekday: string;
  dateLabel: string;
  blocksToGo: number;
  phase: 'before' | 'during' | 'after';
  blocks: TodayBlock[];
  buddy: string;
  tomorrow?: string;
  /** The next birthday or anniversary within 7 days. */
  headsUp?: string;
  checkin: CheckinStatus;
}

const firstLine = (text: string) => text.split('\n')[0].trim();
const join = (parts: (string | undefined | null | false)[]) => parts.filter(Boolean).join(' · ');

function toRow(e: TickEntry, date: ISODate, today: ISODate): TodayRow {
  if (e.type === 'task') {
    const note = firstLine(e.task.note);
    return {
      key: e.key,
      title: e.task.title,
      ...(note ? { subtitle: note } : {}),
      done: e.done,
      chip: effectiveUrgency(e.task, today).urgency,
      taskId: e.task.id,
    };
  }
  const item = e.item;
  const subtitle =
    e.type === 'moved'
      ? `Moved from ${weekdayShort(e.move.fromDate)}`
      : join([
          item.time !== undefined && clock(item.time),
          item.minimum,
          item.note,
          item.backup && item.backup.date > date && `Backup is ${weekdayName(item.backup.date)}`,
        ]);
  return { key: e.key, title: item.title, ...(subtitle ? { subtitle } : {}), done: e.done, chip: 'routine' };
}

function toLine(e: DayEntry): TodayLine | null {
  if (e.type === 'plan') return { key: e.key, time: whenLabel(e.plan.when), title: e.plan.title, source: 'plan', kind: e.plan.kind, planId: e.plan.id };
  if (e.type === 'recurring') return { key: e.key, time: whenLabel(e.plan.when), title: e.plan.title, source: 'plan', kind: e.plan.kind };
  if (e.type === 'event') {
    const time = e.event.allDay ? 'All day' : clockAmPm(minutesOf(new Date(e.event.start)));
    return { key: e.key, time, title: e.event.title, source: 'iphone', kind: 'event' };
  }
  return null;
}

function rowTitle(e: TickEntry): string {
  return e.type === 'task' ? e.task.title : e.item.title;
}

export function buildToday(s: AppState, now: Date): TodayView {
  const today = toISODate(now);
  const day = assembleDay(s, today);
  const at = blockAt(day.record.blocks, minutesOf(now));
  const phase: TodayView['phase'] = at === 'before' ? 'before' : at === 'after' ? 'after' : 'during';
  const nowIndex = phase === 'during' ? day.blocks.findIndex((b) => b.times.id === at) : -1;

  // Tasks planned for the date only float into the current block while the day is running.
  const blocks: AssembledBlock[] = day.blocks.map((b) => ({ ...b, entries: [...b.entries] }));
  if (nowIndex >= 0) {
    const floating = blocks.flatMap((b) => b.entries.filter((e) => e.type === 'task' && !e.task.planned?.block));
    for (const b of blocks) b.entries = b.entries.filter((e) => !floating.includes(e));
    const target = blocks[nowIndex];
    const lastTick = target.entries.filter(isTickable).length;
    target.entries.splice(lastTick, 0, ...floating);
  }
  // All-day iPhone events (not birthdays, which get the heads-up line) show in the current or first block.
  const allDayLines = day.allDay.filter((e) => e.type === 'event' && e.event.allDay && !isBirthdayEntry(s, e)).map(toLine).filter((l): l is TodayLine => !!l);
  const allDayHome = nowIndex >= 0 ? nowIndex : phase === 'before' ? 0 : -1;

  const answers = day.record.checkin?.answers;
  const view: TodayBlock[] = blocks.map((b, i) => {
    const state: TodayBlock['state'] =
      phase === 'before' ? 'later' : phase === 'after' ? 'done' : i < nowIndex ? 'done' : i === nowIndex ? 'now' : 'later';
    const ticks = b.entries.filter(isTickable);
    const rows = ticks.map((e) => toRow(e, today, today));
    const lines = [...(i === allDayHome ? allDayLines : []), ...b.entries.map(toLine).filter((l): l is TodayLine => !!l)];
    const label = b.times.label;
    const bedtime = b.times.id === 'winddown' && b.times.end !== null ? `Bed by ${clock(b.times.end)}` : undefined;
    const summary =
      state === 'done'
        ? ticks.map(rowTitle).join(', ') || label || 'Nothing planned'
        : state === 'later'
          ? join([label, bedtime]) || (rows.length ? plural(rows.length, 'thing') : 'Nothing planned')
          : plural(rows.length, 'thing');
    let mark: TodayBlock['mark'];
    const answer = answers?.[b.times.id];
    if (answer === 'done' || answer === 'partly') mark = answer;
    else if (!answers && ticks.length > 0) {
      const done = ticks.filter((e) => e.done).length;
      mark = done === ticks.length ? 'done' : done > 0 ? 'partly' : undefined;
    }
    return {
      id: b.times.id,
      name: BLOCK_NAME[b.times.id],
      range: b.times.end === null ? clock(b.times.start) : `${clock(b.times.start)}–${clock(b.times.end)}`,
      state,
      summary,
      ...(mark ? { mark } : {}),
      rows,
      lines,
    };
  });

  const result: TodayView = {
    date: today,
    weekday: weekdayName(today),
    dateLabel: shortDate(today),
    blocksToGo: view.filter((b) => b.state !== 'done').length,
    phase,
    blocks: view,
    buddy: '',
    checkin: checkinStatus(s, today, today),
  };

  let tomorrowFirst: string | undefined;
  if (phase === 'after') {
    const next = assembleDay(s, addDays(today, 1));
    const first = next.blocks[0]?.times;
    tomorrowFirst = next.blocks.flatMap((b) => b.entries.filter(isTickable)).map(rowTitle)[0];
    if (first) result.tomorrow = join([`Tomorrow: ${BLOCK_NAME[first.id]} at ${clock(first.start)}`, tomorrowFirst]);
  }
  const heads = headsUp(s, today);
  if (heads) result.headsUp = heads;
  result.buddy = buddyLine(s, today, phase, blocks[nowIndex], view[nowIndex], view[0], tomorrowFirst, heads);
  return result;
}

function isBirthdayEntry(s: AppState, e: DayEntry): boolean {
  return e.type === 'event' && s.calendar.calendars.some((c) => c.id === e.event.calendarId && c.isBirthdays);
}

/** One short, rule-based line. It names the focus, mentions the backup, and never nags. */
function buddyLine(
  s: AppState,
  today: ISODate,
  phase: TodayView['phase'],
  current: AssembledBlock | undefined,
  currentView: TodayBlock | undefined,
  first: TodayBlock | undefined,
  tomorrowFirst: string | undefined,
  heads: string | undefined,
): string {
  if (phase === 'before') return first ? `${first.name} starts at ${first.range.split('–')[0]}. Easy start.` : 'Easy start.';
  if (phase === 'after') return tomorrowFirst ? `Day's done. Rest up. Tomorrow starts with ${tomorrowFirst}.` : "Day's done. Rest up.";
  if (!current || !currentView) return 'Your call.';

  const open = current.entries.filter(isTickable).find((e) => !e.done);
  if (open) {
    const backup = open.type === 'routine' && open.item.backup && open.item.backup.date > today ? open.item.backup.date : undefined;
    return `${rowTitle(open)} first.${backup ? ` If it slips, ${weekdayName(backup)} is the backup.` : ''}`;
  }
  if (heads?.endsWith(' is today')) return `${heads}. Maybe send a note?`;
  const loose = Object.values(s.tasks).find((t) => !t.doneAt && !t.planned && effectiveUrgency(t, today).urgency === 'now');
  if (loose) return `Room for one more? ${loose.title}.`;
  if (currentView.rows.length > 0) return `${currentView.name} is done. Nice.`;
  return current.times.label ? `${current.times.label} time.` : 'Nothing set for now. Your call.';
}
