# Learnings — Weekly-tick data-loss debugging (2026-06-19)

A long session debugging "ticked weekly tasks vanish ~daily on the iPhone PWA." Captured here so the
next person (or session) doesn't repeat the dead ends.

## What the bug actually was
- **Not** the reducer. `TOGGLE_COMPLETE` always routed weekly ticks to `completedWeeklyIds`, and
  `DAILY_RESET` always preserved them — verified in source *and* the live minified bundle, across
  every commit since the initial one.
- **Real cause #1 (load race):** the app loaded state from *two* sources on startup — localStorage
  and the Google Sheet — and picked one wholesale via a coarse `lastSavedAt` last-writer-wins. When
  they diverged (the sheet POST is debounced 3s; the midnight reset writes; a second client writes),
  the most volatile field — the completion arrays — flapped. A staler snapshot could win and drop a
  recent tick. Reopen→reopen showed different ticks: the smoking gun.
- **Real cause #2 (exposed after the first fix): multi-client clobber.** A backgrounded Safari tab
  still on the planning screen kept POSTing its no-sprint state, wiping the active sprint the PWA had
  launched ("tick works, then jumps to planning").

## The fix that stuck
1. **Sheet = single source of truth on load** (drop timestamp arbitration).
2. **Dirty-flag write-ahead:** mark localStorage dirty on save; on load, if dirty, replay local→sheet
   then keep local; else adopt the sheet. No merge → no lost ticks, no resurrected unticks
   (user explicitly rejected a union-merge for the resurrection risk).
3. **`sendBeacon` flush on hide** so an iOS suspend within the 3s debounce can't drop the write.
4. **Foreground re-fetch** so a backgrounded client adopts the sheet before it can write stale data.
5. **Server-side guard in GAS (`shouldAcceptStateWrite`)** — the robust one: a no-sprint write may
   NOT overwrite a stored active sprint unless it carries `_sprintEnded` (set by submit/auto-submit/
   reset). Enforced at the single funnel every client passes through, so it doesn't depend on client
   behaviour. Mirrored in `frontend/src/utils/syncGuard.js` (8 unit tests).

## Process learnings (what cost time / what to do next time)
1. **Get runtime evidence early.** Reading source proved the reducer correct but couldn't explain the
   symptom. Fetching the **live sheet state** (curl the GAS doGet) and **diffing the live minified
   bundle** against the repo are what actually localised the bug. Do this first for "works in code
   but not in prod" reports.
2. **A single empirical test beats more theory.** Asking the user to tick one task and re-reading the
   sheet instantly split "save broken" vs "load broken." Reach for that sooner.
3. **The PWA service worker is a first-class variable.** A *static* SW cache name means deploys don't
   reliably reach users — old and new bundles coexist and the app flaps between two code versions.
   **Always version the SW cache name per deploy** (now `superhero-hq-vN-<date>`; the activate handler
   deletes caches != current). A plain refresh can't clear a stale SW; only clearing website data /
   reinstalling does. An installed iOS PWA's storage is separate from Safari's.
4. **Do not iterate fixes on the user's live device.** Repeated redeploys created transition windows
   that *compounded* the confusion and eroded trust. Harden + cover with **offline unit tests**, then
   deploy once. (Rolled back to stable mid-session to stop the churn; added tests before redeploying.)
5. **Multi-client sync can't be fixed purely client-side.** Enforce the critical invariant at the
   shared backend (the sheet). Client guards help; the server guard is what guarantees it.
6. **Frontend and backend guards are a contract — deploy them together.** Shipping the GAS guard
   alone breaks submit on the old frontend (no `_sprintEnded` marker → legit clears rejected).
7. **Accepted residual:** simultaneous *offline* edits on two devices = last flush wins. No CRDT.

## Security note
The repo's git remote had a GitHub PAT embedded in the URL (plaintext in `.git/config`). Revoked it,
migrated to `gh` CLI auth (keychain) + `gh auth setup-git`. Never embed tokens in remote URLs.

## Deploy reminders
- `cd frontend && npx craco build && npx gh-pages -d build`. **Bump `public/sw.js` CACHE first.**
- GAS: paste `gas-update-weekly-goals.gs` into the Apps Script editor → Deploy → Manage deployments →
  edit → New version. URL is unchanged; the POST "Page not found" 302 is normal.
- Keep `shouldAcceptStateWrite` identical in the `.gs` and `frontend/src/utils/syncGuard.js`.
