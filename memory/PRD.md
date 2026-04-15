# Superhero HQ — PRD

## Overview
A gamified single-page React app for Anurag that merges a base-building planning phase (Project Highrise-style 2D cutaway skyscraper) with a minimalist daily habit tracking protocol. Hero: "Boss Anurag".

## Architecture
- **Frontend Only**: React + Vite, Tailwind CSS, Framer Motion, lucide-react, react-confetti
- **State**: React Context + useReducer + localStorage (key: `superhero_hq_v2`)
- **Audio**: Web Audio API (8-bit sounds, looping bg track on Enter HQ) — NO TTS/voice
- **Music State**: MusicContext (context/MusicContext.js) — syncs with audioEngine, shared across views
- **No Backend**: Pure local-first storage

## File Structure
```
src/
  App.js                         # Root + view router + MusicProvider wrapper
  index.css                      # Global styles (Orbitron + Space Mono fonts)
  data/blueprint.js              # Full 6-floor, 300+ quest master blueprint (NEW DATA)
  data/loadouts.js               # Smart loadout preset quest IDs
  context/AppContext.js          # Global state (EP, XP, streak, buffers, sprint + RESET_SPRINT)
  context/MusicContext.js        # Music state singleton (NEW)
  utils/audioEngine.js           # Web Audio API singleton
  components/
    WelcomeScreen.jsx            # Splash with ENTER HQ button + audio init
    Building.jsx                 # 2D cutaway skyscraper (6 floors, animated rooms)
    PlanningMode.jsx             # 40/60 split: Building+SelectedTasksReceipt + CommandCenter
    CommandCenter.jsx            # Blueprint accordions + quest selection + Reset Sprint
    TrackingMode.jsx             # Progress ring, streak, tasks, submit
    HQVisitMode.jsx              # Building inspection + Return to Protocol
    VoltMascot.jsx               # Fixed bottom-right Bot
    ProgressRing.jsx             # SVG animated progress ring
```

## Core Features Implemented (Last updated: Apr 2026)

### Views
1. **Welcome Screen**: SUPERHERO HQ splash, ENTER HQ button, audio init + looping 8-bit bg track
2. **Planning Mode (View 1)**:
   - 6 new professional floor names (no more playful names)
   - Rooms renamed to professional themes
   - Parent Goal (goal.name) = PRIMARY bold text on each quest card
   - Quest action = secondary muted text below
   - Reset Sprint button near EP tracker (red hover, destructive action)
   - Selected Tasks Receipt below building (unique parent goal names, muted xs text)
   - Music toggle in top navigation bar
3. **Active Tracking Mode (View 2)**:
   - Parent Goal as primary bold text on task cards
   - Quest action as muted secondary text
   - Music toggle in top navigation bar
4. **HQ Visit Mode (View 3)**: Building inspection + Return to Protocol button

### Data Schema (Apr 2026 — NEW)
- **Floor 0**: Health & Basics
  - Rooms: Physical Health, Mental Health & Safety
- **Floor 1**: Focus & Time Management
  - Rooms: Managing Time, Deep Focus, Emotional Strength
- **Floor 2**: Learning & Thinking
  - Rooms: Knowledge & Skills, Problem Solving, Understanding the World, Making Decisions
- **Floor 3**: People & Relationships
  - Rooms: Immediate Family, Friends & Network, Leadership & Empathy, Character & Trust, Future Family (Kids) [Locked]
- **Floor 4**: Business & Wealth
  - Rooms: Strategy & Action, Technology & AI, Sales & Marketing, Companies & Investing
- **Floor 5**: Rewards & Giving Back
  - Rooms: Self-Image & Confidence, Personal Brand, Travel & Freedom, Helping Others
- 68 goals, ~300+ individual quests
- EP Costs: Daily Power-Up=2, Autopilot Bots=2, Big Missions=4, Locked=0

### Systems
- **EP System**: Max 20 EP, no upkeep tax
- **Reset Sprint**: Instantly clears all selections, EP → 0
- **Music Toggle**: In top navigation bar (not floating) — Planning + Tracking modes
- **Selected Tasks Receipt**: Visual receipt of selected sprint tasks below building
- **3AM Daily Reset**: daily tasks reset, streak/buffer logic
- **Monthly Buffer Reset**: 2 buffers reset on 1st of month
- **Hero Level**: Civilian→Sidekick→Hero→Legend
- **Custom Quests**: inline form per room, auto-selected on add
- **Future Sidekicks (F3-E)**: locked + greyed out (curiosity gap)
- **Smart Loadouts**: FOUNDER GRIND, RECOVERY WEEK, REPEAT LAST WEEK

### Design
- Background: #050505 (pure black)
- Neon Green: #39FF14 (active/complete states)
- Electric Blue: #00E5FF (building wireframes, accents)
- Card Surface: #111111 / #161616
- Muted: #8B8B8D
- Alert: #FF3B30
- Fonts: Orbitron (headings), Space Mono (body)

## Prioritized Backlog (P0/P1/P2)

### P0 (Critical - Done)
- [x] Welcome screen with audio initialization
- [x] 2D cutaway building with real-time room lighting
- [x] Quest selection with EP budget
- [x] Launch Mission with validation
- [x] Active tracking with progress ring
- [x] Streak + buffer system
- [x] Weekly submission with grading + confetti
- [x] Volt mascot
- [x] localStorage persistence
- [x] 3AM daily reset logic
- [x] New professional floor/room naming (Apr 2026)
- [x] Parent Goal as primary text on quest cards (Apr 2026)
- [x] Reset Sprint button (Apr 2026)
- [x] Selected Tasks Receipt — shows specific activities grouped under dim goal labels (Apr 2026)
- [x] Goal grouping in CommandCenter — each goal as bold header row + EP badge, quests listed below indented (Apr 2026)
- [x] TrackingMode task cards — goal.name as dim context label, quest.text as main bold activity (Apr 2026)
- [x] Music toggle in nav bar (Apr 2026)
- [x] Mobile responsive layout — stacked flex-col on mobile, side-by-side on sm+ (Apr 2026)
- [x] Command Center UI redesign — goal groups mb-8, uppercase header + border-b + green EP pill, py-3.5 px-4 quest rows, text-gray-300 readability (Apr 2026)
- [x] Selected Tasks Receipt — border-t cyan, goal text-[10px] uppercase gray-500, activity text-xs gray-300 line-clamp-1 (Apr 2026)
- [x] Mobile: building panel hidden (hidden sm:flex), MobileReceiptBar chip row in CommandCenter (Apr 2026)
- [x] PWA: manifest.json, sw.js (offline + local 3AM notification), iOS meta tags, title = Superhero HQ (Apr 2026)

### P1 (Next Sprint)
- [ ] HQ Visit Mode testing/polish
- [ ] Weekly submission confetti quality improvement
- [ ] 8-bit background music quality improvement
- [ ] Mobile responsive enhancements
- [ ] Streak badge animation improvement

### P2 (Future)
- [ ] Multiple sprint history (weekly log)
- [ ] Export/backup feature for blueprint data
- [ ] Unlockable floor 3-E (Future Sidekicks)
- [ ] Difficulty levels per quest
- [ ] Weekly review dashboard
- [ ] Push notifications (PWA)

## Next Tasks
1. Mobile polish pass
2. Sprint history tracking
3. Test confetti on 100% perfect week submission
4. Consider grouping quest cards visually under goal headers to reduce repetition
