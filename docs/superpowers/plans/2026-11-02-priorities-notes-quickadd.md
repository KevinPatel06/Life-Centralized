# Priorities, Notes and Quick Add Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The second-tier screens:
- **Priorities:** Now / Soon / Someday, tag filters and a done list.
- **Task details:** title, urgency, tag, due, start, plan it for, in progress and notes.
- **Notes:** inbox capture, Make it a task (with Undo), Make it a plan, and "On tasks & plans".
- **Quick add:** the **+** sheet that saves the text as a Note, a Task or a Plan.

**Architecture:**
- Pure rules live in `src/domain/tasks.ts` and `src/domain/notes.ts`, and the view models are tested.
- Screens render the view models and dispatch the rules through the store.
- Make it a plan and Quick add → Plan reuse the plan-4 `/plan` sheet with `title` and `fromNoteId` params.

**Tech Stack:** The plan-3 kit, plus `@react-native-community/datetimepicker` (compact date style) for due, start and planned dates.

**Spec:** `docs/superpowers/specs/2026-11-02-life-centralized-design.md` (§3.4, §3.7, §3.8, §4 Priorities, Task details, Notes).

## Global Constraints

- Tags: Trading, Health, Projects, Life. Urgency: Now / Soon / Someday, with section subtitles "Do these first", "Next week or two" and "When there's room".
- A due date moves a task to Now 7 days before. Before that, the list shows "Moves to Now on <date>". Overdue tasks show as Now and are marked overdue.
- Done tasks keep the date they were finished (history).
- **Quick add:** one text field and Note / Task / Plan buttons. It defaults to Note, and Task defaults to Soon.
- **Make it a task:**
  - The first line becomes the title and the rest the note.
  - The new task goes in Soon.
  - It shows "Now a task in Priorities · Soon" with **Undo**.
- **Make it a plan:** opens Add a plan with the text filled in. The note then reads "Turned into a plan".
- No personal data in tests or copy.

## Review Focus

1. **Make it a task, then Undo after editing the task.** Undo removes the task only if it's unchanged. Otherwise it just unlinks the note. The tests are in Task 2.
2. **Notes with only whitespace, or a one-line note made into a task.** Blank notes aren't saved, and a one-line note gives a task with an empty note. The tests are in Task 2.
3. **Planned-for labels across week boundaries:** today, tomorrow, later this week (weekday) and later than that (date). The tests are in Task 1.
4. **Clearing a due date, start date or plan in Task details** removes the field rather than storing an empty value. The tests are in Task 1.
5. **Filtering by a tag that has no open tasks** shows only the empty sections' absence and the done count for that tag. The tests are in Task 1.

---

### Task 1: Task rules and the Priorities view

**Files:** Modify `src/domain/tasks.ts` and `src/domain/tasks.test.ts`.

**Interfaces:**
- `TAGS: { id: Tag; name: string }[]` and `URGENCIES: { id: Urgency; name: string; hint: string }[]`.
- `addTask(s, input: { title: string; urgency?: Urgency; tag?: Tag; note?: string }, now): { state; id }`. Defaults: urgency `soon`, tag `life`. The title is trimmed, and an empty title is refused (the same state comes back with `id: ''`).
- `updateTask(s, id, patch: TaskPatch, now): AppState`.
  - `TaskPatch` covers `title`, `urgency`, `tag`, `inProgress`, `note`, and nullable `due`, `start` and `planned`. `null` removes a field.
  - It sets `noteUpdatedAt` when the note changes to something non-empty.
- `toggleTaskDone(s, id, now)` and `deleteTask(s, id)`.
- `plannedLabel(p: { date; block? }, today): string`:
  - "Today", "Tomorrow", the weekday short name within this week, or else `shortDate`.
  - Then " · Evening" when there's a block.
- `buildPriorities(s, today, filter: Tag | 'all'): PrioritiesView`:

