# Spec: Focus Mode Panel

## Overview
Adds a collapsible "Focus Mode" section to the CommandCenter planning screen, sitting between Smart Loadouts and the All Floors accordion. Users create 1–2 word focus labels (JOB, BODY, SITE…) as cards, map existing blueprint quests to each focus, and bulk-add all linked quests to the sprint with one tap. The All Floors accordion gains a collapsible header so it can be hidden when Focus Mode covers the week's planning. The EP bar moves above Smart Loadouts so budget is always the first visible signal. Focus items persist in localStorage and sync to GAS alongside existing state.

## Depends on
None — standalone addition to existing planning flow.

## Routes
No new routes. This is a React SPA — all changes are component and state-level.

## Database changes
No traditional database. GAS state payload gains one new field:

| Field | Type | Description |
|---|---|---|
| `focusItems` | `Array<{id, name, linkedQuestIds[]}>` | Persisted with existing lightweight state POST to GAS |

GAS `doPost` state handler requires no changes — `focusItems` is included in the payload alongside existing fields and written to Sheet "State" cell A1 as part of the full JSON blob.

## Component changes

### Modify: `frontend/src/components/CommandCenter.jsx`
- **Reorder**: Move EP budget strip above `<LoadoutsPanel />` (currently below it)
- **Add**: `<FocusModePanel />` component between LoadoutsPanel and the floors list
- **Modify**: Wrap all `<FloorSection>` rows in a collapsible `<AllFloorsSection>` with a header chevron matching the Focus Mode collapse pattern

### New subcomponent (inside CommandCenter.jsx): `FocusModePanel`
Renders:
- Collapsible header: chevron + "FOCUS MODE" title + "+ ADD" button
- 2-column card grid of focus items
- Each card: bold 1–2 word name (neon green), quest count, "+ Add to sprint" action, "map" action, "×" delete button (top-right)
- Empty-state card variant: dimmed, orange "no quests yet" label, "+ map quests" CTA instead of "+ Add to sprint"
- Inline add form (toggled by "+ ADD"): short text input → creates empty focus card
- Quest mapper overlay: tapping "map" on a card opens a full-screen overlay showing the blueprint accordion (floors → rooms → goals → quests); tapping a quest toggles it linked/unlinked for that focus; already-linked quests shown with green checkmark

### Modify: `frontend/src/context/AppContext.js`
- **State shape**: Add `focusItems: []` to `initialState`
- **Reducer cases**:
  - `ADD_FOCUS` — `{ name }` → appends `{ id: 'focus-' + Date.now(), name: name.trim().toUpperCase(), linkedQuestIds: [] }`
  - `DELETE_FOCUS` — `{ focusId }` → removes from array
  - `TOGGLE_QUEST_IN_FOCUS` — `{ focusId, questId }` → adds or removes questId from that focus's linkedQuestIds
  - `ADD_FOCUS_TO_SPRINT` — `{ focusId }` → dispatches effectively same as LOAD_LOADOUT but merges (doesn't replace) selectedQuestIds, respects 20 EP cap, skips already-selected quests
- **Persistence**: `focusItems` included in the lightweight GAS POST payload and in localStorage save (already handled by the existing "save full state to localStorage on every dispatch" pattern)
- **GAS GET hydration**: `focusItems` already round-trips since it's part of the state JSON blob in Sheet "State" A1

## Files to change
| File | Change |
|---|---|
| `frontend/src/components/CommandCenter.jsx` | Reorder EP row; import and render FocusModePanel; wrap floors in collapsible AllFloorsSection |
| `frontend/src/context/AppContext.js` | Add focusItems to initialState; add 4 reducer cases; include focusItems in GAS POST payload |

## Files to create
CommandCenter.jsx is already 587 lines — adding Focus Mode inline would push it past the 750-line cap. Extract into two new files:

| File | Contents |
|---|---|
| `frontend/src/components/FocusModePanel.jsx` | FocusModePanel, FocusCard, AddFocusForm subcomponents |
| `frontend/src/components/QuestMapperOverlay.jsx` | Full-screen overlay with blueprint accordion; shows linked state per focus, not sprint selected state |

## New dependencies
None.

## Rules for implementation
- No changes to TrackingMode, HQVisitMode, WelcomeScreen, or GAS script
- Do not touch the existing receipt bar (mobile) or building panel (desktop) — selected quest display must remain exactly as-is
- FocusModePanel reads `focusItems` and `questLookup` from `useAppContext()` — no prop drilling
- `ADD_FOCUS_TO_SPRINT` must merge into existing selectedQuestIds (not replace) and must respect the 20 EP cap; quests that would exceed the cap are silently skipped
- Collapse state (Focus Mode open/closed, All Floors open/closed) is local React state only — not persisted
- Focus Mode is expanded by default; All Floors is expanded by default (no change to existing behaviour)
- All Floors section header label: "ALL FLOORS" in Space Mono, same muted style as existing floor F-labels
- Focus card name is stored and displayed uppercase; input is auto-uppercased on submit
- Delete focus card requires no confirmation dialog — just removes immediately (low blast radius, easy to re-add)
- QuestMapperOverlay cannot reuse QuestCard directly — QuestCard reads `activeSprint.selectedQuestIds` for check state. QuestMapperOverlay renders its own quest rows where checked = `focus.linkedQuestIds.includes(quest.id)`; dispatches `TOGGLE_QUEST_IN_FOCUS` on tap; does not affect `activeSprint.selectedQuestIds`
- IST time, GAS URL, EP_COSTS, MAX_EP — all consumed from existing AppContext exports, no duplication
- Hard cap: CommandCenter.jsx must not exceed 750 lines; extract FocusModePanel and QuestMapperOverlay into separate files if the file grows past that

## Definition of done
- [ ] EP bar appears above Smart Loadouts pills on the planning screen
- [ ] "FOCUS MODE" section appears below Smart Loadouts with a collapse chevron; clicking header toggles content
- [ ] "+ ADD" button in Focus Mode header opens an inline text input; submitting a name creates a new card; pressing × or submitting empty cancels
- [ ] New focus card appears in 2-column grid with name (uppercase), "no quests yet" in orange, and "+ map quests" CTA
- [ ] Tapping "map" on a card opens a full-screen overlay showing all blueprint floors/rooms/quests; tapping a quest links it; tapping again unlinks it; linked quests show a green checkmark; a "← DONE" button at the top closes the overlay
- [ ] Once quests are linked, card shows "N quests linked" and "+ Add to sprint" button appears
- [ ] Tapping "+ Add to sprint" adds all linked quests to the sprint (merges, doesn't replace); EP bar updates; already-selected quests are not double-added; quests that would exceed 20 EP are skipped
- [ ] Tapping "×" on a focus card removes it; its quest links are discarded; selectedQuestIds is NOT changed (quests already in sprint stay)
- [ ] "ALL FLOORS" label appears above the floor accordion with a collapse chevron; clicking toggles the floors list; floors themselves expand/collapse independently as before
- [ ] Mobile receipt bar still shows selected quests; desktop building panel still glows for active floors — no regression
- [ ] Focus items survive a page refresh (persisted in localStorage)
- [ ] Focus items sync to GAS on the normal 3s debounce alongside other state
- [ ] On a new device (no localStorage), focus items are restored from GAS GET on first load
