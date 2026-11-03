# Life Centralized: design

Date: 2026-11-02
Status: approved by the owner, 2026-11-02

A personal iPhone app that helps one person stick to a daily routine. It also keeps their priorities, plans and notes in one place, and pulls in their iPhone calendar.

Visual reference: the clickable mockup, kept locally at `.superpowers/brainstorm/today-styles-v7.html` (gitignored) and privately at https://claude.ai/artifact/M3iRCb7wfFo9Me3Zrtusaw. It has nine screens: Today, Week, Add a plan, Priorities, Task details, Notes, Check-in, Settings and iPhone calendar. The owner approved every screen. The data in it is illustrative.

> **This repo is public.** Nothing personal goes in it: no names, routine contents, task text, calendar data or health or finance details. That covers code, fixtures, tests, commit messages and release assets. Personal starter data goes in a gitignored local file and reaches the phone through the app's own restore feature (see "Starter data").

---

## 1. Why this exists

On free time, the owner gets sidetracked, avoids the thing they meant to do, or spends too long on one subject. Their current tools are a to-do list they describe as "lifeless" and a pile of separate notes. Their week is mostly the same every week.

When they open the app, it should answer one question: **what should I focus on right now, and what else is happening today?** It walks them through the current day. Showing too much is overwhelming, and showing too little means nothing happens.

Priorities matter, but they come second to the routine. The app also has to make logging fast: a plan or a note should take a few taps.

### Success looks like
- Opening the app shows the current block and what to do in it, with no digging.
- The owner sticks to the weekly routine more often. Weekly goal counts (Gym, Trading, Cardio) make progress visible.
- Plans and notes get logged in the app instead of scattered notes.
- It feels friendly and alive: a warm look, rounded type, and an alien buddy who nudges. It must not feel like a corporate to-do app.

### Goals
1. A **Today** screen built around the current routine block.
2. A **weekly routine template** (blocks and items, with times, goals and backup slots) that generates each day.
3. A **daily check-in** the owner starts to end the day. When an item with a backup slot was missed, the owner is asked to move it or skip it.
4. A **Week** page for planning up to 8 weeks ahead, with quick **Add a plan**.
5. **Priorities** (Now / Soon / Someday) with tags, due dates, notes, and the option to plan a task into a block.
6. **Notes**: quick capture into an inbox, turning a note into a task or plan, and notes attached to any task or event.
7. **iPhone calendar**: import everything, let the owner choose what to keep, and write the app's plans back to a "Centralized" calendar.
8. **Themes**: four backgrounds, each with either of two card colors.
9. **History**: everything is kept as weeks pass, ready for a future history view or export (§6).

### Non-goals (v1)
- Home screen widgets, Live Activities or any other app extension. They can't work inside LiveContainer.
- iCloud sync, accounts, multiple devices, a web version, Android, or an App Store release.
- AI features. The buddy's lines are rule-based.
- Browsing past weeks. Week starts at the current week. Past weeks are still **saved** as history (§6); there's just no screen for them yet.
- Notifications of any kind.
- Health tracking beyond a "Health" tag on tasks.

### Anti-goals (failure even if it "works")
- **A busy Today screen.** No countdown timers, no "time left" bars, and no goal pills on Today; the owner removed all of these. Today shows the current block in full and everything else compact.
- **Moving things without asking.** A missed item never moves to its backup slot unless the owner chooses that.
- **Doubling up.** A missed item moves to its backup slot at most once. If the backup is missed too, the item is skipped for the week. The owner set this rule.
- **A lifeless look.** No plain system lists, grey corporate styling or default fonts.
- **Personal data in the public repo or in public release assets.**

---

## 2. Constraints

