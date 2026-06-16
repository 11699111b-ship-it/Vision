# Superhero HQ — Product Requirements Document

## Product Vision

A personal gamified productivity system that maps life goals across 6 domains onto floors of a virtual building. Each week, the user (Anurag) selects a subset of quests within a 30 EP budget, launches a "mission," and tracks daily/weekly completion. Results are logged to Google Sheets for long-term trend analysis.

## User

Single user: Anurag. The app is personalized — hero names, mascot dialogue, and sprint messaging reference "Anurag" directly.

## Core Concepts

### The Building (Blueprint)
A 6-floor structure where each floor is a life domain:

| Floor | Domain | Rooms |
|-------|--------|-------|
| F0 (Basement) | Health & Basics | Physical Health, Mental Health & Safety |
| F1 | Focus & Time Management | Managing Time, Deep Focus, Emotional Strength |
| F2 | Learning & Thinking | Knowledge & Skills, Problem Solving, Understanding the World, Making Decisions |
| F3 | People & Relationships | Immediate Family, Friends & Network, Leadership & Empathy, Character & Trust, Future Family (Locked) |
| F4 | Business & Wealth | Strategy & Action, Technology & AI, Sales & Marketing, Companies & Investing |
| F5 | Rewards & Giving Back | Self-Image & Confidence, Personal Brand, Travel & Freedom, Helping Others |

Each room contains multiple **Goals** (e.g., "Overall Body Mastery"). Each goal contains multiple **Quests** (specific activities like "45-minute physical training"). Quests have frequencies: Daily, Weekly, Monthly, or Quarterly.

### Energy Points (EP)
- Budget: 30 EP per week
- Daily Power-Up goals: 2 EP each
- Autopilot Bots goals: 2 EP each
- Big Missions goals: 4 EP each
- Locked goals: 0 EP (disabled, future use — e.g., "Future Family" room)

Selecting a quest costs the EP of its parent goal. The system prevents exceeding 30 EP.

### Custom Goals
Users can create custom goals within any unlocked room. Custom goals get a unique ID (`{roomId}-custom-{timestamp}`), user-chosen frequency, and tag (which determines EP cost). Custom goals persist in the blueprint's `customGoals` array per room and sync to GAS. They can be deleted via the × button in the All Floors blueprint section (`DELETE_CUSTOM_GOAL`) — deleting also removes the goal's quests from the active sprint selection and completion lists.

### Focus Mode
A user-defined grouping layer that sits above the blueprint, letting Anurag organize the week around a few real-life focus areas (e.g. BODY, JOB, SITE) instead of navigating the full 6-floor tree.

- **Focus cards** (`focusItems[]`): each has a name, `linkedQuestIds[]` (blueprint quests mapped into the focus), and `customQuests[]` (quests that live only inside the focus, not in the blueprint).
- **Quest Mapper** (`QuestMapperOverlay`): full-screen, mobile-optimized overlay to browse the blueprint (with `QuestFilterBar` search) and toggle which blueprint quests are linked into a focus. Toggling here edits `linkedQuestIds`, not the sprint selection.
- **Selecting quests**: tapping a quest row inside a focus card toggles it into the active sprint (`TOGGLE_SPRINT_QUEST`, EP budget enforced). The card header shows `selected/total`.
- **Focus custom quests**: added inline per focus. They synthesize a goal/room/floor entry in `buildQuestLookup` (floor id `focus`, number 99) so EP, selection, and Goals Tracker logic treat them identically to blueprint quests. Their goal id contains `custom`, so they log as `RoomName(custom goal)`.
- **Persistence**: `focusItems` is part of saved state (localStorage + GAS). The loader never lets an empty incoming `focusItems` overwrite a populated one, so mappings survive cross-device sync (see Data Persistence).
- **Reducer actions**: `ADD_FOCUS`, `DELETE_FOCUS`, `TOGGLE_QUEST_IN_FOCUS`, `ADD_FOCUS_CUSTOM_QUEST`, `DELETE_FOCUS_CUSTOM_QUEST`.

### Collapsible Sections
Focus Mode, the All Floors blueprint, and each individual focus card can be collapsed/expanded. State is persisted per-section in localStorage (`superhero_hq_collapse`) via the `usePersistentCollapse(id, defaultOpen)` hook, so the layout survives reloads. Focus-card keys are `focus-card-{focusId}`.

### Smart Loadouts
Preset quest bundles for quick selection:
- **FOUNDER GRIND** (16 EP) — focus, leverage, output-oriented quests
- **RECOVERY WEEK** (12 EP) — body, mind, relationships recharge
- **REPEAT LAST WEEK** — reloads previous sprint's quest selection

