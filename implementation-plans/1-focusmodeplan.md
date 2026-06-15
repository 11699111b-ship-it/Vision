# Focus Mode Panel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a collapsible Focus Mode card grid to the CommandCenter planning screen, with EP bar repositioned above Smart Loadouts and All Floors made collapsible.

**Architecture:** State lives in AppContext.js (focusItems array + 4 new reducer cases + LOAD_STATE patch). UI splits into two new files — FocusModePanel.jsx (cards, add form) and QuestMapperOverlay.jsx (full-screen quest linker) — to keep CommandCenter.jsx under 750 lines. CommandCenter.jsx is restructured: EP first, then Loadouts, then FocusModePanel, then collapsible AllFloorsSection.

**Tech Stack:** React 18, useReducer + Context, Framer Motion, Lucide icons, Tailwind (via Craco), localStorage + GAS for persistence. No new dependencies.

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `frontend/src/context/AppContext.js` | Modify | focusItems state, 4 reducer cases, LOAD_STATE patch |
| `frontend/src/components/FocusModePanel.jsx` | **Create** | FocusModePanel, FocusCard, AddFocusForm |
| `frontend/src/components/QuestMapperOverlay.jsx` | **Create** | Full-screen quest linker for a single focus |
| `frontend/src/components/CommandCenter.jsx` | Modify | Reorder EP row, render FocusModePanel, AllFloorsSection wrapper |
| `frontend/src/context/AppContext.focusMode.test.js` | **Create** | Reducer unit tests for all 4 new cases |

---

## Task 1: AppContext.js — state shape, reducer cases, LOAD_STATE

**Files:**
- Modify: `frontend/src/context/AppContext.js`
- Create: `frontend/src/context/AppContext.focusMode.test.js`

### Step 1.1 — Export the reducer so it can be unit tested

In `AppContext.js`, change line 84 from:
```js
function reducer(state, action) {
```
to:
```js
export function reducer(state, action) {
```

### Step 1.2 — Add `focusItems` to initialState

In `AppContext.js`, after line 80 (`lastSprintQuestIds: [],`), add:
```js
  focusItems: [],
```
Full initialState block becomes:
```js
const initialState = {
  appView: 'welcome',
  xp: 0,
  streak: 0,
  buffers: 2,
  lastResetDate: null,
  lastBufferResetMonth: null,
  blueprint: JSON.parse(JSON.stringify(INITIAL_BLUEPRINT)),
  activeSprint: {
    selectedQuestIds: [],
    completedTodayIds: [],
    completedWeeklyIds: [],
    sprintStartDate: null,
    yesterdayProgress: null,
    dailyCompletionHistory: [],
    questDailyCompletionCounts: {},
  },
  avgCompletion: 0,
  sprintCount: 0,
  launchError: null,
  submissionResult: null,
  lastSprintQuestIds: [],
  autoSubmittedMessage: null,
  focusItems: [],
};
```

### Step 1.3 — Patch LOAD_STATE to restore focusItems

In `AppContext.js`, in the `LOAD_STATE` case (around line 113), add `focusItems` to the returned object:
```js
return {
  ...state,
  xp: p.xp ?? 0,
  streak: p.streak ?? 0,
  buffers: p.buffers ?? 2,
  lastResetDate: p.lastResetDate ?? null,
  lastBufferResetMonth: p.lastBufferResetMonth ?? null,
  blueprint: bp,
  activeSprint: sprint,
  appView: view,
  avgCompletion: p.avgCompletion ?? 0,
  sprintCount: p.sprintCount ?? 0,
  lastSprintQuestIds: p.lastSprintQuestIds ?? [],
  focusItems: p.focusItems ?? [],   // ← add this line
};
```

### Step 1.4 — Add 4 reducer cases

In `AppContext.js`, before the `default:` case, add:

```js
case 'ADD_FOCUS': {
  const newFocus = {
    id: 'focus-' + Date.now(),
    name: action.name.trim().toUpperCase(),
    linkedQuestIds: [],
  };
  return { ...state, focusItems: [...state.focusItems, newFocus] };
}

case 'DELETE_FOCUS': {
  return {
    ...state,
    focusItems: state.focusItems.filter(f => f.id !== action.focusId),
  };
}

case 'TOGGLE_QUEST_IN_FOCUS': {
  return {
    ...state,
    focusItems: state.focusItems.map(f => {
      if (f.id !== action.focusId) return f;
      const already = f.linkedQuestIds.includes(action.questId);
      return {
        ...f,
        linkedQuestIds: already
          ? f.linkedQuestIds.filter(id => id !== action.questId)
          : [...f.linkedQuestIds, action.questId],
      };
    }),
  };
}

case 'ADD_FOCUS_TO_SPRINT': {
  const focus = state.focusItems.find(f => f.id === action.focusId);
  if (!focus) return state;
  const currentIds = state.activeSprint.selectedQuestIds;
  let runningEP = calcTotalEP(lookup, currentIds);
  const newIds = [...currentIds];
  for (const questId of focus.linkedQuestIds) {
    if (newIds.includes(questId)) continue;
    const entry = lookup[questId];
    if (!entry || entry.room.locked || entry.goal.tag === 'Locked') continue;
    const ep = entry.goal.epCost || 0;
    if (runningEP + ep <= MAX_EP) {
      newIds.push(questId);
      runningEP += ep;
    }
  }
  return {
    ...state,
    launchError: null,
    activeSprint: { ...state.activeSprint, selectedQuestIds: newIds },
  };
}
```

