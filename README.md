# Superhero HQ

A gamified weekly mission-planning PWA. Select goals from a 6-floor "building" blueprint, launch a weekly sprint, track daily/weekly completion, and log results to Google Sheets.

## Tech Stack

- **Frontend**: React 18 (CRA), Tailwind CSS, Framer Motion, Radix UI primitives
- **State**: `useReducer` + React Context (`AppContext`). Persisted to localStorage (instant) + Google Apps Script (cross-device).
- **Backend**: Google Apps Script (GAS) web app — stores state in a Google Sheet, logs weekly results. FastAPI backend exists but is unused by the app currently.
- **Hosting**: GitHub Pages (static build). PWA with service worker + offline support.
- **Audio**: Web Audio API — 8-bit chiptune background track + UI sound effects (boop, success, triumph).

## Project Structure

```
frontend/
  public/
    index.html          # viewport-fit=cover, apple-mobile-web-app meta, PWA manifest link
    manifest.json       # PWA manifest — standalone, portrait, dark theme
    sw.js               # Service worker — stale-while-revalidate caching + IST notification scheduling (9AM, 10PM daily; Sun 8PM) + Web Push handler
  src/
    App.js              # Root — wraps AppProvider > MusicProvider > AppContent
    App.css             # Minimal overrides (button transitions, motion-page)
    index.css           # Tailwind directives, CSS variables, safe-area classes, scrollbar, glow utilities

    context/
      AppContext.js      # ALL app state — reducer, GAS sync, daily reset, auto-submit, quest lookup
      MusicContext.js    # Music toggle state — play/pause/sync background track

    data/
      blueprint.js       # The 6-floor goal hierarchy: floors > rooms > goals > quests
      loadouts.js        # Preset quest-ID bundles: FOUNDER_GRIND, RECOVERY_WEEK

    components/
      WelcomeScreen.jsx  # Entry screen — background image, scan-line animation, ENTER button
      PlanningMode.jsx   # Split layout: Building (desktop left) + CommandCenter (right/full mobile). Top bar: HeroTag, EP, StreakBadge, MusicBtn. Desktop receipt has X buttons to unselect quests.
      CommandCenter.jsx  # Quest selection UI — loadouts, EP budget, FocusModePanel + All Floors accordion (both in one scroll area), launch button, custom quest form + delete buttons for custom goals. Mobile receipt bar with X buttons to unselect quests.
      FocusModePanel.jsx # Focus Mode — collapsible panel of focus cards (BODY/JOB/SITE...). Each card: collapsible, lists mapped + custom quests, tap to select into sprint, "map quests"/"add custom" actions, delete buttons.
      QuestMapperOverlay.jsx # Full-screen mobile-optimized overlay to map blueprint quests into a focus (edits linkedQuestIds). Uses QuestFilterBar for search. 44px touch targets, safe-area insets.
      QuestFilterBar.jsx # Search/filter input + filterFloors() helper for narrowing the blueprint tree in the mapper.
      TrackingMode.jsx   # Active sprint — progress ring, streak counter, daily/weekly task cards, submit button, confetti overlay. Top bar: StreakBadge, MusicBtn
      HQVisitMode.jsx    # Building inspection view + return button. Top bar: StreakBadge, MusicBtn
      Building.jsx       # Visual building facade — 6 floors of window panes that glow green when active
      ProgressRing.jsx   # SVG circular progress indicator
      VoltMascot.jsx     # Floating bot icon (bottom-right) with expandable chat bubble

    hooks/
      usePWA.js          # Service worker registration + notification permission request
      usePersistentCollapse.js # Per-section open/closed state persisted in localStorage (superhero_hq_collapse)
      use-toast.js       # Sonner toast hook (shadcn pattern)

    utils/
      istUtils.js        # IST timezone engine — date/hour helpers, sprint deadline calc, week range formatting
      audioEngine.js     # Web Audio API — tone generator, background melody scheduler, SFX functions

    lib/
      utils.js           # Tailwind cn() merge utility (clsx + tailwind-merge)
```

## Core Data Model

### Blueprint (blueprint.js)
6 floors, each with rooms, each with goals, each with quests:
```
Floor (f0-f5) → Room (rA, rB, ...) → Goal → Quest
```
- **Floor 0**: Health & Basics
- **Floor 1**: Focus & Time Management
- **Floor 2**: Learning & Thinking
- **Floor 3**: People & Relationships
- **Floor 4**: Business & Wealth
- **Floor 5**: Rewards & Giving Back

