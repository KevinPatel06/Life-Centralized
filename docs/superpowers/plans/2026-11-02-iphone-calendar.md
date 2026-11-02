# iPhone Calendar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:**
- Import every iPhone calendar for this week plus 8 weeks, and let the owner keep or hide each calendar and each event.
- Re-read on launch and when the app returns to the foreground.
- Write the app's plans to a "Centralized" calendar.
- Show the birthday and anniversary heads-up on Today.
- Let notes be attached to imported events.

**Architecture:**
- **Pure rules** (`src/domain/calendar.ts`): merging a read into state, the keep choices, the screen groups, the heads-up, the times written for a plan, and the action a plan needs on the phone.
- **Phone adapter** (`src/data/phoneCalendar.ts`): a thin wrapper over the expo-calendar SDK 58 object API, using the same calls the on-device spike proved.
- **Sync orchestration** (`src/data/calendarSync.ts`): runs the adapter and dispatches the rules.

**Tech Stack:** `expo-calendar` ~58 (`getCalendarPermissions`, `requestCalendarPermissions`, `getCalendars`, `listEvents`, `createCalendar`, `ExpoCalendar.get`, `ExpoCalendarEvent.get`, `.update`, `.delete`).

**Spec:** `docs/superpowers/specs/2026-11-02-life-centralized-design.md` (§3.5 Writing to the iPhone, §3.6, §4 iPhone calendar, §4 Today heads-up, §6 history snapshots). The spike results say go.

## Global Constraints

- **Import:**
  - It reads every calendar, including Birthdays, but never the app's own "Centralized" calendar.
  - The window is this week plus 8 weeks, with recurring events expanded into occurrences.
  - An event key is `<eventId>|<occurrence start ISO>`.
- **Keeping:**
  - Everything starts kept.
  - A calendar switched off stays off. Events unchecked one at a time stay hidden by key.
  - New events in kept calendars come in on their own.
  - Unchecked events disappear right away.
- **Read-only:** imported events can't be edited in the app, but notes can be attached.
- **Centralized calendar:**
  - Plans with "Also add to iPhone calendar" on are written there.
  - Editing or deleting a plan updates or removes its event.
  - Turning the switch off removes the event.
  - Writes go one way only: nothing is pulled back.
  - A block plan is written over its block's template times for that day.
- **Heads-up:** the next kept birthday (from a Birthdays calendar) or anniversary (an all-day event with "anniversary" in the title) within 7 days. It reads "…is Thursday · in 3 days", "…is tomorrow" or "…is today".
- **History:** each sync snapshots the kept events onto this week's day records up to today.
- **No prompts:** sync never asks for permission. Only the import button on the iPhone calendar screen does.
- No calendar or event data in the repo. Tests use neutral names.

## Review Focus

1. **Permission not granted, or revoked later.** The launch sync does nothing and doesn't prompt. The screen explains how to allow access in Settings. Already-imported events stay until the next successful read. The tests are in Task 1 (`mergeImport` isn't called), and the screen handles the state.
2. **The owner deletes the Centralized calendar or the event in the Calendar app.** The next plan save recreates the calendar or the event instead of failing. The tests are in Task 1 (`planPhoneAction`), and the adapter is written to fall back.
3. **A recurring event's occurrences:** each is its own key, and hiding one doesn't hide the others. The tests are in Task 1.
4. **A plan moved to another day, or switched to "not on iPhone".** The event is updated, or deleted and its id cleared. The tests are in Task 1.
5. **A heads-up on Sunday for a birthday next Tuesday** (across the week boundary, within 7 days), and anniversaries matched case-insensitively. The tests are in Task 1.

---

### Task 1: Calendar rules

**Files:** Create `src/domain/calendar.ts` and `src/domain/calendar.test.ts`.

**Interfaces:**

```ts
export const CENTRALIZED = 'Centralized';
export interface RawCalendar { id: string; title: string; color?: string; type?: string; allowsModifications?: boolean }
export interface RawEvent { id: string; calendarId: string; title: string; startDate: string | Date; endDate: string | Date; allDay: boolean }
export function mergeImport(s: AppState, cals: RawCalendar[], events: RawEvent[], now: Date): AppState;
export function setCalendarKept(s: AppState, calendarId: string, keep: boolean): AppState;
export function setEventKept(s: AppState, key: string, keep: boolean): AppState;
export interface CalendarGroup { id: string; title: string; color: string; on: boolean; kept: number; total: number;
  events: { key: string; title: string; when: string; kept: boolean }[] }
export function calendarGroups(s: AppState): { groups: CalendarGroup[]; kept: number; total: number };
export function headsUp(s: AppState, today: ISODate): string | undefined;
export function planEventTimes(s: AppState, p: Plan): { start: Date; end: Date };
export function planPhoneAction(p: Plan): 'create' | 'update' | 'delete' | 'none';
```

- **`mergeImport`:**
  - Skips calendars titled "Centralized" and the one whose id is `settings.centralizedCalendarId`, along with their events.
  - `isBirthdays` comes from `type === 'birthdays'`, and the color defaults to `#66707C`.
  - Each event's `date` is the local date of its start.
  - Replaces `calendar.calendars` and `calendar.events`, sets `imported: true` and `syncedAt`, and keeps the keep choices.
  - Snapshots the visible events into `days[d].events` for existing records from this week's Monday through today, with `calendarTitle`.
- **`calendarGroups`:**
  - Calendars are sorted by title, and their events by start.
  - `when` reads "Thu, Nov 5th · All day" or "Thu, Nov 5th · 7:45 PM".
  - `kept` counts events that are kept and in a calendar that's on.
