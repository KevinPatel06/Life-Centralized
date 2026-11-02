# Today, Week and Add a Plan Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The three core screens:
- **Today:** the current block in full, everything else compact, and the buddy line.
- **Week:** 8 weeks ahead, with goals, plans and ticks.
- **Add a plan:** quick picks, a day picker and the time panel. It also edits and deletes existing plans.

**Architecture:**
- One pure "day assembly" function decides what belongs in each block of a date:
  - routine items, moved-in items and planned tasks
  - one-off plans, recurring plans and kept iPhone events
- Today, Week and (next plan) Check-in all read it.
- View models (`buildToday`, `buildWeek`) turn it into display rows.
- Screens render those rows and dispatch pure actions through the store.

**Tech Stack:** Expo Router, `@react-native-community/datetimepicker` (iOS spinner), the plan-3 UI kit.

**Spec:** `docs/superpowers/specs/2026-11-02-life-centralized-design.md`, §3.1, §3.2, §3.4 (planned tasks, the 7-day bump), §3.5 and §4 (Today, Week, Add a plan). The mockup is the visual reference.

## Global Constraints

- **Today shows no countdowns, no time-left bars and no goal pills.**
  - Finished blocks collapse to one dashed line, the current block is expanded, and later blocks are compact cards.
- Header: weekday, then "Nov 2nd · **N blocks to go**" (current plus later blocks).
- The buddy speaks one short, rule-based line and never nags. It never says it will move something.
- Ticking is allowed for today and earlier days of the current week. Future days are read-only, and so are checked-in days (reopen the check-in to change them).
- Plans can be added from this week up to 8 weeks ahead. Quick picks: Lunch → Afternoon, Dinner → Evening, Hangout → Evening. Typing a custom title clears the pick. "Also add to iPhone calendar" is on by default.
- A planned task is treated as Now from 7 days before its due date. The stored urgency doesn't change.
- Time formats:
  - Block ranges: "6:00–9:00"
  - Plan and event times: "7:45 PM"
  - Time ranges: "8:00 – 11:00 PM"
  - Dates: "Nov 2nd"
- Run checks with `bash .superpowers/check.sh`, plus the iOS bundle export.

## Review Focus

1. **Items at block edges:**
   - A plan at exactly 6:00 PM belongs to Evening, not Afternoon.
   - A plan before the first block goes to Morning, and one after bedtime goes to Wind down.
   - A range plan is placed by its start time.
   - The tests are in Task 2.
2. **Moved items:**
   - An item moved into a day shows there with "Moved from Mon", and ticking it there counts once toward goals.
   - The original stays unticked.
   - The tests are in Tasks 2 and 3.
3. **Viewing a future week or a future day:**
   - The days are generated from the current template without being saved, and ticks are refused.
   - Goal counts show 0 in future weeks.
   - The tests are in Task 4.
4. **Hidden and switched-off iPhone events** never appear. Birthday events stay out of Today's blocks; the heads-up line handles them in plan 7. The tests are in Task 2.
5. **Saving a plan with no title or no time chosen.** Save stays disabled. Editing a plan keeps its id and calendar event id. The tests are in Task 6.

---

### Task 1: Formatting

**Files:** Modify `src/lib/format.ts`. Create `src/lib/format.test.ts`.

**Interfaces:**
- `clock(m: Minutes): string` gives "6:00" and "12:30" (12-hour, no suffix).
- `clockAmPm(m): string` gives "7:45 PM", "12:00 PM" and "12:00 AM".
- `blockRange(b: BlockTimes): string` gives "6:00–9:00" with an en dash and no spaces. A null end gives just the start, "9:00".
- `timeRange(a, b): string` gives "8:00 – 11:00 PM", or "11:00 AM – 1:00 PM" when the suffixes differ.
- `whenLabel(w: When): string`: a block gives its name ("Evening"), `at` gives `clockAmPm`, and `range` gives `timeRange`.
- `ordinal(n): string`: 1st 2nd 3rd 4th 11th 12th 13th 21st 22nd 23rd.
- `shortDate(d: ISODate): string` gives "Nov 2nd".
- `weekdayName(d)` gives "Monday", `weekdayShort(d)` gives "Mon" and `weekdayLetter(d)` gives "M".
- `BLOCK_NAME: Record<BlockId, string>`: Morning, Afternoon, Evening, Wind down.
- `weekTitle(offset: number)` gives "This week", "Next week" or "In N weeks".
- `weekRange(start: ISODate)` gives "Nov 2 – 8", or "Nov 30 – Dec 6" across a month.