### Step 1.5 — Write reducer unit tests

Create `frontend/src/context/AppContext.focusMode.test.js`:

```js
import { reducer } from './AppContext';
import INITIAL_BLUEPRINT from '../data/blueprint';

// Minimal valid state for focus-mode tests
const baseState = {
  appView: 'planning',
  xp: 0, streak: 0, buffers: 2,
  lastResetDate: null, lastBufferResetMonth: null,
  blueprint: JSON.parse(JSON.stringify(INITIAL_BLUEPRINT)),
  activeSprint: {
    selectedQuestIds: [],
    completedTodayIds: [],
    completedWeeklyIds: [],
    sprintStartDate: null,
    yesterdayProgress: null,
    dailyCompletionHistory: [],
    questDailyCompletionCounts: {},
  },
  avgCompletion: 0, sprintCount: 0,
  launchError: null, submissionResult: null,
  lastSprintQuestIds: [],
  autoSubmittedMessage: null,
  focusItems: [],
};

describe('ADD_FOCUS', () => {
  it('creates a focus with uppercase name and empty linkedQuestIds', () => {
    const next = reducer(baseState, { type: 'ADD_FOCUS', name: 'job' });
    expect(next.focusItems).toHaveLength(1);
    expect(next.focusItems[0].name).toBe('JOB');
    expect(next.focusItems[0].linkedQuestIds).toEqual([]);
    expect(next.focusItems[0].id).toMatch(/^focus-\d+$/);
  });

  it('appends without replacing existing focuses', () => {
    const withOne = reducer(baseState, { type: 'ADD_FOCUS', name: 'JOB' });
    const withTwo = reducer(withOne, { type: 'ADD_FOCUS', name: 'BODY' });
    expect(withTwo.focusItems).toHaveLength(2);
  });
});

describe('DELETE_FOCUS', () => {
  it('removes the focus with the matching id', () => {
    const state = { ...baseState, focusItems: [{ id: 'focus-1', name: 'JOB', linkedQuestIds: [] }] };
    const next = reducer(state, { type: 'DELETE_FOCUS', focusId: 'focus-1' });
    expect(next.focusItems).toHaveLength(0);
  });

  it('leaves other focuses untouched', () => {
    const state = {
      ...baseState,
      focusItems: [
        { id: 'focus-1', name: 'JOB', linkedQuestIds: [] },
        { id: 'focus-2', name: 'BODY', linkedQuestIds: [] },
      ],
    };
    const next = reducer(state, { type: 'DELETE_FOCUS', focusId: 'focus-1' });
    expect(next.focusItems).toHaveLength(1);
    expect(next.focusItems[0].id).toBe('focus-2');
  });
});

describe('TOGGLE_QUEST_IN_FOCUS', () => {
  const questId = 'f0-rA-g0-q0';
  const state = {
    ...baseState,
    focusItems: [{ id: 'focus-1', name: 'BODY', linkedQuestIds: [] }],
  };

  it('links a quest when not already linked', () => {
    const next = reducer(state, { type: 'TOGGLE_QUEST_IN_FOCUS', focusId: 'focus-1', questId });
    expect(next.focusItems[0].linkedQuestIds).toContain(questId);
  });

  it('unlinks a quest when already linked', () => {
    const linked = { ...baseState, focusItems: [{ id: 'focus-1', name: 'BODY', linkedQuestIds: [questId] }] };
    const next = reducer(linked, { type: 'TOGGLE_QUEST_IN_FOCUS', focusId: 'focus-1', questId });
    expect(next.focusItems[0].linkedQuestIds).not.toContain(questId);
  });

  it('does not affect other focuses', () => {
    const twoFocuses = {
      ...baseState,
      focusItems: [
        { id: 'focus-1', name: 'BODY', linkedQuestIds: [] },
        { id: 'focus-2', name: 'JOB', linkedQuestIds: [] },
      ],
    };
    const next = reducer(twoFocuses, { type: 'TOGGLE_QUEST_IN_FOCUS', focusId: 'focus-1', questId });
    expect(next.focusItems[1].linkedQuestIds).toHaveLength(0);
  });
});

describe('ADD_FOCUS_TO_SPRINT', () => {
  // f0-rA-g0-q0 is the first quest in Health & Basics — exists in INITIAL_BLUEPRINT
  const questId = 'f0-rA-g0-q0';

  it('merges linked quests into selectedQuestIds without replacing', () => {
    const existingQuestId = 'f1-rA-g0-q0';
    const state = {
      ...baseState,
      focusItems: [{ id: 'focus-1', name: 'BODY', linkedQuestIds: [questId] }],
      activeSprint: { ...baseState.activeSprint, selectedQuestIds: [existingQuestId] },
    };
    const next = reducer(state, { type: 'ADD_FOCUS_TO_SPRINT', focusId: 'focus-1' });
    expect(next.activeSprint.selectedQuestIds).toContain(existingQuestId);
    expect(next.activeSprint.selectedQuestIds).toContain(questId);
  });

  it('does not double-add a quest already in selectedQuestIds', () => {
    const state = {
      ...baseState,
      focusItems: [{ id: 'focus-1', name: 'BODY', linkedQuestIds: [questId] }],
      activeSprint: { ...baseState.activeSprint, selectedQuestIds: [questId] },
    };
    const next = reducer(state, { type: 'ADD_FOCUS_TO_SPRINT', focusId: 'focus-1' });
    const count = next.activeSprint.selectedQuestIds.filter(id => id === questId).length;
    expect(count).toBe(1);
  });

  it('returns state unchanged for unknown focusId', () => {
    const next = reducer(baseState, { type: 'ADD_FOCUS_TO_SPRINT', focusId: 'does-not-exist' });
    expect(next).toBe(baseState);
  });
});
```

