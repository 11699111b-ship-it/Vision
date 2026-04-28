# Sheet-Based Goals Configuration Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Google Sheets the source of truth for ALL goals/quests — user can add, remove, and organize goals directly in the sheet, and the app reflects those changes on load.

**Architecture:** A flat "Goals Config" sheet (one row per quest) replaces hardcoded goals in `blueprint.js`. App fetches this sheet on every load via GAS `doGet`, groups rows by Room ID, and injects them into a skeleton blueprint. Floor/room structure stays in code; goal/quest content comes from the sheet. Custom goals created in-app also write back to the sheet.

**Tech Stack:** Google Apps Script, React Context, localStorage cache for offline fallback.

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `gas-update-weekly-goals.gs` | Modify | Add `populateGoalsConfig()`, `doGet` goals_config handler, `doPost` add_goal_config handler |
| `frontend/src/data/blueprint.js` | Modify | Remove hardcoded goals, keep floor/room skeleton |
| `frontend/src/context/AppContext.js` | Modify | Add `fetchGoalsConfig()`, `LOAD_GOALS_CONFIG` reducer, update `ADD_CUSTOM_GOAL` to write to sheet |

---

## Sheet Structure

A new sheet called **"Goals Config"** with flat rows — one row per quest:

```
| Room ID | Room Name | Goal ID | Goal Name | Quest ID | Quest Text | Frequency | Tag |
|---------|-----------|---------|-----------|----------|------------|-----------|-----|
| f0-rA   | Physical Health | f0-rA-g0 | Overall Body Mastery | f0-rA-g0-q0 | 45-minute physical training | Daily | Daily Power-Up |
| f0-rA   | Physical Health | f0-rA-g0 | Overall Body Mastery | f0-rA-g0-q1 | Hit strict protein targets | Daily | Daily Power-Up |
| f0-rA   | Physical Health | f0-rA-g1 | High on Energy... | f0-rA-g1-q0 | 15 mins direct sunlight... | Daily | Daily Power-Up |
| ...     |                 |          |                      |              |                            |       |                |
```

**Why flat rows:** Easy to edit in Sheets — add a row to add a quest, delete a row to remove one. No merged cells, no complex hierarchy. Room ID + Goal ID columns group things naturally.

**Why include IDs:** Quest IDs are referenced in `selectedQuestIds`, `completedTodayIds`, Goals Tracker sheet, etc. Stable IDs prevent breaking existing data. For new goals added via sheet, the user assigns an ID following the existing pattern.

### Sync Direction: Sheet -> App (one-way read)

- App fetches "Goals Config" sheet on every load (replaces the hardcoded blueprint goals)
- Floor structure (floor names, room icons, locked status) stays in `blueprint.js` as a skeleton
- The sheet provides ALL goal/quest content — no more distinction between "hardcoded" and "custom" goals
- In-app custom goal creation (`ADD_CUSTOM_GOAL`) writes to the sheet AND adds locally

### Loading Flow

```
App Load
  -> Load skeleton blueprint (floors + rooms, no goals)
  -> Fetch "Goals Config" sheet from GAS (new doGet param: ?action=goals_config)
  -> Parse rows into goals/quests, group by Room ID
  -> Inject into skeleton blueprint's rooms
  -> Continue with normal LOAD_STATE for sprint data
  -> Fallback: if GAS fetch fails, use localStorage cached blueprint (offline resilience)
```

---

## Implementation Tasks

### Task 1: Create GAS "Goals Config" sheet + populate script

**Files:**
- Modify: `gas-update-weekly-goals.gs`

- [ ] **Step 1: Add `populateGoalsConfig()` function**

One-time function that creates "Goals Config" sheet and populates it with all existing blueprint quests as flat rows. The blueprint data is provided as a JSON constant within the function.

- [ ] **Step 2: Add `doGet` handler for `?action=goals_config`**

When `doGet` receives `?action=goals_config`, read all rows from "Goals Config" sheet and return as JSON array of objects with keys: roomId, roomName, goalId, goalName, questId, questText, frequency, tag.

- [ ] **Step 3: Add `doPost` handler for `action === 'add_goal_config'`**

Append a new quest row to the "Goals Config" sheet when a custom goal is created in-app.

- [ ] **Step 4: Commit**

### Task 2: Slim down blueprint.js to skeleton

**Files:**
- Modify: `frontend/src/data/blueprint.js`

- [ ] **Step 1: Remove all hardcoded goals from rooms**

Keep floor/room structure (id, name, icon, locked) but set `goals: []` for every room. Keep `customGoals: []` on each room. Export `EP_COSTS` as-is.

- [ ] **Step 2: Commit**

### Task 3: Add goals config fetch to AppContext

**Files:**
- Modify: `frontend/src/context/AppContext.js`

- [ ] **Step 1: Add `fetchGoalsConfig()` async function**

Calls `GAS_URL?action=goals_config`, parses response, groups rows by Room ID, builds goal objects with quests array.

- [ ] **Step 2: Add `LOAD_GOALS_CONFIG` reducer action**

Merges fetched goals into blueprint rooms by matching Room ID.

- [ ] **Step 3: Wire into load effect**

After loading state, fetch goals config and dispatch `LOAD_GOALS_CONFIG`. Cache in localStorage as `superhero_goals_config` for offline fallback. If fetch fails, use cached version.

- [ ] **Step 4: Commit**

### Task 4: Update ADD_CUSTOM_GOAL to write to sheet

**Files:**
- Modify: `frontend/src/context/AppContext.js`

- [ ] **Step 1: Fire GAS call on custom goal creation**

When `ADD_CUSTOM_GOAL` is dispatched, also fire `postToGAS({ action: 'add_goal_config', ... })` to append the new quest to the "Goals Config" sheet.

- [ ] **Step 2: Commit**

### Task 5: Initial population

- [ ] **Step 1: Run `populateGoalsConfig()` in GAS editor**
- [ ] **Step 2: Verify app loads correctly from sheet**

---

## Key Decisions

| Decision | Choice | Why |
|----------|--------|-----|
| One row per quest (flat) | Yes | Easy to edit, sort, filter in Sheets |
| IDs in sheet | Explicit columns | Prevents breaking existing sprint data |
| Skeleton blueprint in code | Keep floors/rooms | Icons, locked status, floor order rarely change |
| Fetch timing | Every app load | Always up-to-date; cached in localStorage for offline |
| Custom goal flow | Write to sheet + local | Bidirectional for in-app creation |

## Verification

1. Populate sheet via GAS function, verify all ~100 quests appear organized by room
2. App loads and shows all goals from sheet (not from code)
3. Add a new goal row in the sheet, refresh app — new goal appears in correct room
4. Delete a goal row in the sheet, refresh app — goal disappears
5. Create custom goal in-app — appears in sheet AND in app
6. Test offline: disable network, app still loads from localStorage cache
7. Test active sprint: existing `selectedQuestIds` still resolve correctly
8. Build succeeds: `npx craco build`