- [ ] **Step 1: Failing tests.** One test per function, covering every example above, plus 12:00 PM, 12:00 AM and 11th–13th.
- [ ] **Step 2: Run** `node node_modules/jest/bin/jest.js src/lib/format`. Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Full check.** Expected: pass.
- [ ] **Step 5: Commit:** `feat(format): times, dates and labels used across the app`

### Task 2: Day assembly

**Files:** Create `src/domain/day.ts`, `src/domain/day.test.ts`, `src/domain/tasks.ts` and `src/domain/tasks.test.ts`.

**Interfaces:**
- `src/domain/tasks.ts`:
  - `effectiveUrgency(t: Task, today: ISODate): { urgency: Urgency; overdue: boolean; bumpOn?: ISODate }`.
    - Due within 7 days or past due: `now`, with `overdue` when it's past.
    - Stored urgency isn't `now` and the bump is still ahead: `bumpOn = due − 7`.
- `src/domain/day.ts`:
  - `dayRecordFor(s: AppState, date: ISODate): DayRecord` is the stored record, or one generated from the current template (not saved).
  - `visibleEvents(s: AppState, date: ISODate): ImportedEvent[]` gives the cached events on that date. It drops events in `offCalendars` and keys in `hidden`. Order: all-day first, then by start.
  - `isBirthday(s, e: ImportedEvent): boolean` is true when the event's calendar has `isBirthdays`.
  - `interface DayEntry`: a row in a block, tickable or not.

```ts
export type DayEntry =
  | { type: 'routine'; key: string; item: DayItem; done: boolean }                         // key = item.id
  | { type: 'moved'; key: string; item: DayItem; move: Move; done: boolean }               // key = `move:<id>`
  | { type: 'task'; key: string; task: Task; done: boolean }                               // key = `task:<id>`
  | { type: 'plan'; key: string; plan: Plan; sort: number }                                // key = `plan:<id>`
  | { type: 'recurring'; key: string; plan: TemplatePlan; sort: number }                   // key = `rec:<id>`
  | { type: 'event'; key: string; event: ImportedEvent; sort: number };                    // key = `event:<key>`
export interface AssembledBlock { times: BlockTimes; entries: DayEntry[] }
export function assembleDay(s: AppState, date: ISODate): { record: DayRecord; blocks: AssembledBlock[]; allDay: DayEntry[] };
```

- **Placement rules:**
  - Routine items go in their block.
  - A moved item goes in `move.toBlock`, with its item taken from the from-day's record.
  - A task planned for `{date, block}` goes in that block. A task planned for the date only goes in Morning (the Today view lifts it into the current block).
  - Plans and recurring plans:
    - A `block` When goes in that block.
    - An `at` or `range` When is placed with `blockAt` on its start, where `before` means Morning and `after` means Wind down.
  - Events: timed ones by their local start minute. All-day ones go to `allDay`.
  - Birthday events go only to `allDay`.