```ts
export interface PriorityRow { id: string; title: string; notePreview?: string; tag: Tag; tagName: string; inProgress: boolean;
  due?: string; overdue: boolean; starts?: string; planned?: string; hasNote: boolean; bump?: string; done: boolean }
export interface PrioritiesView { open: number; inProgress: number;
  sections: { id: Urgency; name: string; hint: string; rows: PriorityRow[] }[];  // non-empty sections only
  done: PriorityRow[] }
```

- **Row fields:**
  - `due`: "Due Dec 1st" (or "Overdue · Dec 1st").
  - `starts`: shown only for a future start, as "Starts tomorrow" or "Starts Nov 5th".
  - `planned`: `plannedLabel`, shown only when the date is today or later.
  - `bump`: "Moves to Now on Nov 24th".
- **Ordering within a section:** overdue, then earliest due, then in progress, then oldest created.
- **Done list:** newest `doneAt` first.
- **Counts:** `open` and `inProgress` ignore the filter.

- [ ] **Step 1: Failing tests:**
  - **Add:** adding defaults to Soon/Life, and an empty title is refused.
  - **`updateTask`:**
    - `null` removes `due`, `start` and `planned`.
    - Changing the note sets `noteUpdatedAt`.
    - Setting the urgency keeps the other fields.
  - **`plannedLabel`** with today Wed 2026-11-04:
    - Wed is "Today", Thu evening is "Tomorrow · Evening", Sat is "Sat".
    - 2026-11-10 is "Nov 10th".
  - **`buildPriorities`:**
    - A due-in-3-days Soon task sits in Now.
    - A due-in-20-days Soon task sits in Soon with its bump label.
    - An overdue task comes first and is marked overdue.
    - The filter `trading` hides other tags, but the counts stay.
    - Done tasks are newest first.
    - A future start shows "Starts tomorrow".
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Full check.** Expected: pass.
- [ ] **Step 5: Commit:** `feat(tasks): task edits and the Priorities view`

### Task 2: Notes and quick add rules

**Files:** Create `src/domain/notes.ts` and `src/domain/notes.test.ts`.

**Interfaces:**
- `addNote(s, text, now): { state; id }`. Blank text is refused (`id: ''`).
- `deleteNote(s, id)`.
- `noteToTask(s, noteId, now): { state; taskId }` creates a Soon task.
  - Title: the first non-empty line. Note: the remaining lines, trimmed.
  - Tag `life`.
  - Sets `turnedInto`.
- `undoNoteToTask(s, noteId): AppState`.
  - Deletes the task if it's unchanged since creation (same title and note, not done).
  - Always clears `turnedInto`.
- `inboxNotes(s): Note[]`: notes without `turnedInto`, newest first.
- `attachedNotes(s, today): AttachedNote[]`:
  - `AttachedNote = { key; kind: 'task' | 'plan' | 'event'; id: string; title: string; sub: string; text: string; at: string }`.
  - It covers tasks and plans with a non-empty note, plus every `eventNotes` entry.
  - `sub` reads "Task · Trading", "Plan · Thu, Nov 5th · 8:00 PM" or "iPhone · Thu, Nov 5th".
  - Newest first, by `noteUpdatedAt ?? createdAt` (events by `updatedAt`).
- `setEventNote(s, event: ImportedEvent, text, now)`. Empty text removes the note.
- `noteWhen(iso, now): string`:
  - Same day: "Today, 2:14 PM".
  - Previous day: "Yesterday".
  - Within 6 days: the weekday name.
  - Otherwise: `shortDate`.
- `quickAdd(s, text, as: 'note' | 'task', now): { state; id }`. A note goes to the inbox. A task is Soon with tag `life`.

