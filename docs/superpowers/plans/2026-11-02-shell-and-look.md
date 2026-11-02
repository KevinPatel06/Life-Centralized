# App Shell and Look Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the spike with the real app frame:
- Expo Router tabs (Today · Priorities · + · Week · Notes)
- The data store booted on launch and refreshed on return to the foreground
- The theme system and bundled Fredoka and Lexend fonts
- The buddy and shared UI pieces
- A working Settings screen: theme, Dark Mode switch, weekly goals, back up, and restore (which is how the owner's seed gets onto the phone)

**Architecture:**
- Routes live in `src/app/`, per AGENTS.md.
- The root layout loads fonts, opens the database, builds the store and runs `startOfDay`.
- Themes are pure token tables resolved from settings plus the system color scheme. `useTheme()` exposes them.
- Every rule lives in a tested pure function. Screens only render and dispatch.

**Tech Stack:**
- expo-router ~58, react-native-screens, react-native-safe-area-context
- expo-font with @expo-google-fonts/fredoka and @expo-google-fonts/lexend (font files are bundled, so there's no network loading)
- react-native-svg

**Spec:** `docs/superpowers/specs/2026-11-02-life-centralized-design.md` (§4 Tab bar and Settings, §5, §6 Backup). The mockup's CSS (`.superpowers/brainstorm/today-styles-v7.html`, local only) is the visual reference.

## Global Constraints

- No personal data in the repo. UI copy must be generic.
- Theme tokens are exactly the spec §5 tables, plus the mockup's derived tokens. Default: Linen + Sage. All 8 pairs are allowed.
- "Use Charcoal in Dark Mode" is off by default. When it's on and the iPhone is in Dark Mode, the background is Charcoal and the chosen card color stays.
- Touch targets are 44pt or larger. Cards have a 20–26 radius and pills are fully round.
- Respect Reduce Motion: use no animations beyond the system defaults.
- Fonts: Fredoka for display, Lexend for body. With static font files, pick the family by weight.
- Run checks with `bash .superpowers/check.sh`. Bundle check: in PowerShell, `npx expo export --platform ios --output-dir dist`, then delete `dist`.

## Review Focus

1. **Restoring the wrong file, or cancelling:** the spike JSON, a newer backup, or a cancelled picker. The current data must be untouched, and the owner sees the plain error. The tests are in Task 3 (`restoreFlow`).
2. **Dark Mode switch combinations:** switch on with a light system, switch on with a dark system, and switch off with a dark system. Charcoal applies only in the second case, and Charcoal + Cocoa uses the darker card override. The tests are in Task 1.
3. **Coming back to the app after midnight or after a new week starts:** the foreground refresh must open the new day and close the old week. The tests are in Task 2 (`refreshDay`).
4. **Goal targets typed out of range.** Each is clamped to 0–14, a whole number. The tests are in Task 3.
5. **The first launch on an empty database:** the app opens on Today with an empty routine, and nothing crashes before a restore. Covered in Task 2 (`bootState` on an empty db) and by the bundle check.

---

### Task 1: Theme tokens

**Files:** Create `src/ui/theme.ts` and `src/ui/theme.test.ts`.

**Interfaces:**
- `interface Theme`. These are color strings unless noted:
  - Background: `bg`, `onBg`, `onBgMuted`, `bgLine`, `doneLine`, `doneCheck`, `bubbleBg`, `bubbleInk`, `dark: boolean`
  - Cards: `card`, `ink`, `muted`, `line`, `nowBg`, `nowRing`, `nowKicker`, `icBg`, `taskBg`, `fieldBg`
  - Category colors: `cat: Record<'trade'|'love'|'free'|'wind'|'work'|'warm', string>`
  - Chips: `chipNowBg`, `chipNowInk`, `chipSomeBg`, `chipSomeInk`, `chipRtBg`, `chipRtInk`
  - Pills and ticks: `pillBg`, `pillInk`, `pillMuted`, `miniTrack`, `tick`, `tickOn`, `tickMark`
  - Tab bar and buttons: `tabBg`, `tabInk`, `tabOn`, `fabBg`, `fabInk`
  - Fixed values: `accent` (= `nowRing`), `nowChip` (`#F2B04A`), `nowChipInk` (`#2A1C00`)
- `BACKGROUNDS: { id: Background; name: string; swatch: string }[]` and `CARDS: { id: CardColor; name: string; swatch: string; accent: string }[]`, in spec order.
- `resolveTheme(settings: Settings, scheme: 'light' | 'dark' | null | undefined): Theme`
- `TAG_COLOR: Record<Tag, keyof Theme['cat']>`: trading → trade, health → love, projects → wind, life → free
- `BLOCK_COLOR: Record<BlockId, keyof Theme['cat']>`: morning → free, afternoon → work, evening → trade, winddown → wind
- `PLAN_COLOR: Record<PlanKind, keyof Theme['cat']>`: lunch and dinner → warm, hangout → free, other → trade

- [ ] **Step 1: Failing tests:**
  - Defaults: `resolveTheme(emptyState().settings, 'light')` has `bg '#F8F4ED'`, `card '#DCE6D5'`, `accent '#47705A'`, `fabBg '#2B2219'`, `fabInk '#F7F0E3'`, `dark false`.
  - Charcoal + Cocoa: `card '#43352D'`, `nowBg '#4F3F35'`, `tabBg '#43352D'`, `dark true`.
  - Oat + Cocoa: `card '#3A2E28'`, `fabBg '#F2B866'`.
  - Dark switch: on + dark gives `bg '#1D1E1C'`; on + light gives `bg '#F8F4ED'`; off + dark gives `bg '#F8F4ED'`.
- [ ] **Step 2: Run** `node node_modules/jest/bin/jest.js src/ui`. Expected: FAIL.
- [ ] **Step 3: Implement.** Copy the mockup's `.screen[data-bg]` and `.screen[data-card]` values, including the Charcoal+Cocoa override row.
- [ ] **Step 4: Full check.** Expected: pass.
- [ ] **Step 5: Commit:** `feat(ui): theme tokens for every background and card pair`

### Task 2: Router, boot and the app frame

**Files:**
- Modify: `package.json` (`main: "expo-router/entry"`) and `app.config.ts` (`scheme: 'lifecentralized'`; plugins `expo-router`, `expo-font`, `@react-native-community/datetimepicker`; keep the rest)
- Delete: `App.tsx`, `index.ts`, `src/spike/`
- Create:
  - `src/data/boot.ts` and `src/data/boot.test.ts`
  - `src/ui/ThemeContext.tsx`, `src/ui/fonts.ts`, `src/ui/Txt.tsx`, `src/ui/Icon.tsx`, `src/ui/Buddy.tsx`, `src/ui/kit.tsx`
  - `src/app/_layout.tsx`, `src/app/(tabs)/_layout.tsx`, `src/app/(tabs)/index.tsx`, `src/app/(tabs)/priorities.tsx`, `src/app/(tabs)/week.tsx`, `src/app/(tabs)/notes.tsx`, `src/app/(tabs)/add.tsx`, `src/app/quick-add.tsx`

**Interfaces:**
- `src/data/boot.ts`:
  - `bootState(store: Store, now: Date): void` runs `store.update(s => startOfDay(s, toISODate(now)))`.
  - `refreshDay` is the same function, called on `AppState` `'active'`.
- `src/ui/ThemeContext.tsx`: `useTheme(): Theme`, from `useAppState().settings` and `useColorScheme()`.
- `src/ui/fonts.ts`:
  - `FONT_ASSETS` is the map passed to `useFonts`: Fredoka 600 and 700, and Lexend 400, 500, 600 and 700.
  - `font(kind: 'display' | 'body', weight: 400 | 500 | 600 | 700): string` returns the loaded family name.
- `src/ui/Txt.tsx`: `<Txt kind? weight? size? color? style? numberOfLines?>`.
- `src/ui/Icon.tsx`: `<Icon name size? color? strokeWidth?>`, with every mockup symbol:
  - today, sun, list, cal, note, plus, chart, moon, check
  - phone, heart, fork, dice, users, gear, cake, star, clock, left, right
- `src/ui/Buddy.tsx`: `<Buddy size?>`, the mockup buddy SVG.
- `src/ui/kit.tsx`: `Card`, `Chip`, `PillButton` (selected state), `PrimaryButton`, `Tick` (44pt target, a11y `checkbox` role) and `Screen` (safe-area scroll page on the theme bg).
- Tabs:
  - Today (`index`), Priorities, `add`, Week and Notes.
  - The `add` tab's `tabBarButton` is the rounded **+** (the mockup `.fab`). It opens `/quick-add` as a `formSheet` and never navigates to the tab.
  - Tab icons: today → sun, priorities → list, week → cal, notes → note.
- The Stack in the root layout holds:
  - `(tabs)`
  - `settings` (push)
  - These sheets as `formSheet` with the grabber shown and corner radius 26: `quick-add`, `plan`, `task/[id]`, `checkin/[date]`
  - `calendar` and `routine` (push), added by later plans

- [ ] **Step 1: Failing tests** (`boot.test.ts`, with `createTestDb` and fake dates):
  - On an empty db, `bootState` at Wed 2026-11-04 10:00 creates the Mon–Wed records and sets `lastWeekClosed: '2026-10-26'`.
  - After a flush, a second `createStore` plus `bootState` on the same day writes nothing new. Count the rows before and after.
  - `refreshDay` at Mon 2026-11-09 00:05 closes week 2026-11-02 (`weeks['2026-11-02']` exists) and creates the record for `'2026-11-09'`.
- [ ] **Step 2: Run** `node node_modules/jest/bin/jest.js src/data/boot`. Expected: FAIL.
- [ ] **Step 3: Implement** `boot.ts`. Then make the config changes, delete the spike, and add the UI kit, root layout and tabs with placeholder tab screens: a title and the buddy.
  - The root layout:
    - Shows nothing (keeps the splash) until the fonts and the store are ready.
    - Calls `bootState` once.
    - Subscribes to `AppState` and calls `refreshDay` when it becomes `'active'`.
    - Sets `StatusBar` from `theme.dark`.
- [ ] **Step 4: Full check and bundle check.** Expected: pass, and the export finishes with no unresolved modules.
- [ ] **Step 5: Commit:** `feat(app): Expo Router frame with tabs, quick-add button, fonts, theme and store boot`

### Task 3: Settings

**Files:**
- Create: `src/domain/settings.ts`, `src/domain/settings.test.ts`, `src/app/settings.tsx`
- Modify: `src/app/(tabs)/index.tsx` to add the gear to Settings.

**Interfaces:**
- `src/domain/settings.ts`:
  - `setBackground(s, bg: Background): AppState`
  - `setCards(s, c: CardColor): AppState`
  - `setCharcoalInDark(s, on: boolean): AppState`
  - `setGoalTarget(s, g: GoalId, n: number): AppState` clamps to a whole number from 0 to 14.
  - `restoreFlow(result: ParseResult | null): { kind: 'cancelled' } | { kind: 'error'; message: string } | { kind: 'confirm'; state: AppState; summary: string }`. The summary reads like "14 tasks, 0 plans, 0 notes".
- `src/app/settings.tsx`:
  - Back to Today.
  - **Theme:** 4 background swatches and 2 card swatches, as in the mockup, plus the Dark Mode switch.
  - **More:**
    - Weekly goals, with a −/+ stepper per goal.
    - Routine blocks, a row that pushes `/routine` (added by plan 8).
    - iPhone calendar, a row that pushes `/calendar` (added by plan 7).
    - Back up my data (`shareBackup`).
    - Restore from a backup:
      1. `pickBackup` runs, then `restoreFlow`.
      2. On `confirm`, an `Alert` reads "Replace everything on this phone with this backup? <summary>". The buttons are Cancel and a destructive Replace.
      3. Replace runs `store.replace(startOfDay(state, today))`, then shows "Restored".

- [ ] **Step 1: Failing tests:**
  - Each setter returns the expected settings and leaves everything else the same reference.
  - `setGoalTarget` with −1 gives 0, with 20 gives 14, and with 2.6 gives 3.
  - `restoreFlow(null)` is cancelled.
  - The spike-file result is an error carrying parseBackup's message.
  - `ok` gives `confirm` with the summary `"2 tasks, 1 plan, 1 note"` for `fullState()`. Singular and plural are both covered.
- [ ] **Step 2: Run** `node node_modules/jest/bin/jest.js src/domain/settings`. Expected: FAIL.
- [ ] **Step 3: Implement** the pure functions, then the screen.
- [ ] **Step 4: Full check and bundle check.** Expected: pass.
- [ ] **Step 5: Commit:** `feat(settings): theme, dark mode switch, weekly goals, back up and restore`
- [ ] **Step 6: Push** (CI builds the IPA), so the owner can install it and restore `seed.local.json`.
