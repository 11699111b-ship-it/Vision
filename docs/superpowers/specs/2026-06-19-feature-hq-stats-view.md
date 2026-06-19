# Feature: HQ icon → stats view (replace the building)

**Status:** Designed (decisions captured), not started. Build after the sync fix is verified + merged.
**Type:** Feature — UI + small state addition. Fully client-side, **no GAS/sheet changes**.

## Intent
The "VISIT HQ" / home icon currently opens `HQVisitMode` (BASE INSPECTION), which shows the
`Building` facade. Replace the building with a **stats panel** so tapping the icon shows progress
instead of the building visual.

## What to show (decisions already made with user)
1. **This-week running %** — weighted completion of the *current* sprint so far. Reuse the
   `SUBMIT_MISSION` formula (avg of `dailyCompletionHistory` + today's live daily score, weighted
   with weekly tasks done) so the number equals what submitting right now would score.
   - User chose "this week's running total" over lifetime average.
2. **Day-by-day %** — list each logged day from `activeSprint.dailyCompletionHistory` plus today's
   live `dailyProgress`, e.g. `Mon 80% · Tue 100% · Wed 60% · Thu (live) 50%`. Show all days inline
   (sprint is max 7 days, so no scroll needed).
3. **Last sprint %** — the previous completed sprint's final percentage.

## Required state change
`submissionResult` is cleared after submit and never persisted, so last-sprint % is currently lost.
Add a persisted field `lastSprintResult: { percentage, weekRange }` (or similar), set in
`SUBMIT_MISSION` **and** `AUTO_SUBMIT_SPRINT`. Show "—" until the first sprint completes.

## Implementation notes
- Edit `frontend/src/components/HQVisitMode.jsx`: keep the "BASE INSPECTION" header and the
  `RETURN TO PROTOCOL` button; replace the `<Building />` block + "ROOMS GLOWING…" caption with the
  stats panel. The right-side return panel can stay.
- Pull data from `useAppContext()`: `activeSprint.dailyCompletionHistory`, `dailyProgress`,
  `questLookup` (to compute the weighted current-week %), and the new `lastSprintResult`.
- Match existing visual style (Space Mono labels, #00E5FF accent, dark theme).

## Open questions for next session
- Exact label/format for each stat block; whether to show a tiny sparkline for day-by-day.
- Keep the building accessible anywhere else, or remove it entirely?

## Verification
- New sprint, no history yet → this-week shows current day, last-sprint shows "—".
- After a few `DAILY_RESET`s → day-by-day lists each day's score.
- After a submit → last-sprint % populates and persists across reloads.