### Sprint / Mission Lifecycle
1. **Select quests** in Planning Mode (CommandCenter accordion UI)
2. **Launch Mission** — locks selections, records `sprintStartDate`
3. **Track daily** — check off daily tasks each day (reset at IST 3:00 AM)
4. **Track weekly** — check off weekly/monthly/quarterly tasks anytime during sprint
5. **Submit** — manual ("END & SUBMIT") or automatic (IST Sunday 23:59:59)
6. **Score** — completion % uses averaged daily scores across the week (not just submit day) + weekly completion, weighted by task count
7. **XP** — +1 if 100% completion (perfect week)
8. **Log** — results sent to Google Sheets (WeeklyLogs + Weekly Goals sheets)

### Streak System
- **Streak**: Consecutive days where daily quest completion reaches 90% or higher
- **Buffers**: 2 per month (reset on 1st). A missed day consumes a buffer instead of breaking the streak. Buffers protect streaks only — they don't affect completion %.
- **Daily Reset**: IST 3:00 AM — records today's daily score to `dailyCompletionHistory`, clears `completedTodayIds`, evaluates yesterday's progress, updates streak/buffers

### Completion % Formula
Daily completion is averaged across all days of the sprint (not just the submit day):
```
avgDailyPct = mean(dailyCompletionHistory)     // fraction 0-1 per day
weeklyPct   = completedWeekly / totalWeekly    // fraction 0-1
final %     = (avgDailyPct * dailyCount + weeklyPct * weeklyCount) / totalQuests * 100
```
This means a user who does dailies perfectly Mon-Sat but misses Sunday still gets credit for those days.

### Hero Progression
| XP | Level | Title |
|----|-------|-------|
| 0 | 1 | Civilian |
| 1+ | 2 | Sidekick |
| 3+ | 3 | Hero |
| 7+ | 4 | Legend |

## Views

### Welcome Screen
Full-screen entry with background image, scan-line animation, title "SUPERHERO HQ." Click "ENTER" to proceed. Initializes audio engine and background music.

### Planning Mode (Desktop: Split | Mobile: Full)
- **Top bar**: HQ title, HeroTag (level + XP), EP count, StreakBadge (flame + count), MusicBtn
- **Left panel (desktop only)**: Building facade visualization. Floors glow green when they have active quests. Shows selected tasks receipt grouped by goal with X buttons to unselect.
- **Right panel (full on mobile)**: CommandCenter — smart loadouts, EP budget bar, collapsible **Focus Mode** panel (focus cards + quest mapper), collapsible **All Floors** blueprint accordion (floor > room > goal > quest, with custom quest form and delete buttons for custom goals), LAUNCH MISSION button. The Focus Mode panel and blueprint live inside the same scroll area so the Launch button stays reachable. Mobile receipt bar at bottom with X buttons to unselect quests.

### Tracking Mode
- **Top bar**: VISIT HQ button, "ACTIVE PROTOCOL" title, StreakBadge, MusicBtn
- Progress ring showing daily completion %
- Streak counter (X DAYS) with buffer badge
- Daily Protocol section — task cards for daily quests
- Weekly Tasks section — task cards for weekly+ quests
- END & SUBMIT WEEKLY MISSION button
- Submission overlay with score, label (MISSION ACCOMPLISHED / SOLID EFFORT / RESET & CONQUER), and confetti

### HQ Visit Mode
- **Top bar**: "BASE INSPECTION" title, StreakBadge, MusicBtn
- Building visualization + return panel. Accessible during active sprint via nav button.

### Volt Mascot
Floating bot icon (bottom-right, above safe area). Expands to show contextual chat bubble with status messages. Present on all views except Welcome.

## Data Persistence

### localStorage (Primary)
Key: `superhero_hq_v2`. Full state JSON. Immediate writes on every state change. Provides instant load on same device. Every save stamps `lastSavedAt` (epoch ms) for cross-device arbitration. Collapse state is stored separately under `superhero_hq_collapse`.

### Cross-Device Sync Arbitration
On load, localStorage is read first (instant), then GAS is fetched in the background. Which one wins is decided by `lastSavedAt`:
- **No local data** → use GAS.
- **Local data with a timestamp** → use GAS only if `gasTimestamp > localTimestamp`.
- **Local data without a timestamp** (pre-`lastSavedAt` format) → keep local, skip GAS, to avoid stale cross-device overwrites.

Additionally, `LOAD_STATE` never replaces a populated `focusItems` with an empty one — if an incoming payload (e.g. an old GAS save) has `focusItems: []` but current state has focus cards, the current cards are kept. These two guards together prevent focus mappings from being silently wiped on sync.

### Google Apps Script (Cross-device backup)
- **GET**: Returns state JSON from Sheet "State" cell A1. Used when no localStorage exists (new device) or when GAS is newer (see arbitration above).
- **POST (state)**: Debounced 3s. Sends lightweight payload — full blueprint replaced with just `_customGoals` array (~2KB vs ~78KB).
- **POST (log)**: On sprint submit. Appends to "WeeklyLogs" sheet.
- **POST (log_goals)**: On mission launch. Appends row to "Weekly Goals" sheet with S.no + goal names (Week and Completion % left blank).
- **POST (update_goals)**: On sprint submit. Finds the last "Weekly Goals" row with empty Completion %, fills in Week dates and Completion %.
- **POST (track_goals_launch)**: On mission launch. Adds new quest rows or increments No of Weeks for existing quests in "Goals Tracker" sheet.
- **POST (track_goals_submit)**: On sprint submit. Updates per-quest Average % (running average as raw numbers) and Recent % in "Goals Tracker" sheet.