- **`planEventTimes`:**
  - `at`: one hour.
  - `range`: its start and end.
  - `block`: the day's block start and end. A null end means 23:59.
- **`planPhoneAction`:**
  - `addToCalendar` on: `update` when there's a `calendarEventId`, otherwise `create`.
  - Off: `delete` when there's an id, otherwise `none`.

- [ ] **Step 1: Failing tests:**
  - **`mergeImport`:**
    - It drops the Centralized calendar and its events.
    - It marks Birthdays.
    - Each occurrence of a recurring event (same id, two starts) has a distinct key.
    - Hidden keys and switched-off calendars survive a re-import.
    - It snapshots today's visible events onto today's record and not onto tomorrow.
  - **Keep choices:** `setEventKept(false)` hides only that occurrence, and `setCalendarKept(false)` hides the whole calendar from `visibleEvents`.
  - **`calendarGroups`:** the counts and the `when` labels.
  - **`headsUp`:**
    - A birthday in 3 days reads "X is Thursday · in 3 days".
    - Tomorrow and today read "is tomorrow" and "is today".
    - Sunday to Tuesday works across the week boundary.
    - An anniversary is matched case-insensitively.
    - An event 8 days out, a hidden birthday, and a non-anniversary all-day event give no heads-up.
  - **`planEventTimes`:** the `at`, `range`, `block` and Wind-down-without-end cases.
  - **`planPhoneAction`:** all four outcomes.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Full check.** Expected: pass.
- [ ] **Step 5: Commit:** `feat(calendar): import, keep choices, heads-up and plan event rules`

### Task 2: Phone adapter, sync and plan write-back

**Files:**
- Create: `src/data/phoneCalendar.ts` and `src/data/calendarSync.ts`
- Modify: `src/app/_layout.tsx` (sync on launch and foreground), `src/app/plan.tsx` (write back on save and delete), `src/domain/today.ts` and `src/domain/today.test.ts` (heads-up and the buddy's birthday line)

**Interfaces:**
- **`phoneCalendar.ts`:**
  - `permission(prompt: boolean): Promise<'granted' | 'denied' | 'undetermined'>`
  - `readPhone(start: Date, end: Date): Promise<{ cals: RawCalendar[]; events: RawEvent[] }>`
  - `ensureCentralized(knownId?: string): Promise<string>`: reuse the known calendar, else a writable calendar titled "Centralized", else create one with color `#47705A` on the default calendar's source.
  - `upsertEvent(calendarId, eventId | undefined, details): Promise<string>`: update when the event exists, otherwise create.
  - `removeEvent(eventId): Promise<void>`: ignores a missing event.
- **`calendarSync.ts`:**
  - `syncFromPhone(store, now): Promise<void>`: no-op without permission, otherwise reads `planningWindow(now)` and runs `mergeImport`.
  - `importFromPhone(store, now): Promise<'granted' | 'denied'>`: prompts, then syncs.
  - `pushPlan(store, planId): Promise<void>`:
    - Runs `planPhoneAction`. For create or update it ensures the calendar (saving `centralizedCalendarId`), upserts the event, and saves `calendarEventId`.
    - For delete it removes the event and clears the id.
    - It needs the "granted" permission and does nothing otherwise.
  - `removePlanEvent(eventId)`.
- **Today:**
  - `TodayView.headsUp?: string`.
  - The buddy gets one more rule, ahead of "Room for one more?": while `during`, with no open item and a birthday heads-up for today, it says "<heads-up>. Maybe send a note?"

- [ ] **Step 1: Failing tests** (today): `buildToday` carries `headsUp`, and the buddy uses the birthday line only when the block has nothing open.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement** the rules, then the adapter and orchestration, then the wiring. The root runs `syncFromPhone` after boot and on `'active'`. The plan sheet runs `pushPlan(id)` after a save, and `removePlanEvent` on delete when there was an id.
- [ ] **Step 4: Full check and bundle check.** Expected: pass.
- [ ] **Step 5: Commit:** `feat(calendar): phone sync on open, Centralized write-back, Today heads-up`

### Task 3: iPhone calendar screen and event notes

**Files:**
- Create: `src/app/calendar.tsx` and `src/app/event/[key].tsx`
- Modify: `src/app/settings.tsx` (the iPhone calendar row, "N events kept" or "Not imported yet"), `src/app/_layout.tsx` (register both), `src/app/(tabs)/index.tsx` (heads-up line), `src/app/(tabs)/week.tsx` (an iPhone card opens `/event/<key>`) and `src/app/(tabs)/notes.tsx` (event rows open `/event/<key>`)

**Interfaces:**
- **`/calendar`:**
  - Back to Settings, the title "iPhone calendar", and a short explanation.
  - Not imported yet: an **Import from iPhone** button. If access is denied: "Calendar access is off. Turn it on in the iPhone Settings app under Life Centralized (or LiveContainer)."
  - Imported: per calendar, a colored dot, the name, "kept of total" and a `Switch`, then its events as check rows with the title and `when`.
  - A footer: "New events in calendars you keep come in on their own. Your plans go to a calendar called Centralized, which isn't imported back."
  - A sticky **Keep N of M events** button that goes back.
- **`/event/[key]`** (sheet):
  - The event title, `when` and calendar name.
  - "Read-only. Edit it in the Calendar app."
  - A note field. Save runs `setEventNote`.
- **Today:** the heads-up line under the header (a cake icon and the text) when it's set.

- [ ] **Step 1: Implement.**
- [ ] **Step 2: Full check and bundle check.** Expected: pass.
- [ ] **Step 3: Commit:** `feat(calendar): iPhone calendar screen, event notes, heads-up line`
