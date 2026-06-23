# Superhero HQ — Project Instructions for Claude

## Context Loading
At the start of every session on this project, read these two files first:
- `PRD.md` — full product spec, state shape, GAS integration, sprint lifecycle
- `README.md` — tech stack, file map, build/deploy commands

They cover everything in ~400 lines. No need to explore the codebase blind.

## Key Files (read only when relevant to the task)
- `frontend/src/context/AppContext.js` — ALL app state (reducer, GAS sync + timestamp arbitration, daily reset, auto-submit, focusItems)
- `frontend/src/data/blueprint.js` — hardcoded 6-floor goal hierarchy
- `frontend/src/data/loadouts.js` — preset quest bundles
- `frontend/src/components/FocusModePanel.jsx` — Focus Mode cards (grouping layer over the blueprint)
- `frontend/src/components/QuestMapperOverlay.jsx` — full-screen overlay to map blueprint quests into a focus
- `frontend/src/hooks/usePersistentCollapse.js` — per-section collapse state persisted in localStorage
- `frontend/public/sw.js` — service worker: caching + IST notifications (9AM/10PM/Sun 8PM)
- `gas-update-weekly-goals.gs` — GAS script (deployed separately in Apps Script editor)

## Build & Deploy
```bash
cd frontend && npx craco build && npx gh-pages -d build
```
NOT `react-scripts` — this project uses craco.

## GAS Deployment
URL stays the same. To update the script: paste new code into Apps Script editor and redeploy as a new version. A curl POST returning "Page not found" HTML is expected (302 redirect after doPost processes — harmless).

## Debug overlay (kept, hidden by default)
On-screen sync diagnostics for phone PWAs (no tethered DevTools needed):
`frontend/src/utils/debugLog.js` (ring-buffer logger, `dbg()` calls live in `AppContext.js`'s
load/sync path) + `frontend/src/components/DebugOverlay.jsx` (renders the log).
- **Logging always runs** — cheap, capped ring buffer in localStorage (`hq_debug_log`).
- **The on-screen 🐞 button is hidden by default.** To reveal it: tap the top-right corner of
  the screen 5x within 2 seconds. Same gesture hides it again. State persists in
  `localStorage['hq_debug_enabled']`.
- Once revealed, tap 🐞 (bottom-left) to open the log viewer: refresh / clear / copy buttons.
- Useful for diagnosing sync flips/reverts — see the `fingerprint()`/`diffFingerprints()` helpers
  in `debugLog.js` for what's tracked (xp, streak, view, sprint state, doneToday, lastSavedAt).
- Don't strip this code casually — it's how the 2026-06-24 stale-sheet-read bug (tick reverting
  on restart) was diagnosed and confirmed fixed. Only remove if it becomes a maintenance burden.

## Update Ideas & Planned Features
All researched improvement ideas and implementation plans live in:
**`update-ideas.md`** (project root)

Read this file ONLY when the user explicitly asks about ideas, planned features, or what's next — not on every session start.

## 🔜 Next Session — Work Queue (added 2026-06-19)
Read these when resuming. Specs live in `docs/superpowers/specs/`:

1. **Sync data-loss bug — FIX DONE on branch `fix/sheet-sync-ssot`, NOT yet merged/deployed.**
   Live site was rolled back to old stable code. The fix (sheet = single source of truth +
   `sendBeacon` flush + dirty-replay + stale-client guard) is committed with passing tests but
   awaits the user's on-device verification before merge + deploy. Specs:
   `2026-06-19-sheet-sync-ssot-design.md`. Guard logic mirrored in `gas-update-weekly-goals.gs`
   (`shouldAcceptStateWrite`) and `frontend/src/utils/syncGuard.js` — **keep them in sync**;
   redeploying GAS requires pasting the script into the Apps Script editor.
2. **Feature — HQ stats view:** `2026-06-19-feature-hq-stats-view.md` (designed, no GAS change).
3. **Feature — daily↔weekly task flip (once/week):** `2026-06-19-feature-daily-weekly-flip.md`
   (designed, no GAS change).
4. **Feature — focus config in sheet, manual CRUD only:** `2026-06-19-feature-manual-focus-crud-sheet.md`
   (NEW — needs a brainstorming pass before building).

⚠️ SW cache name in `frontend/public/sw.js` must be bumped on every deploy (now
`superhero-hq-v3-...`) or returning PWAs serve stale bundles.