- **Sorting:** tickable entries keep their order: routine items in template order, then moved items, then tasks. Plans and events are sorted by `sort` (start minute, with block plans at the block's start).

- [ ] **Step 1: Failing tests:**
  - `effectiveUrgency`:
    - Due in 8 days: stored urgency, with `bumpOn` = due − 7.
    - Due in 7 days: now.
    - Due yesterday: now and overdue.
    - No due date: stored urgency.
  - `assembleDay`:
    - An `at` 18:00 plan lands in Evening, 5:00 in Morning and 23:30 in Wind down when the bedtime is 23:00.
    - A range plan 17:30–19:00 lands in Afternoon.
    - A moved item lands in its toBlock with key `move:m1`. Its `done` follows the to-day's ticks.
    - A task planned for date+evening lands in Evening. A task planned for the date only lands in Morning.
    - A future date with no record uses the template, and `s.days` is unchanged.
  - `visibleEvents` drops hidden keys and switched-off calendars, and sorts all-day first.
  - A birthday event never lands in a block.
- [ ] **Step 2: Run** `node node_modules/jest/bin/jest.js src/domain/day src/domain/tasks`. Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Full check.** Expected: pass.
- [ ] **Step 5: Commit:** `feat(day): assemble each date's blocks from routine, moves, tasks, plans and events`

### Task 3: Today view model, buddy line and ticking

**Files:** Create `src/domain/today.ts`, `src/domain/today.test.ts`, `src/domain/ticks.ts` and `src/domain/ticks.test.ts`.

**Interfaces:**
- `src/domain/ticks.ts`:
  - `canTick(s, date: ISODate, today: ISODate): boolean` is true when the date is in today's week, on or before today, and not checked in.
  - `toggleEntry(s, date: ISODate, key: string, now: Date): AppState`:
    - For a routine item or `move:` key: set or clear `days[date].ticks[key]`, using `now.toISOString()`.
    - For a `task:` key: set or clear `tasks[id].doneAt`.
    - Returns `s` itself when `canTick` is false.
- `src/domain/today.ts`:

```ts
export interface TodayRow { key: string; title: string; subtitle?: string; done: boolean; chip: 'routine' | 'now' | 'soon' | 'someday' }
export interface TodayLine { key: string; time: string; title: string; source: 'plan' | 'iphone'; kind: PlanKind | 'event'; planId?: string }
export interface TodayBlock { id: BlockId; name: string; range: string; state: 'done' | 'now' | 'later';
  summary: string; mark?: 'done' | 'partly'; rows: TodayRow[]; lines: TodayLine[] }
export interface TodayView { date: ISODate; weekday: string; dateLabel: string; blocksToGo: number;
  phase: 'before' | 'during' | 'after'; blocks: TodayBlock[]; buddy: string; tomorrow?: string }
export function buildToday(s: AppState, now: Date): TodayView;
```

- **Block states:** at `blockAt(now)`, earlier blocks are `done`, the current one is `now` and later ones are `later`. In `before` all are later; in `after` all are done.
- **`summary`:**
  - For a done block: its tickable titles joined with ", ", or else its `label`, or else "Nothing planned".
  - For a later block: its `label` and, for Wind down with an end time, "Bed by 11:00", joined with " · ".
  - Otherwise: the item count, as "3 things".
- **`mark`:** taken from the check-in answers if there are any. Otherwise every tickable entry ticked gives `done`, some ticked gives `partly`, and none gives no mark.
- **Planned tasks:** tasks planned for the date only are moved into the `now` block while `during`.
- **Row subtitles**, parts joined with " · ":
  - Routine rows: the time (`clock`), the minimum, the note and "Backup is <Weekday>".
  - Moved rows: "Moved from <Mon>".
  - Task rows: the first line of the note.
- **Task chip:** the effective urgency.
- **The buddy line**, first match wins:
  1. `before`: "<First block> starts at <clock>. Easy start."
  2. `after`: "Day's done. Rest up." When there's a tomorrow record or template, "Tomorrow starts with <first item title or block name>." is appended.
  3. `now` block with an unticked row: "<title> first." With a backup it adds " If it slips, <Weekday> is the backup."
  4. `now` block all ticked or empty, and an unplanned task whose effective urgency is Now exists: "Room for one more? <task title>."
  5. `now` block all ticked: "<Block> is done. Nice."
  6. `now` block empty: its label plus " time." (e.g. "Work time."), else "Nothing set for now. Your call."
- **`tomorrow`**, shown in `after`: "Tomorrow: Morning at 6:00 · <first item title>".

- [ ] **Step 1: Failing tests:**
  - `canTick`:
    - Allowed: today, earlier this week.
    - Refused: tomorrow, last week, and checked-in days.
  - `toggleEntry`:
    - It ticks and unticks a routine item and a `move:` key.
    - It marks a task done and not done.
    - It returns the same state for a future date.
  - `buildToday` at Monday 18:40 with the seed-like fixture (routine morning item ticked, an evening item with a Thursday backup, a 19:45 iPhone event and a planned Now task in Evening):
    - Header: weekday "Monday", dateLabel "Nov 2nd", blocksToGo 2.
    - Block states: done, done, now, later.
    - Morning mark is "done".
    - Evening rows: [routine, task]. Its line: "7:45 PM", source "iphone".
    - Buddy: "Item E first. If it slips, Thursday is the backup."
  - At 5:00, the phase is `before` and the buddy says Morning starts at 6:00.
  - At 23:30 with a 23:00 bedtime, the phase is `after` and `tomorrow` is set.
  - With everything ticked and an unplanned Now task, the buddy suggests it.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Full check.** Expected: pass.
- [ ] **Step 5: Commit:** `feat(today): today's view model, buddy line and ticking rules`

### Task 4: Week view model

**Files:** Create `src/domain/week.ts` and `src/domain/week.test.ts`.

**Interfaces:**

```ts
export interface WeekRow { key: string; title: string; subtitle?: string; done: boolean; tickable: boolean }
export interface WeekCard { key: string; time: string; title: string; kind: PlanKind | 'event' | 'birthday'; source: 'plan' | 'iphone' | 'routine'; planId?: string; eventKey?: string }
export interface WeekDay { date: ISODate; letter: string; dayNum: number; name: string; dateLabel: string; isToday: boolean;
  label?: string; note?: string; backupTags: string[]; hasPlans: boolean; cards: WeekCard[]; rows: WeekRow[] }
export interface WeekView { offset: number; title: string; range: string; start: ISODate; days: WeekDay[];
  goals: { id: GoalId; name: string; count: number; target: number }[] }
export const MAX_WEEK_OFFSET = 8;
export function buildWeek(s: AppState, now: Date, offset: number): WeekView;
```

- `offset` is clamped to 0–8.
- **Cards:** all-day first ("All day"), then by time. Plans use `whenLabel`, events use `clockAmPm` or "All day", and birthday events get kind `birthday`.
- **`backupTags`:** for every item in this week's records whose backup date is this day, "<item title> backup".
- **Rows:** routine, moved and planned tasks. `tickable` comes from `canTick`.
- **`goals`:** the current week uses `goalCounts`. Future weeks are 0.

- [ ] **Step 1: Failing tests:**
  - Offsets: offset 0 is "This week" / "Nov 2 – 8", and offset 9 clamps to 8, "In 8 weeks".
  - Cards: a day with an all-day event and a 20:00 plan lists the all-day one first.
  - Backup tags: Thursday shows "Item E backup".
  - Ticking: in the current week, Tuesday rows (today Wed) are tickable and Thursday rows aren't. Every row of next week is untickable.
  - Goals: next week's goals are 0, and future days don't add records to `s.days`.
  - `hasPlans` is true for a day with only a recurring plan.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Full check.** Expected: pass.
- [ ] **Step 5: Commit:** `feat(week): week view model with goals, cards, ticks and backup tags`

### Task 5: Today and Week screens

**Files:**
- Modify: `src/app/(tabs)/index.tsx` and `src/app/(tabs)/week.tsx`, plus `src/app/_layout.tsx` (the clock).
- Create: `src/ui/useNow.ts`, `src/ui/blocks.tsx` (Today block pieces) and `src/ui/weekParts.tsx`.

**Interfaces:**
- `useNow(intervalMs = 30000): Date` re-renders on the interval. The root layout also runs `refreshDay` when the local date changes, so a day rolls over even if the app stays open.
- **Today:**
  - The header from the view model, with the gear.
  - Finished blocks are dashed lines with a dot, name, summary and a check mark for `done`.
  - The current block has the "NOW" kicker, name, range, rows (a `Tick` plus chip) and lines (time in bold, then the title, then "iPhone calendar" for events).
  - Later blocks are compact cards with an icon, name, summary and range.
  - Then the buddy and its bubble.
  - Before the first block or after Wind down, the `tomorrow` line shows under the blocks.
  - Ticking calls `toggleEntry`.
  - Tapping a plan line opens `/plan?id=<planId>`.
- **Week:**
  - Sticky header:
    - ‹ › arrows with the title and range.
    - The 7-day strip: letter, date number and a dot when the day has plans. Today is highlighted. Tapping a day scrolls to it.
  - Goal pills: the three in one row, each with a thin progress bar.
  - Days with no boxes around them, separated by a 2px line. Each day header has:
    - the day, date, a "Today" tag and the label tag
    - a **+** that pushes `/plan?date=<date>`
  - Then the note and backup tags, the cards (tapping a plan opens `/plan?id=`), and the rows as ticks (disabled when not tickable).

- [ ] **Step 1: Implement** the screens from the view models, following the mockup's markup and CSS for these screens.
- [ ] **Step 2: Full check and bundle check.** Expected: pass.
- [ ] **Step 3: Commit:** `feat(screens): Today and Week`

### Task 6: Add a plan

**Files:** Create `src/domain/plans.ts`, `src/domain/plans.test.ts` and `src/app/plan.tsx`. Modify `src/app/_layout.tsx` to register `plan` as a sheet with `sheetAllowedDetents: [1]`.

**Interfaces:**
- `QUICK_PICKS`: Lunch/lunch/afternoon, Dinner/dinner/evening and Hangout/hangout/evening.
- `interface PlanDraft { title: string; kind: PlanKind; date: ISODate; when: When | null; note: string; addToCalendar: boolean }`
- `newDraft(date: ISODate, title = ''): PlanDraft`. `when` starts as null and `addToCalendar` as true.
- `draftFromPlan(p: Plan): PlanDraft`
- `pickQuick(d, pick): PlanDraft` sets the title, kind and suggested `when`.
- `typeTitle(d, text): PlanDraft`. If the text no longer equals the picked title, the kind becomes `other`.
- `canSavePlan(d, today): boolean`: the title is non-empty after trimming, `when` is set, and the date runs from this week's Monday through the planning window end (63 days, exclusive). A range must have end > start.
- `savePlan(s, d, now, id?): { state: AppState; id: string }`. It creates a plan, or updates one while keeping `id`, `createdAt` and `calendarEventId`. It sets `noteUpdatedAt` when the note changed and isn't empty. With `fromNoteId`, the note gets `turnedInto: {kind:'plan', id}`.
- `deletePlan(s, id): AppState`
- **Sheet** (`/plan`; params: `id?`, `date?`, `title?`, `fromNoteId?`):
  - "What's the plan?", the quick picks in one row, then a text field ("Or type your own").
  - **Day:** ‹ › week arrows (0–8) and a 7-day picker. Past days this week are disabled.
  - **When:** Morning / Afternoon / Evening in one row, then a full-width clock button.
    - The clock button shows the chosen time, or "Pick a time".
    - It opens the time panel: an "At a time" / "From – to" segmented control and an iOS spinner (two spinners for From – to).
  - The "Also add to iPhone calendar" switch and a Note field.
  - **Add plan** (or **Save** when editing). When editing there's also a **Delete plan** text button, which asks first.

- [ ] **Step 1: Failing tests:**
  - `pickQuick` Dinner sets the evening block and kind dinner. Typing "Dinner at home" sets kind `other` and keeps `when`.
  - `canSavePlan` is false without a title, without `when`, for a date 63 days past Monday, for last week, and for a range with end ≤ start.
  - `savePlan` creates a plan with a new id. Editing keeps the id, `createdAt` and `calendarEventId`. With `fromNoteId`, the note is marked turned into a plan.
  - `deletePlan` removes it.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement** the pure functions, then the sheet.
- [ ] **Step 4: Full check and bundle check.** Expected: pass.
- [ ] **Step 5: Commit:** `feat(plans): add, edit and delete plans with quick picks and the time panel`
