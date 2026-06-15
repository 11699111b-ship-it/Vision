import React, { createContext, useContext, useReducer, useEffect, useRef, useState, useMemo, useCallback } from 'react';
import INITIAL_BLUEPRINT, { EP_COSTS } from '../data/blueprint';
import { getISTDate, getISTHour, isSprintExpired, formatWeekRange } from '../utils/istUtils';

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

export function reducer(state, action) {
  const lookup = buildQuestLookup(state.blueprint);

  switch (action.type) {
    case 'LOAD_STATE': {
      const p = action.payload;
      let sprint = p.activeSprint ?? initialState.activeSprint;
      const hasMission = !!sprint.sprintStartDate && (sprint.selectedQuestIds?.length ?? 0) > 0;
      // Orphaned sprint: start date set but no quests — clear it so user isn't stuck
      if (sprint.sprintStartDate && !hasMission) {
        sprint = { ...initialState.activeSprint };
      }
      let view = p.appView === 'welcome' ? 'planning' : (p.appView || 'planning');
      if (hasMission) view = 'tracking';
      // Reconstruct blueprint: if full blueprint present (localStorage), use it.
      // If only _customGoals (GAS), inject them into INITIAL_BLUEPRINT.
      let bp;
      if (p.blueprint) {
        bp = mergeBlueprint(INITIAL_BLUEPRINT, p.blueprint);
      } else {
        bp = JSON.parse(JSON.stringify(INITIAL_BLUEPRINT));
        if (p._customGoals) {
          p._customGoals.forEach(({ floorId, roomId, customGoals }) => {
            const floor = bp.floors.find(f => f.id === floorId);
            const room = floor?.rooms.find(r => r.id === roomId);
            if (room) room.customGoals = customGoals;
          });
        }
      }
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
        focusItems: p.focusItems ?? [],
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
      const goalNames = activeSprint.selectedQuestIds.map(id => lookup[id]?.quest.text).filter(Boolean);
      const trackerQuests = activeSprint.selectedQuestIds.map(id => {
        const entry = lookup[id];
        if (!entry) return null;
        const isCustom = entry.goal.id.includes('custom');
        return {
          mission: isCustom ? entry.room.name + '(custom goal)' : entry.goal.name,
          goal: entry.quest.text,
        };
      }).filter(Boolean);
      return {
        ...state,
        appView: 'tracking',
        launchError: null,
        activeSprint: { ...activeSprint, sprintStartDate: new Date().toISOString() },
        _pendingGoalLog: { goalNames },
        _pendingTrackerLaunch: { quests: trackerQuests },
      };
    }

    case '_CLEAR_GOAL_LOG':
      return { ...state, _pendingGoalLog: null };

    case '_CLEAR_TRACKER_LAUNCH':
      return { ...state, _pendingTrackerLaunch: null };

    case '_CLEAR_TRACKER_SUBMIT':
      return { ...state, _pendingTrackerSubmit: null };

    case 'SUBMIT_MISSION': {
      const { activeSprint } = state;
      const { selectedQuestIds, completedTodayIds, completedWeeklyIds, dailyCompletionHistory } = activeSprint;
      const total = selectedQuestIds.length;
      if (total === 0) return {
        ...state,
        appView: 'planning',
        activeSprint: { selectedQuestIds: [], completedTodayIds: [], completedWeeklyIds: [], sprintStartDate: null, yesterdayProgress: null, dailyCompletionHistory: [], questDailyCompletionCounts: {} },
      };
      const dailyIds = selectedQuestIds.filter(id => lookup[id]?.quest.frequency === 'Daily');
      const nonDailyIds = selectedQuestIds.filter(id => lookup[id]?.quest.frequency !== 'Daily');
      const completedW = nonDailyIds.filter(id => completedWeeklyIds.includes(id)).length;

      // Include today's daily score in history, then average all days
      const todayDailyDone = dailyIds.filter(id => completedTodayIds.includes(id)).length;
      const todayScore = dailyIds.length > 0 ? todayDailyDone / dailyIds.length : 1;
      const allDailyScores = [...(dailyCompletionHistory || []), todayScore];
      const avgDailyPct = allDailyScores.length > 0
        ? allDailyScores.reduce((s, v) => s + v, 0) / allDailyScores.length
        : 1;

      // Weighted: daily tasks contribute their averaged score, weekly tasks contribute their completion
      const dailyContribution = avgDailyPct * dailyIds.length;
      const weeklyContribution = completedW;
      const percentage = Math.round(((dailyContribution + weeklyContribution) / total) * 100);
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
      const isPerfect = percentage === 100;
      const newCount = state.sprintCount + 1;
      const newAvg = Math.round(((state.avgCompletion * state.sprintCount) + percentage) / newCount);
      const goalNames = selectedQuestIds.map(id => lookup[id]?.quest.text).filter(Boolean);
      return {
        ...state,
        xp: isPerfect ? state.xp + 1 : state.xp,
        sprintCount: newCount,
        avgCompletion: newAvg,
        submissionResult: { percentage, isPerfect },
        _pendingLog: { sprintStartDate: activeSprint.sprintStartDate, percentage, xpEarned: isPerfect ? 1 : 0, total, completed: Math.round(dailyContribution + weeklyContribution), goalNames },
        _pendingTrackerSubmit: { quests: trackerQuests },
        lastSprintQuestIds: selectedQuestIds.length > 0 ? [...selectedQuestIds] : state.lastSprintQuestIds,
        activeSprint: { selectedQuestIds: [], completedTodayIds: [], completedWeeklyIds: [], sprintStartDate: null, yesterdayProgress: null, dailyCompletionHistory: [], questDailyCompletionCounts: {} },
      };
    }

    // ── Auto-submit (IST Sunday midnight deadline reached) ───────────────────
    case 'AUTO_SUBMIT_SPRINT': {
      const { activeSprint } = state;
      const { selectedQuestIds, completedTodayIds, completedWeeklyIds, dailyCompletionHistory } = activeSprint;
      const total = selectedQuestIds.length;
      if (total === 0) {
        return {
          ...state,
          appView: 'planning',
          autoSubmittedMessage: 'Boss Anurag, your previous sprint automatically concluded at midnight IST. Your HQ is ready for a new week.',
          activeSprint: { selectedQuestIds: [], completedTodayIds: [], completedWeeklyIds: [], sprintStartDate: null, yesterdayProgress: null, dailyCompletionHistory: [] },
        };
      }
      const dailyIds = selectedQuestIds.filter(id => lookup[id]?.quest.frequency === 'Daily');
      const nonDailyIds = selectedQuestIds.filter(id => lookup[id]?.quest.frequency !== 'Daily');
      const completedW = nonDailyIds.filter(id => completedWeeklyIds.includes(id)).length;

      // Include today's daily score in history, then average all days
      const todayDailyDone = dailyIds.filter(id => completedTodayIds.includes(id)).length;
      const todayScore = dailyIds.length > 0 ? todayDailyDone / dailyIds.length : 1;
      const allDailyScores = [...(dailyCompletionHistory || []), todayScore];
      const avgDailyPct = allDailyScores.length > 0
        ? allDailyScores.reduce((s, v) => s + v, 0) / allDailyScores.length
        : 1;

      const dailyContribution = avgDailyPct * dailyIds.length;
      const weeklyContribution = completedW;
      const percentage = Math.round(((dailyContribution + weeklyContribution) / total) * 100);
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
      const isPerfect = percentage === 100;
      const newCount = state.sprintCount + 1;
      const newAvg = Math.round(((state.avgCompletion * state.sprintCount) + percentage) / newCount);
      const goalNames = selectedQuestIds.map(id => lookup[id]?.quest.text).filter(Boolean);
      return {
        ...state,
        xp: isPerfect ? state.xp + 1 : state.xp,
        sprintCount: newCount,
        avgCompletion: newAvg,
        autoSubmittedMessage: `Boss Anurag, your previous sprint automatically concluded at midnight IST with a score of ${percentage}%. Your HQ is ready for a new week.`,
        _pendingLog: { sprintStartDate: activeSprint.sprintStartDate, percentage, xpEarned: isPerfect ? 1 : 0, total, completed: Math.round(dailyContribution + weeklyContribution), goalNames },
        _pendingTrackerSubmit: { quests: trackerQuests },
        lastSprintQuestIds: selectedQuestIds.length > 0 ? [...selectedQuestIds] : state.lastSprintQuestIds,
        activeSprint: { selectedQuestIds: [], completedTodayIds: [], completedWeeklyIds: [], sprintStartDate: null, yesterdayProgress: null, dailyCompletionHistory: [], questDailyCompletionCounts: {} },
        appView: 'planning',
      };
    }

    case '_CLEAR_LOG':
      return { ...state, _pendingLog: null };

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
      const dailyDoneCount = completedTodayIds.filter(id => dailyIds.includes(id)).length;
      const yp = dailyIds.length > 0
        ? Math.round((dailyDoneCount / dailyIds.length) * 100)
        : 100;

      // Record today's daily score (as fraction 0-1) for weekly average calc
      const todayScore = dailyIds.length > 0 ? dailyDoneCount / dailyIds.length : 1;
      const updatedHistory = [...(activeSprint.dailyCompletionHistory || []), todayScore];

      const updatedQuestCounts = { ...(activeSprint.questDailyCompletionCounts || {}) };
      dailyIds.forEach(id => {
        if (!updatedQuestCounts[id]) updatedQuestCounts[id] = 0;
        if (completedTodayIds.includes(id)) updatedQuestCounts[id]++;
      });

      let ns = streak, nb = buffers;
      if (yp >= 90) { ns = streak + 1; }
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
        // completedTodayIds cleared (Daily only) — completedWeeklyIds + dailyCompletionHistory preserved
        activeSprint: { ...activeSprint, completedTodayIds: [], yesterdayProgress: yp, dailyCompletionHistory: updatedHistory, questDailyCompletionCounts: updatedQuestCounts },
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
          dailyCompletionHistory: [],
          questDailyCompletionCounts: {},
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

    default:
      return state;
  }
}

