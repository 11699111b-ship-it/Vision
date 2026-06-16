# Superhero HQ — Update Ideas

Research-backed improvements compared against Habitica, Fabulous, Beeminder, Streaks, Notion Life OS, Goals on Track, and Serenity.

---

## 1. Sprint Countdown Urgency on Tracking Screen
Beeminder shows a "Bright Red Line" that communicates deadline proximity. Tracking screen shows "Active Protocol" but nowhere says "4 days remaining." Deadline invisibility kills mid-week motivation. Add a pill like "4 DAYS LEFT" next to the progress ring so every day feels like it counts.

## 2. Weekly Reflection Prompt at Submission
Fabulous, Notion Life OS, and evidence-based coaching apps include qualitative capture after sessions. Submit flow goes score → confetti → planning with no memory. Add one optional text prompt before confetti ("What blocked you?" / "What to protect next week?"). Data goes to a "Reflections" column in Google Sheets.

## 3. In-App Historical Completion Chart
Beeminder and Strides make trajectory visible over time. Completion % is already logged to Sheets every week but never surfaced in-app. A last-8-weeks bar chart on a Stats screen (fetched from GAS on demand) makes progress feel real and non-reversible — the strongest motivator in habit science.

## 4. Achievement Badges / Trophy Case
Habitica has collectibles and gear. XP ceiling is "Legend" at 7 XP — reachable in 7 perfect weeks. After that, progression disappears. One-time badges (First 7-day streak, 30-day streak, 10 sprints, Perfect month, Floor master) give something to work toward that never resets. Display in a section on HQ Visit screen.

## 5. Building Floors Reflect Cumulative Health
Building lights green only for active quests this sprint — no memory across weeks. Goal visualization apps maintain persistent domain health scores. If F4 (Business) averages 30% over 8 sprints, it should look dimmer than F0 (Health). Turns the building into a genuine life dashboard, not just a quest picker.

## 6. Per-Quest Stats Surfaced In-App ✅ PLANNED
Habitica shows per-habit streaks and completion history. Average % and No of Weeks per quest already tracked in Goals Tracker sheet — but invisible inside the app. In planning mode, showing "78% avg • 6 sprints" next to each quest name gives real signal for what to pick vs deprioritize.

## 7. Consequence Mechanic for Low-Completion Weeks
Habitica damages HP when you miss dailies. Beeminder charges money. No stakes in Superhero HQ beyond a low %. A simple mechanic: submit below 50% → building "takes damage" (cracked floor visual, windows go dark) + a "Repair" quest added for next week. Consequences make wins feel earned.

## 8. Ritual Sequencing for Daily Tasks
Fabulous' biggest differentiator is ordered morning/evening ritual flows. Daily task cards are a flat unordered list. Optional "Ritual Mode" sequences daily tasks (Workout → Meditation → Deep Focus) and lets you tap through them one at a time with a timer between steps. Converts checking off tasks from chore to ritual.

## 9. Adaptive Loadout Suggestions Based on Sheets Data
Modern apps like Serenity adapt weekly plans from performance history. Loadouts are static. 8+ weeks of data already in Sheets. A "Smart Suggest" loadout that surfaces consistently-completed quests (keep) and flags <40% avg quests (swap or drop) would make planning take 30 seconds instead of manual picks.

## 11. Season Dashboard in Planning Mode (Structural Idea — Think Before Building)
Current blueprint is hardcoded — quests don't connect to shifting 6-month priorities (Job, Site, Influence, Body, etc.). Cognitive overload comes from missing link between "what matters this season" and "what to pick this week."

**The idea (Approach C from brainstorm):** A "This Season" section sits above the existing accordion in CommandCenter. Your seasonal priorities (11 items) appear as compact cards — each card shows its linked quests (mix of existing blueprint quests + custom quests) with one tap to add them to the sprint. The accordion below is demoted to an overflow/discovery zone for anything outside current season priorities. No mode switching — priority-first is the default every week.

**Why it reduces cognitive overload:** You open planning, see your current season cards, pick quests per priority, done. The 6-floor building stays as the long-term life domain structure and coexists with this seasonal layer.

**Note:** May warrant a completely new app rather than bolting onto Superhero HQ. Think about this structurally before implementing — what's the right home for this: new app, new view, or full rearchitecture of planning mode?

## 10. Shareable Weekly Result Card ✅ PLANNED
Habitica has social parties. Fabulous has community challenges. Superhero HQ has zero external anchor — score disappears after overlay. "Share Result" button on submission overlay generates a styled image card (%, streak, level, week range, neon design) and opens the system share sheet or copies to clipboard. External accountability is one of the strongest retention levers in behavior research.

---

# Probable Updates (As of June 2026)

## Feature #6 — Per-Quest Stats In Planning Mode

### What it does
In the CommandCenter accordion, each quest shows a small stats badge: `78% avg • 6 sprints`. Dim/muted when you haven't done the quest before. Data comes from the Goals Tracker sheet already being populated every sprint.

---

### Data layer

**Step 1 — New GAS endpoint action: `get_quest_stats`**

The Goals Tracker sheet has rows: `[Mission, Goal, No of Weeks, Average %, Recent %]`. Add a branch in `doGet` that reads this sheet and returns it as a JSON map keyed by quest text:
```
{ "45-minute physical training": { weeks: 6, avgPct: 78, recentPct: 100 }, ... }
```
Keyed by quest text (not ID) because that's what GAS stores.

**Step 2 — Fetch function in the frontend**

