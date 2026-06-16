# Accountability Notifications — Daily & Weekly WhatsApp Reports

## Context

Anurag wants automated **accountability reports** over WhatsApp so his wife can hold him accountable. Two reports — **daily** (completion %, what went well / what went wrong) and **weekly** (completion %, quests nailed vs slipped). Channel is **CallMeBot** (final). All sending runs from **Google Apps Script** on time-triggers + on submit, independent of whether the PWA is open (the app's reset/auto-submit only fire on a JS interval when open — unreliable on a backgrounded iOS PWA).

**All work happens on branch `accountability-report`, cut from `main`.**

## Locked Decisions

| Decision | Choice |
|----------|--------|
| Channel | CallMeBot (WhatsApp), via a swappable `notify()` |
| Recipients | List in Script Properties — **start with Anurag's number only**; add wife by appending one entry (no code change) |
| Streak in message | Omit for now |
| Source of truth | **The sheet, for both reports.** Report senders read only from sheets. |
| Reports sent | Daily + Weekly, both built by GAS from sheet data |
| Send trigger | Time-triggers at **00:15 IST**, plus **immediate send on manual end-mission** |
| Day/week boundary | **Midnight (00:00 IST)** |

## Codebase Review — Risks Found & How the Plan Handles Them

Verified against `AppContext.js` (reducer + effects), `istUtils.js`, `TrackingMode.jsx`, and the GAS script.

1. **Double-count / spurious-zero bug (critical).** `DAILY_RESET` (`AppContext.js:376`) appends `todayScore` to `dailyCompletionHistory` and re-evaluates streak/buffers. If a manual Daily Submit finalizes day D (appends D's score, clears `completedTodayIds`), then at 00:00 the interval (`:717`, `lastResetDate !== istDate`) **fires `DAILY_RESET` again** for the new day — with empty completions → appends a **spurious 0**, corrupting the weekly average **and** wrongly breaking the streak / consuming a buffer. → Fix: add a `dailyFinalizedDate` guard. Manual submit sets it; the midnight pass skips the score-append + streak eval when the ending day was already finalized, doing only new-day housekeeping (clear, monthly buffer reset). Simply "setting `lastResetDate=today`" is **not** enough — the date still advances at midnight and re-triggers.

2. **Weekly-report race (critical).** Submit emits **three independent fire-and-forget POSTs** from separate effects — `log` + `update_goals` (`:674`) and `track_goals_submit` (`:705`) — with no ordering. Triggering `sendWeeklyReport()` from inside `trackGoalsOnSubmit` could run **before** `update_goals` writes the overall %, sending a blank/0 %. → Fix: immediate send uses a **dedicated `action:'send_weekly_report'` POST that carries week + overall % + per-quest results** (the app already has them in `_pendingLog`/`_pendingTrackerSubmit`), fired last. The Monday 00:15 backstop reads the sheet (by then all writes have landed). Slight, deliberate deviation from "purely from sheet" for the immediate path — required to avoid the race.

3. **Transient-field leak (correctness).** The save effect (`:659`) already strips `_pending*` fields before persisting. `LOAD_STATE` (`:107`) only reads known keys, so extra keys in the GAS blob are ignored — **but** `_daily`/report flags must NOT live in reducer state or they'd re-POST on every debounced save. → Fix: compute `_daily` inside the save effect (attach to the GAS payload only, not state/localStorage); make the report request a transient `_pending`-style flag with its own effect that clears after POST (mirrors `_pendingTrackerSubmit`).

4. **Reset/date misalignment (confirms the midnight change is necessary, not cosmetic).** `getISTDate()` rolls at 00:00 but reset fires at 03:00 — so 00:00–03:00 check-offs key to the new date while `completedTodayIds` still holds the old day. Moving reset to midnight aligns them so `Daily Log` rows key correctly.

5. **Smaller risks (noted, mitigated):** Apps Script's 20-trigger cap — clean up spent one-off triggers at schedule time + in a `finally`. CallMeBot/WhatsApp message length — cap/truncate long done/missed lists. Per-save `Daily Log` upsert adds a sheet read+write to every debounced save — acceptable for a single user, noted.

## Single Source of Truth = the Sheet

Both report senders read **only** from sheets. The app's sole job is to keep the sheets populated:

- **Weekly data** is already in the sheet via existing submit actions — `Weekly Goals` (overall %) and the per-quest % sent in `track_goals_submit`. No new app data needed; GAS just persists the submit's per-quest snapshot so the sender can read it.
- **Daily data does not exist in any sheet today**, and GAS cannot name quest IDs (names live in `blueprint.js`, not the sheet). So the app must **write** a named daily row. This is the one unavoidable app-side write. After that, the daily sender reads purely from the sheet.

## Data Flow

**Daily:**
1. The app's save effect computes a `_daily` snapshot — `{ date, pct, done, missed }`, daily-frequency quests only (`completedTodayIds ∩ dailyIds` vs `dailyIds \ completedTodayIds`, named via `buildQuestLookup` `AppContext.js:11`) — and attaches it to the **GAS payload only** (not reducer state, not localStorage). GAS upserts today's `Daily Log` row. This keeps the row fresh independent of whether the app is open at midnight.
2. GAS daily time-trigger at **00:15 IST** reads **yesterday's** `Daily Log` row (the day that just ended), formats, `notify()`s all recipients. Guard with a `lastDailySent` Script Property (once per date).

**Weekly:**
1. On submit, app already POSTs `update_goals` (overall %) and `track_goals_submit { quests:[{mission,goal,percentage}] }` → these populate the sheet.
2. **Manual end-mission → immediate send (race-safe):** app fires a dedicated `action:'send_weekly_report'` POST **last**, carrying `{ week, percentage, quests:[{goal,percentage}] }` (already available in `_pendingLog`/`_pendingTrackerSubmit`). GAS formats from the payload directly — no dependency on the other POSTs having landed.
3. **Backstop time-trigger** Monday **00:15 IST** reads the sheet (overall % + per-quest), covering auto-submit / forgotten weeks. Dedup with a `lastWeeklySent` (week-range) Script Property so immediate + backstop don't double-send.
4. Nailed = `pct ≥ THRESHOLD`, slipped = `pct < THRESHOLD` (default 50, configurable).

## Manual "Daily Submit" Button

New button on the **Tracking Mode (Active Protocol)** screen, placed **just above** the END & SUBMIT WEEKLY MISSION button (`TrackingMode.jsx:381` block; existing submit at `:383-401`, `handleSubmit` at `:242`).

- **Behavior:** new `DAILY_SUBMIT` action mirrors the finalize half of `DAILY_RESET` (`AppContext.js:376-414`): appends `todayScore` to `dailyCompletionHistory`, updates `questDailyCompletionCounts`, evaluates streak/buffers, clears `completedTodayIds` — **and sets a new `dailyFinalizedDate = today`** (see Risk #1). It also sets a transient `_pendingDailyReport` flag carrying the `_daily` snapshot.
- **Double-count guard (Risk #1):** `DAILY_RESET` must check `dailyFinalizedDate`. If the day that just ended was already finalized via a manual submit, the midnight pass skips the score-append + streak/buffer eval and only does new-day housekeeping (clear `completedTodayIds`, monthly buffer reset, advance `lastResetDate`). Prevents the spurious-zero average corruption and false streak break.
- **Report after ~5 min:** a dedicated effect POSTs `action:'request_daily_report'` carrying the snapshot `{ date, pct, done, missed }`, then clears the flag. GAS writes the `Daily Log` row immediately and schedules a one-off trigger ~5 min out (`ScriptApp.newTrigger(...).timeBased().after(5*60*1000)`) that calls `sendDailyReport(storedDate)` for today (target date saved in a Script Property to survive a midnight rollover), then deletes spent triggers (clean up at schedule time + in `finally` to respect the 20-trigger cap — Risk #5).
- **Dedup:** `sendDailyReport` uses the shared once-per-date `lastDailySent` guard. Manual submit at 9 PM sets `lastDailySent = D`; the 00:15 trigger (which reports the prior day = `D`) then skips it.
- **Caveat:** after a manual Daily Submit, further check-offs that day won't count (day finalized early) — intended "submit" semantics; the button confirms before finalizing.

## Boundary / Timing Changes

- **Daily reset → midnight.** Change the `istHour >= 3` gate (`AppContext.js:717`) to fire at IST 00:00. This aligns the reset boundary with `getISTDate()` (which already rolls at midnight) so `Daily Log` rows key cleanly to the right date. Trade-off: removes the post-midnight grace window where a late check-off counted for the prior day.
- **Auto-submit** is already Sunday 23:59:59 IST (`istUtils.js:23`) — effectively midnight; left as-is. The weekly send happens at Monday 00:15 (or immediately on manual end).
- **All sends at 00:15 IST** — the 15-minute buffer after midnight absorbs any reset/processing lag so the report reflects the fully-settled day/week.

## Changes

### App (`frontend/src/`)
- **`context/AppContext.js`**
  - Save effect (`:655`): compute `_daily` from `activeSprint` + `buildQuestLookup` and attach to the **GAS payload only** (after the existing `_pending*` strip, before `saveToGAS`). Not stored in state/localStorage.
  - New `DAILY_SUBMIT` action (mirrors finalize half of `DAILY_RESET:376`; sets `dailyFinalizedDate`; sets transient `_pendingDailyReport`).
  - Add `dailyFinalizedDate` to `initialState` + `LOAD_STATE` hydration; add the Risk #1 guard inside `DAILY_RESET`.
  - New effect: when `_pendingDailyReport` set → `postToGAS({action:'request_daily_report', ...snapshot})` then clear.
  - `SUBMIT_MISSION`/`AUTO_SUBMIT`: set a transient `_pendingWeeklyReport` carrying `{week, percentage, quests}`; new effect POSTs `action:'send_weekly_report'` **after** the existing log/track effects, then clears.
  - Change daily-reset gate `:717` from `istHour >= 3` to midnight. No auto-submit change.
- **`components/TrackingMode.jsx`** — add "Daily Submit" button above the submit block (`:381`); onClick confirms, then dispatches `DAILY_SUBMIT`. Visually secondary to END & SUBMIT.

### GAS (`gas-update-weekly-goals.gs`)
- `notify(text)` — loop recipients from Script Property `CALLMEBOT_RECIPIENTS` (`[{phone,apikey,name}]`); one `UrlFetchApp` GET each to `api.callmebot.com/whatsapp.php`; on failure write an error cell + `MailApp.sendEmail` to Anurag. Truncate long lists (Risk #5).
- `doPost` default branch: extract `_daily` → upsert `Daily Log`.
- New `action:'request_daily_report'`: upsert today's `Daily Log` row from the payload, store target date, schedule a one-off 5-min trigger (clean up spent triggers).
- New `action:'send_weekly_report'`: build + `notify()` directly from the payload (race-safe immediate send); set `lastWeeklySent`.
- `sendDailyReport(targetDate)` — read that date's `Daily Log` row, build, `notify()`; once-per-date guard.
- `sendWeeklyReport()` (backstop) — read overall % + per-quest from sheet, build, `notify()`; once-per-week guard.
- One-off-trigger handler — `sendDailyReport(storedDate)`, then delete spent triggers in `finally`.
- `setupTriggers()` — register recurring time-triggers: daily 00:15 IST, weekly Monday 00:15 IST.

### Message format (CallMeBot plain text; `*bold*`, `%0A` newlines)
```
🦸 Anurag — Daily Report · Mon 16 Jun
Score 82%
✅ Done: Workout · Meditation · Deep work 2h
❌ Missed: Read 30 min
```
```
🦸 Anurag — Weekly Report · 10–16 Jun
Score 78%   XP +0
✅ Nailed: Workout 100% · Meditation 86%
⚠️ Slipped: Reading 40% · Sales calls 0%
```

## One-Time Setup (manual, by user)
1. Anurag messages the CallMeBot number once to opt in and get his API key. (Wife does the same later.)
2. GAS **Script Properties**: `CALLMEBOT_RECIPIENTS` = `[{ "phone": "+91...", "apikey": "...", "name": "Anurag" }]` (one entry now), optional `WENT_WRONG_THRESHOLD`, `REPORT_ERROR_EMAIL`.
3. Run `setupTriggers()` once in the Apps Script editor.
4. Redeploy the GAS web app as a new version (URL unchanged).

## Known Limitations
- The **weekly time-trigger backstop** still depends on the sprint having been submitted. Auto-submit rides the app-open interval, so if the app isn't opened around Sunday midnight, the weekly sheet data is stale until next open (manual end-mission avoids this — it sends immediately). Out of scope to fix now.
- CallMeBot is a third-party relay (occasional downtime, ~1 msg/min). Mitigated by CC-to-self (Anurag is a recipient) + failure email, not eliminated.

## Verification
1. **App write**: check off a daily quest → next state POST body includes `_daily` with correct named `done`/`missed` (DevTools Network), and `Daily Log` shows an upserted row for today.
2. **notify()**: run `sendDailyReport()` manually in the Apps Script editor → Anurag's phone receives the message; verify the failure path emails on a bad apikey.
3. **Daily Submit button**: tap it in Tracking Mode → day finalizes (`completedTodayIds` clears, `dailyFinalizedDate=today`), `Daily Log` row written, ~5 min later daily WhatsApp arrives. Confirm the 00:15 trigger does NOT resend that day.
3a. **Double-count guard (Risk #1)**: after a manual Daily Submit, advance past midnight (set device clock) → confirm `DAILY_RESET` does **not** append a second (0) score to `dailyCompletionHistory` and does **not** break the streak. Highest-value regression test.
3b. **Weekly race (Risk #2)**: end a mission → confirm the immediate weekly message shows the correct overall % (not 0/blank), proving it read the payload not a half-written sheet.
4. **Immediate weekly**: manually END & SUBMIT a sprint → weekly WhatsApp arrives right away; confirm the Monday trigger then dedups (no second copy).
5. **Triggers**: recurring daily/weekly exist (Apps Script → Triggers); spent one-off triggers are cleaned up; once-per-date / once-per-week guards prevent duplicates.
6. **Boundary**: confirm daily reset fires at IST 00:00 and the 00:15 daily send reports the correct (prior) day.
7. Build: `cd frontend && npx craco build`. Deploy (when ready): `npx gh-pages -d build`; redeploy GAS as a new version.