- **The owner has no Mac.** Development happens on Windows. iOS builds run on **GitHub Actions macOS runners**, which are free for public repos. Each build makes an **unsigned IPA**.
- **The app is installed through LiveContainer** on the owner's iPhone. There's no Apple Developer account and no App Store. The owner wants a real installed app, not a web page or WebKit wrapper.
- **What LiveContainer means for the app:**
  - No app extensions.
  - No iCloud or other entitlement-gated capabilities.
  - Calendar permission and whether data survives an update must both be **proven on the device first** (§9).
- **Data is stored only on the phone.** That makes a dependable **backup and restore** (export to and import from Files) a must, not an extra.
- **Stack (my call, not challenged by the owner):** Expo / React Native with TypeScript.
  - The owner has **Expo Go** installed for optional live previews from the PC.
  - Calendar uses `expo-calendar` (EventKit). v1 has no notifications.
- **The IPA must be easy to get onto the phone.** Publish each build where the owner can download it from Safari on the iPhone, such as a GitHub Release asset, then open it in LiveContainer.

---

## 3. The model

### 3.1 Day structure and the weekly template
- Each day has **blocks** in this order: **Morning, Afternoon, Evening, Wind down**. Free time is part of Wind down.
- Each block has a start and end time. The times can differ by weekday; for example, Evening is 6:00–9:00 and Wind down starts at 9:00.
- The **weekly template** sets, for each weekday:
  - Block times.
  - A **day label** (optional), shown as a tag on Week; for example, "Office".
  - A **day note** (optional), shown as a small line on Week; for example, "Catch-up day".
  - A **bedtime** (optional, my call): Wind down's end time. The Wind down card on Today shows it, e.g. "Bed by 11:00". No extra notification in v1.
  - **Routine items** in each block. Each item has:
    - Title.
    - An optional fixed time, like "Gym 7:00".
    - An optional **minimum**, a small floor like "5 minutes", shown in the item's subtitle.
    - An optional **goal** it counts toward: Gym, Trading or Cardio.
    - An optional **backup slot** (day and block) in the same week.
    - An optional note.
  - **Recurring plans** in a block; for example, a standing evening plan on a certain weekday.
- The template is edited in Settings → Routine blocks. It is rarely edited, and its UI wasn't mocked (builder's call; keep it simple).
- Each actual day is **generated from the template**, plus that date's one-off plans, kept iPhone events, and tasks planned into that day. Ticking items or changing one day never changes the template.

### 3.2 Weekly goals
- Counts per week, Monday to Sunday: **Gym, Trading, Cardio**. Example targets: Gym 3, Trading 2, Cardio 3. They're editable in Settings → Weekly goals.
- A goal goes up when a routine item tied to it is ticked done, on Today, Week or in a check-in. A moved item counts once, wherever it gets done.
- **Ticking on Week (my call):** routine items can be ticked for today and earlier days of the current week. Future days are read-only.
- Goals appear **only on Week**, as three pills in one row with a thin progress bar. They are not on Today.

### 3.3 Backup slots and the daily check-in
- **One check-in per day, started only by the owner.** The owner ends a day by tapping **End my day** on Today, or the **Check in** button next to a day on Week.
  - The app never opens a check-in by itself and sends no check-in notifications.
  - The owner said they may revisit this later. Keep the check-in logic separate from how it's triggered, so another trigger can be added.
- **Days waiting to be checked in:** today and earlier days of the current week that aren't checked in show a small marker next to the day on Week, such as an amber "Check in" pill (look is the builder's call). Tapping it opens that day's check-in.
- **Days already checked in** show a small summary in that spot instead, e.g. "Checked in · 2 of 3 done".
- **What the check-in covers:** the day's blocks that have something to tick. That's usually Morning, Afternoon and Evening.
  - Wind down is left out (my call).
  - So is a block with nothing to tick, such as a work-only afternoon (my call).
- **For each block:**
  - Answers: **Done / Partly / Skipped**, plus a tick for each item ("What got done?").
  - The ticks and the answer stay in sync: all ticked means Done, none means Skipped, otherwise Partly.
  - Items already ticked during the day arrive ticked.
