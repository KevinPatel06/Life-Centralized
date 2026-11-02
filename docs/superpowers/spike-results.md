# On-device spike results

Date: 2026-11-02
Build tested: 1 (CI run 41513052202, release `build-1`), installed in LiveContainer on the owner's iPhone.

| # | Check | Result |
|---|---|---|
| 1 | App launches | PASS |
| 2 | Calendar read (all calendars, including Birthdays) | PASS |
| 3 | Calendar write ("Centralized" calendar + test event visible in the Calendar app) | PASS |
| 4 | Data survives update | PENDING: needs build 2 installed over build 1 |
| 5 | Export to Files and read back | PASS |

The owner reported the results in chat ("it all passes except 4, which is normal"). Counts and the iOS version weren't copied, and none are needed for the decision.

## Decision

- **Calendar: go.** Read and write both work inside LiveContainer, so no §9 fallback is needed. The iPhone calendar plan goes ahead as specced.
- **Persistence: not yet proven.** Build 2 (release `build-2`) exists for the update test. Until it passes, the app treats backup as important: Settings keeps "Back up my data" one tap away, and the data plan's restore path is tested from day one through the seed file. If check 4 fails, the §9 fallback applies: a prominent "Back up now" and a restore prompt on first launch.