const AppContext = createContext(null);

// ── Strip blueprint to only customGoals (reduces ~78KB → <2KB) ──────────────
function extractCustomGoals(blueprint) {
  if (!blueprint?.floors) return [];
  return blueprint.floors.reduce((acc, floor) => {
    floor.rooms.forEach(room => {
      if (room.customGoals?.length) {
        acc.push({ floorId: floor.id, roomId: room.id, customGoals: room.customGoals });
      }
    });
    return acc;
  }, []);
}

// ── POST to GAS via form-encoded fetch ──────────────────────────────────────
// GAS processes doPost BEFORE returning 302 redirect. The redirect may trigger
// a CORS error in the console — that's expected and harmless (data is already written).
function postToGAS(payload) {
  const json = JSON.stringify(payload);
  const params = new URLSearchParams();
  params.append('payload', json);
  fetch(GAS_URL, { method: 'POST', body: params }).catch(() => {});
}

// ── Log a weekly mission result to GAS "Weekly Logs" sheet ──────────────────
function logToGAS(logEntry) {
  postToGAS({ action: 'log', ...logEntry });
}

// ── Async GAS save (debounced, fire-and-forget) ──────────────────────────────
function saveToGAS(data) {
  postToGAS(data);
}

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [isLoading, setIsLoading] = useState(true);
  const saveTimerRef = useRef(null);
  const initialLoadDone = useRef(false);

  // ── 1. Load state: localStorage first (instant), GAS fallback (cross-device) ─
  useEffect(() => {
    const load = async () => {
      // 1a. Try localStorage (always up-to-date on same device)
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        const hasEntered = localStorage.getItem('hq_entered');
        if (raw && hasEntered) {
          dispatch({ type: 'LOAD_STATE', payload: JSON.parse(raw) });
          setIsLoading(false);
          return;
        }
      } catch { /* ignore */ }

      // 1b. No local data — try GAS (new device / fresh browser)
      try {
        const controller = new AbortController();
        const tid = setTimeout(() => controller.abort(), 8000);
        const res = await fetch(GAS_URL, { signal: controller.signal });
        clearTimeout(tid);
        const data = await res.json();
        if (data && (data.xp !== undefined || data.streak !== undefined || data.activeSprint)) {
          dispatch({ type: 'LOAD_STATE', payload: data });
        }
      } catch { /* ignore */ }

      setIsLoading(false);
    };
    load();
  }, []);

  // ── 2. Save state to GAS (debounced 3s) + localStorage (immediate) ─────────
  useEffect(() => {
    if (isLoading) return;
    if (!initialLoadDone.current) { initialLoadDone.current = true; return; }

    const { appView, launchError, submissionResult, autoSubmittedMessage, _pendingLog, _pendingGoalLog, _pendingTrackerLaunch, _pendingTrackerSubmit, ...toSave } = state;
    toSave.appView = appView === 'welcome' ? 'planning' : appView;

    // localStorage — full state (immediate, offline resilient)
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave)); } catch { /* ignore */ }

    // GAS — lightweight: replace full blueprint with just customGoals (~78KB → <2KB)
    const gasPayload = { ...toSave, _customGoals: extractCustomGoals(toSave.blueprint) };
    delete gasPayload.blueprint;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => saveToGAS(gasPayload), 3000);
  }, [state, isLoading]);

  // ── 2b. Fire weekly log POST when a mission is submitted ────────────────────
  useEffect(() => {
    if (!state._pendingLog) return;
    const { sprintStartDate, percentage, xpEarned, total, completed, goalNames } = state._pendingLog;
    const week = formatWeekRange(sprintStartDate);
    logToGAS({
      week,
      percentage,
      xpEarned,
      totalQuests: total,
      completedQuests: completed,
    });
    postToGAS({ action: 'update_goals', week, percentage, goalNames: goalNames || [] });
    dispatch({ type: '_CLEAR_LOG' });
  }, [state._pendingLog]);

  // ── 2c. Log goals to "Weekly Goals" sheet on mission launch ─────────────────
  useEffect(() => {
    if (!state._pendingGoalLog) return;
    const { goalNames } = state._pendingGoalLog;
    postToGAS({ action: 'log_goals', goalNames: goalNames || [] });
    dispatch({ type: '_CLEAR_GOAL_LOG' });
  }, [state._pendingGoalLog]);

  // ── 2d. Log goals to "Goals Tracker" sheet on mission launch ───────────────
  useEffect(() => {
    if (!state._pendingTrackerLaunch) return;
    postToGAS({ action: 'track_goals_launch', quests: state._pendingTrackerLaunch.quests });
    dispatch({ type: '_CLEAR_TRACKER_LAUNCH' });
  }, [state._pendingTrackerLaunch]);

  // ── 2e. Update Goals Tracker with per-quest % on sprint submit ─────────────────
  useEffect(() => {
    if (!state._pendingTrackerSubmit) return;
    postToGAS({ action: 'track_goals_submit', quests: state._pendingTrackerSubmit.quests });
    dispatch({ type: '_CLEAR_TRACKER_SUBMIT' });
  }, [state._pendingTrackerSubmit]);

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