- For each **unticked item that has a backup slot**, the check-in asks **"Move to <backup day> / Skip this week"**.
  - **Move** is offered only while the backup slot is still ahead: today or later this week. Once the backup slot has passed, only **Skip** is offered, labeled "Backup has passed".
  - **Save stays disabled until each of these is answered.** Saving finalizes the day.
  - **Move:** the item appears in its backup slot that week, with a note like "Moved from Mon".
  - **Skip:** the item is marked skipped for the week.
- **An item already in its backup slot that is missed again** is skipped for the week when that day is checked in. There's no prompt and no further move.
- **Unticked items with no backup slot:**
  - Routine items are recorded as missed.
  - Priority tasks stay open in Priorities. Their "planned for" is cleared, and they keep their urgency.
- **Before a day is checked in:** ticks still count toward goals right away. Nothing is moved, skipped or marked missed until the owner checks the day in.
- **Changing a check-in (my call):** a checked-in day can be reopened from Week while it's still the current week. Changing a Move to Skip removes the moved item.
- **When the week ends (my call):** days that were never checked in are saved to history as "not checked in". Nothing moves.

### 3.4 Priorities (tasks)
- **Fields:**
  - Title.
  - Urgency: **Now / Soon / Someday**.
  - Tag: **Trading / Health / Projects / Life**, a fixed list in v1.
  - **In progress** flag.
  - Optional **due date**.
  - Optional **start date**, shown as "Starts tomorrow".
  - Optional **planned for**: a date, or a date and block.
  - **Notes** (free text, multi-line).
  - Done state.
- **Due dates move urgency up (my call: 7 days):** a task is treated as **Now** from 7 days before its due date. Its stored urgency doesn't change, and the list shows "Moves to Now on <date>" beforehand. Overdue tasks are shown as Now and marked overdue.
- **Planned tasks:** a task planned for a block shows up inside that block on Today and on that day in Week.
- **Unplanned Now tasks (my call):** they don't appear on Today automatically. When the current block has room, the buddy may suggest one. This keeps Today from overflowing.

### 3.5 Plans (events made in the app)
- **Fields:**
  - Title.
  - Date: this week up to **8 weeks ahead**.
  - **When** is one of:
    - **Morning / Afternoon / Evening**.
    - **At a time** (e.g. 8:00 PM).
    - **From – to** (e.g. 8:00 – 11:00 PM).
  - Note.
  - "Also add to iPhone calendar" switch, on by default.
- **Quick picks** set the title and suggest a When: **Lunch** (Afternoon), **Dinner** (Evening), **Hangout** (Evening). Typing a custom title clears the pick.
- Plans appear on Week on their day. On Today they appear inside the block they fall in.
- **Writing to the iPhone (my call):**
  - Plans with the switch on are written to a **"Centralized" calendar** that the app creates on the phone. The owner chose this name.
  - Editing or deleting the plan in the app updates or removes the iPhone event.
  - Changes made to Centralized events from the iPhone Calendar app are **not** pulled back in v1. The app owns those events.
  - A "Morning / Afternoon / Evening" plan is written as a timed event covering that block's template times for the day.

### 3.6 Imported iPhone events
- **Import** reads **every calendar** on the phone, including the Birthdays calendar, from **this week through one year from today** (owner decision, 2026-11-03), so a full year of birthdays comes in. Plans and the Week page still reach 8 weeks ahead. Recurring events are expanded into individual occurrences. The app's own "Centralized" calendar is excluded.
- **Choosing what to keep:**
  - Each calendar has a switch, and each event has a checkbox.
  - Everything starts **kept**.
  - The button shows the count: "Keep 7 of 11 events".
  - Unchecked events disappear from Week and Today straight away.
- **Staying in sync (my call):**
  - The app re-reads on launch and when it returns to the foreground.
  - **New events in calendars that are kept come in on their own.**
  - Events unchecked one at a time stay hidden, matched by event identifier plus occurrence date.
  - A calendar switched off stays off.