### ID Format
`{floorId}-r{roomKey}-g{goalIndex}-q{questIndex}` — e.g. `f0-rA-g0-q0`
Custom goals: `{floorId}-r{roomKey}-custom-{timestamp}-q0`

### Goal Tags & EP Costs
| Tag | EP Cost |
|-----|---------|
| Daily Power-Up | 2 |
| Autopilot Bots | 2 |
| Big Missions | 4 |
| Locked | 0 (disabled) |

**Budget**: 30 EP max per sprint. Floor 0+1 EP tracked separately via `calcFloor01EP`.

### Quest Frequencies
- **Daily**: Reset at IST 3:00 AM (`completedTodayIds` cleared). Must be re-checked each day.
- **Weekly/Monthly/Quarterly**: Persist across the sprint in `completedWeeklyIds`. Cleared on submit.

## State Management (AppContext.js)

### Key State Shape
```js
{
  appView: 'welcome' | 'planning' | 'tracking' | 'hq-visit',
  xp: number,              // +1 per perfect (100%) sprint
  streak: number,           // consecutive days with all dailies done
  buffers: number,          // 0-2, forgiveness tokens per month
  blueprint: object,        // full goal hierarchy + customGoals per room
  activeSprint: {
    selectedQuestIds: [],   // chosen quests for this week
    completedTodayIds: [],      // daily tasks checked off today (reset at IST 3AM)
    completedWeeklyIds: [],     // weekly+ tasks checked off (persist across days)
    sprintStartDate: ISO,       // when LAUNCH MISSION was clicked
    yesterdayProgress: num,      // previous day's daily completion %
    dailyCompletionHistory: [], // array of daily scores (0-1 fraction) accumulated at each 3AM reset
    questDailyCompletionCounts: {}, // per-quest daily tracking: { [questId]: daysCompleted }
  },
  avgCompletion: number,    // running average across all sprints
  sprintCount: number,
  lastSprintQuestIds: [],   // for "REPEAT LAST WEEK" loadout
  focusItems: [             // Focus Mode groupings (see Focus Mode below)
    { id, name, linkedQuestIds: [], customQuests: [{ id, text, frequency, tag, epCost }] }
  ],
  lastSavedAt: number,      // epoch ms of last save — drives cross-device sync arbitration
}
```

### Reducer Actions
| Action | Effect |
|--------|--------|
| `LOAD_STATE` | Hydrate from localStorage or GAS |
| `SET_VIEW` | Navigate between views |
| `TOGGLE_SPRINT_QUEST` | Select/deselect a quest (EP budget enforced) |
| `LAUNCH_MISSION` | Lock selections, set sprintStartDate, log goals to GAS, go to tracking |
| `TOGGLE_COMPLETE` | Check/uncheck a task (daily vs weekly tracked separately) |
| `SUBMIT_MISSION` | End sprint, calc %, update XP, trigger GAS log + update Weekly Goals completion |
| `AUTO_SUBMIT_SPRINT` | Fires at IST Sunday 23:59 if sprint is still active |
| `DAILY_RESET` | IST 3AM — records daily score to `dailyCompletionHistory`, clears daily completions, updates streak (90% threshold)/buffers |
| `ADD_CUSTOM_GOAL` | Add user-defined goal+quest to a room |
| `DELETE_CUSTOM_GOAL` | Remove a custom goal from a room + drop its quests from sprint/completion lists |
| `LOAD_LOADOUT` | Bulk-set selectedQuestIds from a preset |
| `RESET_SPRINT` | Clear all selections |
| `ADD_FOCUS` / `DELETE_FOCUS` | Create / remove a Focus Mode card (delete also unselects its custom quests) |
| `TOGGLE_QUEST_IN_FOCUS` | Link/unlink a blueprint quest into a focus (`linkedQuestIds`) |
| `ADD_FOCUS_CUSTOM_QUEST` / `DELETE_FOCUS_CUSTOM_QUEST` | Add/remove a focus-only custom quest (auto-selects into sprint if EP fits) |

### Persistence
- **localStorage** (`superhero_hq_v2`): Full state saved immediately on every change. Each save stamps `lastSavedAt`. Collapse state stored separately (`superhero_hq_collapse`).
- **GAS POST**: Debounced 3s. Sends lightweight payload (blueprint replaced with just customGoals ~2KB).
- **GAS GET**: Fetched on every load. Used only if no local data, or `gasTimestamp > localTimestamp`. If local data predates `lastSavedAt` (no timestamp), local wins and GAS is skipped.
- **focusItems guard**: `LOAD_STATE` keeps existing focus cards rather than overwriting them with an empty incoming `focusItems` — prevents stale cross-device saves from wiping focus mappings.

