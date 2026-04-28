# Quest Search Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a search input to CommandCenter that filters quests by name, auto-expands matching floor/room/goal accordions, and highlights matches — letting users find any quest without manual navigation.

**Architecture:** A search bar sits between the EP budget strip and the floor list. When the user types, we filter the blueprint in-memory and pass a `searchMatches` set + `searchQuery` string down to FloorSection/RoomSection/GoalSection. Matched sections auto-expand; non-matching quests are hidden. Clearing search restores normal accordion state.

**Tech Stack:** React useState for search query, existing blueprint data, no new dependencies.

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `frontend/src/components/CommandCenter.jsx` | Modify | Add search input, filter logic, pass match data to accordion components, auto-expand matched sections |

---

### Task 1: Add search state and filter logic to CommandCenter

**Files:**
- Modify: `frontend/src/components/CommandCenter.jsx`

- [ ] **Step 1: Add search state and compute matches**

In `CommandCenter()` function, after the existing state/context lines, add:

```javascript
const [searchQuery, setSearchQuery] = useState('');

const searchMatches = React.useMemo(() => {
  const q = searchQuery.trim().toLowerCase();
  if (!q) return null;
  const matches = new Set();
  blueprint.floors.forEach(floor => {
    floor.rooms.forEach(room => {
      [...room.goals, ...(room.customGoals || [])].forEach(goal => {
        goal.quests.forEach(quest => {
          if (quest.text.toLowerCase().includes(q) || goal.name.toLowerCase().includes(q)) {
            matches.add(quest.id);
          }
        });
      });
    });
  });
  return matches;
}, [searchQuery, blueprint]);
```

- [ ] **Step 2: Add search input UI between EP strip and floor list**

After the EP budget `</div>` and before the blueprint floors `<div>`, add:

```jsx
{/* Search bar */}
<div className="px-4 py-2 flex-shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
  <div style={{ position: 'relative' }}>
    <input
      type="text"
      value={searchQuery}
      onChange={e => setSearchQuery(e.target.value)}
      placeholder="Search quests..."
      style={{
        width: '100%',
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 8,
        padding: '8px 32px 8px 12px',
        color: '#D1D5DB',
        fontSize: 13,
        fontFamily: 'system-ui, sans-serif',
        outline: 'none',
      }}
    />
    {searchQuery && (
      <button
        onClick={() => setSearchQuery('')}
        style={{
          position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'rgba(255,255,255,0.3)', fontSize: 16, padding: 0,
        }}
      >
        ×
      </button>
    )}
  </div>
</div>
```

- [ ] **Step 3: Pass `searchMatches` to FloorSection**

Change the floor map to pass search data:

```jsx
{blueprint.floors.map(floor => (
  <FloorSection key={floor.id} floor={floor} searchMatches={searchMatches} searchQuery={searchQuery} />
))}
```

- [ ] **Step 4: Commit**

```bash
cd frontend && git add src/components/CommandCenter.jsx && git commit -m "feat: add search input to CommandCenter with quest filtering"
```

---

### Task 2: Wire search through FloorSection → RoomSection → GoalSection

**Files:**
- Modify: `frontend/src/components/CommandCenter.jsx`

- [ ] **Step 1: Update FloorSection to accept and pass search props, auto-expand on match**

FloorSection currently manages its own `open` state. When `searchMatches` is non-null, check if any quest in this floor matches. If so, force the floor open.

In FloorSection's signature, add `searchMatches` and `searchQuery` props. Add:

```javascript
const hasMatch = searchMatches ? floor.rooms.some(room =>
  [...room.goals, ...(room.customGoals || [])].some(goal =>
    goal.quests.some(quest => searchMatches.has(quest.id))
  )
) : false;

const isOpen = searchMatches ? hasMatch : open;
```

Use `isOpen` instead of `open` for rendering the content. If `searchMatches` is set and no match, hide the floor entirely:

```javascript
if (searchMatches && !hasMatch) return null;
```

Pass `searchMatches` and `searchQuery` to each `<RoomSection>`.

- [ ] **Step 2: Update RoomSection similarly**

Check if any quest in this room matches. Auto-expand if yes, hide if no matches and searching.

```javascript
const hasMatch = searchMatches ? [...room.goals, ...(room.customGoals || [])].some(goal =>
  goal.quests.some(quest => searchMatches.has(quest.id))
) : false;

if (searchMatches && !hasMatch) return null;
const isOpen = searchMatches ? hasMatch : open;
```

Use `isOpen` for content visibility. Pass `searchMatches` to GoalSection.

- [ ] **Step 3: Update GoalSection to filter quests**

If `searchMatches` is set, only show quests that match. Hide the goal entirely if none match:

```javascript
const visibleQuests = searchMatches
  ? goal.quests.filter(q => searchMatches.has(q.id))
  : goal.quests;

if (searchMatches && visibleQuests.length === 0) return null;
```

Render `visibleQuests` instead of `goal.quests`.

- [ ] **Step 4: Commit**

```bash
cd frontend && git add src/components/CommandCenter.jsx && git commit -m "feat: auto-expand matching floors/rooms/goals during search"
```

---

## Design Notes

- Search is instant (no debounce needed — in-memory filter over ~100 quests)
- Matches on quest text OR goal name (so searching "energy" finds quests under "High on Energy..." goal)
- Clearing the search (× button or backspace) restores normal collapsed accordion state
- Non-matching floors/rooms/goals are hidden entirely during search (not greyed out) for a clean filtered view
- No new dependencies required