- **In the app:**
  - Imported events are read-only (no editing in v1) and carry an "iPhone" marker.
  - The owner **can attach notes** to them. Notes are stored in the app, keyed to the event.
- **Heads-up on Today (my call: 7 days):**
  - The next kept **birthday or anniversary** in the next 7 days shows as one small line under the date, e.g. "Mom's birthday is Thursday · in 3 days".
  - Birthdays are events from the Birthdays calendar. Anniversaries are all-day events with "anniversary" in the title (builder may refine).
  - On the day itself, it reads "…is today".

### 3.7 Notes
- **Quick capture:** a text field and + button at the top of Notes. New notes go to the **Inbox**.
- **Inbox notes** have two actions:
  - **Make it a task:** creates a task in **Soon** (first line becomes the title, the rest the note) and shows "Now a task in Priorities · Soon" with **Undo**.
  - **Make it a plan:** opens Add a plan with the text filled in. The note becomes "Turned into a plan".
- **Attached notes:** every task, plan and imported event can have a note. The **"On tasks & plans"** tab lists all of them, newest first. Tapping one opens its task or plan.

### 3.8 Quick add (the + in the tab bar)
Not mocked; my call. It opens a small sheet with one text field and three buttons: **Note**, **Task** (defaults to Soon) and **Plan** (opens Add a plan with the text filled in). It's built for speed and defaults to Note.

---

## 4. Screens

These follow the mockup. Behavior not described here is shown in the mockup.

**Tab bar:** Today · Priorities · **+** (quick add) · Week · Notes. Settings opens from a gear at the top of Today.

### Today
- **Header:** weekday in big display type. Under it, "Nov 2nd · **2 blocks to go**": ordinal date, a dot separator, and the bold count of the current and later blocks.
- **Heads-up line** for a birthday or anniversary (§3.6), only when there is one.
- **Blocks:**
  - Finished blocks collapse to one dashed line each: name, short summary, and a done, partly or skipped mark.
  - The **current block** is expanded:
    - "NOW" kicker, block name, time range.
    - Its items, each with a tick and a chip: Routine, Now, Soon or Someday.
    - A subtitle where it applies, like "Backup is Thursday".
    - Plans and iPhone events that fall in the block, e.g. "7:45 PM Haircut · iPhone calendar".
  - Later blocks show as compact cards.
- **Alien buddy** with one speech bubble. It's rule-based and short. It names the current focus, mentions the backup if relevant, and flags birthdays. One line, and it never nags.
- **No countdowns or time-left displays.**
- **End my day** button below the blocks. It opens the daily check-in (§3.3) and can be tapped anytime. Once the day is checked in, it becomes a small "Day checked in" summary that reopens the check-in.
- **Before the first block and after Wind down:** builder's call. Keep it light; for example, a short "day's done" summary and tomorrow's first block.

### Week
- **Sticky header:**
  - Previous and next arrows; the title runs "This week, Next week, In 2 weeks … In 8 weeks", with the date range under it.
  - A 7-day strip (weekday letter, date, and a dot when the day has plans). Tapping a day scrolls to it.
- **Goals:** Gym / Trading / Cardio pills in one row.
- **Days:** one scrolling page with no boxed cards around days. Days are separated by a 2px line and generous spacing. Each day has:
  - A header: day, date, "Today" tag, template day label, and a **+** that opens Add a plan with that day selected.
  - For today and earlier days this week, a **check-in marker** in the header:
    - A "Check in" pill when the day isn't checked in yet.
    - A small summary once it is.
    - Either one opens that day's check-in.
  - Plan cards: all-day first, then by time. Imported events carry an "iPhone" marker.
  - Routine items as checkboxes.
  - The day note and any backup-slot tag.
- **Future weeks** show template items and plans, with goal counts at 0.

