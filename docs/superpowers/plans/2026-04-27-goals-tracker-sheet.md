# Goals Tracker Sheet Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Goals Tracker" sheet in Google Sheets that tracks per-quest mission history, weeks selected, and individual completion percentages — updated automatically on mission launch and sprint submit.

**Architecture:** Two new GAS actions (`track_goals_launch`, `track_goals_submit`) manage the "Goals Tracker" sheet. The frontend derives mission/goal names from the quest lookup at launch time, and calculates per-quest completion % at submit time. Per-quest daily tracking requires a new `questDailyCompletionCounts` field in `activeSprint` that gets updated during `DAILY_RESET`.

**Tech Stack:** Google Apps Script (server-side sheet ops), React Context reducer (frontend state)

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `gas-update-weekly-goals.gs` | Modify | Add `trackGoalsOnLaunch()` and `trackGoalsOnSubmit()` GAS functions + route in `doPost` |
| `frontend/src/context/AppContext.js` | Modify | Add `questDailyCompletionCounts` to state, update `DAILY_RESET`/`LAUNCH_MISSION`/`SUBMIT_MISSION`/`AUTO_SUBMIT_SPRINT` reducers, add effects for new pending states |

---

## Data Flow

**On LAUNCH_MISSION:**
1. For each selected quest, derive: `mission` (goal.name for hardcoded, `room.name + "(custom goal)"` for custom), `goal` (quest.text)
2. Send `{ action: 'track_goals_launch', quests: [{mission, goal}, ...] }` to GAS
3. GAS: for each quest, find existing row by Mission (col A) + Goal (col B) match. If found, increment No of Weeks (col C). If not found, append new row with No of Weeks = 1.

**On DAILY_RESET:**
1. For each daily quest in `selectedQuestIds`, if it's in `completedTodayIds`, increment its count in `questDailyCompletionCounts`

**On SUBMIT_MISSION / AUTO_SUBMIT_SPRINT:**
1. Calculate per-quest %:
   - **Daily quest:** `(questDailyCompletionCounts[id] + (completedToday ? 1 : 0)) / (dailyCompletionHistory.length + 1) * 100`
   - **Weekly quest:** `completedWeeklyIds.includes(id) ? 100 : 0`
2. Send `{ action: 'track_goals_submit', quests: [{mission, goal, percentage}, ...] }` to GAS
3. GAS: for each quest, find row by Mission + Goal, update Recent % (col E) = this week's %, recalculate Average % (col D) = `((oldAvg * (weeks - 1)) + newPct) / weeks`

---

### Task 1: GAS — Add `track_goals_launch` action

**Files:**
- Modify: `gas-update-weekly-goals.gs`

- [ ] **Step 1: Add the `trackGoalsOnLaunch` function**

Add after `updateGoalsOnSubmit` (line 128):

```javascript
/**
 * Goals Tracker: On mission launch, add new quests or increment No of Weeks for existing ones.
 * Payload: { action: 'track_goals_launch', quests: [{mission, goal}, ...] }
 */
function trackGoalsOnLaunch(ss, data) {
  var sheet = ss.getSheetByName('Goals Tracker');

  if (!sheet) {
    sheet = ss.insertSheet('Goals Tracker');
    sheet.appendRow(['Mission', 'Goal', 'No of Weeks', 'Average %', 'Recent %']);
    sheet.getRange(1, 1, 1, 5).setFontWeight('bold');
  }

  var quests = data.quests || [];
  if (quests.length === 0) return;

  var lastRow = sheet.getLastRow();
  var existingData = lastRow >= 2
    ? sheet.getRange(2, 1, lastRow - 1, 5).getValues()
    : [];

  for (var i = 0; i < quests.length; i++) {
    var mission = quests[i].mission;
    var goal = quests[i].goal;
    var found = false;

    for (var r = 0; r < existingData.length; r++) {
      if (existingData[r][0] === mission && existingData[r][1] === goal) {
        var rowNum = r + 2;
        var currentWeeks = existingData[r][2] || 0;
        sheet.getRange(rowNum, 3).setValue(currentWeeks + 1);
        existingData[r][2] = currentWeeks + 1;
        found = true;
        break;
      }
    }

    if (!found) {
      sheet.appendRow([mission, goal, 1, '', '']);
      existingData.push([mission, goal, 1, '', '']);
    }
  }
}
```

- [ ] **Step 2: Route the action in `doPost`**