### Step 1.6 — Run tests to verify they pass

```bash
cd "/Users/anurag/Desktop/projects/10 year vision/Vision/frontend"
npx craco test --watchAll=false --testPathPattern="AppContext.focusMode"
```

Expected: 8 tests pass, 0 fail.

### Step 1.7 — Commit

```bash
cd "/Users/anurag/Desktop/projects/10 year vision/Vision"
git add frontend/src/context/AppContext.js frontend/src/context/AppContext.focusMode.test.js
git commit -m "feat(focus-mode): add focusItems state and 4 reducer cases"
```

---

## Task 2: FocusModePanel.jsx — panel, cards, add form

**Files:**
- Create: `frontend/src/components/FocusModePanel.jsx`

### Step 2.1 — Create FocusModePanel.jsx

Create `frontend/src/components/FocusModePanel.jsx`:

```jsx
import React, { useState } from 'react';
import { ChevronRight, ChevronDown } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { boop } from '../utils/audioEngine';
import QuestMapperOverlay from './QuestMapperOverlay';

// ── Inline add-focus form ──────────────────────────────────────────────────────
function AddFocusForm({ onClose }) {
  const [name, setName] = useState('');
  const { dispatch } = useAppContext();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) { onClose(); return; }
    dispatch({ type: 'ADD_FOCUS', name: name.trim() });
    boop();
    onClose();
  };

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        gridColumn: '1 / -1',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        background: 'rgba(57,255,20,0.04)',
        border: '1px dashed rgba(57,255,20,0.22)',
        borderRadius: 8,
        padding: '10px 12px',
        marginBottom: 2,
      }}
    >
      <input
        autoFocus
        value={name}
        onChange={e => setName(e.target.value.toUpperCase())}
        placeholder="JOB, BODY, SITE..."
        maxLength={16}
        style={{
          flex: 1,
          background: 'transparent',
          border: 'none',
          borderBottom: '1px solid rgba(57,255,20,0.3)',
          color: '#39FF14',
          fontFamily: 'Space Mono, monospace',
          fontSize: 12,
          fontWeight: 700,
          letterSpacing: '0.06em',
          outline: 'none',
          padding: '2px 0',
        }}
      />
      <button
        type="submit"
        style={{
          background: '#39FF14', border: 'none', borderRadius: 4,
          padding: '4px 10px', fontFamily: 'Space Mono, monospace',
          fontSize: 10, fontWeight: 700, color: '#000', cursor: 'pointer',
        }}
      >
        ADD
      </button>
      <button
        type="button"
        onClick={onClose}
        style={{
          background: 'none', border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 4, padding: '4px 7px', fontSize: 10,
          color: 'rgba(255,255,255,0.3)', cursor: 'pointer',
        }}
      >
        ×
      </button>
    </form>
  );
}

// ── Single focus card ──────────────────────────────────────────────────────────
function FocusCard({ focus, onMap }) {
  const { dispatch } = useAppContext();
  const hasQuests = focus.linkedQuestIds.length > 0;

  return (
    <div
      style={{
        background: hasQuests ? 'rgba(255,255,255,0.025)' : 'rgba(255,255,255,0.01)',
        border: `1px solid ${hasQuests ? 'rgba(57,255,20,0.18)' : 'rgba(255,255,255,0.08)'}`,
        borderRadius: 8,
        padding: '10px 12px',
        position: 'relative',
        opacity: hasQuests ? 1 : 0.7,
      }}
    >
      {/* Delete × */}
      <button
        onClick={() => { boop(); dispatch({ type: 'DELETE_FOCUS', focusId: focus.id }); }}
        style={{
          position: 'absolute', top: 6, right: 7,
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'rgba(255,255,255,0.15)', fontSize: 14, lineHeight: 1,
          padding: '1px 3px', borderRadius: 3,
        }}
        onMouseOver={e => { e.currentTarget.style.color = '#FF3B30'; e.currentTarget.style.background = 'rgba(255,59,48,0.1)'; }}
        onMouseOut={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.15)'; e.currentTarget.style.background = 'none'; }}
      >
        ×
      </button>

      {/* Name */}
      <div style={{
        fontFamily: 'Space Mono, monospace', fontSize: 12, fontWeight: 700,
        color: hasQuests ? '#39FF14' : 'rgba(57,255,20,0.4)',
        letterSpacing: '0.05em', marginBottom: 2,
      }}>
        {focus.name}
      </div>

      {/* Quest count */}
      <div style={{
        fontFamily: 'Space Mono, monospace', fontSize: 9, marginBottom: 8,
        color: hasQuests ? 'rgba(255,255,255,0.28)' : 'rgba(255,165,0,0.5)',
      }}>
        {hasQuests
          ? `${focus.linkedQuestIds.length} quest${focus.linkedQuestIds.length !== 1 ? 's' : ''} linked`
          : 'no quests yet'}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {hasQuests && (
          <>
            <button
              onClick={() => { boop(); dispatch({ type: 'ADD_FOCUS_TO_SPRINT', focusId: focus.id }); }}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                fontFamily: 'Space Mono, monospace', fontSize: 10,
                color: '#39FF14', padding: 0, letterSpacing: '0.03em',
              }}
            >
              + Add to sprint
            </button>
            <span style={{ color: 'rgba(255,255,255,0.1)', fontSize: 10 }}>·</span>
          </>
        )}
        <button
          onClick={() => onMap(focus.id)}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontFamily: 'Space Mono, monospace', fontSize: 9,
            color: hasQuests ? 'rgba(0,229,255,0.55)' : 'rgba(255,165,0,0.65)',
            padding: 0,
          }}
        >
          {hasQuests ? 'map' : '+ map quests'}
        </button>
      </div>
    </div>
  );
}

// ── Main panel ─────────────────────────────────────────────────────────────────
export default function FocusModePanel() {
  const { focusItems } = useAppContext();
  const [open, setOpen] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [mappingFocusId, setMappingFocusId] = useState(null);

  const ChevronIcon = open ? ChevronDown : ChevronRight;

  return (
    <>
      {mappingFocusId && (
        <QuestMapperOverlay
          focusId={mappingFocusId}
          onClose={() => setMappingFocusId(null)}
        />
      )}

      <div style={{
        borderBottom: '1px solid rgba(57,255,20,0.1)',
        background: 'rgba(57,255,20,0.008)',
      }}>
        {/* Header */}
        <div
          onClick={() => setOpen(o => !o)}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '11px 16px', cursor: 'pointer', userSelect: 'none',
          }}
        >
          <ChevronIcon size={10} color="rgba(57,255,20,0.55)" style={{ flexShrink: 0 }} />
          <span style={{
            fontFamily: 'Space Mono, monospace', fontSize: 11, fontWeight: 700,
            color: '#39FF14', letterSpacing: '0.14em', flex: 1,
          }}>
            FOCUS MODE
          </span>
          <button
            onClick={e => { e.stopPropagation(); setShowAddForm(v => !v); boop(); }}
            style={{
              background: 'rgba(57,255,20,0.08)',
              border: '1px solid rgba(57,255,20,0.28)',
              borderRadius: 5, padding: '3px 9px',
              fontFamily: 'Space Mono, monospace', fontSize: 10,
              color: '#39FF14', cursor: 'pointer', letterSpacing: '0.05em',
            }}
          >
            + ADD
          </button>
        </div>

        {/* Body */}
        {open && (
          <div style={{ padding: '6px 12px 12px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7 }}>
              {showAddForm && (
                <AddFocusForm onClose={() => setShowAddForm(false)} />
              )}
              {focusItems.map(focus => (
                <FocusCard
                  key={focus.id}
                  focus={focus}
                  onMap={id => setMappingFocusId(id)}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
```