### Add a plan (sheet)
- **What's the plan?** Lunch / Dinner / Hangout in one row, then a text field ("Or type your own").
- **Day:** week arrows (up to 8 weeks ahead) and a 7-day picker.
- **When:**
  - Morning / Afternoon / Evening in one row.
  - Below them, a full-width clock button that opens the time panel. Its two modes are **At a time** and **From – to**, using the iOS time wheel.
  - The button shows the chosen time.
- "Also add to iPhone calendar" switch, a Note field, and the **Add plan** button.

### Priorities
- **Header:** "9 open · 2 in progress".
- **Filter chips:** All plus one per tag.
- **Sections:**
  - **Now** ("Do these first"), **Soon** ("Next week or two"), **Someday** ("When there's room").
  - Each section is a rounded card list. A row has a tick, title, a one-line note preview, tag, and chips for In progress, Due, Starts or Planned, plus a note icon.
  - A task about to move up shows "Moves to Now on <date>".
- **Done:** a dashed "Done · N" button that expands the done list.
- Tapping a row opens Task details.

### Task details (sheet)
- Editable title.
- **How urgent?** Now / Soon / Someday.
- Tag.
- Rows for Due date, Plan it for ("Shows up on Today") and an In progress switch.
- **Notes**, a large text area.
- Save.

### Notes
- Title with "N in your inbox".
- The quick-capture field.
- A segmented control: **Inbox · N** / **On tasks & plans**.
- Inbox: note cards with timestamp, **Make it a task** and **Make it a plan**.
- On tasks & plans: rows with parent icon, parent title, "Task · Tag" or "Plan · date", and the note text.

### Check-in (sheet, once per day)
> The mockup shows an earlier version with one check-in per block. **This doc wins:** one check-in per day, built from the same pieces and grouped by block.

- Buddy plus **"How did Monday go?"** (or "How did today go?") and the date.
- One section per block that has something to tick (§3.3). Each section has:
  - The block name and time range.
  - **Done / Partly / Skipped** in one row.
  - The block's items with ticks.
  - Each unticked item that has a backup slot gets the prompt with **Move to <day>** / **Skip this week**. Only Skip is offered once the backup has passed.
  - Unticked tasks with no backup slot show "No backup slot, so it stays in Priorities".
- **Save** is disabled until every prompt is answered. Saving finalizes the day.

### Settings
- Back to Today.
- **Theme:**
  - Background swatches: Linen, Beige, Oat, Charcoal.
  - Card swatches: Sage, Cocoa.
  - **"Use Charcoal in Dark Mode"** switch, off by default. When on, Charcoal is used while the iPhone is in Dark Mode.
- **More:**
  - Weekly goals (shows the targets).
  - Routine blocks.
  - iPhone calendar ("N events kept").
  - Back up my data.

### iPhone calendar
- Back to Settings.
- A short explanation.
- Then, per calendar: colored dot, name, "kept of total", a switch, and the event rows (checkbox, title, "Thu, Nov 5th · All day").
- A footer explaining sync and the Centralized calendar.
- A sticky **"Keep N of M events"** button.

---

## 5. Look and feel

- **Type:** **Fredoka** for display (headings, numbers on date chips) and **Lexend** for the app body. Bundle both fonts in the app, with no network font loading.
- **Shape:**
  - Very rounded: cards 20–26px radius, pills fully round.
  - Soft shadows on cards.
  - Done blocks use dashed borders.
- **Touch targets:** 44pt or larger.
- **Themes:** the owner picks a **background** and a **card color**. The default is **Linen + Sage**. All 8 pairs are allowed.

| Background | bg | text | muted text | lines |
|---|---|---|---|---|
| Linen (default) | `#F8F4ED` | `#2A241D` | `#6A6052` | `#E0D6C5` |
| Beige | `#EEE5D5` | `#2B2219` | `#685944` | `#D1C1A4` |
| Oat | `#E2D5BF` | `#2B2219` | `#5B4C38` | `#C8B798` |
| Charcoal | `#1D1E1C` | `#EFEFEA` | `#ABACA4` | `#363833` |

