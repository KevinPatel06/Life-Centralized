# Foundation and On-Device Spike Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the Expo project, local checks, and the GitHub Actions pipeline that produces an unsigned IPA. Ship a throwaway spike screen that proves, inside LiveContainer on the owner's iPhone, the five risky capabilities in spec §9.

**Architecture:** An Expo (React Native, TypeScript) app at the repo root, with native projects generated at build time (`expo prebuild`). They are not committed.
- Pure logic lives in `src/` and is unit-tested with jest-expo on Windows.
- The spike screen in `src/spike/` wires native modules to those pure helpers. It is deleted in the next plan.
- A GitHub Actions macOS job builds `Payload/*.app`, zips it into an IPA, and publishes it as a GitHub Release asset the owner downloads in Safari.

**Tech Stack:** Expo SDK 58 (latest on npm as of 2026-11-02), TypeScript, expo-calendar, expo-sqlite, expo-file-system, expo-sharing, expo-document-picker, expo-clipboard, expo-application, jest-expo, eslint-config-expo, GitHub Actions (`macos-latest`), `gh` CLI. Local Node is v24.

**Spec:** `docs/superpowers/specs/2026-11-02-life-centralized-design.md`. This plan implements §2 (constraints), §7 (build and delivery) and §9 (first milestone). Later plans implement the rest (see "After this plan").

## Global Constraints

- **The repo is public.** No personal data in code, fixtures, tests, commit messages or release assets: no names, routine contents, task text, calendar titles or event titles. Spike reports carry **counts only**.
- No app extensions or widgets, no iCloud or entitlement-gated capabilities, and **no notifications in v1**. Do not install `expo-notifications`.
- The app's iPhone calendar is named exactly **`Centralized`**.
- Planning window: **this week plus 8 weeks ahead**. Weeks run **Monday to Sunday** in the device's local time.
- Keep the bundle identifier **`com.lifecentralized.app`** and the app name **`Life Centralized`** stable across builds, so LiveContainer treats each IPA as an update.
- The IPA is **unsigned**, built on GitHub Actions macOS, and published as a **GitHub Release asset**.
- Data is stored only on the device.
- `seed.local.json`, `ios/`, `android/`, `build/`, `Payload/` and `dist/` are never committed.
- Install Expo modules with `npx expo install` so versions match SDK 58. When an API differs from what's written here, follow the installed module's docs and keep the behavior.

## Review Focus

1. **Calendar permission denied, or iOS granting less than full access.** The spike must report `FAIL` with the permission status, not crash or hang. The test is in Task 2 (`calendarReadVerdict`).
2. **Running "Create Centralized calendar" twice.** It must reuse the existing `Centralized` calendar, not create duplicates. The test is in Task 2 (`pickCentralizedCalendar`).
3. **Week boundaries on Sunday night and across a DST change.** The window must start Monday 00:00 local and end exactly 9 weeks later at local midnight. The tests are in Task 1.
4. **The build number not changing between CI builds**, which makes the update/persistence test meaningless. `app.config.ts` must take `BUILD_NUMBER` from CI, and the persistence verdict must compare builds. The tests are in Task 1 and Task 2.
5. **The share sheet or file picker cancelled.** That must read `CANCELLED`, not `FAIL`, and must not throw. The test is in Task 2 (`exportVerdict`).

---

## File Structure

| Path | Responsibility | Lifetime |
|---|---|---|
| `package.json`, `tsconfig.json`, `eslint.config.js`, `jest.global-setup.js`, `.nvmrc` | Tooling and scripts | Permanent |
| `app.config.ts` (replaces `app.json`) | App identity, build number, permission strings, plugins | Permanent |
| `src/lib/dates.ts` | `startOfWeek`, `planningWindow` | Permanent; later plans reuse it |
| `src/spike/report.ts` | Pure spike logic: summaries, verdicts, report text | Throwaway |
| `src/spike/SpikeScreen.tsx` | Native wiring for the five checks | Throwaway |
| `App.tsx` | Renders `SpikeScreen` for now | Replaced in the next plan |
| `scripts/build-ipa.sh` | xcodebuild with signing off, then Payload, then IPA | Permanent |
| `.github/workflows/ios-ipa.yml` | CI build and Release | Permanent |
| `docs/superpowers/spike-results.md` | Outcome of the on-device test, counts only | Permanent record |