### Step 2.2 — Commit

```bash
cd "/Users/anurag/Desktop/projects/10 year vision/Vision"
git add frontend/src/components/FocusModePanel.jsx
git commit -m "feat(focus-mode): add FocusModePanel with cards and add form"
```

---

## Task 3: QuestMapperOverlay.jsx — full-screen quest linker

**Files:**
- Create: `frontend/src/components/QuestMapperOverlay.jsx`

### Step 3.1 — Create QuestMapperOverlay.jsx

```jsx
import React, { useState } from 'react';
import { ChevronRight, ChevronDown, Check } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { boop } from '../utils/audioEngine';

// ── Single quest row (checks linkedQuestIds, not selectedQuestIds) ─────────────
function MapperQuestRow({ quest, isLinked, focusId, isLast }) {
  const { dispatch } = useAppContext();

  const handleToggle = () => {
    boop();
    dispatch({ type: 'TOGGLE_QUEST_IN_FOCUS', focusId, questId: quest.id });
  };

  return (
    <div
      onClick={handleToggle}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '12px 20px',
        borderBottom: !isLast ? '1px solid rgba(255,255,255,0.05)' : 'none',
        background: isLinked ? 'rgba(57,255,20,0.04)' : 'transparent',
        cursor: 'pointer', transition: 'background 0.15s',
      }}
    >
      <p style={{
        flex: 1, fontSize: 13, margin: 0, lineHeight: 1.45,
        color: isLinked ? '#ffffff' : '#D1D5DB',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontWeight: isLinked ? 500 : 400,
      }}>
        {quest.text}
      </p>
      <div style={{
        width: 16, height: 16, borderRadius: '50%', flexShrink: 0,
        border: `1.5px solid ${isLinked ? '#39FF14' : 'rgba(255,255,255,0.18)'}`,
        background: isLinked ? '#39FF14' : 'transparent',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'all 0.15s',
      }}>
        {isLinked && <Check size={9} color="#000" strokeWidth={3.5} />}
      </div>
    </div>
  );
}

// ── Goal group inside mapper ───────────────────────────────────────────────────
function MapperGoalGroup({ goal, focusId, linkedQuestIds, isLocked }) {
  const linkedCount = goal.quests.filter(q => linkedQuestIds.includes(q.id)).length;

  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        paddingBottom: 8, marginBottom: 12,
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        padding: '0 20px 8px',
      }}>
        {linkedCount > 0 && (
          <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#39FF14', boxShadow: '0 0 4px #39FF14', flexShrink: 0 }} />
        )}
        <span style={{
          flex: 1, fontSize: 11, fontWeight: 700, color: '#9CA3AF',
          fontFamily: 'system-ui, sans-serif', textTransform: 'uppercase', letterSpacing: '0.08em',
        }}>
          {goal.name}
        </span>
        {linkedCount > 0 && (
          <span style={{ fontSize: 9, color: '#39FF14', fontFamily: 'Space Mono, monospace' }}>
            {linkedCount}/{goal.quests.length}
          </span>
        )}
      </div>
      {goal.quests.map((quest, idx) => (
        <MapperQuestRow
          key={quest.id}
          quest={quest}
          isLinked={linkedQuestIds.includes(quest.id)}
          focusId={focusId}
          isLast={idx === goal.quests.length - 1}
        />
      ))}
    </div>
  );
}

// ── Room accordion inside mapper ───────────────────────────────────────────────
function MapperRoomSection({ floor, room, focusId, linkedQuestIds }) {
  const [open, setOpen] = useState(false);
  const allGoals = [...room.goals, ...(room.customGoals || [])];
  const linkedInRoom = allGoals.flatMap(g => g.quests).filter(q => linkedQuestIds.includes(q.id)).length;
  const ChevronIcon = open ? ChevronDown : ChevronRight;

  return (
    <div>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2 text-left"
        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '9px 16px' }}
      >
        <span style={{
          fontSize: 12, fontWeight: 600, flex: 1,
          color: linkedInRoom > 0 ? '#39FF14' : 'rgba(255,255,255,0.5)',
          fontFamily: 'system-ui, sans-serif',
        }}>
          {room.name}
        </span>
        {linkedInRoom > 0 && (
          <span style={{ fontSize: 9, color: '#39FF14', fontFamily: 'Space Mono, monospace' }}>
            {linkedInRoom}
          </span>
        )}
        {room.locked && (
          <span style={{ fontSize: 10, color: '#444', fontFamily: 'Space Mono, monospace' }}>LOCKED</span>
        )}
        <ChevronIcon size={12} color="rgba(255,255,255,0.2)" style={{ flexShrink: 0 }} />
      </button>
      {open && !room.locked && (
        <div style={{ padding: '8px 0 4px' }}>
          {allGoals.map(goal => (
            <MapperGoalGroup
              key={goal.id}
              goal={goal}
              focusId={focusId}
              linkedQuestIds={linkedQuestIds}
              isLocked={room.locked}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Floor accordion inside mapper ──────────────────────────────────────────────
function MapperFloorSection({ floor, focusId, linkedQuestIds }) {
  const [open, setOpen] = useState(false);
  const ChevronIcon = open ? ChevronDown : ChevronRight;

  return (
    <div style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 text-left"
        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '13px 16px' }}
      >
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.22)', fontFamily: 'Space Mono, monospace', letterSpacing: '0.1em', flexShrink: 0 }}>
          F{floor.number}
        </span>
        <span style={{ fontSize: 14, fontWeight: 700, color: '#ffffff', flex: 1 }}>
          {floor.name}
        </span>
        <ChevronIcon size={14} color="rgba(255,255,255,0.22)" style={{ flexShrink: 0 }} />
      </button>
      {open && (
        <div style={{ background: 'rgba(0,0,0,0.18)', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
          {floor.rooms.map(room => (
            <MapperRoomSection
              key={room.id}
              floor={floor}
              room={room}
              focusId={focusId}
              linkedQuestIds={linkedQuestIds}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Overlay root ───────────────────────────────────────────────────────────────
export default function QuestMapperOverlay({ focusId, onClose }) {
  const { blueprint, focusItems } = useAppContext();
  const focus = focusItems.find(f => f.id === focusId);
  if (!focus) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 50,
      background: '#0d0d0d',
      display: 'flex', flexDirection: 'column',
      overflowY: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '14px 16px',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        flexShrink: 0,
      }}>
        <button
          onClick={onClose}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontFamily: 'Space Mono, monospace', fontSize: 11,
            color: 'rgba(255,255,255,0.45)', display: 'flex', alignItems: 'center', gap: 4,
          }}
        >
          ← DONE
        </button>
        <div style={{ flex: 1 }}>
          <span style={{ fontFamily: 'Space Mono, monospace', fontSize: 10, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.14em' }}>
            MAP QUESTS TO
          </span>
          <span style={{ fontFamily: 'Space Mono, monospace', fontSize: 12, fontWeight: 700, color: '#39FF14', marginLeft: 8 }}>
            {focus.name}
          </span>
        </div>
        <span style={{ fontFamily: 'Space Mono, monospace', fontSize: 10, color: 'rgba(57,255,20,0.5)' }}>
          {focus.linkedQuestIds.length} linked
        </span>
      </div>

      {/* Blueprint accordion — scrollable */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {blueprint.floors.map(floor => (
          <MapperFloorSection
            key={floor.id}
            floor={floor}
            focusId={focusId}
            linkedQuestIds={focus.linkedQuestIds}
          />
        ))}
        <div style={{ height: 32 }} />
      </div>
    </div>
  );
}
```

