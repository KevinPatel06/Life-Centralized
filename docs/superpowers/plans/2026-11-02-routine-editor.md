# Routine Editor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Settings → Routine blocks: edit the weekly template on the phone.
- Per weekday: block times and bedtime, the day label and note, block labels, routine items (title, block, time, minimum, goal, backup slot, note) and standing plans.
- Edits apply from today on. Past days keep what they had.

**Architecture:**
- Pure template edits live in `src/domain/routine.ts`.
- After each edit, `applyTemplateToToday` re-freezes today's record from the new template. It keeps the ticks of items that still exist, and it skips a day that's already checked in.
- Screens: `/routine` (one weekday at a time) and `/routine-item` (an item sheet).

**Tech Stack:** The plan-3 kit and `@react-native-community/datetimepicker` (compact time style).

**Spec:** `docs/superpowers/specs/2026-11-02-life-centralized-design.md` (§3.1, §4 Settings → Routine blocks, §6 "Template edits apply from that point on", §8: the editor UI is the builder's call, so keep it simple).

## Global Constraints

- Blocks stay contiguous and in order: Morning, Afternoon, Evening, Wind down. Changing where a block starts also moves where the previous one ends.
- Bedtime is Wind down's end, and it's optional.
- A backup slot is a weekday and block in the same week.
- Goals: Gym, Trading, Cardio, or none.
- Template edits never change past days.

## Review Focus

1. **A block start that would break the order**, e.g. Evening starting before Afternoon. It's refused and the times stay unchanged. The tests are in Task 1.
2. **Editing today's routine after ticking some items.** Ticks on items that still exist survive. A removed item's tick goes. A checked-in today isn't touched. The tests are in Task 1.
3. **Removing an item that has a pending move from an earlier day.** The move and its history stay, because moves point at the from-day's frozen record. The tests are in Task 1.
4. **A bedtime at or before Wind down's start** is refused. The tests are in Task 1.
5. **"Same times every day"** copies the block times and labels, but not the items. The tests are in Task 1.

---

### Task 1: Template edits

**Files:** Create `src/domain/routine.ts` and `src/domain/routine.test.ts`.

**Interfaces:**
- `setBlockStart(s, weekday, block: Exclude<BlockId,'morning'> | 'morning', m: Minutes): AppState`.
  - It sets `block.start = m` and the previous block's `end = m`.
  - The order must hold: previous start < m < this block's end (or the next block's start). Otherwise it returns `s`.
- `setBedtime(s, weekday, m: Minutes | null)`: must be > Wind down's start.
- `setBlockLabel(s, weekday, block, label: string)`: empty clears it.
- `setDayInfo(s, weekday, { label?: string; note?: string })`: empty strings clear.
- `sameTimesEveryDay(s, fromWeekday)`: copies blocks (times and labels) to all 7 days.
- `addItem(s, weekday, block, title): { state; id }`: trims, and refuses empty.
- `updateItem(s, weekday, id, patch: ItemPatch)`:
  - `ItemPatch` covers `title`, `block`, `time | null`, `minimum | null`, `goal | null`, `backup: Slot | null` and `note | null`.
  - `null` removes the field.
- `removeItem(s, weekday, id)` and `moveItem(s, weekday, id, dir: -1 | 1)` (within the whole list).
- `addStandingPlan(s, weekday, title, block: BlockId, kind: PlanKind): { state; id }` and `removeStandingPlan(s, weekday, id)`.
- `applyTemplateToToday(s, today)`:
  - When today's record exists and has no `checkin`, it's regenerated from the template.
  - Ticks are kept for keys that are still item ids, plus `move:` keys.
  - `events` is kept.
  - Otherwise `s` comes back unchanged.
- `editRoutine(s, today, fn)` = `applyTemplateToToday(fn(s), today)`, the one entry point the screens use.

- [ ] **Step 1: Failing tests:**
  - **Block times:**
    - Setting Evening's start to 17:30 moves Afternoon's end to 17:30.
    - Setting Evening's start to 11:00 (before Afternoon's start) returns the same state.
    - A bedtime of 21:00 with Wind down starting at 21:00 is refused. A bedtime of 23:30 sets the end, and `null` clears it.
  - **Labels and copying:**
    - `setDayInfo` with '' removes the label.
    - `sameTimesEveryDay` copies blocks but not items.
  - **Items:**
    - `addItem` with '  ' is refused.
    - `updateItem` with `{ time: null, backup: { weekday: 3, block: 'evening' } }` removes the time and sets the backup.
    - `moveItem` reorders.
  - **`editRoutine` on today:**
    - Today's record picks up a new item. The tick on a kept item survives. The removed item's tick is gone.
    - A checked-in today is unchanged.
    - Yesterday is unchanged.
  - **Moves:** removing an item that has a move from Monday keeps the move, and `assembleDay` on its to-day still shows it.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Full check.** Expected: pass.
- [ ] **Step 5: Commit:** `feat(routine): template edits that apply from today on`

### Task 2: Routine screens

**Files:**
- Create: `src/app/routine.tsx` and `src/app/routine-item.tsx`
- Modify: `src/app/settings.tsx` (a "Routine blocks" row, "Mon – Sun", that pushes `/routine`) and `src/app/_layout.tsx` (register both, `routine-item` as a sheet)

**Interfaces:**
- **`/routine`:**
  - Back to Settings, the title "Routine blocks", and a 7-day chip row (M … S) for the weekday.
  - For that day:
    - The day label and day note fields, saved on blur.
    - The block list. Each row has the name, its start time (a compact time picker, with Morning's start editable too) and an optional label field. Wind down also has a Bedtime row with Set and Clear.
    - "Use these times every day", which asks first.
  - For each block, its items: tapping one opens `/routine-item?weekday=&id=`, and an "Add to <Block>" field adds a new one.
  - Standing plans: a list with remove buttons, and "Add a standing plan" (a title plus Morning / Afternoon / Evening chips).
- **`/routine-item`** (sheet):
  - Title, block chips, Time (Set / compact picker / Clear), Minimum (text), and the goal chips None / Gym / Trading / Cardio.
  - Backup slot: None, or day chips plus block chips.
  - Note.
  - Save, and Remove item (which asks first).
- Every edit goes through `editRoutine(s, today, fn)`.

- [ ] **Step 1: Implement.**
- [ ] **Step 2: Full check and bundle check.** Expected: pass.
- [ ] **Step 3: Commit:** `feat(routine): Routine blocks editor in Settings`