---

### Task 1: Expo project, checks, app identity and the planning window

**Files:**
- Create: the Expo app at the repo root (from `blank-typescript`), plus `app.config.ts`, `eslint.config.js`, `jest.global-setup.js`, `.nvmrc`, `src/lib/dates.ts`
- Delete: `app.json` (replaced by `app.config.ts`)
- Modify: `.gitignore` (merge the template's entries with the existing `.superpowers/` and `seed.local.json`)
- Test: `src/lib/dates.test.ts`, `app.config.test.ts`

**Interfaces:**
- Produces:
  - `startOfWeek(d: Date): Date`, which returns Monday 00:00 local of `d`'s week.
  - `planningWindow(now: Date): { start: Date; end: Date }`. `start = startOfWeek(now)`; `end` is exclusive, 63 calendar days later at local 00:00.
  - npm scripts `typecheck`, `lint`, `test` and `check` (which runs all three).
  - The default export of `app.config.ts`, a `(ctx: ConfigContext) => ExpoConfig`.

- [ ] **Step 1: Scaffold.** `create-expo-app` refuses a non-empty directory, so scaffold into a temporary folder and move the files up:

```bash
npx create-expo-app@latest _scaffold --template blank-typescript --no-install
# move everything from _scaffold/ (including dotfiles) into the repo root, merge .gitignore, delete _scaffold/
npm install
npx expo install jest-expo jest @types/jest eslint eslint-config-expo -- --save-dev
npx expo install expo-calendar expo-sqlite expo-file-system expo-sharing expo-document-picker expo-clipboard expo-application
```

- **`.gitignore`** must end up containing: `node_modules/`, `.expo/`, `ios/`, `android/`, `build/`, `Payload/`, `dist/`, `.superpowers/`, `seed.local.json`.
- **`.nvmrc`:** `24`.
- **`package.json`** scripts: `"typecheck": "tsc --noEmit"`, `"lint": "eslint ."`, `"test": "jest"`, `"check": "npm run typecheck && npm run lint && npm test"`. Jest config: `"jest": { "preset": "jest-expo", "globalSetup": "./jest.global-setup.js" }`.
- **`jest.global-setup.js`** sets `process.env.TZ = 'America/New_York'`, so DST tests behave the same on every machine.
- **`eslint.config.js`** uses the `eslint-config-expo/flat` flat config, ignoring `dist/*`, `ios/*`, `android/*`, `build/*`, `Payload/*`.

- [ ] **Step 2: Write the failing tests**

`src/lib/dates.test.ts`:

```ts
import { startOfWeek, planningWindow } from './dates';

const at = (y: number, m: number, d: number, h = 0, min = 0) => new Date(y, m - 1, d, h, min);

test('startOfWeek returns Monday 00:00 for a Monday evening', () => {
  expect(startOfWeek(at(2026, 11, 2, 18, 40))).toEqual(at(2026, 11, 2));
});

test('startOfWeek treats Sunday night as the end of the Monday-start week', () => {
  expect(startOfWeek(at(2026, 11, 8, 23, 59))).toEqual(at(2026, 11, 2));
});

test('planningWindow covers this week plus 8 more (63 days, exclusive end)', () => {
  const w = planningWindow(at(2026, 11, 2, 18, 40));
  expect(w.start).toEqual(at(2026, 11, 2));
  expect(w.end).toEqual(at(2027, 1, 4));
});

test('planningWindow ends at local midnight across a DST change', () => {
  const w = planningWindow(at(2027, 3, 10, 12)); // US DST starts Mar 14 2027
  expect(w.start).toEqual(at(2027, 3, 8));
  expect(w.end).toEqual(at(2027, 5, 10));
  expect(w.end.getHours()).toBe(0);
});
```

`app.config.test.ts`:

```ts
import config from './app.config';

const build = (env: Record<string, string | undefined>) => {
  const saved = process.env.BUILD_NUMBER;
  if (env.BUILD_NUMBER === undefined) delete process.env.BUILD_NUMBER; else process.env.BUILD_NUMBER = env.BUILD_NUMBER;
  const out = config({ config: {} } as any);
  if (saved === undefined) delete process.env.BUILD_NUMBER; else process.env.BUILD_NUMBER = saved;
  return out;
};

test('identity is stable', () => {
  const c = build({});
  expect(c.name).toBe('Life Centralized');
  expect(c.slug).toBe('life-centralized');
  expect(c.ios?.bundleIdentifier).toBe('com.lifecentralized.app');
});

test('buildNumber comes from BUILD_NUMBER, defaulting to "1"', () => {
  expect(build({ BUILD_NUMBER: '42' }).ios?.buildNumber).toBe('42');
  expect(build({}).ios?.buildNumber).toBe('1');
});

test('calendar permission is configured and notifications are not', () => {
  const plugins = JSON.stringify(build({}).plugins);
  expect(plugins).toContain('expo-calendar');
  expect(plugins).toContain('Centralized');
  expect(plugins).not.toContain('expo-notifications');
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `npm test`
Expected: FAIL. Both suites report that `./dates` and `./app.config` cannot be found, or that they have no export.

- [ ] **Step 4: Implement `src/lib/dates.ts` and `app.config.ts`**
  - **`dates.ts`:** use local calendar arithmetic (`new Date(y, m, d)` and `setDate`), never millisecond offsets, so DST can't shift midnight. Monday is the first day: `(getDay() + 6) % 7` days back.
  - **`app.config.ts`:** spread the incoming `config`, then set:
    - `name: 'Life Centralized'`, `slug: 'life-centralized'`, `version: '0.1.0'`, `orientation: 'portrait'`, `userInterfaceStyle: 'automatic'`.
    - `ios: { bundleIdentifier: 'com.lifecentralized.app', buildNumber: process.env.BUILD_NUMBER ?? '1', supportsTablet: false }`.
    - `plugins: [['expo-calendar', { calendarPermission: 'Life Centralized shows your calendar events next to your routine and adds your plans to a Centralized calendar.' }]]`.
    - Keep the template's icon and splash entries.

- [ ] **Step 5: Run all checks**

Run: `npm run check`
Expected: typecheck clean, lint clean, and 7 tests passing.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore: scaffold Expo app with checks, app identity and planning window"
```

Before committing, confirm `git status` shows nothing under `ios/`, `android/` or `_scaffold/`.

---

### Task 2: Spike logic (pure, tested)

**Files:**
- Create: `src/spike/report.ts`
- Test: `src/spike/report.test.ts`

**Interfaces:**
- Consumes: nothing from Task 1.
- Produces (all exported from `src/spike/report.ts`):
  - `type CheckId = 'launch' | 'calendarRead' | 'calendarWrite' | 'persistence' | 'export'`
  - `type CheckStatus = 'pending' | 'pass' | 'fail' | 'cancelled'`
  - `interface CheckResult { id: CheckId; status: CheckStatus; detail: string }`
  - `interface CalendarLike { id: string; title: string; type?: string; allowsModifications?: boolean }`
  - `interface EventLike { calendarId: string }`
  - `interface CalendarSummary { calendarCount: number; birthdayCalendarCount: number; eventCount: number; birthdayEventCount: number }`
  - `CHECK_ORDER: CheckId[]` = `['launch','calendarRead','calendarWrite','persistence','export']`
  - `CHECK_LABELS: Record<CheckId, string>` = `{ launch: 'App launches', calendarRead: 'Calendar read', calendarWrite: 'Calendar write', persistence: 'Data survives update', export: 'Export to Files' }`
  - `summarizeCalendars(calendars: CalendarLike[], events: EventLike[]): CalendarSummary`. A birthday calendar has `type === 'birthdays'`.
  - `calendarReadVerdict(permission: string, summary: CalendarSummary | null): CheckResult`
  - `pickCentralizedCalendar(calendars: CalendarLike[]): string | null`. This is an exact title match on `'Centralized'`, preferring one with `allowsModifications !== false`.
  - `persistenceVerdict(runs: { build: string; at: string }[], currentBuild: string): CheckResult`
  - `exportVerdict(outcome: { kind: 'cancelled' } | { kind: 'error'; message: string } | { kind: 'read'; json: unknown }): CheckResult`
  - `formatSpikeReport(results: CheckResult[], meta: { build: string; iosVersion: string }): string`

- [ ] **Step 1: Write the failing tests** (`src/spike/report.test.ts`)

```ts
import { summarizeCalendars, calendarReadVerdict, pickCentralizedCalendar, persistenceVerdict, exportVerdict, formatSpikeReport } from './report';

const cals = [
  { id: 'a', title: 'Private Title One', type: 'caldav' },
  { id: 'b', title: 'Birthdays', type: 'birthdays', allowsModifications: false },
  { id: 'c', title: 'Private Title Two', type: 'local' },
];
const evs = [{ calendarId: 'a' }, { calendarId: 'b' }, { calendarId: 'b' }, { calendarId: 'c' }];

test('summarizeCalendars counts calendars, birthday calendars and events', () => {
  expect(summarizeCalendars(cals, evs)).toEqual({ calendarCount: 3, birthdayCalendarCount: 1, eventCount: 4, birthdayEventCount: 2 });
});

test('summary and report never contain calendar titles', () => {
  const s = summarizeCalendars(cals, evs);
  const r = calendarReadVerdict('granted', s);
  const text = formatSpikeReport([r], { build: '7', iosVersion: '18.1' });
  expect(JSON.stringify(s) + text).not.toMatch(/Private Title/);
});

test('calendarReadVerdict passes only with full access and a birthdays calendar', () => {
  expect(calendarReadVerdict('granted', summarizeCalendars(cals, evs)).status).toBe('pass');
  expect(calendarReadVerdict('granted', summarizeCalendars([cals[0]], [])).status).toBe('fail');
  const denied = calendarReadVerdict('denied', null);
  expect(denied.status).toBe('fail');
  expect(denied.detail).toContain('denied');
});

test('pickCentralizedCalendar reuses an existing writable Centralized calendar', () => {
  expect(pickCentralizedCalendar([...cals, { id: 'x', title: 'Centralized', allowsModifications: true }])).toBe('x');
  expect(pickCentralizedCalendar([{ id: 'r', title: 'Centralized', allowsModifications: false }, { id: 'w', title: 'Centralized' }])).toBe('w');
  expect(pickCentralizedCalendar([{ id: 'y', title: 'centralized ' }])).toBeNull();
});

test('persistenceVerdict needs a row written by an earlier build', () => {
  expect(persistenceVerdict([{ build: '7', at: 't1' }], '7').status).toBe('pending');
  expect(persistenceVerdict([{ build: '7', at: 't1' }, { build: '8', at: 't2' }], '8').status).toBe('pass');
  expect(persistenceVerdict([], '8').status).toBe('fail');
});

test('exportVerdict: cancel is not a failure; read-back must be the spike file', () => {
  expect(exportVerdict({ kind: 'cancelled' }).status).toBe('cancelled');
  expect(exportVerdict({ kind: 'error', message: 'boom' })).toMatchObject({ status: 'fail', detail: 'boom' });
  expect(exportVerdict({ kind: 'read', json: { app: 'life-centralized', kind: 'spike' } }).status).toBe('pass');
  expect(exportVerdict({ kind: 'read', json: { app: 'other' } }).status).toBe('fail');
});

test('formatSpikeReport lists checks in order with status words', () => {
  const text = formatSpikeReport(
    [{ id: 'export', status: 'pass', detail: '' }, { id: 'launch', status: 'pass', detail: '' }],
    { build: '7', iosVersion: '18.1' },
  );
  expect(text.split('\n')).toEqual([
    'Life Centralized spike · build 7 · iOS 18.1',
    '1. App launches: PASS',
    '2. Calendar read: PENDING',
    '3. Calendar write: PENDING',
    '4. Data survives update: PENDING',
    '5. Export to Files: PASS',
  ]);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx jest src/spike`
Expected: FAIL with "Cannot find module './report'".

- [ ] **Step 3: Implement `src/spike/report.ts`** using the signatures above.
  - **Report lines:**
    - Format: `N. <label>: <STATUS>`, plus ` (<detail>)` only when `detail` is non-empty.
    - Missing checks print `PENDING`.
  - **`calendarReadVerdict` detail:**
    - When it passes: `"<n> calendars (<b> birthdays), <e> events (<be> birthdays)"`.
    - When it fails: include the permission string, or `"no Birthdays calendar"`.
  - **`persistenceVerdict` detail:**
    - Pending: `"Install a newer build over this one, then reopen"`.
    - Pass: `"Found data from build <oldest build>"`.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm run check`
Expected: all clean, with 14 tests passing.

- [ ] **Step 5: Commit**

```bash
git add src/spike
git commit -m "feat(spike): pure verdicts and report for the on-device checks"
```

---

### Task 3: Spike screen (native wiring)

**Files:**
- Create: `src/spike/SpikeScreen.tsx`
- Modify: `App.tsx`, which renders `<SpikeScreen />` inside a safe-area scroll view

**Interfaces:**
- Consumes: everything Task 2 produces, plus `planningWindow` from `src/lib/dates.ts`.
- Produces: `export default function SpikeScreen(): JSX.Element`. Nothing else depends on it, and it's deleted in the next plan.

- [ ] **Step 1: On mount, run the launch and persistence checks.**
  - Open SQLite database `spike.db`.
  - `CREATE TABLE IF NOT EXISTS runs (id INTEGER PRIMARY KEY AUTOINCREMENT, build TEXT NOT NULL, at TEXT NOT NULL)`.
  - Insert `{ build: Application.nativeBuildVersion ?? 'dev', at: new Date().toISOString() }`.
  - Read all rows, then set `launch = pass` and `persistence = persistenceVerdict(rows, currentBuild)`.
  - Show the build and the iOS version (`Platform.Version`) at the top.

- [ ] **Step 2: Add the "Read calendars" button.**
  - Request calendar permission.
  - If it isn't granted, show `calendarReadVerdict(status, null)`.
  - Otherwise, read all event calendars and the events in `planningWindow(new Date())` across all their ids, then show `calendarReadVerdict('granted', summarizeCalendars(...))`.

- [ ] **Step 3: Add the "Create Centralized calendar + test event" button.**
  - Reuse `pickCentralizedCalendar(calendars)`.
  - If there's none, create a calendar titled `Centralized`, color `#47705A`, on the default calendar's source.
  - Add an event titled `Centralized spike test` at the next full hour, lasting 30 minutes.
  - Result:
    - Pass with detail `"Check the iPhone Calendar app at <time>"`.
    - Fail with the error message.

- [ ] **Step 4: Add the "Export test file" and "Read file back" buttons.**
  - **Export:**
    - Write `centralized-spike.json` with content `{ app: 'life-centralized', kind: 'spike', build, writtenAt }` to the document directory.
    - Open the share sheet (`mimeType: 'application/json'`, `UTI: 'public.json'`) so it can be saved to Files.
  - **Read back:** pick a JSON file, read it, `JSON.parse` it, and set `export = exportVerdict({ kind: 'read', json })`.
  - **Outcomes:** a cancelled share sheet or picker gives `exportVerdict({ kind: 'cancelled' })`; a thrown error gives `exportVerdict({ kind: 'error', message })`.

- [ ] **Step 5: Add the check list and the "Copy report" button.**
  - Render one row per check in `CHECK_ORDER`: label, status and detail.
  - "Copy report" copies `formatSpikeReport(results, { build, iosVersion })` to the clipboard.
  - No calendar or event titles are shown or copied anywhere.

- [ ] **Step 6: Verify**

Run: `npm run check`
Expected: all clean, with 14 tests passing.

Optional: run `npx expo start --tunnel` and open it in Expo Go on the phone. Launch, calendar read and export should work there. This only previews; the real test is Task 5.

- [ ] **Step 7: Commit**

```bash
git add App.tsx src/spike/SpikeScreen.tsx
git commit -m "feat(spike): screen running the five on-device checks"
```

---

### Task 4: CI pipeline (unsigned IPA → GitHub Release)

**Files:**
- Create: `scripts/build-ipa.sh` (mark it executable with `git update-index --chmod=+x`)
- Create: `.github/workflows/ios-ipa.yml`

**Interfaces:**
- Consumes: `app.config.ts` (`BUILD_NUMBER`).
- Produces:
  - A release tagged `build-<run_number>` with asset `LifeCentralized.ipa`.
  - Builds from branches other than `main` are marked prerelease.

- [ ] **Step 1: Write `scripts/build-ipa.sh`.** Exact flags matter here:

```bash
#!/usr/bin/env bash
set -euo pipefail
WS=$(ls -d ios/*.xcworkspace | head -1)
SCHEME=$(basename "$WS" .xcworkspace)
xcodebuild -workspace "$WS" -scheme "$SCHEME" -configuration Release \
  -sdk iphoneos -destination 'generic/platform=iOS' -derivedDataPath build \
  CODE_SIGNING_ALLOWED=NO CODE_SIGNING_REQUIRED=NO CODE_SIGN_IDENTITY="" build
rm -rf Payload dist && mkdir -p Payload dist
cp -R "build/Build/Products/Release-iphoneos/$SCHEME.app" Payload/
zip -qry dist/LifeCentralized.ipa Payload
echo "Built dist/LifeCentralized.ipa from scheme $SCHEME"
```

- [ ] **Step 2: Write `.github/workflows/ios-ipa.yml`.**
  - **Trigger:** `push` on all branches (`branches: ['**']`) and `workflow_dispatch`. Docs-only commits opt out with `[skip ci]` in the message.
  - Spec §7 says "push to `main`". This plan widens that to every branch, because the work happens on `design/life-centralized` and GitHub only offers manual runs for workflows on the default branch. Release tags stay unique per run.
  - **Job:**
    - `runs-on: macos-latest`, `permissions: contents: write`.
    - Env: `BUILD_NUMBER: ${{ github.run_number }}`, `CI: 1`.
  - **Steps:**
    1. `actions/checkout`.
    2. `actions/setup-node` with `node-version-file: .nvmrc` and `cache: npm`.
    3. `npm ci`.
    4. `npm run check`.
    5. `npx expo prebuild --platform ios --clean` (this also runs `pod install`).
    6. `bash scripts/build-ipa.sh`.
    7. Release with `gh` (env `GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}`):
       ```bash
       PRE=$([ "$GITHUB_REF_NAME" = "main" ] || echo "--prerelease")
       gh release create "build-$GITHUB_RUN_NUMBER" dist/LifeCentralized.ipa \
         --target "$GITHUB_SHA" --title "Build $GITHUB_RUN_NUMBER ($GITHUB_REF_NAME)" \
         --notes "Unsigned IPA for LiveContainer. Commit $GITHUB_SHA." $PRE
       ```
  - If the runner's default Xcode is too old for SDK 58, add a `sudo xcode-select -s` step that picks the newest installed Xcode. Note the reason in a YAML comment.

- [ ] **Step 3: Verify locally what can be verified**

Run: `npm run check`. Then `bash -n scripts/build-ipa.sh` (Git Bash).
Expected: checks clean, and no syntax errors from `bash -n`.

- [ ] **Step 4: Commit**

```bash
git add scripts/build-ipa.sh .github/workflows/ios-ipa.yml
git commit -m "ci: build unsigned IPA on macOS and publish it as a GitHub Release"
```

- [ ] **Step 5: Push and watch the build.** Ask the owner before the first push; pushing publishes the branch.

Run: `git push -u origin design/life-centralized`, then `gh run watch --exit-status`.
Expected: the run succeeds, and `gh release view build-<n>` lists `LifeCentralized.ipa`.

If it fails, read `gh run view --log-failed`, fix, commit and push again. The usual culprits are the Xcode version, the workspace or scheme name, and pods.

---

### Task 5: On-device test with the owner, and record results

**Files:**
- Create: `docs/superpowers/spike-results.md`

**Interfaces:**
- Consumes: the Release from Task 4.
- Produces: a go/no-go for the calendar features, which the next plan reads.

- [ ] **Step 1: Owner installs build N.** In Safari on the iPhone:
  1. Open `https://github.com/KevinPatel06/Life-Centralized/releases`.
  2. Download `LifeCentralized.ipa` from the newest build.
  3. Open it in LiveContainer (install from Files), then launch it.

- [ ] **Step 2: Owner runs the checks.** Tap, in order:
  1. Read calendars.
  2. Create Centralized calendar + test event (then confirm it in the iPhone Calendar app).
  3. Export test file (save it to Files).
  4. Read file back (pick the saved file).
  5. Copy report.

  Then paste the report into the chat. It's counts only.

- [ ] **Step 3: Trigger build N+1**

Run: `git commit --allow-empty -m "chore: trigger build for update test" && git push`, then `gh run watch --exit-status`.
Expected: release `build-<N+1>` exists.

- [ ] **Step 4: Owner installs N+1 over N.** Install it in LiveContainer as an update of the same app, open it, tap "Copy report" and paste it.
Expected: "Data survives update: PASS (Found data from build N)".

- [ ] **Step 5: Write `docs/superpowers/spike-results.md`.**
  - Contents: date, iOS version, build numbers, and each check's status and detail (counts only), plus which spec §9 fallback applies, if any.
  - **Decide:**
    - Read and write both pass: go.
    - Read or write fails: **stop and bring the owner the options from spec §9** before the next plan.
    - Persistence fails: the next plan must make backup and restore part of every update.

- [ ] **Step 6: Commit and push**

```bash
git add docs/superpowers/spike-results.md
git commit -m "docs: record on-device spike results [skip ci]"
git push
```

---

## After this plan

Each of these gets its own plan, written after this one ships, with the spike results in hand. The spike screen is removed in the first one.

1. **Data core:** SQLite schema and migrations, generating days from the template, goals, history (spec §6), backup and restore JSON, and loading `seed.local.json`.
2. **App shell and look:** Expo Router tabs with the + button, Fredoka and Lexend, the theme system (Linen, Beige, Oat, Charcoal × Sage, Cocoa, plus the Dark Mode switch), the buddy, and Settings.
3. **Today, Week and Add a plan**, including the 8-week planning window and the custom time panel.
4. **Daily check-in and backup slots**, from End my day and the Week markers.
5. **Priorities, Task details, Notes and Quick add.**
6. **iPhone calendar:** import and keep choices, the Centralized write-back, sync on open, and the birthday heads-up. The shape of this plan depends on the spike.
