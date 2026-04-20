import React, { createContext, useContext, useReducer, useEffect, useRef, useState, useMemo, useCallback } from 'react';
import INITIAL_BLUEPRINT, { EP_COSTS } from '../data/blueprint';
import { getISTDate, getISTHour, isSprintExpired } from '../utils/istUtils';

const STORAGE_KEY = 'superhero_hq_v2';
const GAS_URL = 'https://script.google.com/macros/s/AKfycbzyZTaQOLvFsmD1DCZbKgYtbzHOXi4iA8gMFEI4yV9N6Vr5pTlPOAwR_NM-L_w_nTtF/exec';

export const MAX_EP = 20;
export const UPKEEP_MIN_EP = 5;

export function buildQuestLookup(blueprint) {
  const map = {};
  blueprint.floors.forEach(floor => {
    floor.rooms.forEach(room => {
      [...room.goals, ...(room.customGoals || [])].forEach(goal => {
        goal.quests.forEach(quest => {
          map[quest.id] = { quest, goal, room, floor };
        });
      });
    });
  });
  return map;
}

export function calcTotalEP(lookup, ids) {
  return ids.reduce((s, id) => s + (lookup[id]?.goal.epCost || 0), 0);
}

export function calcFloor01EP(lookup, ids) {
  return ids.reduce((s, id) => {
    const e = lookup[id];
    return e && e.floor.number <= 1 ? s + e.goal.epCost : s;
  }, 0);
}

export function getHeroInfo(xp) {
  if (xp >= 7) return { level: 4, name: 'Legend', emoji: '🦸✨' };
  if (xp >= 3) return { level: 3, name: 'Hero', emoji: '🦸' };
  if (xp >= 1) return { level: 2, name: 'Sidekick', emoji: '🏃' };
  return { level: 1, name: 'Civilian', emoji: '🧍' };
}

function mergeBlueprint(initial, saved) {
  if (!saved) return JSON.parse(JSON.stringify(initial));
  const merged = JSON.parse(JSON.stringify(initial));
  try {
    merged.floors.forEach(floor => {
      const sf = saved.floors?.find(f => f.id === floor.id);
      if (!sf) return;
      floor.rooms.forEach(room => {
        const sr = sf.rooms?.find(r => r.id === room.id);
        if (sr) room.customGoals = sr.customGoals || [];
      });
    });
  } catch { /* ignore */ }
  return merged;
}

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
  },
  launchError: null,
  submissionResult: null,
  lastSprintQuestIds: [],
  autoSubmittedMessage: null,
};