- [ ] **Step 1: Failing tests:**
  - **Blank text:** a note of "  " is refused.
  - **`noteToTask`:** "Line one\nLine two\n" gives title "Line one" and note "Line two". A one-line note gives an empty note. The note gets `turnedInto`.
  - **`undoNoteToTask`:** right away, it removes the task and returns the note to the inbox. After the task's title was edited, it keeps the task and still returns the note.
  - **`attachedNotes`:**
    - The order follows the timestamps.
    - The plan sub is "Plan · Thu, Nov 5th · 8:00 PM".
    - An event note appears.
    - A task with an empty note doesn't appear.
  - **`noteWhen`:** today, yesterday, a weekday 3 days back, and a date 10 days back.
  - **`setEventNote`:** setting "" deletes the note.
  - **`quickAdd`:** with `task` it makes a Soon task.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Full check.** Expected: pass.
- [ ] **Step 5: Commit:** `feat(notes): inbox notes, turning notes into tasks, attached notes, quick add`

### Task 3: Priorities and Task details screens

**Files:**
- Modify: `src/app/(tabs)/priorities.tsx` and `src/app/_layout.tsx` (register `task/[id]` as a sheet)
- Create: `src/app/task/[id].tsx`

**Interfaces:**
- **Priorities:**
  - Title "Priorities" and the sub "N open · M in progress".
  - Filter chips: All, Trading, Health, Projects, Life.
  - One rounded card list per section, with the section name, a colored dot and the hint.
  - A row:
    - A `Tick` (toggles done).
    - The title and the one-line note preview.
    - The meta chips: the tag in its color, In progress, Due, Starts, Planned (calendar icon), and a note icon when there's a note.
    - The bump line, with a chart icon.
  - A dashed "Done · N" button expands the done list.
  - Tapping a row opens `/task/<id>`.
  - Empty state: "Nothing here yet. Tap + to add a task."
- **Task details sheet:**
  - The editable title.
  - "How urgent?" as a three-way segmented control.
  - The tag chips.
  - Rows, each a compact iOS date picker plus a clear button:
    - Due date, with the sub "Moves to Now a week before" or "Optional".
    - Starts.
    - Plan it for: a date and the block chips Any time / Morning / Afternoon / Evening, with the sub "Shows up on Today".
  - The In progress switch.
  - Notes, as a large text area.
  - **Save**, which runs `updateTask` and closes.
  - **Delete task**, which asks first.

- [ ] **Step 1: Implement.**
- [ ] **Step 2: Full check and bundle check.** Expected: pass.
- [ ] **Step 3: Commit:** `feat(screens): Priorities and Task details`

### Task 4: Notes screen and Quick add

**Files:** Modify `src/app/(tabs)/notes.tsx` and `src/app/quick-add.tsx`.

**Interfaces:**
- **Notes:**
  - Title "Notes" and the sub "N in your inbox".
  - The quick-capture field with a **+** button. It saves on submit.
  - The segmented control "Inbox · N" / "On tasks & plans".
- **Inbox:**
  - Cards with the text, `noteWhen`, and two pill buttons: **Make it a task** and **Make it a plan**.
  - A long press on a card offers Delete.
  - After Make it a task, a banner shows "Now a task in Priorities · Soon" with **Undo** until the next action, or for 6 seconds.
  - Make it a plan pushes `/plan?title=<text>&fromNoteId=<id>`.
  - Empty state: "Your inbox is clear."
- **On tasks & plans:**
  - Rows with the parent icon, parent title, sub and note text.
  - Tapping opens `/task/<id>` or `/plan?id=<id>`. Event rows open nothing until plan 7.
- **Quick add:**
  - A text field (autofocus) and three buttons, Note (primary), Task and Plan.
  - Submitting the keyboard saves a Note.
  - Plan replaces the sheet with `/plan?title=<text>`.
  - Buttons stay disabled while the field is blank.

- [ ] **Step 1: Implement.**
- [ ] **Step 2: Full check and bundle check.** Expected: pass.
- [ ] **Step 3: Commit:** `feat(screens): Notes and Quick add`