| Cards | card | ink | muted | current block bg | accent (rings, selected) | primary button |
|---|---|---|---|---|---|---|
| Sage (default) | `#DCE6D5` | `#1F2A20` | `#4D5C4D` | `#CCDCC2` | `#47705A` | `#2B2219` on `#F7F0E3` text |
| Cocoa | `#3A2E28` (`#43352D` on Charcoal) | `#F6EDE1` | `#CDBBA8` | `#46372F` | `#9C5420` | `#F2B866` with `#2A1F1A` text |

- **Other tokens:**
  - The "Now" chip is amber `#F2B04A` with `#2A1C00` text.
  - Category colors, Sage / Cocoa: Trading blue `#2F5FCF` / `#8FB0FF`; Projects purple `#6248C2` / `#C7B2FF`; Life green `#2F7A50` / `#7FD9A8`; love/birthday pink `#B92E64` / `#FF9CBF`; work grey `#66707C` / `#B9A897`; warm/food amber `#A86400` / `#F2B866`.
  - The full set, including chips, ticks and tab bar, is in the mockup CSS.
- **Alien buddy:** a mint-green rounded blob (`#45D6A4`) with two dark eyes, a smile and pink cheeks, as in the mockup SVG. The builder may polish it but should keep the character.
- **Motion:** only small transitions, and respect Reduce Motion.

---

## 6. Data and storage

- **Store:** all data on the device in a local database. `expo-sqlite` is the suggested choice; builder's call.
- **Entities:**
  - Template: days, blocks, items.
  - Goal targets.
  - Generated day state: item completion, moves, skips, check-in results.
  - Tasks.
  - Plans.
  - Notes (inbox, plus notes attached to a task, plan or imported event).
  - Imported-event keep and hide choices.
  - Settings: theme, the dark-mode switch, the calendar id of "Centralized".
- **History (the owner asked for this):** nothing is deleted when a day or week passes.
  - **What's kept for each past day:**
    - The items generated for it.
    - Ticks.
    - The check-in result, or "not checked in".
    - Moves and skips.
    - The plans that day.
    - A snapshot of the kept iPhone events that day.
  - **Also kept:** the weekly goal counts against their targets, done tasks with the date they were finished, and all notes.
  - **Template edits apply from that point on.** Past days keep what they had at the time.
  - There's no screen for history in v1. It's included in the backup export so a future history view or export can be built on it. Design the schema so date-range queries over history are easy.
- **Backup:**
  - Settings → Back up my data exports **one JSON file** of everything through the iOS share sheet, so it can be saved to Files.
  - **Restore** imports such a file and replaces current data after a confirmation.
  - The format is versioned.
- **Starter data:**
  - The owner's real weekly routine, goal targets and existing task list go into **`seed.local.json`**, in the backup format and **gitignored**.
  - The owner moves it to the phone and loads it with **Restore**. This keeps personal data out of the repo and the public IPA, and tests restore on day one.
  - Sources the builder can use locally:
    - The mockup's `TEMPLATE` and `TASKS` data.
    - The owner's old to-do list artifact (Health items included in the seed, since it's private).
  - **Seed defaults (my calls, all editable in Settings):**
    - Block times: Morning until 12:00, Afternoon 12:00–6:00, Evening 6:00–9:00, Wind down from 9:00.
    - Goal mapping: gym sessions count toward Gym; trading study items (course modules, educational videos) count toward Trading; jump rope and basketball count toward Cardio.
    - Weekday afternoons with nothing scheduled are treated as Work.

---

## 7. Build and delivery