function reducer(state, action) {
  const lookup = buildQuestLookup(state.blueprint);

  switch (action.type) {
    case 'LOAD_STATE': {
      const p = action.payload;
      return {
        ...state,
        xp: p.xp ?? 0,
        streak: p.streak ?? 0,
        buffers: p.buffers ?? 2,
        lastResetDate: p.lastResetDate ?? null,
        lastBufferResetMonth: p.lastBufferResetMonth ?? null,
        blueprint: mergeBlueprint(INITIAL_BLUEPRINT, p.blueprint),
        activeSprint: p.activeSprint ?? initialState.activeSprint,
        appView: p.appView === 'welcome' ? 'planning' : (p.appView || 'planning'),
        lastSprintQuestIds: p.lastSprintQuestIds ?? [],
      };
    }

    case 'SET_VIEW':
      return { ...state, appView: action.view };

    case 'TOGGLE_SPRINT_QUEST': {
      const { questId } = action;
      const { activeSprint } = state;
      const selected = activeSprint.selectedQuestIds;
      if (selected.includes(questId)) {
        return { ...state, launchError: null, activeSprint: { ...activeSprint, selectedQuestIds: selected.filter(id => id !== questId) } };
      }
      const curEP = calcTotalEP(lookup, selected);
      const addEP = lookup[questId]?.goal.epCost || 0;
      if (curEP + addEP > MAX_EP) {
        return { ...state, launchError: `EP budget full! ${curEP}/${MAX_EP} EP used. Deselect a quest first.` };
      }
      return { ...state, launchError: null, activeSprint: { ...activeSprint, selectedQuestIds: [...selected, questId] } };
    }

    case 'TOGGLE_COMPLETE': {
      const { questId } = action;
      const { activeSprint } = state;
      const entry = lookup[questId];
      if (!entry) return state;
      const isDaily = entry.quest.frequency === 'Daily';
      if (isDaily) {
        const done = activeSprint.completedTodayIds.includes(questId);
        return { ...state, activeSprint: { ...activeSprint, completedTodayIds: done ? activeSprint.completedTodayIds.filter(id => id !== questId) : [...activeSprint.completedTodayIds, questId] } };
      } else {
        // Weekly/Monthly/Quarterly persist across days — only cleared on sprint submit
        const done = activeSprint.completedWeeklyIds.includes(questId);
        return { ...state, activeSprint: { ...activeSprint, completedWeeklyIds: done ? activeSprint.completedWeeklyIds.filter(id => id !== questId) : [...activeSprint.completedWeeklyIds, questId] } };
      }
    }

    case 'LAUNCH_MISSION': {
      const { activeSprint } = state;
      if (activeSprint.selectedQuestIds.length === 0) {
        return { ...state, launchError: 'Select at least one quest to launch the mission!' };
      }
      return {
        ...state,
        appView: 'tracking',
        launchError: null,
        activeSprint: { ...activeSprint, sprintStartDate: new Date().toISOString() },
      };
    }

    case 'SUBMIT_MISSION': {
      const { activeSprint } = state;
      const { selectedQuestIds, completedTodayIds, completedWeeklyIds } = activeSprint;
      const total = selectedQuestIds.length;
      if (total === 0) return { ...state, appView: 'planning', submissionResult: { percentage: 0, isPerfect: false } };
      const dailyIds = selectedQuestIds.filter(id => lookup[id]?.quest.frequency === 'Daily');
      const nonDailyIds = selectedQuestIds.filter(id => lookup[id]?.quest.frequency !== 'Daily');
      const completedD = dailyIds.filter(id => completedTodayIds.includes(id)).length;
      const completedW = nonDailyIds.filter(id => completedWeeklyIds.includes(id)).length;
      const percentage = Math.round(((completedD + completedW) / total) * 100);
      const isPerfect = percentage === 100;
      return {
        ...state,
        xp: isPerfect ? state.xp + 1 : state.xp,
        submissionResult: { percentage, isPerfect },
        lastSprintQuestIds: selectedQuestIds.length > 0 ? [...selectedQuestIds] : state.lastSprintQuestIds,
        activeSprint: { selectedQuestIds: [], completedTodayIds: [], completedWeeklyIds: [], sprintStartDate: null, yesterdayProgress: null },
      };
    }

    // ── Auto-submit (IST Sunday midnight deadline reached) ───────────────────
    case 'AUTO_SUBMIT_SPRINT': {
      const { activeSprint } = state;
      const { selectedQuestIds, completedTodayIds, completedWeeklyIds } = activeSprint;
      const total = selectedQuestIds.length;
      if (total === 0) {
        return {
          ...state,
          appView: 'planning',
          autoSubmittedMessage: 'Boss Anurag, your previous sprint automatically concluded at midnight IST. Your HQ is ready for a new week.',
          activeSprint: { selectedQuestIds: [], completedTodayIds: [], completedWeeklyIds: [], sprintStartDate: null, yesterdayProgress: null },
        };
      }
      const dailyIds = selectedQuestIds.filter(id => lookup[id]?.quest.frequency === 'Daily');
      const nonDailyIds = selectedQuestIds.filter(id => lookup[id]?.quest.frequency !== 'Daily');
      const completedD = dailyIds.filter(id => completedTodayIds.includes(id)).length;
      const completedW = nonDailyIds.filter(id => completedWeeklyIds.includes(id)).length;
      const percentage = Math.round(((completedD + completedW) / total) * 100);
      const isPerfect = percentage === 100;
      return {
        ...state,
        xp: isPerfect ? state.xp + 1 : state.xp,
        autoSubmittedMessage: `Boss Anurag, your previous sprint automatically concluded at midnight IST with a score of ${percentage}%. Your HQ is ready for a new week.`,
        lastSprintQuestIds: selectedQuestIds.length > 0 ? [...selectedQuestIds] : state.lastSprintQuestIds,
        activeSprint: { selectedQuestIds: [], completedTodayIds: [], completedWeeklyIds: [], sprintStartDate: null, yesterdayProgress: null },
        appView: 'planning',
      };
    }

    case 'CLEAR_AUTO_SUBMIT':
      return { ...state, autoSubmittedMessage: null };

    case 'CLEAR_SUBMISSION':
      return { ...state, appView: 'planning', submissionResult: null };

    case 'ADD_CUSTOM_GOAL': {
      const { floorId, roomId, goal } = action;
      const nb = JSON.parse(JSON.stringify(state.blueprint));
      const floor = nb.floors.find(f => f.id === floorId);
      if (!floor) return state;
      const room = floor.rooms.find(r => r.id === roomId);
      if (!room) return state;
      room.customGoals = [...(room.customGoals || []), goal];
      const newQuestId = goal.quests[0]?.id;
      if (newQuestId) {
        const newLookup = buildQuestLookup(nb);
        const selected = state.activeSprint.selectedQuestIds;
        const curEP = calcTotalEP(newLookup, selected);
        if (curEP + (goal.epCost || 0) <= MAX_EP) {
          return {
            ...state,
            blueprint: nb,
            launchError: null,
            activeSprint: { ...state.activeSprint, selectedQuestIds: [...selected, newQuestId] },
          };
        }
      }
      return { ...state, blueprint: nb };
    }

    // ── IST 3AM Daily Reset — ONLY resets Daily tasks (Weekly+ persist) ───────
    case 'DAILY_RESET': {
      const { activeSprint, buffers, streak, lastBufferResetMonth } = state;
      const { completedTodayIds, selectedQuestIds } = activeSprint;

      // Only Daily-frequency tasks count for daily progress score
      const dailyIds = selectedQuestIds.filter(id => lookup[id]?.quest.frequency === 'Daily');
      const yp = dailyIds.length > 0
        ? Math.round((completedTodayIds.filter(id => dailyIds.includes(id)).length / dailyIds.length) * 100)
        : 100;

      let ns = streak, nb = buffers;
      if (yp >= 100) { ns = streak + 1; }
      else { if (nb > 0) { nb -= 1; } else { ns = 0; } }

      // IST-based date + monthly buffer reset on 1st of month
      const istNow = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
      const istDateStr = istNow.toLocaleDateString('en-CA');
      const cm = istNow.getMonth() + 1;
      if (lastBufferResetMonth !== cm && istNow.getDate() === 1) nb = 2;

      return {
        ...state,
        streak: ns,
        buffers: Math.min(2, nb),
        lastResetDate: istDateStr,
        lastBufferResetMonth: cm,
        // completedTodayIds cleared (Daily only) — completedWeeklyIds preserved
        activeSprint: { ...activeSprint, completedTodayIds: [], yesterdayProgress: yp },
      };
    }

    case 'CLEAR_ERROR':
      return { ...state, launchError: null };

    case 'RESET_SPRINT':
      return {
        ...state,
        launchError: null,
        activeSprint: {
          selectedQuestIds: [],
          completedTodayIds: [],
          completedWeeklyIds: [],
          sprintStartDate: null,
          yesterdayProgress: null,
        },
      };

    case 'LOAD_LOADOUT': {
      const { questIds } = action;
      if (!questIds || questIds.length === 0) {
        return { ...state, activeSprint: { ...state.activeSprint, selectedQuestIds: [] } };
      }
      const validIds = questIds.filter(id => {
        const entry = lookup[id];
        return entry && !entry.room.locked && entry.goal.tag !== 'Locked';
      });
      let runningEP = 0;
      const fittingIds = [];
      for (const id of validIds) {
        const ep = lookup[id]?.goal.epCost || 0;
        if (runningEP + ep <= MAX_EP) { fittingIds.push(id); runningEP += ep; }
      }
      return {
        ...state,
        launchError: null,
        activeSprint: { ...state.activeSprint, selectedQuestIds: fittingIds },
      };
    }

    default:
      return state;
  }
}

