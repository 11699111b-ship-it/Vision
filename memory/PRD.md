# Superhero HQ — PRD

## Overview
A gamified single-page React app for Anurag that merges a base-building planning phase (Project Highrise-style 2D cutaway skyscraper) with a minimalist daily habit tracking protocol. Hero: "Boss Anurag".

## Architecture
- **Frontend Only**: React + Vite, Tailwind CSS, Framer Motion, lucide-react, react-confetti
- **State**: React Context + useReducer + localStorage (key: `superhero_hq_v2`)
- **Audio**: Web Audio API (8-bit sounds, looping bg track on Enter HQ) — NO TTS/voice
- **No Backend**: Pure local-first storage

## File Structure
```
src/
  App.js                         # Root + view router
  index.css                      # Global styles (Orbitron + Space Mono fonts)
  data/blueprint.js              # Full 6-floor, 100+ quest master blueprint
  context/AppContext.js          # Global state (EP, XP, streak, buffers, sprint)
  utils/audioEngine.js           # Web Audio API singleton (boop, success, TTS)
  components/
    WelcomeScreen.jsx            # Splash with ENTER HQ button + audio init
    Building.jsx                 # 2D cutaway skyscraper (6 floors, animated rooms)
    PlanningMode.jsx             # 40/60 split: Building + Command Center
    CommandCenter.jsx            # Master Blueprint accordions + quest selection
    TrackingMode.jsx             # Progress ring, streak, tasks, submit
    HQVisitMode.jsx              # Building inspection + Return to Protocol
    VoltMascot.jsx               # Fixed bottom-right Bot with TTS
    ProgressRing.jsx             # SVG animated progress ring
```

## Core Features Implemented (Last updated: Feb 2026)

### Views
1. **Welcome Screen**: SUPERHERO HQ splash, ENTER HQ button, audio init + looping 8-bit bg track
2. **Planning Mode (View 1)**: 
   - Unified screen: Building (left ~36%, max 320px) + CommandCenter (right) always side-by-side
   - Single top heading "SUPERHERO HQ — PLANNING MODE"
   - EP Budget inline strip (no separate header); all text WCAG-readable (13px+)
   - Rooms light up in neon green (#39FF14) as quests selected
   - Custom quests auto-select on add, immediately lighting up their floor
   - Launch Mission button
3. **Active Tracking Mode (View 2)** — Minimalist dark design:
   - #0a0a0a background; dark rounded cards (#161616, border-radius 14px)
   - Clean SVG progress ring (round strokeLinecap, no glow)
   - Huge streak text "{N} DAYS"; buffer pill badge
   - Task cards: bold system-ui font (16px), toggle circle on right
   - Section headers with horizontal rule dividers
   - End & Submit with confetti overlay
4. **HQ Visit Mode (View 3)**: Building inspection + Return to Protocol button

### Systems
- **EP System**: Max 20 EP, Daily Power-Up=2EP, Autopilot Bots=2EP, Big Missions=4EP (no upkeep tax)
- **No TTS**: text-only Volt mascot
- **Music Toggle**: floating button (top-right) pauses/resumes 8-bit bg track; works after page refresh
- **3AM Daily Reset**: daily tasks reset, streak/buffer logic
- **Monthly Buffer Reset**: 2 buffers reset on 1st of month
- **Hero Level**: Civilian→Sidekick→Hero→Legend
- **Custom Quests**: inline form per room, auto-selected on add
- **Future Sidekicks (F3-E)**: locked + greyed out (curiosity gap)
- **3AM Daily Reset**: Daily tasks reset, buffers deducted if <100%, streak resets if no buffers
- **Monthly Buffer Reset**: Buffers reset to 2 on 1st of month
- **Hero Level System**: Civilian (0 XP) → Sidekick (1) → Hero (3) → Legend (7+)
- **Custom Quests**: User can add custom goals to any room, saved to localStorage
- **Future Sidekicks (F3-E)**: Shown but greyed out (locked)

### Blueprint Data
- 6 floors (0-5), 21 rooms, ~100 individual quests
- All quests split by OR into individual selectable items
- Custom goals supported per room

## Design
- Background: #050505 (pure black)
- Neon Green: #39FF14 (active/complete states)
- Electric Blue: #00E5FF (building wireframes, accents)
- Card Surface: #111111
- Muted: #8B8B8D
- Alert: #FF3B30
- Fonts: Orbitron (headings), Space Mono (body)

## Prioritized Backlog (P0/P1/P2)

### P0 (Critical - Done)
- [x] Welcome screen with audio initialization
- [x] 2D cutaway building with real-time room lighting
- [x] Quest selection with EP budget
- [x] Launch Mission with upkeep tax validation
- [x] Active tracking with progress ring
- [x] Streak + buffer system
- [x] Weekly submission with grading + confetti
- [x] Volt mascot with TTS
- [x] localStorage persistence
- [x] 3AM daily reset logic

### P1 (Next Sprint)
- [ ] HQ Visit Mode fully tested
- [ ] Weekly submission confetti verified in browser
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
1. Verify HQ Visit Mode works correctly end-to-end
2. Test confetti on 100% perfect week submission
3. Add sprint history tracking
4. Mobile polish
