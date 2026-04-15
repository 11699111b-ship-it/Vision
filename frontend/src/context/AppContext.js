import React, { createContext, useContext, useReducer, useEffect, useMemo, useCallback } from 'react';
import INITIAL_BLUEPRINT, { EP_COSTS } from '../data/blueprint';

const STORAGE_KEY = 'superhero_hq_v2';
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
  } catch { /* ignore merge errors */ }
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
        const done = activeSprint.completedWeeklyIds.includes(questId);
        return { ...state, activeSprint: { ...activeSprint, completedWeeklyIds: done ? activeSprint.completedWeeklyIds.filter(id => id !== questId) : [...activeSprint.completedWeeklyIds, questId] } };
      }
    }

    case 'LAUNCH_MISSION': {
      const { activeSprint } = state;
      if (activeSprint.selectedQuestIds.length === 0) {
        return { ...state, launchError: 'Select at least one quest to launch the mission!' };
      }
      return { ...state, appView: 'tracking', launchError: null, activeSprint: { ...activeSprint, sprintStartDate: new Date().toISOString() } };
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
        // Save this sprint's quests so "Repeat Last Week" works
        lastSprintQuestIds: selectedQuestIds.length > 0 ? [...selectedQuestIds] : state.lastSprintQuestIds,
        activeSprint: { selectedQuestIds: [], completedTodayIds: [], completedWeeklyIds: [], sprintStartDate: null, yesterdayProgress: null },
      };
    }

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
      // Auto-select the new quest so its floor lights up immediately in the building
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

    case 'DAILY_RESET': {
      const { activeSprint, buffers, streak, lastBufferResetMonth } = state;
      const { completedTodayIds, selectedQuestIds } = activeSprint;
      const dailyIds = selectedQuestIds.filter(id => lookup[id]?.quest.frequency === 'Daily');
      const yp = dailyIds.length > 0
        ? Math.round((completedTodayIds.filter(id => dailyIds.includes(id)).length / dailyIds.length) * 100)
        : 100;
      let ns = streak, nb = buffers;
      if (yp >= 100) { ns = streak + 1; }
      else { if (nb > 0) { nb -= 1; } else { ns = 0; } }
      const now = new Date();
      const cm = now.getMonth() + 1;
      if (lastBufferResetMonth !== cm && now.getDate() === 1) nb = 2;
      return {
        ...state, streak: ns, buffers: Math.min(2, nb),
        lastResetDate: now.toISOString().split('T')[0],
        lastBufferResetMonth: cm,
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
      // Only include quests that exist and are not locked
      const validIds = questIds.filter(id => {
        const entry = lookup[id];
        return entry && !entry.room.locked && entry.goal.tag !== 'Locked';
      });
      // Respect EP budget — take as many as fit
      let runningEP = 0;
      const fittingIds = [];
      for (const id of validIds) {
        const ep = lookup[id]?.goal.epCost || 0;
        if (runningEP + ep <= MAX_EP) {
          fittingIds.push(id);
          runningEP += ep;
        }
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

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const hasEntered = localStorage.getItem('hq_entered');
      // Only restore state (and skip welcome) if user has previously entered HQ
      if (raw && hasEntered) {
        dispatch({ type: 'LOAD_STATE', payload: JSON.parse(raw) });
      }
      // If no hasEntered flag → stay on welcome screen
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    try {
      const { appView, launchError, submissionResult, ...toSave } = state;
      toSave.appView = appView === 'welcome' ? 'planning' : appView;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
    } catch { /* ignore */ }
  }, [state]);

  useEffect(() => {
    const check = () => {
      const now = new Date();
      const today = now.toISOString().split('T')[0];
      if (now.getHours() >= 3 && state.lastResetDate !== today && state.activeSprint.sprintStartDate) {
        dispatch({ type: 'DAILY_RESET' });
      }
    };
    check();
    const id = setInterval(check, 60000);
    return () => clearInterval(id);
  }, [state.lastResetDate, state.activeSprint.sprintStartDate]);

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

  const isLockdown = false; // Upkeep tax removed — all quests freely selectable

  return (
    <AppContext.Provider value={{ ...state, dispatch, questLookup, totalEP, floor01EP, heroInfo, dailyProgress, isRoomActive, isLockdown, MAX_EP, UPKEEP_MIN_EP, EP_COSTS }}>
      {children}
    </AppContext.Provider>
  );
}

export const useAppContext = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppContext requires AppProvider');
  return ctx;
};