### Step 3.2 — Commit

```bash
cd "/Users/anurag/Desktop/projects/10 year vision/Vision"
git add frontend/src/components/QuestMapperOverlay.jsx
git commit -m "feat(focus-mode): add QuestMapperOverlay for linking quests to a focus"
```

---

## Task 4: CommandCenter.jsx — reorder EP, add FocusModePanel, collapsible AllFloorsSection

**Files:**
- Modify: `frontend/src/components/CommandCenter.jsx`

### Step 4.1 — Add import for FocusModePanel

At the top of `CommandCenter.jsx`, after the existing imports, add:

```js
import FocusModePanel from './FocusModePanel';
```

### Step 4.2 — Add AllFloorsSection wrapper component

In `CommandCenter.jsx`, add this new component after `FloorSection` (around line 398), before `LoadoutsPanel`:

```jsx
// ── All Floors — collapsible wrapper ──────────────────────────────────────────
function AllFloorsSection({ floors }) {
  const [open, setOpen] = useState(true);
  const ChevronIcon = open ? ChevronDown : ChevronRight;

  return (
    <div>
      <div
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '11px 16px',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
          cursor: 'pointer', userSelect: 'none',
        }}
      >
        <ChevronIcon size={10} color="rgba(255,255,255,0.22)" style={{ flexShrink: 0 }} />
        <span style={{
          fontFamily: 'Space Mono, monospace', fontSize: 11, fontWeight: 700,
          color: 'rgba(255,255,255,0.35)', letterSpacing: '0.14em', flex: 1,
        }}>
          ALL FLOORS
        </span>
        <span style={{
          fontFamily: 'Space Mono, monospace', fontSize: 10,
          color: 'rgba(255,255,255,0.18)',
        }}>
          {floors.length} FLOORS
        </span>
      </div>
      {open && floors.map(floor => (
        <FloorSection key={floor.id} floor={floor} />
      ))}
    </div>
  );
}
```