Add this block in `doPost`, after the `update_goals` block (after line 28) and before the `log` block:

```javascript
    // Goals Tracker: update on mission launch
    if (data.action === 'track_goals_launch') {
      trackGoalsOnLaunch(ss, data);
      return ContentService.createTextOutput(
        JSON.stringify({ status: 'tracker_launch_logged' })
      ).setMimeType(ContentService.MimeType.JSON);
    }
```

- [ ] **Step 3: Commit**

```bash
git add gas-update-weekly-goals.gs
git commit -m "feat(gas): add track_goals_launch action for Goals Tracker sheet"
```

---

### Task 2: GAS — Add `track_goals_submit` action

**Files:**
- Modify: `gas-update-weekly-goals.gs`

- [ ] **Step 1: Add the `trackGoalsOnSubmit` function**

Add after `trackGoalsOnLaunch`:

```javascript
/**
 * Goals Tracker: On sprint submit, update Recent % and recalculate Average % for each quest.
 * Payload: { action: 'track_goals_submit', quests: [{mission, goal, percentage}, ...] }
 */
function trackGoalsOnSubmit(ss, data) {
  var sheet = ss.getSheetByName('Goals Tracker');
  if (!sheet) return;

  var quests = data.quests || [];
  if (quests.length === 0) return;

  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return;

  var existingData = sheet.getRange(2, 1, lastRow - 1, 5).getValues();

  for (var i = 0; i < quests.length; i++) {
    var mission = quests[i].mission;
    var goal = quests[i].goal;
    var pct = quests[i].percentage || 0;

    for (var r = 0; r < existingData.length; r++) {
      if (existingData[r][0] === mission && existingData[r][1] === goal) {
        var rowNum = r + 2;
        var weeks = existingData[r][2] || 1;
        var oldAvgStr = String(existingData[r][3]).replace('%', '');
        var oldAvg = oldAvgStr === '' ? 0 : parseFloat(oldAvgStr) || 0;

        var newAvg;
        if (weeks <= 1) {
          newAvg = pct;
        } else {
          newAvg = Math.round(((oldAvg * (weeks - 1)) + pct) / weeks);
        }

        sheet.getRange(rowNum, 4).setValue(newAvg + '%');
        sheet.getRange(rowNum, 5).setValue(pct + '%');
        break;
      }
    }
  }
}
```

- [ ] **Step 2: Route the action in `doPost`**

Add after the `track_goals_launch` routing block:

```javascript
    // Goals Tracker: update on sprint submit
    if (data.action === 'track_goals_submit') {
      trackGoalsOnSubmit(ss, data);
      return ContentService.createTextOutput(
        JSON.stringify({ status: 'tracker_submit_updated' })
      ).setMimeType(ContentService.MimeType.JSON);
    }
```

- [ ] **Step 3: Commit**

```bash
git add gas-update-weekly-goals.gs
git commit -m "feat(gas): add track_goals_submit action to update Goals Tracker percentages"
```

---

### Task 3: Frontend — Add per-quest daily tracking to state

**Files:**
- Modify: `frontend/src/context/AppContext.js`

- [ ] **Step 1: Add `questDailyCompletionCounts` to `initialState.activeSprint`**

In `initialState` (around line 67), add the new field to `activeSprint`:

```javascript
  activeSprint: {
    selectedQuestIds: [],
    completedTodayIds: [],
    completedWeeklyIds: [],
    sprintStartDate: null,
    yesterdayProgress: null,
    dailyCompletionHistory: [],
    questDailyCompletionCounts: {},
  },
```

- [ ] **Step 2: Update `DAILY_RESET` reducer to track per-quest counts**

In the `DAILY_RESET` case (line 293), after `const updatedHistory = ...` (line 306), add per-quest tracking. Then update the return to include the new counts:

After line 306 (`const updatedHistory = ...`), add:

```javascript
      const updatedQuestCounts = { ...(activeSprint.questDailyCompletionCounts || {}) };
      dailyIds.forEach(id => {
        if (!updatedQuestCounts[id]) updatedQuestCounts[id] = 0;
        if (completedTodayIds.includes(id)) updatedQuestCounts[id]++;
      });
```

Then update the return's `activeSprint` spread (line 325) to include `questDailyCompletionCounts: updatedQuestCounts`:

```javascript
        activeSprint: { ...activeSprint, completedTodayIds: [], yesterdayProgress: yp, dailyCompletionHistory: updatedHistory, questDailyCompletionCounts: updatedQuestCounts },
```