### Weekly Goals Sheet Format (Two-Phase Logging)
| S.no | Week | Completion % | Goal 1 | Goal 2 | ... | Goal 19 |
|------|------|-------------|--------|--------|-----|---------|
| 1 | 20 Apr 26 - 26 Apr 26 | 85% | Workout Goal | Meditation | ... | |

- **Phase 1 (Launch)**: Row created with S.no and goal names. Week and Completion % are blank.
- **Phase 2 (Submit)**: Week dates and Completion % filled in (same format as WeeklyLogs).

### Goals Tracker Sheet Format (Per-Quest History)
| Mission | Goal | No of Weeks | Average % | Recent % |
|---------|------|-------------|-----------|----------|
| Overall Body Mastery | 45-minute physical training | 3 | 78 | 100 |

- **Mission**: Parent goal name (for hardcoded goals) or `RoomName(custom goal)` (for custom goals)
- **Goal**: Individual quest text
- **No of Weeks**: Incremented each time the quest is included in a sprint launch
- **Average %**: Running average of per-quest completion across all sprints (stored as raw numbers, not strings)
- **Recent %**: Latest sprint's per-quest completion %
- **Per-quest % calculation**: Daily quests use `daysCompleted / totalDays * 100`. Weekly quests are binary (100% if done, 0% if not).

## Design System

- **Dark theme**: Background #050505, surface #111111
- **Primary accent**: Neon green #39FF14 (active states, success, XP)
- **Secondary accent**: Electric blue #00E5FF (building, structural elements, info)
- **Alert**: Red #FF3B30 (errors, streak danger, low completion)
- **Warning**: Orange #FFA500 (EP near limit, neutral states)
- **Muted**: #8B8B8D (secondary text, inactive states)
- **Fonts**: Orbitron (headings, labels) + Space Mono (data, badges) + system-ui (body text)
- **Audio**: 8-bit chiptune aesthetic — square wave melody, sine wave success chords

## Key Technical Decisions

1. **All time in IST**: Sprint deadlines, daily resets, and date formatting use IST regardless of user timezone. Hardcoded to Asia/Kolkata.
2. **GAS over traditional backend**: No server to maintain. The FastAPI backend in `/backend` is scaffolding only — all real persistence goes through GAS.
3. **Blueprint is code, not data**: The 6-floor goal hierarchy is hardcoded in `blueprint.js`. Only `customGoals` are user-mutable and persisted. (Planned: migrate to sheet-based goals config where Google Sheet becomes the source of truth for all goals.)
4. **EP budget at goal level**: Selecting any quest from a goal costs the goal's EP. Multiple quests from the same goal don't multiply the cost — they share it (since quest selection is per-quest but EP is per-goal-membership).
5. **Daily vs Weekly tracking split**: `completedTodayIds` resets at IST 3AM. `completedWeeklyIds` persists until sprint submit. `dailyCompletionHistory` accumulates each day's daily score (0-1 fraction) for weekly average calculation. This enables daily streak tracking, fair weekly averaging, and allows weekly tasks to be checked off anytime.
6. **Auto-submit safety net**: If the user forgets to submit before Sunday midnight IST, the system auto-submits with current progress and shows a toast on next visit.

## Non-Functional Requirements

- **PWA**: Installable on iOS/Android home screen. Service worker for offline caching (stale-while-revalidate).
- **Local Notifications** (`sw.js`): three IST-accurate scheduled reminders, computed entirely in UTC so device timezone is irrelevant:
  - **9:00 AM IST daily** — "Watch Your Goals"
  - **10:00 PM IST daily** — "Update Daily Tasks"
  - **Sunday 8:00 PM IST** — "Submit Your Mission" (sprint deadline warning)

  Scheduled via `setTimeout` in the service worker. Note: SW timers are unreliable when the PWA is fully backgrounded on iOS — a server-driven Web Push path (`push` event handler) exists as a fallback but is not yet wired to a push server.
- **Mobile-first**: Safe area insets for notch/Dynamic Island. 100dvh for mobile browser chrome. Touch-friendly 44px+ targets. All inputs use `font-size: 16px !important` to prevent iOS Safari zoom-on-focus.
- **Performance**: No external API calls during normal use (localStorage is primary). GAS calls are fire-and-forget with `.catch(() => {})`.
- **Single user**: No auth, no multi-tenancy. State is per-device via localStorage, cross-device via shared GAS sheet.