### Step 4.3 — Restructure the main CommandCenter render

Replace the `return` block of the `CommandCenter` default export (currently lines 478–586) with:

```jsx
return (
  <div data-testid="command-center" className="flex flex-col h-full">

    {/* 1. EP budget strip — FIRST (moved above loadouts) */}
    <div
      data-testid="ep-budget-display"
      className="flex items-center gap-3 px-4 py-2.5 flex-shrink-0"
      style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(0,0,0,0.2)' }}
    >
      <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.28)', fontFamily: 'Space Mono, monospace', flexShrink: 0 }}>
        EP
      </span>
      <div style={{ flex: 1, background: 'rgba(255,255,255,0.05)', height: 4, borderRadius: 2, overflow: 'hidden' }}>
        <motion.div
          style={{ height: '100%', background: totalEP > MAX_EP * 0.85 ? '#FFA500' : '#39FF14', borderRadius: 2 }}
          animate={{ width: `${epPct}%` }}
          transition={{ duration: 0.4 }}
        />
      </div>
      <span style={{ fontSize: 15, fontWeight: 700, fontFamily: 'Space Mono, monospace', flexShrink: 0, color: totalEP > MAX_EP * 0.85 ? '#FFA500' : '#39FF14' }}>
        {totalEP}<span style={{ color: '#333', fontSize: 12 }}>/{MAX_EP}</span>
      </span>
      <span style={{ fontSize: 11, color: '#444', fontFamily: 'Space Mono, monospace', flexShrink: 0 }}>
        {activeSprint.selectedQuestIds.length}
      </span>
      <motion.button
        data-testid="reset-sprint-btn"
        onClick={() => { if (hasSelection) { boop(); dispatch({ type: 'RESET_SPRINT' }); } }}
        title="Reset all selections"
        style={{
          background: 'transparent',
          border: `1px solid ${hasSelection ? 'rgba(255,59,48,0.3)' : 'rgba(255,255,255,0.06)'}`,
          borderRadius: 6, padding: '3px 8px',
          cursor: hasSelection ? 'pointer' : 'not-allowed',
          opacity: hasSelection ? 1 : 0.35,
          display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0,
        }}
        whileHover={hasSelection ? { background: 'rgba(255,59,48,0.1)', borderColor: 'rgba(255,59,48,0.6)' } : {}}
        whileTap={hasSelection ? { scale: 0.94 } : {}}
      >
        <RotateCcw size={10} color={hasSelection ? '#FF3B30' : '#333'} />
        <span style={{ fontSize: 10, color: hasSelection ? '#FF3B30' : '#333', fontFamily: 'Space Mono, monospace' }}>
          RESET
        </span>
      </motion.button>
    </div>

    {/* 2. Smart Loadouts — SECOND */}
    <LoadoutsPanel />

    {/* 3. Focus Mode — THIRD */}
    <FocusModePanel />

    {/* 4. Blueprint — All Floors collapsible */}
    <div className="flex-1 overflow-y-auto" style={{ minHeight: 0 }}>
      <MobileReceiptBar />
      <AllFloorsSection floors={blueprint.floors} />
      <div style={{ height: 20 }} />
    </div>

    {/* 5. Launch footer — unchanged */}
    <div className="px-4 py-4 flex-shrink-0" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
      <AnimatePresence>
        {launchError && (
          <motion.div
            initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="flex items-start gap-2 mb-3 p-3"
            style={{ background: 'rgba(239,68,68,0.08)', borderRadius: 10, border: '1px solid rgba(239,68,68,0.28)' }}
          >
            <AlertTriangle size={14} color="#ef4444" style={{ flexShrink: 0, marginTop: 1 }} />
            <p style={{ fontSize: 12, color: '#ef4444', margin: 0, lineHeight: 1.5, fontFamily: 'Space Mono, monospace' }}>{launchError}</p>
            <button onClick={() => dispatch({ type: 'CLEAR_ERROR' })} style={{ background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0 }}>
              <X size={12} color="#555" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
      <motion.button
        data-testid="launch-mission-btn"
        onClick={() => { boop(); dispatch({ type: 'LAUNCH_MISSION' }); }}
        disabled={!canLaunch}
        className="w-full flex items-center justify-center gap-3 py-4 font-orbitron font-black"
        style={{
          background: canLaunch ? '#39FF14' : 'rgba(255,255,255,0.04)',
          border: `1.5px solid ${canLaunch ? '#39FF14' : 'rgba(255,255,255,0.08)'}`,
          borderRadius: 12, color: canLaunch ? '#000' : '#333',
          fontSize: 14, letterSpacing: '0.18em',
          cursor: canLaunch ? 'pointer' : 'not-allowed',
          boxShadow: canLaunch ? '0 0 24px rgba(57,255,20,0.28)' : 'none',
        }}
        whileHover={canLaunch ? { boxShadow: '0 0 40px rgba(57,255,20,0.45)', scale: 1.01 } : {}}
        whileTap={canLaunch ? { scale: 0.97 } : {}}
      >
        <Rocket size={16} />
        LAUNCH MISSION
      </motion.button>
    </div>
  </div>
);
```

