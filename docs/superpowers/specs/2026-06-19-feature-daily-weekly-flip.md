# Feature: flip a task daily ↔ weekly mid-week (once only)

**Status:** Designed (decisions captured), not started. Build after the sync fix is verified + merged.
**Type:** Feature — reducer + UI. **No GAS/sheet schema changes** (the only sheet-touching field,
the D/W `type` in the weekly report, is cosmetic; Goals Tracker keys on mission+goal text).

## Intent
During an active week, let the user change a single task's frequency from Daily to Weekly or vice
versa — but **only once per task per sprint**. Useful when a task was created with the wrong
frequency (e.g. "Fully automate 2 tasks per week" was set Daily and resets every night).

## Decisions already made with user
- **"Going forward only"** semantics: the flip changes which section/tracking the task uses from
  that moment on. Days already logged are **not** retroactively recomputed (minor % imprecision,
  far simpler and predictable). User explicitly chose this over a strict recalc.
- **Once per sprint** per task — after flipping, the control is disabled for that task until the
  sprint ends.

## Design sketch
- Add to `activeSprint`:
  - `frequencyOverrides: { [questId]: 'Daily' | 'Weekly' }`
  - `frequencyFlipped: { [questId]: true }` (the once-guard)
- New helper `effectiveFreq(questId)` = `frequencyOverrides[id] ?? lookup[id].quest.frequency`.
  Thread it through every site that currently reads `quest.frequency` directly:
  - `TOGGLE_COMPLETE` (which completion list)
  - `TrackingMode` daily/weekly split (`dailyTasks` / `weeklyTasks`)
  - `DAILY_RESET` (`dailyIds`)
  - `SUBMIT_MISSION` + `AUTO_SUBMIT_SPRINT` (daily vs weekly contribution + per-quest `type`)
  - `DAILY_SUBMIT`
  - the `_daily` snapshot builder in `buildGasPayload` / save effect
- New reducer action `FLIP_FREQUENCY { questId }`:
  - no-op if `frequencyFlipped[questId]` already set
  - set the override to the opposite of the effective frequency, set the flipped guard
  - move the task's current completion between `completedTodayIds` / `completedWeeklyIds` so it
    lands sanely in its new section
- Reset `frequencyOverrides` + `frequencyFlipped` to `{}` everywhere `activeSprint` is hard-reset
  (SUBMIT, AUTO_SUBMIT, RESET) — ~4 spots.
- UI: a small "→ make weekly / make daily" control on each `TaskCard` in `TrackingMode`, disabled
  (e.g. shows "flipped") once used.

## Open questions for next session
- Exact placement/affordance of the flip control on the task card (icon vs text).
- Confirm "going forward only" is acceptable for the % math at submit (accepted in principle).

## Verification
- Flip a Daily task to Weekly mid-week → it moves to the Weekly section, survives the next
  `DAILY_RESET`, control becomes disabled.
- Try to flip the same task again → blocked.
- Submit → flip state cleared for the new sprint.
