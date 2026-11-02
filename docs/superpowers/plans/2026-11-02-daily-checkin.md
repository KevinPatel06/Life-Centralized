# Daily Check-in Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The once-a-day check-in the owner starts with **End my day** on Today, or with the **Check in** marker next to a day on Week. It covers Done / Partly / Skipped per block, a tick per item, and Move or Skip for missed items that have a backup slot. It writes the outcome to history.

**Architecture:**
- `src/domain/checkin.ts` is pure. It builds a draft from the assembled day, edits the draft, and saves it, which writes ticks, outcomes, moves, done tasks and cleared plans.
- How a check-in is started is kept apart from its logic, so another trigger can be added later (spec §3.3).
- The sheet route `/checkin/[date]` renders the draft.

**Tech Stack:** The plan-3 UI kit and the plan-4 `assembleDay`.

**Spec:** `docs/superpowers/specs/2026-11-02-life-centralized-design.md` (§3.3, §4 Check-in, §4 Today's "End my day", §4 Week check-in marker, §11).

## Global Constraints

- **One check-in per day, started only by the owner.** There are no pop-ups and no notifications.
- **What it covers:** blocks with something to tick, except Wind down.
- **Answers and ticks stay in sync.** All ticked means Done, none means Skipped, otherwise Partly. Choosing Done ticks everything, Skipped unticks everything, and Partly sets a mixed state.
- **Unticked item with a backup slot:**
  - Prompt: "Move to <Day>" / "Skip this week".
  - Move is offered only while the backup date is today or later. Otherwise only Skip is offered, labelled "Backup has passed".
  - **Save stays disabled until every prompt is answered.**
- **An item already in its backup slot, missed again:** skipped with no prompt. It never moves twice.
- **Unticked items with no backup slot:**
  - Routine items are recorded as `missed`.
  - Tasks stay open, their `planned` is cleared, and their urgency is kept.
- **Reopening:** a checked-in day can be reopened while it's in the current week. Changing a Move to Skip removes that move and any tick on it.
- Nothing is moved, skipped or marked missed before the owner saves.

## Review Focus

1. **Reopening and changing an answer:**
   - Move then Skip removes the moved item from the backup day.
   - Move then Move again doesn't duplicate it.
   - A task unplanned by the first check-in and ticked on reopening becomes done.
   - The tests are in Task 1.
2. **Checking in an earlier day after its backup day has passed**, e.g. Monday checked in on Friday with a Thursday backup. Only Skip is offered. The tests are in Task 1.
3. **A moved item missed again** gets the outcome `skipped` with no prompt. The tests are in Task 1.
4. **Days with nothing to tick, and Wind-down-only items.** The check-in has no sections and saves straight away as "Checked in · 0 of 0 done". The tests are in Tasks 1 and 2.
5. **Future days and other weeks.** No marker is shown and the check-in can't be opened. The tests are in Task 2.

---

### Task 1: Check-in model

**Files:** Create `src/domain/checkin.ts` and `src/domain/checkin.test.ts`.

**Interfaces:**

```ts
export interface CheckinItem { key: string; title: string; kind: 'routine' | 'moved' | 'task';
  prompt: 'none' | 'move-or-skip' | 'skip-only' | 'stays-in-priorities'; backup?: { date: ISODate; block: BlockId; label: string } }
export interface CheckinSection { block: BlockId; name: string; range: string; items: CheckinItem[] }
export interface CheckinDraft { date: ISODate; ticked: Record<string, boolean>; decisions: Record<string, 'move' | 'skip'> }
export interface CheckinView { date: ISODate; title: string; dateLabel: string; reopening: boolean; sections: CheckinSection[] }
export function canOpenCheckin(s: AppState, date: ISODate, today: ISODate): boolean;   // date in today's week, ≤ today
export function buildCheckin(s: AppState, date: ISODate, today: ISODate): { view: CheckinView; draft: CheckinDraft };
export function answerOf(section: CheckinSection, d: CheckinDraft): BlockAnswer;
export function setAnswer(section: CheckinSection, d: CheckinDraft, a: BlockAnswer): CheckinDraft;
export function toggleItem(d: CheckinDraft, key: string): CheckinDraft;
export function decide(d: CheckinDraft, key: string, choice: 'move' | 'skip'): CheckinDraft;
export function promptOf(item: CheckinItem, d: CheckinDraft): CheckinItem['prompt'];  // 'none' when ticked
export function canSaveCheckin(view: CheckinView, d: CheckinDraft): boolean;
export function saveCheckin(s: AppState, view: CheckinView, d: CheckinDraft, now: Date): AppState;
```

- **`title`:** "How did today go?" when `date === today`, otherwise "How did Monday go?".
- **Sections:** the blocks other than Wind down that have at least one tickable entry from `assembleDay`, in block order. When reopening, the day's `checkin.unplannedTasks` come back as task items in the Morning section (that section is created if missing).
- **Item prompt:**
  - Routine with a backup: `move-or-skip` if `backup.date >= today` and `backup.date > date`, otherwise `skip-only`. `label` is the weekday short name.
  - Routine without a backup, or a moved item: `none`.
  - Task: `stays-in-priorities`.
- **Initial draft:**
  - Ticks come from the day record, and tasks from `doneAt`.
  - Decisions are empty. When reopening, the previous outcomes `moved` / `skipped` become `move` / `skip`.
- **`setAnswer`:**
  - `done` ticks all items and `skipped` unticks all.
  - `partly`: if every item is ticked, it unticks the last one. If none are ticked, it ticks the first. Otherwise nothing changes.
- **`canSaveCheckin`:** every unticked item whose prompt is `move-or-skip` or `skip-only` has a decision. A `skip-only` item accepts only `skip`.
- **`saveCheckin`:**
  - **Day record:** ticks are set (with `now`) or cleared for routine and `move:` keys. `checkin = { at, answers, outcomes, unplannedTasks }`, and `notCheckedIn` is removed.
  - **Outcomes:**
    - Ticked: `done`.
    - Routine plus `move`: `moved`. A `Move` is created to the backup date and block, unless one already exists for the same from-date and item.
    - Routine plus `skip`: `skipped`.
    - Routine with no prompt: `missed`.
    - Moved item, unticked: `skipped`.
    - Tasks get no outcome.
  - **Moves:** a move made earlier from this date and item that's now decided `skip` (or ticked) is deleted, along with its tick on the to-day.
  - **Tasks:**
    - Ticked: `doneAt = now` if it wasn't set.
    - Unticked: `planned` is removed, and the id goes in `unplannedTasks`.
- `canOpenCheckin` is false for future dates and dates outside today's week.

- [ ] **Step 1: Failing tests.** Use the `routineState` fixture: Monday has `m` (no backup) and `e` (backup Thursday evening).
  - On Monday, Monday's view has sections [Morning, Evening]. `e` has prompt `move-or-skip` with label "Thu", and the title is "How did today go?".
  - On Friday, Monday's `e` is `skip-only` and the title is "How did Monday go?".
  - `answerOf` and `setAnswer` stay in sync for done, skipped and partly.
  - `canSaveCheckin` is false until `e` is decided, and true after `decide(e,'move')`.
  - Saving with `m` ticked and `e` moved:
    - Outcomes are `{m:'done', e:'moved'}`.
    - One move goes to 2026-11-05 evening.
    - The day has `checkin` and the answers `{morning:'done', evening:'skipped'}`.
  - Reopening and deciding `skip` deletes that move and its tick on Thursday.
  - Saving the same day twice with `move` leaves exactly one move.
  - On Thursday, the moved item unticked is outcome `skipped` with no prompt.
  - A planned task left unticked loses `planned` and is listed in `unplannedTasks`. On reopening it's ticked, and saving sets `doneAt`.
  - A day with only Wind-down items has no sections, saves, and gets empty outcomes.
  - `canOpenCheckin`: false for tomorrow and for last Sunday, true for Monday when today is Wednesday.
- [ ] **Step 2: Run** `node node_modules/jest/bin/jest.js src/domain/checkin`. Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Full check.** Expected: pass.
- [ ] **Step 5: Commit:** `feat(checkin): daily check-in model with backup moves, skips and reopening`

### Task 2: Markers on Week and the End my day state

**Files:** Modify `src/domain/week.ts`, `src/domain/week.test.ts`, `src/domain/today.ts` and `src/domain/today.test.ts`. Create `checkinStatus` in `src/domain/checkin.ts`.

**Interfaces:**
- `checkinStatus(s, date, today): { state: 'none' } | { state: 'pending' } | { state: 'done'; summary: string }`.
  - `none` when `canOpenCheckin` is false.
  - The summary reads "Checked in · N of M done": N is the outcomes equal to `done`, plus done tasks; M is all outcomes plus done tasks.
- `WeekDay.checkin` and `TodayView.checkin` get this value.

- [ ] **Step 1: Failing tests:**
  - Status by day, with today Wednesday: Monday is pending; Thursday and last week are none; a checked-in Tuesday reads "Checked in · 1 of 2 done".
  - `buildWeek` days and `buildToday` carry the status.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Full check.** Expected: pass.
- [ ] **Step 5: Commit:** `feat(checkin): check-in markers for Week and Today`

### Task 3: Check-in sheet, End my day and Week markers

**Files:**
- Create: `src/app/checkin/[date].tsx`
- Modify: `src/app/_layout.tsx` (register the sheet), `src/app/(tabs)/index.tsx` and `src/app/(tabs)/week.tsx`

**Interfaces:**
- **Sheet:**
  - The buddy, the title, and the date ("Nov 2nd").
  - Per section:
    - The block name and range.
    - Done / Partly / Skipped in one row.
    - The items with `Tick`.
    - Under an unticked item, its prompt:
      - Two pills, "Move to Thu" and "Skip this week".
      - Or "Backup has passed" with a single "Skip this week" pill.
      - Or the muted line "No backup slot, so it stays in Priorities".
  - **Save** is disabled until `canSaveCheckin`. It runs `saveCheckin` and closes.
  - If there are no sections: "Nothing to tick today." and Save.
- **Today:** below the blocks, an **End my day** button (outlined pill) when the status is `pending`. When it's `done`, a small row with a check and the summary. Either opens `/checkin/<date>`.
- **Week:** in each day header, an amber "Check in" pill (the Now chip colors) when the status is `pending`, or a small muted summary chip when `done`. Either opens `/checkin/<date>`.

- [ ] **Step 1: Implement.**
- [ ] **Step 2: Full check and bundle check.** Expected: pass.
- [ ] **Step 3: Commit:** `feat(checkin): check-in sheet, End my day, and Week markers`