### Step 4.4 — Remove the now-duplicate EP block from its old position

The old EP block was between `<LoadoutsPanel />` and the floors div. Since you replaced the entire return block in Step 4.3, there is nothing left to remove — the old block is already gone.

### Step 4.5 — Verify line count stays under 750

```bash
wc -l "/Users/anurag/Desktop/projects/10 year vision/Vision/frontend/src/components/CommandCenter.jsx"
```

Expected: under 750. If over, move `AllFloorsSection` into a new file `frontend/src/components/AllFloorsSection.jsx`.

### Step 4.6 — Build to catch any compile errors

```bash
cd "/Users/anurag/Desktop/projects/10 year vision/Vision/frontend"
npx craco build 2>&1 | tail -20
```

Expected: `Compiled successfully` with no errors (warnings about bundle size are fine).

### Step 4.7 — Run tests to confirm no regressions

```bash
cd "/Users/anurag/Desktop/projects/10 year vision/Vision/frontend"
npx craco test --watchAll=false --testPathPattern="AppContext.focusMode"
```

Expected: 8 tests pass.

### Step 4.8 — Commit

```bash
cd "/Users/anurag/Desktop/projects/10 year vision/Vision"
git add frontend/src/components/CommandCenter.jsx
git commit -m "feat(focus-mode): restructure CommandCenter — EP first, FocusModePanel, collapsible AllFloors"
```