- **CI:** a GitHub Actions workflow on a macOS runner. It runs on push to `main` and on manual dispatch.
- **Steps:**
  1. Install dependencies.
  2. `expo prebuild` for iOS.
  3. `xcodebuild` with code signing disabled.
  4. Package `Payload/<App>.app` into `.ipa`.
  5. Attach the IPA to a **GitHub Release** the owner can open in Safari on the iPhone.
- **Before pushing:** checks run on the Windows PC (TypeScript, lint, tests). Expo Go live previews are optional.
- **Identity:** keep the bundle identifier and app name stable across builds, so LiveContainer treats each IPA as an update.

---

## 8. What's left to the builder

- Code structure, state management, navigation library, database schema and migrations.
- The Routine blocks editor UI and the Weekly goals editor UI.
- Today's states before the first block and after Wind down.
- How the buddy's lines are chosen, within the "one short line, never nags" rule.
- Event matching details for hidden imports, and the anniversary heuristics.
- How the Week check-in marker and the "End my day" button look.
- Polishing the visuals, while staying faithful to the mockup's layout, palette and type.

---

## 9. First milestone: prove the risky parts on the phone

Before building features, ship a throwaway **spike IPA** through the real pipeline (§7). The owner tests it in LiveContainer. It must check:

1. The app launches from an IPA built by CI.
2. **Calendar read:** the permission prompt appears and is granted, and events from all calendars are listed, **including Birthdays**.
3. **Calendar write:** it can create a "Centralized" calendar and add an event that shows up in the iPhone Calendar app.
4. **Data survives an update:** write a record, install a newer IPA over it in LiveContainer, and the record is still there.
5. **Export:** a JSON file can be saved to Files through the share sheet, and read back.

**If a check fails:**
- **Calendar (2 or 3) fails:** stop and bring options to the owner. For example, install the IPA directly with SideStore or AltStore under a free Apple ID (weekly re-signing), or import a `.ics` file by hand. The calendar features depend on this.
- **Data doesn't survive updates:** make backup and restore part of every update: a prominent "Back up now" and a restore prompt on first launch. Tell the owner.

---

## 10. Choices I made (the owner should check these)

- Expo / React Native with TypeScript; local SQLite storage; backup and restore as JSON.
- Starter data loaded through a gitignored seed file plus Restore.
- Blocks are Morning, Afternoon, Evening and Wind down. Free time is part of Wind down, and Wind down has no check-in. Blocks with nothing to tick get no check-in either.
- Wind down's end time is the night's bedtime, shown on Today.
- Seed defaults: block times, goal mapping (Gym / Trading / Cardio), and afternoons treated as Work.
- On Week, routine items can be ticked only for today and earlier days.
- Due dates bump a task to Now **7 days** before. The birthday heads-up looks **7 days** ahead.
- Unplanned Now tasks are not put on Today automatically. The buddy may suggest one.
- The daily check-in leaves out Wind down and blocks with nothing to tick. Move is offered only while the backup slot is still ahead. A checked-in day can be reopened during the current week. Days never checked in by the end of the week are saved as "not checked in", with nothing moved.
- Centralized-calendar events are one-way (app to iPhone). Imported events are read-only, but notes can be attached.
- New events in kept calendars come in automatically.
- "Use Charcoal in Dark Mode" switch, off by default. Settings opens from a gear on Today.
- Quick add (+) is one text field that saves as Note, Task or Plan.
- No browsing of past weeks in v1, but full history is saved (owner's decision).

## 11. Owner decisions after the first draft (2026-11-02)
- The app's iPhone calendar is named **"Centralized"**.
- The check-in happens **once a day** and only when the owner starts it: **End my day** on Today, or the **Check in** marker next to a day on Week. Check-ins never pop up by themselves. Days not yet checked in wait on Week to be finalized. The owner may change this later.
- **Past weeks aren't browsable, but everything is kept as history** for a future view or export.
- (2026-11-03) The iPhone calendar import reads **one year ahead** instead of 8 weeks, so all birthdays can be imported and kept or hidden.