- [ ] **Step 3: Update `RESET_SPRINT` to include `questDailyCompletionCounts: {}`**

In the `RESET_SPRINT` case (line 332), add the field to the reset activeSprint:

```javascript
        activeSprint: {
          selectedQuestIds: [],
          completedTodayIds: [],
          completedWeeklyIds: [],
          sprintStartDate: null,
          yesterdayProgress: null,
          dailyCompletionHistory: [],
          questDailyCompletionCounts: {},
        },
```

- [ ] **Step 4: Commit**

```bash
cd frontend && git add src/context/AppContext.js && git commit -m "feat: add per-quest daily completion tracking to activeSprint state"
```

---

### Task 4: Frontend — Update LAUNCH_MISSION to send tracker data

**Files:**
- Modify: `frontend/src/context/AppContext.js`

- [ ] **Step 1: Build tracker quest data in LAUNCH_MISSION**

In the `LAUNCH_MISSION` case (line 158), after `const goalNames = ...` (line 163), build the tracker payload. A quest is custom if its goal ID contains `custom`:

```javascript
      const trackerQuests = activeSprint.selectedQuestIds.map(id => {
        const entry = lookup[id];
        if (!entry) return null;
        const isCustom = entry.goal.id.includes('custom');
        return {
          mission: isCustom ? entry.room.name + '(custom goal)' : entry.goal.name,
          goal: entry.quest.text,
        };
      }).filter(Boolean);
```

Then add `_pendingTrackerLaunch: { quests: trackerQuests }` to the returned state object (alongside `_pendingGoalLog`):

```javascript
      return {
        ...state,
        appView: 'tracking',
        launchError: null,
        activeSprint: { ...activeSprint, sprintStartDate: new Date().toISOString() },
        _pendingGoalLog: { goalNames },
        _pendingTrackerLaunch: { quests: trackerQuests },
      };
```

- [ ] **Step 2: Add `_CLEAR_TRACKER_LAUNCH` reducer case**

Add after the `_CLEAR_GOAL_LOG` case (line 174):

```javascript
    case '_CLEAR_TRACKER_LAUNCH':
      return { ...state, _pendingTrackerLaunch: null };
```

- [ ] **Step 3: Add effect to fire `track_goals_launch` GAS call**

Add after the existing `_pendingGoalLog` effect (after line 485):

```javascript
  // ── 2d. Log goals to "Goals Tracker" sheet on mission launch ───────────────
  useEffect(() => {
    if (!state._pendingTrackerLaunch) return;
    postToGAS({ action: 'track_goals_launch', quests: state._pendingTrackerLaunch.quests });
    dispatch({ type: '_CLEAR_TRACKER_LAUNCH' });
  }, [state._pendingTrackerLaunch]);
```

- [ ] **Step 4: Exclude `_pendingTrackerLaunch` from persisted state**

In the state save effect (line 450), add `_pendingTrackerLaunch` to the destructured exclusions:

```javascript
    const { appView, launchError, submissionResult, autoSubmittedMessage, _pendingLog, _pendingGoalLog, _pendingTrackerLaunch, ...toSave } = state;
```

- [ ] **Step 5: Commit**

```bash
cd frontend && git add src/context/AppContext.js && git commit -m "feat: send tracker launch data to Goals Tracker sheet on mission launch"
```

---

### Task 5: Frontend — Update SUBMIT_MISSION and AUTO_SUBMIT to send per-quest percentages

**Files:**
- Modify: `frontend/src/context/AppContext.js`

- [ ] **Step 1: Add per-quest % calculation to `SUBMIT_MISSION`**

In the `SUBMIT_MISSION` case (line 176), after the existing `const percentage = ...` (line 196) and before `const isPerfect = ...` (line 197), add per-quest tracker computation:

```javascript
      const trackerQuests = selectedQuestIds.map(id => {
        const entry = lookup[id];
        if (!entry) return null;
        const isCustom = entry.goal.id.includes('custom');
        const missionName = isCustom ? entry.room.name + '(custom goal)' : entry.goal.name;
        let questPct;
        if (entry.quest.frequency === 'Daily') {
          const prevCount = (activeSprint.questDailyCompletionCounts || {})[id] || 0;
          const todayDone = completedTodayIds.includes(id) ? 1 : 0;
          const totalDays = allDailyScores.length; // already includes today
          questPct = totalDays > 0 ? Math.round(((prevCount + todayDone) / totalDays) * 100) : 0;
        } else {
          questPct = completedWeeklyIds.includes(id) ? 100 : 0;
        }
        return { mission: missionName, goal: entry.quest.text, percentage: questPct };
      }).filter(Boolean);
```