const AppContext = createContext(null);

// ── Async GAS save (debounced, fire-and-forget) ──────────────────────────────
function saveToGAS(data) {
  fetch(GAS_URL, {
    method: 'POST',
    mode: 'no-cors',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify(data),
  }).catch(() => {});
}

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [isLoading, setIsLoading] = useState(true);
  const saveTimerRef = useRef(null);
  const initialLoadDone = useRef(false);

  // ── 1. Load state from GAS on mount (with localStorage fallback) ────────────
  useEffect(() => {
    const load = async () => {
      try {
        const controller = new AbortController();
        const tid = setTimeout(() => controller.abort(), 8000); // 8s timeout
        const res = await fetch(GAS_URL, { signal: controller.signal });
        clearTimeout(tid);
        const data = await res.json();
        if (data && (data.xp !== undefined || data.streak !== undefined || data.activeSprint)) {
          dispatch({ type: 'LOAD_STATE', payload: data });
        } else {
          throw new Error('empty');
        }
      } catch {
        // Fallback to localStorage
        try {
          const raw = localStorage.getItem(STORAGE_KEY);
          const hasEntered = localStorage.getItem('hq_entered');
          if (raw && hasEntered) dispatch({ type: 'LOAD_STATE', payload: JSON.parse(raw) });
        } catch { /* ignore */ }
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  // ── 2. Save state to GAS (debounced 3s) + localStorage (immediate) ─────────
  useEffect(() => {
    if (isLoading) return;
    if (!initialLoadDone.current) { initialLoadDone.current = true; return; }

    const { appView, launchError, submissionResult, autoSubmittedMessage, ...toSave } = state;
    toSave.appView = appView === 'welcome' ? 'planning' : appView;

    // localStorage — immediate, offline resilient
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave)); } catch { /* ignore */ }

    // GAS — debounced 3 seconds
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => saveToGAS(toSave), 3000);
  }, [state, isLoading]);

  // ── 3. IST 3AM Daily Reset (checks every 60s, only resets Daily tasks) ──────
  useEffect(() => {
    const check = () => {
      if (!state.activeSprint.sprintStartDate) return;
      const istDate = getISTDate();
      const istHour = getISTHour();
      if (istHour >= 3 && state.lastResetDate !== istDate) {
        dispatch({ type: 'DAILY_RESET' });
      }
    };
    check();
    const id = setInterval(check, 60000);
    return () => clearInterval(id);
  }, [state.lastResetDate, state.activeSprint.sprintStartDate]);

  // ── 4. IST Sunday 11:59 PM Auto-Submit (mount + every 60s interval) ─────────
  useEffect(() => {
    const check = () => {
      if (state.activeSprint.sprintStartDate && isSprintExpired(state.activeSprint.sprintStartDate)) {
        dispatch({ type: 'AUTO_SUBMIT_SPRINT' });
      }
    };
    check();
    const id = setInterval(check, 60000);
    return () => clearInterval(id);
  }, [state.activeSprint.sprintStartDate]);

  const questLookup = useMemo(() => buildQuestLookup(state.blueprint), [state.blueprint]);
  const totalEP = useMemo(() => calcTotalEP(questLookup, state.activeSprint.selectedQuestIds), [questLookup, state.activeSprint.selectedQuestIds]);
  const floor01EP = useMemo(() => calcFloor01EP(questLookup, state.activeSprint.selectedQuestIds), [questLookup, state.activeSprint.selectedQuestIds]);
  const heroInfo = useMemo(() => getHeroInfo(state.xp), [state.xp]);

  const dailyProgress = useMemo(() => {
    const { selectedQuestIds, completedTodayIds } = state.activeSprint;
    const daily = selectedQuestIds.filter(id => questLookup[id]?.quest.frequency === 'Daily');
    if (!daily.length) return 0;
    return Math.round((completedTodayIds.filter(id => daily.includes(id)).length / daily.length) * 100);
  }, [state.activeSprint, questLookup]);

  const isRoomActive = useCallback((roomId) => {
    return state.activeSprint.selectedQuestIds.some(id => questLookup[id]?.room.id === roomId);
  }, [state.activeSprint.selectedQuestIds, questLookup]);

  const isLockdown = false;

  return (
    <AppContext.Provider value={{
      ...state,
      isLoading,
      dispatch,
      questLookup,
      totalEP,
      floor01EP,
      heroInfo,
      dailyProgress,
      isRoomActive,
      isLockdown,
      MAX_EP,
      UPKEEP_MIN_EP,
      EP_COSTS,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export const useAppContext = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppContext requires AppProvider');
  return ctx;
};
