# Sheet-as-Single-Source-of-Truth Sync Rewrite

**Date:** 2026-06-19
**Branch:** `fix/sheet-sync-ssot`
**Type:** Bug fix (data loss)

## Symptom

Ticked **weekly** tasks disappear roughly once a day: tick on Wednesday → gone Thursday →
re-tick Thursday → gone Friday. Reported on the live iPhone PWA. Affects both genuinely-Weekly
tasks (SITE, COOK FOOD, INFLUENCE, EVENT) and Daily-configured tasks whose text says "per week".

## Investigation (evidence)

- `TOGGLE_COMPLETE` routes weekly quests to `completedWeeklyIds`, daily to `completedTodayIds`
  (`AppContext.js:179-195`). Correct in both repo **and** the live deployed bundle
  (`main.61aeb5e3.js`, verified by diffing the minified source).
- `DAILY_RESET` only clears `completedTodayIds`; `completedWeeklyIds` is preserved via spread in
  both branches (`AppContext.js:411-471`). Correct in repo and live bundle.
- The GAS script stores the whole state JSON in `State!A1` and returns it verbatim
  (`gas-update-weekly-goals.gs` `doPost`/`doGet`). No per-field logic drops completions.
- Live sheet read confirmed the **save works**: ticking COOK FOOD placed `focuscq-1781548001501`
  into `completedWeeklyIds` on the sheet within seconds.
- **Reproduction:** force-quitting and reopening the PWA produced *nondeterministic flapping* —
  reopen #1 showed all weekly ticks, #2 showed only one, #3 showed all again, then stabilized.

## Root cause

The app loads state from **two competing sources** on startup (`AppContext.js:712-754`):

1. **localStorage** — dispatched immediately.
2. **Google Sheet GET** — dispatched after, *if* `gasTimestamp > localTimestamp`.

This is a **blind whole-state, last-writer-wins** pick driven by a single coarse `lastSavedAt`.
The two sources diverge constantly because:

- the sheet POST is **debounced 3s** behind localStorage,
- the midnight `DAILY_RESET` writes a fresh timestamp,
- a stale second client (start-of-week browser session) can write a newer wall-clock timestamp.

When they diverge, the most volatile field — the completion arrays — flaps. Whichever snapshot
the arbitration happens to pick can be the one missing a recent weekly tick. Daily-tick losses
are invisible (they reset anyway), so only **weekly** losses are noticed, and the nightly reset
makes it look like a clean daily cadence.

## Decision

Make the **sheet the single source of truth**, with a reliable write path so the sheet is never
behind. localStorage is demoted from a competing authority to (a) an instant-paint cache and
(b) an offline write-ahead log. **Rejected** the union-merge alternative because it can resurrect
an unticked item (user explicitly declined that tradeoff).

## Design

### 1. Load — sheet wins, no timestamp arbitration
- Paint instantly from localStorage as **provisional** UI.
- Before trusting the sheet, honor the dirty-replay rule (step 3).
- When the sheet GET succeeds, **adopt the sheet state wholesale**. Remove the
  `gasTimestamp > localTimestamp` comparison and the `hadLocalData`/`localTimestamp` bookkeeping.
- If the GET fails (offline/timeout), keep the localStorage-painted state. localStorage is the
  offline fallback only — never a rival snapshot that wins over a successful sheet read.

### 2. Write — guarantee the sheet is never behind
- On `visibilitychange === 'hidden'` and `pagehide`, **flush the latest pending state immediately
  via `navigator.sendBeacon`** (form-encoded `payload=`), so an iOS suspend within the 3s debounce
  window cannot drop the write. Fall back to a keepalive `fetch` if `sendBeacon` is unavailable.
- Keep the existing 3s debounce for steady-state typing/toggling; the beacon covers the close race.

### 3. Offline safety — dirty-flag write-ahead (removes the untick tradeoff)
- On every state-changing save, set a `superhero_hq_dirty` flag in localStorage (alongside the
  state) and clear it only when a sheet POST is acknowledged (`status: success`).
- On startup, **before** trusting the sheet: if `dirty` is set, POST the local state to the sheet
  first (replay the unacknowledged write), wait for ack, then GET. If not dirty, GET directly.
- Result: a tick/untick is either already on the sheet, or replayed from the dirty cache before the
  read. Never lost, never resurrected — the sheet stays authoritative.

### 4. Foreground re-fetch — defeat the stale long-lived client
- On `visibilitychange === 'visible'` (app brought back to foreground), **re-fetch the sheet** and
  adopt it (same path as load, including the dirty-replay guard so a pending local write isn't
  clobbered).
- This stops a client that's been backgrounded for hours/days from holding stale state long enough
  to overwrite a tick/untick made elsewhere: it adopts the latest sheet *before* it can write.
- Cost: one extra GET per foreground. Debounce-guard so rapid hidden/visible toggles don't spam.

### Residual limitation (accepted)
Simultaneous **offline** edits on two devices → last device to flush wins. No conflict resolution
beyond that (would require per-field version vectors / CRDT — out of scope). Does not occur for the
single-iPhone-PWA + occasional-browser usage pattern.

## Affected code
- `frontend/src/context/AppContext.js` — load effect (rewrite arbitration + dirty replay), save
  effect (dirty flag + ack handling), new lifecycle effect (`sendBeacon` flush on hidden/pagehide,
  re-fetch on visible), `LOAD_STATE` (adopt-sheet semantics; revisit the `focusItems`
  keep-if-empty guard now that the sheet is authoritative).
- No GAS / sheet schema changes. `doPost` already returns `{status:'success'}` for ack; `doGet`
  already returns the full blob.

## Verification
- Tick a weekly task, force-quit + reopen the PWA repeatedly → tick persists every time (no flap).
- Tick, immediately lock the screen / swipe away within 1s → reopen → tick persists (beacon flush).
- Tick offline (airplane mode) → reopen online → tick persists (dirty replay).
- Untick a task → reopen repeatedly → stays unticked (no resurrection).
- Background the app, change the same task on another client, foreground → adopts latest (no stale
  overwrite).
- Cross the IST midnight boundary with a weekly tick set → tick survives the daily reset.