Then add `_pendingTrackerSubmit: { quests: trackerQuests }` to the returned state:

```javascript
        _pendingTrackerSubmit: { quests: trackerQuests },
```

(Add it next to `_pendingLog` in the return object.)

- [ ] **Step 2: Add the same per-quest % calculation to `AUTO_SUBMIT_SPRINT`**

In the `AUTO_SUBMIT_SPRINT` case (line 214), add the identical per-quest calculation after `const percentage = ...` (line 240):

```javascript
      const trackerQuests = selectedQuestIds.map(id => {
        const entry = lookup[id];
        if (!entry) return null;
        const isCustom = entry.goal.id.includes('custom');
        const missionName = isCustom ? entry.room.name + '(custom goal)' : entry.goal.name;
        let questPct;
        if (entry.quest.frequency === 'Daily') {
          const prevCount = (activeSprint.questDailyCompletionCounts || {})[id] || 0;
          const todayDone = completedTodayIds.includes(id) ? 1 : 0;
          const totalDays = allDailyScores.length;
          questPct = totalDays > 0 ? Math.round(((prevCount + todayDone) / totalDays) * 100) : 0;
        } else {
          questPct = completedWeeklyIds.includes(id) ? 100 : 0;
        }
        return { mission: missionName, goal: entry.quest.text, percentage: questPct };
      }).filter(Boolean);
```

Then add `_pendingTrackerSubmit: { quests: trackerQuests }` to the returned state (next to `_pendingLog`).

- [ ] **Step 3: Add `_CLEAR_TRACKER_SUBMIT` reducer case**

Add after `_CLEAR_TRACKER_LAUNCH`:

```javascript
    case '_CLEAR_TRACKER_SUBMIT':
      return { ...state, _pendingTrackerSubmit: null };
```

- [ ] **Step 4: Add effect to fire `track_goals_submit` GAS call**

Add after the `_pendingTrackerLaunch` effect:

```javascript
  // ── 2e. Update Goals Tracker with per-quest % on sprint submit ─────────────
  useEffect(() => {
    if (!state._pendingTrackerSubmit) return;
    postToGAS({ action: 'track_goals_submit', quests: state._pendingTrackerSubmit.quests });
    dispatch({ type: '_CLEAR_TRACKER_SUBMIT' });
  }, [state._pendingTrackerSubmit]);
```

- [ ] **Step 5: Exclude `_pendingTrackerSubmit` from persisted state**

Update the destructuring in the state save effect to also exclude `_pendingTrackerSubmit`:

```javascript
    const { appView, launchError, submissionResult, autoSubmittedMessage, _pendingLog, _pendingGoalLog, _pendingTrackerLaunch, _pendingTrackerSubmit, ...toSave } = state;
```

- [ ] **Step 6: Also add `questDailyCompletionCounts: {}` to the activeSprint reset in both SUBMIT_MISSION and AUTO_SUBMIT_SPRINT**

In SUBMIT_MISSION (line 209), the activeSprint reset already clears everything. Verify it includes the new field:

```javascript
        activeSprint: { selectedQuestIds: [], completedTodayIds: [], completedWeeklyIds: [], sprintStartDate: null, yesterdayProgress: null, dailyCompletionHistory: [], questDailyCompletionCounts: {} },
```

Same for AUTO_SUBMIT_SPRINT (line 253):

```javascript
        activeSprint: { selectedQuestIds: [], completedTodayIds: [], completedWeeklyIds: [], sprintStartDate: null, yesterdayProgress: null, dailyCompletionHistory: [], questDailyCompletionCounts: {} },
```

- [ ] **Step 7: Commit**

```bash
cd frontend && git add src/context/AppContext.js && git commit -m "feat: calculate per-quest completion % and send to Goals Tracker on submit"
```

---

## Deployment Note

After all code changes, the GAS script must be manually updated:
1. Open Google Apps Script editor for the project
2. Replace the script contents with updated `gas-update-weekly-goals.gs`
3. Deploy as new version (Deploy > New deployment or Manage deployments > edit > new version)

The frontend changes deploy with the normal `cd frontend && npx craco build && npx gh-pages -d build` flow.