A standalone `fetchQuestStats()` function (not in the reducer — this is read-only metadata). Calls `GAS_URL + ?action=get_quest_stats`, 5s timeout, returns the map or `null` on failure. Fire-and-forget — never blocks the UI.

---

### State layer

**Step 3 — Store in CommandCenter local state, not AppContext**

`const [questStats, setQuestStats] = useState(null)` inside CommandCenter. Fetch once on mount. No reducer involvement — this data doesn't need to survive navigation or be persisted. Refetches on next mount automatically (i.e., each time user opens planning).

---

### UI layer

**Step 4 — Stats badge on each quest row in the accordion**

Current quest row: `[checkbox] Quest text`
New quest row: `[checkbox] Quest text · [78% avg · 6w]`

The badge shows only if `questStats[quest.text]` exists and `weeks >= 1`. Style: Space Mono, 10px, `rgba(255,255,255,0.28)` — intentionally dim so it doesn't compete with the quest text. Color shifts to neon green if `avgPct >= 80`, orange if `40–79%`, red if `< 40%` — instant visual signal.

**Step 5 — Loading state**

While fetching, show skeleton placeholders on the badges (a 40px wide dimly pulsing bar). If fetch fails or times out, badges simply don't appear — zero impact on existing functionality.

---

### Files to touch
| File | Change |
|------|--------|
| `gas-update-weekly-goals.gs` | Add `get_quest_stats` branch to `doGet` |
| `frontend/src/components/CommandCenter.jsx` | Fetch stats on mount, pass to quest rows, render badge |
| `frontend/src/context/AppContext.js` | Export `GAS_URL` so CommandCenter can use it |

No new files beyond the GAS change. No changes to reducer, TrackingMode, or any other view.

---

### Risk / edge cases
- Quest text mismatch: if quest text is edited in `blueprint.js`, old Sheets rows won't match. Low risk since blueprint is stable.
- First sprint ever: no rows in Goals Tracker yet → `questStats` returns empty map → badges simply don't show. Graceful.
- GAS cold start (first fetch of the day can take 3–5s): 5s timeout handles this; badges appear late or not at all. Fine.

---

## Feature #10 — Shareable Weekly Result Card

### What it does
On the SubmissionOverlay (after END & SUBMIT), a "SHARE RESULT" button appears below the score. Tap it → a 1080×1080 image card is generated in-memory (no server, pure client-side Canvas API) → on mobile it opens the native share sheet; on desktop it copies to clipboard. Card matches the Superhero HQ dark/neon aesthetic.

---

### Card design (1080×1080 px)
```
┌─────────────────────────────────┐
│  SUPERHERO HQ           [logo]  │  ← dim header, Space Mono
│                                 │
│           87%                   │  ← giant neon green number
│    MISSION ACCOMPLISHED         │  ← Orbitron, white
│                                 │
│   🔥 12 DAY STREAK              │
│   ⚡ HERO  •  LVL 3             │
│                                 │
│   10 Jun 26 – 16 Jun 26         │  ← week range, muted
│                                 │
│  "Built different, Boss Anurag" │  ← fixed tagline
└─────────────────────────────────┘
```
Background: `#0a0a0a`. Accent: neon green (≥50%) or red (<50%). Subtle scanline pattern matches WelcomeScreen identity.

---

### Rendering approach — Canvas API (no dependencies)

**Why Canvas over html2canvas:**
- No new dependency (html2canvas is 60KB+ and has quirks with Tailwind/CSS variables)
- Full control over layout — simple card content doesn't need DOM rendering
- Works in all browsers including iOS Safari PWA
- Orbitron font loaded via `FontFace` API before drawing

**Step 1 — Load fonts before rendering**
Orbitron and Space Mono are already loaded in the app via CSS. Check `document.fonts.ready` before drawing to ensure they're available to the Canvas context.

**Step 2 — Draw card on an offscreen `<canvas>` (1080×1080)**
Draw order: background fill → scanline grid → accent shapes → text layers. All coordinates hardcoded for fixed 1080×1080 — no responsive logic, this is export-only.

**Step 3 — Export to Blob**
`canvas.toBlob(blob => { ... }, 'image/png')`

**Step 4 — Share / copy (priority order)**
```
Priority 1 (mobile): navigator.share({ files: [new File([blob], 'mission.png')] })
Priority 2 (desktop): navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
Priority 3 (fallback): create <a download="mission.png"> and programmatically click it
```
Button shows "COPIED!" or "SHARED!" feedback for 2 seconds on success. Errors caught silently, fallback to next priority.

---

### Files to touch
| File | Change |
|------|--------|
| `frontend/src/utils/shareCard.js` | **New file** — `generateShareCard({ percentage, streak, heroInfo, weekRange })` draws canvas, returns Blob |
| `frontend/src/components/TrackingMode.jsx` | In `SubmissionOverlay`, add "SHARE RESULT" button, call `generateShareCard`, trigger share/copy |

No changes to AppContext, GAS, or any other file. All data needed (`percentage`, `streak`, `heroInfo`, `weekRange`) already available inside `SubmissionOverlay`.

---

### Risk / edge cases
- `navigator.share` with files requires HTTPS — GitHub Pages is HTTPS, fine.
- iOS Safari PWA: `navigator.clipboard.write` (images) not supported — priority order (share first) handles this.
- Font not loaded in time: draw with fallback `Arial` — card still readable.
- Canvas blocked by browser extension: catch error, show toast "Screenshot manually to share."
