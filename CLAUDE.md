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

## Update Ideas & Planned Features
All researched improvement ideas and implementation plans live in:
**`update-ideas.md`** (project root)

Read this file ONLY when the user explicitly asks about ideas, planned features, or what's next — not on every session start.