## Google Apps Script Integration

**GAS URL**: Stored in `AppContext.js` as `GAS_URL`.
**Sheet ID**: `1n75In-uqipFeZcigKUyLgK_F21cTnXmY9gYPwQRnMWE`

### Sheets
| Sheet | Purpose |
|-------|---------|
| `State` | Cell A1 stores JSON blob of app state (for cross-device sync) |
| `WeeklyLogs` | Append-only log: `[timestamp, weekRange, %, xpEarned, totalQuests, completedQuests]` |
| `Weekly Goals` | Two-phase: `[S.no, weekRange, completion%, goal1..goal19]` — goals logged at launch, completion filled on submit |
| `Goals Tracker` | Per-quest tracking: `[Mission, Goal, No of Weeks, Average %, Recent %]` — tracks individual quest history across sprints |

### Payloads
- **State save**: `POST { xp, streak, buffers, activeSprint, _customGoals, ... }` (no `action` field)
- **Sprint log**: `POST { action: 'log', week, percentage, xpEarned, totalQuests, completedQuests }`
- **Goals log (launch)**: `POST { action: 'log_goals', goalNames[] }` — appends row with S.no + goals, Week and Completion % blank
- **Goals update (submit)**: `POST { action: 'update_goals', week, percentage }` — fills Week and Completion % on the last blank row
- **Tracker launch**: `POST { action: 'track_goals_launch', quests: [{mission, goal}] }` — adds new quests or increments No of Weeks for existing ones
- **Tracker submit**: `POST { action: 'track_goals_submit', quests: [{mission, goal, percentage}] }` — updates Average % and Recent % per quest

## Sprint Lifecycle

1. **Planning** → User selects quests (or loads a preset). EP budget enforced (max 30).
2. **Launch** → `sprintStartDate` set. Goal names logged to "Weekly Goals" sheet (Phase 1). View switches to Tracking.
3. **Tracking** → User checks off daily tasks (reset at IST 3AM) and weekly tasks (persist).
4. **Submit** → User clicks "END & SUBMIT" or auto-submit fires at IST Sunday 23:59. Completion % + Week filled in "Weekly Goals" (Phase 2).
5. **Result** → Completion % shown with confetti. XP awarded if 100%. Logged to GAS.
6. **Reset** → Sprint cleared. Back to Planning for next week.

## PWA & Mobile

- `viewport-fit=cover` + `black-translucent` status bar for iOS notch support.
- `.safe-top` / `.safe-bottom` CSS classes use `env(safe-area-inset-*)`.
- Heights use `100dvh` (dynamic viewport height) to handle mobile browser chrome.
- All inputs forced to `font-size: 16px !important` to stop iOS Safari zooming on focus.
- Service worker handles stale-while-revalidate caching and IST-accurate local notifications: **9 AM** ("Watch Your Goals") and **10 PM** ("Update Daily Tasks") daily, plus **Sunday 8 PM** ("Submit Your Mission"). A `push` handler exists for future server-driven Web Push (SW `setTimeout` is unreliable when iOS fully backgrounds the PWA).

## Time Engine (istUtils.js)

All time logic is IST (Asia/Kolkata, UTC+5:30):
- `getISTDate()` / `getISTHour()` — current IST date/hour
- `getSprintDeadlineIST(launchTimestamp)` — next Sunday 23:59:59 IST
- `isSprintExpired(sprintStartDate)` — is the deadline past?
- `formatWeekRange(sprintStartDate)` — "20 Apr 26 - 26 Apr 26" format

## Build & Deploy

```bash
cd frontend
npm install
npm run build        # craco build, outputs to frontend/build/
npm run deploy       # gh-pages -d build → pushes to GitHub Pages
```

Homepage configured as `"."` in package.json for relative paths.

## UI Components Present on All Views

- **StreakBadge**: Flame icon + streak count. Orange when active (streak > 0), muted grey when 0. Shows on PlanningMode, TrackingMode, HQVisitMode top bars.
- **MusicBtn**: Volume toggle for 8-bit background track. Shows on all three main views.
- **VoltMascot**: Floating bot (bottom-right, respects safe-area-inset-bottom). Shows on all views except Welcome.

## Streak & Buffer System

- **Streak**: Incremented at IST 3AM if daily quest completion is 90% or higher. Reset to 0 if below 90% and no buffer available.
- **Buffers**: 2 per month, auto-reset on the 1st. Consumed when dailies < 90% to protect streak. Max 2, no way to earn extra.
- **Completion %**: Separate from streak. Uses averaged daily scores across all days of the sprint, weighted with weekly task completion.