---

## Self-Review Checklist

### Spec coverage
- [x] EP bar above Smart Loadouts → Task 4 Step 4.3
- [x] FOCUS MODE collapsible header → Task 2 Step 2.1 (FocusModePanel)
- [x] + ADD opens inline form → Task 2 Step 2.1 (AddFocusForm)
- [x] 2-column card grid → Task 2 Step 2.1 (FocusCard grid)
- [x] "map" opens QuestMapperOverlay → Task 3
- [x] Linked quests show green checkmark → Task 3 Step 3.1 (MapperQuestRow)
- [x] ← DONE closes overlay → Task 3 Step 3.1 (header button)
- [x] + Add to sprint merges (not replaces) → Task 1 Step 1.4 (ADD_FOCUS_TO_SPRINT)
- [x] × deletes focus card → Task 2 Step 2.1 (FocusCard delete button)
- [x] ALL FLOORS collapsible → Task 4 Step 4.2 (AllFloorsSection)
- [x] Mobile receipt bar untouched → MobileReceiptBar rendered inside the floors scroll div as before
- [x] focusItems persists in localStorage → automatic via existing useEffect (state → toSave → localStorage)
- [x] focusItems syncs to GAS → automatic via existing gasPayload construction
- [x] focusItems restores from GAS GET → Task 1 Step 1.3 (LOAD_STATE patch)
- [x] Reducer tests → Task 1 Step 1.5

### No placeholder violations
All steps contain complete code. No TBD, TODO, or "similar to above" patterns.

### Type consistency
- `focus.id` — always `'focus-' + Date.now()` string. Used consistently in DELETE_FOCUS, TOGGLE_QUEST_IN_FOCUS, ADD_FOCUS_TO_SPRINT, FocusCard, QuestMapperOverlay.
- `focus.linkedQuestIds` — always `string[]`. Checked with `.includes()`, filtered with `.filter()`, spread with `[...f.linkedQuestIds, action.questId]`. Consistent across all 4 reducer cases and both new components.
- `dispatch({ type: 'TOGGLE_QUEST_IN_FOCUS', focusId, questId })` — matches reducer case signature exactly.
- `dispatch({ type: 'ADD_FOCUS_TO_SPRINT', focusId })` — matches reducer case signature exactly.
