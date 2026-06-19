import React, { createContext, useContext, useReducer, useEffect, useRef, useState, useMemo, useCallback } from 'react';
import INITIAL_BLUEPRINT, { EP_COSTS } from '../data/blueprint';
import { getISTDate, getISTHour, isSprintExpired, formatWeekRange } from '../utils/istUtils';

const STORAGE_KEY = 'superhero_hq_v2';
const DIRTY_KEY = 'superhero_hq_dirty'; // set while a local save is unacknowledged by the sheet
const GAS_URL = 'https://script.google.com/macros/s/AKfycbzyZTaQOLvFsmD1DCZbKgYtbzHOXi4iA8gMFEI4yV9N6Vr5pTlPOAwR_NM-L_w_nTtF/exec';

export const MAX_EP = 30;
export const UPKEEP_MIN_EP = 5;

export function buildQuestLookup(blueprint, focusItems = []) {
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
  // Focus-owned custom quests — synthesize goal/room/floor so EP, selection,
  // and Goals Tracker logic all work the same as blueprint quests.
  const focusFloor = { id: 'focus', number: 99, name: 'Focus' };
  focusItems.forEach(focus => {
    (focus.customQuests || []).forEach(cq => {
      const goal = {
        id: `${focus.id}-custom-${cq.id}`,   // contains 'custom' → tracked as custom goal
        name: cq.text,
        tag: cq.tag,
        epCost: cq.epCost,
        quests: [cq],
        isCustom: true,
      };
      const room = { id: focus.id, name: focus.name, locked: false };
      map[cq.id] = { quest: cq, goal, room, floor: focusFloor };
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

// Current IST calendar date as 'YYYY-MM-DD' (matches DAILY_SUBMIT / getISTDate keying)
function istTodayStr() {
  return new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })).toLocaleDateString('en-CA');
}

const initialState = {
  appView: 'welcome',
  xp: 0,
  streak: 0,
  buffers: 2,
  lastResetDate: null,
  lastBufferResetMonth: null,
  dailyFinalizedDate: null,
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
  dailySubmissionResult: null,
  lastSprintQuestIds: [],
  autoSubmittedMessage: null,
  focusItems: [],
  lastSavedAt: null,
};

export function reducer(state, action) {
  const lookup = buildQuestLookup(state.blueprint, state.focusItems);

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
        dailyFinalizedDate: p.dailyFinalizedDate ?? null,
        blueprint: bp,
        activeSprint: sprint,
        appView: view,
        avgCompletion: p.avgCompletion ?? 0,
        sprintCount: p.sprintCount ?? 0,
        lastSprintQuestIds: p.lastSprintQuestIds ?? [],
        // Prefer whichever has more focus data. GAS data can arrive with focusItems:[]
        // (old save from another device before mappings existed) and would silently
        // wipe all linkedQuestIds. If the payload has nothing, keep current state.
        focusItems: (p.focusItems?.length > 0) ? p.focusItems : state.focusItems,
        lastSavedAt: p.lastSavedAt ?? null,
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
        // Day already finalized via Daily Submit — daily tasks are locked until midnight reset
        if (state.dailyFinalizedDate === istTodayStr()) return state;
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
        dailyFinalizedDate: null, // fresh mission — Daily Submit available again (even same day)
        _sprintEnded: false, // an active sprint now exists — protect it from stale planning writes
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
        dailyFinalizedDate: null,
        _sprintEnded: true,
        activeSprint: { selectedQuestIds: [], completedTodayIds: [], completedWeeklyIds: [], sprintStartDate: null, yesterdayProgress: null, dailyCompletionHistory: [], questDailyCompletionCounts: {} },
      };
      const dailyIds = selectedQuestIds.filter(id => lookup[id]?.quest.frequency === 'Daily');
      const nonDailyIds = selectedQuestIds.filter(id => lookup[id]?.quest.frequency !== 'Daily');
      const completedW = nonDailyIds.filter(id => completedWeeklyIds.includes(id)).length;

      // Include today's daily score in history, then average all days.
      // If today was already finalized via Daily Submit, it's already in history — don't add it twice.
      const finalizedToday = state.dailyFinalizedDate === istTodayStr();
      const todayDailyDone = dailyIds.filter(id => completedTodayIds.includes(id)).length;
      const todayScore = dailyIds.length > 0 ? todayDailyDone / dailyIds.length : 1;
      const allDailyScores = finalizedToday
        ? [...(dailyCompletionHistory || [])]
        : [...(dailyCompletionHistory || []), todayScore];
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
          const todayDone = finalizedToday ? 0 : (completedTodayIds.includes(id) ? 1 : 0);
          const totalDays = allDailyScores.length;
          questPct = totalDays > 0 ? Math.round(((prevCount + todayDone) / totalDays) * 100) : 0;
        } else {
          questPct = completedWeeklyIds.includes(id) ? 100 : 0;
        }
        return { mission: missionName, goal: entry.quest.text, percentage: questPct, type: entry.quest.frequency === 'Daily' ? 'D' : 'W' };
      }).filter(Boolean);
      const isPerfect = percentage === 100;
      const newCount = state.sprintCount + 1;
      const newAvg = Math.round(((state.avgCompletion * state.sprintCount) + percentage) / newCount);
      const goalNames = selectedQuestIds.map(id => lookup[id]?.quest.text).filter(Boolean);
      const weekRange = formatWeekRange(activeSprint.sprintStartDate);
      return {
        ...state,
        xp: isPerfect ? state.xp + 1 : state.xp,
        sprintCount: newCount,
        avgCompletion: newAvg,
        submissionResult: { percentage, isPerfect },
        dailyFinalizedDate: null,
        _sprintEnded: true,
        _pendingLog: { sprintStartDate: activeSprint.sprintStartDate, percentage, xpEarned: isPerfect ? 1 : 0, total, completed: Math.round(dailyContribution + weeklyContribution), goalNames },
        _pendingTrackerSubmit: { quests: trackerQuests },
        _pendingWeeklyReport: { week: weekRange, percentage, xpEarned: isPerfect ? 1 : 0, daysLogged: allDailyScores.length, quests: trackerQuests },
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
          autoSubmittedMessage: 'Anurag, your previous sprint automatically concluded at midnight IST. Your HQ is ready for a new week.',
          dailyFinalizedDate: null,
          _sprintEnded: true,
          activeSprint: { selectedQuestIds: [], completedTodayIds: [], completedWeeklyIds: [], sprintStartDate: null, yesterdayProgress: null, dailyCompletionHistory: [] },
        };
      }
      const dailyIds = selectedQuestIds.filter(id => lookup[id]?.quest.frequency === 'Daily');
      const nonDailyIds = selectedQuestIds.filter(id => lookup[id]?.quest.frequency !== 'Daily');
      const completedW = nonDailyIds.filter(id => completedWeeklyIds.includes(id)).length;

      // Include today's daily score in history, then average all days.
      // If today was already finalized via Daily Submit, it's already in history — don't add it twice.
      const finalizedToday = state.dailyFinalizedDate === istTodayStr();
      const todayDailyDone = dailyIds.filter(id => completedTodayIds.includes(id)).length;
      const todayScore = dailyIds.length > 0 ? todayDailyDone / dailyIds.length : 1;
      const allDailyScores = finalizedToday
        ? [...(dailyCompletionHistory || [])]
        : [...(dailyCompletionHistory || []), todayScore];
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
          const todayDone = finalizedToday ? 0 : (completedTodayIds.includes(id) ? 1 : 0);
          const totalDays = allDailyScores.length;
          questPct = totalDays > 0 ? Math.round(((prevCount + todayDone) / totalDays) * 100) : 0;
        } else {
          questPct = completedWeeklyIds.includes(id) ? 100 : 0;
        }
        return { mission: missionName, goal: entry.quest.text, percentage: questPct, type: entry.quest.frequency === 'Daily' ? 'D' : 'W' };
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
        autoSubmittedMessage: `Anurag, your previous sprint automatically concluded at midnight IST with a score of ${percentage}%. Your HQ is ready for a new week.`,
        dailyFinalizedDate: null,
        _sprintEnded: true,
        _pendingLog: { sprintStartDate: activeSprint.sprintStartDate, percentage, xpEarned: isPerfect ? 1 : 0, total, completed: Math.round(dailyContribution + weeklyContribution), goalNames },
        _pendingTrackerSubmit: { quests: trackerQuests },
        _pendingWeeklyReport: { week: formatWeekRange(activeSprint.sprintStartDate), percentage, xpEarned: isPerfect ? 1 : 0, daysLogged: allDailyScores.length, quests: trackerQuests },
        lastSprintQuestIds: selectedQuestIds.length > 0 ? [...selectedQuestIds] : state.lastSprintQuestIds,
        activeSprint: { selectedQuestIds: [], completedTodayIds: [], completedWeeklyIds: [], sprintStartDate: null, yesterdayProgress: null, dailyCompletionHistory: [], questDailyCompletionCounts: {} },
        appView: 'planning',
      };
    }

    case '_CLEAR_LOG':
      return { ...state, _pendingLog: null };

    case '_CLEAR_DAILY_REPORT':
      return { ...state, _pendingDailyReport: null };

    case '_CLEAR_WEEKLY_REPORT':
      return { ...state, _pendingWeeklyReport: null };

    case 'CLEAR_AUTO_SUBMIT':
      return { ...state, autoSubmittedMessage: null };

    case 'CLEAR_SUBMISSION':
      return { ...state, appView: 'planning', submissionResult: null };

    case 'CLEAR_DAILY_SUBMISSION':
      return { ...state, dailySubmissionResult: null };

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

    // ── IST Midnight Daily Reset — ONLY resets Daily tasks (Weekly+ persist) ───
    case 'DAILY_RESET': {
      const { activeSprint, buffers, streak, lastBufferResetMonth } = state;
      const { completedTodayIds, selectedQuestIds } = activeSprint;

      const istNow = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
      const istDateStr = istNow.toLocaleDateString('en-CA');
      const cm = istNow.getMonth() + 1;

      // Guard: the finalized day's score is ALREADY in history (via Daily Submit / daily auto-submit),
      // and daily tasks are locked while dailyFinalizedDate is set, so completedTodayIds can't have
      // gained new entries. Discard those stale completions and do new-day housekeeping only —
      // never re-append a score. (Truthy check, not "=== yesterday", so a skipped midnight from a
      // multi-day app closure can't cause a double-count.)
      if (state.dailyFinalizedDate) {
        let nb = buffers;
        if (lastBufferResetMonth !== cm && istNow.getDate() === 1) nb = 2;
        return {
          ...state,
          buffers: Math.min(2, nb),
          lastResetDate: istDateStr,
          lastBufferResetMonth: cm,
          dailyFinalizedDate: null,
          activeSprint: { ...activeSprint, completedTodayIds: [] },
        };
      }

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

      // monthly buffer reset on 1st of month
      if (lastBufferResetMonth !== cm && istNow.getDate() === 1) nb = 2;

      return {
        ...state,
        streak: ns,
        buffers: Math.min(2, nb),
        lastResetDate: istDateStr,
        lastBufferResetMonth: cm,
        dailyFinalizedDate: null,
        // completedTodayIds cleared (Daily only) — completedWeeklyIds + dailyCompletionHistory preserved
        activeSprint: { ...activeSprint, completedTodayIds: [], yesterdayProgress: yp, dailyCompletionHistory: updatedHistory, questDailyCompletionCounts: updatedQuestCounts },
      };
    }

    // ── Manual Daily Submit — finalize today early + queue WhatsApp daily report ─
    case 'DAILY_SUBMIT': {
      const { activeSprint, buffers, streak, lastBufferResetMonth } = state;
      const { completedTodayIds, selectedQuestIds } = activeSprint;
      if (!activeSprint.sprintStartDate) return state;

      const istNow = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
      const istDateStr = istNow.toLocaleDateString('en-CA');
      const cm = istNow.getMonth() + 1;

      // No-op if today was already finalized (prevents double-count on repeat taps)
      if (state.dailyFinalizedDate === istDateStr) return state;

      const dailyIds = selectedQuestIds.filter(id => lookup[id]?.quest.frequency === 'Daily');
      const dailyDoneCount = completedTodayIds.filter(id => dailyIds.includes(id)).length;
      const yp = dailyIds.length > 0 ? Math.round((dailyDoneCount / dailyIds.length) * 100) : 100;
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
      if (lastBufferResetMonth !== cm && istNow.getDate() === 1) nb = 2;

      const done = dailyIds.filter(id => completedTodayIds.includes(id)).map(id => lookup[id]?.quest.text).filter(Boolean);
      const missed = dailyIds.filter(id => !completedTodayIds.includes(id)).map(id => lookup[id]?.quest.text).filter(Boolean);

      return {
        ...state,
        streak: ns,
        buffers: Math.min(2, nb),
        lastBufferResetMonth: cm,
        dailyFinalizedDate: istDateStr,
        dailySubmissionResult: { percentage: yp, isPerfect: yp === 100 },
        _pendingDailyReport: { date: istDateStr, pct: yp, done, missed },
        // Keep completedTodayIds so the finalized day stays visible (locked) until the midnight reset clears it.
        activeSprint: { ...activeSprint, yesterdayProgress: yp, dailyCompletionHistory: updatedHistory, questDailyCompletionCounts: updatedQuestCounts },
      };
    }

    case 'CLEAR_ERROR':
      return { ...state, launchError: null };

    case 'RESET_SPRINT':
      return {
        ...state,
        launchError: null,
        dailyFinalizedDate: null,
        _sprintEnded: true,
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

    case 'DELETE_CUSTOM_GOAL': {
      const { floorId, roomId, goalId } = action;
      const nb = JSON.parse(JSON.stringify(state.blueprint));
      const floor = nb.floors.find(f => f.id === floorId);
      const room = floor?.rooms.find(r => r.id === roomId);
      if (!room) return state;
      const goal = (room.customGoals || []).find(g => g.id === goalId);
      const removedQuestIds = (goal?.quests || []).map(q => q.id);
      room.customGoals = (room.customGoals || []).filter(g => g.id !== goalId);
      return {
        ...state,
        blueprint: nb,
        activeSprint: {
          ...state.activeSprint,
          selectedQuestIds: state.activeSprint.selectedQuestIds.filter(id => !removedQuestIds.includes(id)),
          completedTodayIds: state.activeSprint.completedTodayIds.filter(id => !removedQuestIds.includes(id)),
          completedWeeklyIds: state.activeSprint.completedWeeklyIds.filter(id => !removedQuestIds.includes(id)),
        },
      };
    }

    case 'ADD_FOCUS': {
      const newFocus = {
        id: 'focus-' + Date.now(),
        name: action.name.trim().toUpperCase(),
        linkedQuestIds: [],
        customQuests: [],
      };
      return { ...state, focusItems: [...state.focusItems, newFocus] };
    }

    case 'DELETE_FOCUS': {
      const focus = state.focusItems.find(f => f.id === action.focusId);
      // Custom quests live only inside the focus — drop them from the sprint too.
      const customIds = (focus?.customQuests || []).map(q => q.id);
      const selectedQuestIds = customIds.length
        ? state.activeSprint.selectedQuestIds.filter(id => !customIds.includes(id))
        : state.activeSprint.selectedQuestIds;
      return {
        ...state,
        focusItems: state.focusItems.filter(f => f.id !== action.focusId),
        activeSprint: { ...state.activeSprint, selectedQuestIds },
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

    case 'ADD_FOCUS_CUSTOM_QUEST': {
      const { focusId, text, frequency, tag } = action;
      const trimmed = (text || '').trim();
      if (!trimmed) return state;
      const ts = Date.now();
      const cq = {
        id: `focuscq-${ts}`,
        text: trimmed,
        frequency,
        tag,
        epCost: EP_COSTS[tag] || 2,
      };
      const focusItems = state.focusItems.map(f =>
        f.id === focusId ? { ...f, customQuests: [...(f.customQuests || []), cq] } : f
      );
      // Auto-select the new quest into the sprint if it fits the EP budget.
      const newLookup = buildQuestLookup(state.blueprint, focusItems);
      const selected = state.activeSprint.selectedQuestIds;
      const curEP = calcTotalEP(newLookup, selected);
      const selectedQuestIds = curEP + cq.epCost <= MAX_EP ? [...selected, cq.id] : selected;
      return {
        ...state,
        launchError: null,
        focusItems,
        activeSprint: { ...state.activeSprint, selectedQuestIds },
      };
    }

    case 'DELETE_FOCUS_CUSTOM_QUEST': {
      const { focusId, questId } = action;
      return {
        ...state,
        focusItems: state.focusItems.map(f =>
          f.id === focusId
            ? { ...f, customQuests: (f.customQuests || []).filter(q => q.id !== questId) }
            : f
        ),
        activeSprint: {
          ...state.activeSprint,
          selectedQuestIds: state.activeSprint.selectedQuestIds.filter(id => id !== questId),
        },
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
// Returns the (always-resolving) fetch promise so callers can act after the write.
function postToGAS(payload) {
  const params = new URLSearchParams();
  params.append('payload', JSON.stringify(payload));
  return fetch(GAS_URL, { method: 'POST', body: params }).catch(() => {});
}

// ── Flush the latest state on page hide — survives iOS suspending the PWA ─────
// sendBeacon is delivered by the browser even after the page is frozen/closed,
// closing the window where a debounced save would otherwise be dropped.
function beaconToGAS(payload) {
  try {
    const params = new URLSearchParams();
    params.append('payload', JSON.stringify(payload));
    if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
      navigator.sendBeacon(GAS_URL, params);
    } else {
      fetch(GAS_URL, { method: 'POST', body: params, keepalive: true }).catch(() => {});
    }
  } catch { /* ignore */ }
}

// ── Build the lightweight sheet payload from a full saved-state object ────────
// Replaces the ~78KB blueprint with just customGoals (<2KB) and attaches the
// daily snapshot for the accountability "Daily Log" sheet. Used by both the
// debounced save and the dirty-replay on load.
function buildGasPayload(saved) {
  const payload = { ...saved, _customGoals: extractCustomGoals(saved.blueprint) };
  delete payload.blueprint;
  const sprint = saved.activeSprint;
  if (sprint && sprint.sprintStartDate) {
    const lk = buildQuestLookup(saved.blueprint, saved.focusItems);
    const completed = sprint.completedTodayIds || [];
    const dIds = (sprint.selectedQuestIds || []).filter(id => lk[id]?.quest.frequency === 'Daily');
    const done = dIds.filter(id => completed.includes(id)).map(id => lk[id]?.quest.text).filter(Boolean);
    const missed = dIds.filter(id => !completed.includes(id)).map(id => lk[id]?.quest.text).filter(Boolean);
    payload._daily = { date: getISTDate(), pct: dIds.length > 0 ? Math.round((done.length / dIds.length) * 100) : 0, done, missed };
  }
  return payload;
}

// ── Log a weekly mission result to GAS "Weekly Logs" sheet ──────────────────
function logToGAS(logEntry) {
  postToGAS({ action: 'log', ...logEntry });
}

// ── Async GAS state save — clears the dirty flag once the sheet acknowledges ──
function saveToGAS(payload, savedAt) {
  postToGAS(payload).then(() => {
    try {
      // Only clear if no newer save has superseded this one.
      if (localStorage.getItem(DIRTY_KEY) === String(savedAt)) {
        localStorage.removeItem(DIRTY_KEY);
      }
    } catch { /* ignore */ }
  });
}

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [isLoading, setIsLoading] = useState(true);
  const saveTimerRef = useRef(null);
  const initialLoadDone = useRef(false);
  const pendingPayloadRef = useRef(null);  // latest sheet payload, for the beacon flush
  const syncingRef = useRef(false);        // guards against overlapping reconciles
  const lastVisibleSyncRef = useRef(0);    // debounces rapid hidden/visible toggles

  // ── Reconcile with the sheet (the single source of truth) ───────────────────
  // If localStorage holds an unacknowledged write (dirty), replay it to the sheet
  // and KEEP local — local is the latest. Otherwise adopt the sheet wholesale.
  // No merge step → a tick/untick is never lost and never resurrected.
  const syncFromSheet = useCallback(async () => {
    if (syncingRef.current) return;
    syncingRef.current = true;
    try {
      let dirty = null, local = null;
      try {
        dirty = localStorage.getItem(DIRTY_KEY);
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) local = JSON.parse(raw);
      } catch { /* ignore */ }

      if (dirty && local) {
        // Push the unacknowledged local write up so the sheet matches local, then
        // keep local. Skip adopting the sheet this cycle — local is authoritative.
        await postToGAS(buildGasPayload(local));
        try { if (localStorage.getItem(DIRTY_KEY) === dirty) localStorage.removeItem(DIRTY_KEY); } catch { /* ignore */ }
        return;
      }

      // Clean → adopt the sheet.
      const controller = new AbortController();
      const tid = setTimeout(() => controller.abort(), 8000);
      const res = await fetch(GAS_URL, { signal: controller.signal });
      clearTimeout(tid);
      const data = await res.json();
      if (data && (data.xp !== undefined || data.streak !== undefined || data.activeSprint)) {
        dispatch({ type: 'LOAD_STATE', payload: data });
      }
    } catch { /* ignore */ }
    finally { syncingRef.current = false; }
  }, []);

  // ── 1. Initial load: paint from localStorage instantly, then trust the sheet ─
  useEffect(() => {
    const init = async () => {
      let painted = false;
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        const hasEntered = localStorage.getItem('hq_entered');
        if (raw && hasEntered) {
          dispatch({ type: 'LOAD_STATE', payload: JSON.parse(raw) });
          painted = true;
          setIsLoading(false); // show cached state immediately; sheet reconciles next
        }
      } catch { /* ignore */ }
      await syncFromSheet();
      if (!painted) setIsLoading(false);
    };
    init();
  }, [syncFromSheet]);

  // ── 2. Save state to GAS (debounced 3s) + localStorage (immediate) ─────────
  useEffect(() => {
    if (isLoading) return;
    if (!initialLoadDone.current) { initialLoadDone.current = true; return; }

    // Note: _sprintEnded is intentionally KEPT in toSave so it persists to
    // localStorage and rides along in the sheet payload (via buildGasPayload).
    // This lets the sheet guard distinguish a legit submit/reset (clears the
    // sprint) from a stale planning client (rejected), even on an offline replay.
    const { appView, launchError, submissionResult, dailySubmissionResult, autoSubmittedMessage, _pendingLog, _pendingGoalLog, _pendingTrackerLaunch, _pendingTrackerSubmit, _pendingDailyReport, _pendingWeeklyReport, ...toSave } = state;
    toSave.appView = appView === 'welcome' ? 'planning' : appView;
    toSave.lastSavedAt = Date.now();

    // localStorage — full state (immediate) + dirty flag: this write is not yet
    // acknowledged by the sheet, so a reconcile must replay it rather than clobber it.
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
      localStorage.setItem(DIRTY_KEY, String(toSave.lastSavedAt));
    } catch { /* ignore */ }

    // Lightweight sheet payload (blueprint → customGoals, + daily snapshot).
    // _sprintEnded rides along via the spread inside buildGasPayload.
    const gasPayload = buildGasPayload(toSave);
    pendingPayloadRef.current = gasPayload; // captured for the beacon flush on hide

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => saveToGAS(gasPayload, toSave.lastSavedAt), 3000);
  }, [state, isLoading]);

  // ── 2a. Flush on hide (beacon survives iOS suspend) + re-sync on foreground ──
  useEffect(() => {
    const flush = () => { if (pendingPayloadRef.current) beaconToGAS(pendingPayloadRef.current); };
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        flush();
      } else if (document.visibilityState === 'visible') {
        const now = Date.now();
        if (now - lastVisibleSyncRef.current < 3000) return; // ignore rapid toggles
        lastVisibleSyncRef.current = now;
        syncFromSheet(); // adopt latest sheet before this client can write stale data
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', flush);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', flush);
    };
  }, [syncFromSheet]);

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

  // ── 2f. Request a Daily WhatsApp report (manual Daily Submit) ─────────────────
  useEffect(() => {
    if (!state._pendingDailyReport) return;
    postToGAS({ action: 'request_daily_report', ...state._pendingDailyReport });
    dispatch({ type: '_CLEAR_DAILY_REPORT' });
  }, [state._pendingDailyReport]);

  // ── 2g. Immediate Weekly WhatsApp report on submit (race-safe: carries its data) ─
  // Declared after the log/tracker effects so this POST fires last.
  useEffect(() => {
    if (!state._pendingWeeklyReport) return;
    const { week, percentage, xpEarned, daysLogged, quests } = state._pendingWeeklyReport;
    postToGAS({ action: 'send_weekly_report', week, percentage, xpEarned, daysLogged, quests });
    dispatch({ type: '_CLEAR_WEEKLY_REPORT' });
  }, [state._pendingWeeklyReport]);

  // ── 3. IST Midnight Daily Reset (checks every 60s, only resets Daily tasks) ──
  useEffect(() => {
    const check = () => {
      if (!state.activeSprint.sprintStartDate) return;
      const istDate = getISTDate();
      const istHour = getISTHour();
      if (istHour >= 0 && state.lastResetDate !== istDate) {
        dispatch({ type: 'DAILY_RESET' });
      }
    };
    check();
    const id = setInterval(check, 60000);
    return () => clearInterval(id);
  }, [state.lastResetDate, state.activeSprint.sprintStartDate]);

  // ── 4. IST Sunday 11:58 PM Weekly Auto-Submit (mount + every 60s interval) ───
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

  // ── 5. IST 11:55 PM Daily Auto-Submit — finalize today + send report (no wait).
  // Fires 3 min before the 11:58 weekly auto-submit so on Sunday the daily report goes out
  // first, then the weekly (whose finalizedToday guard avoids double-counting today).
  useEffect(() => {
    const check = () => {
      if (!state.activeSprint.sprintStartDate) return;
      const istNow = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
      const today = istNow.toLocaleDateString('en-CA');
      if (istNow.getHours() === 23 && istNow.getMinutes() >= 55 && state.dailyFinalizedDate !== today) {
        dispatch({ type: 'DAILY_SUBMIT' });
      }
    };
    check();
    const id = setInterval(check, 30000);
    return () => clearInterval(id);
  }, [state.activeSprint.sprintStartDate, state.dailyFinalizedDate]);

  const questLookup = useMemo(() => buildQuestLookup(state.blueprint, state.focusItems), [state.blueprint, state.focusItems]);
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
  const dailyLocked = state.dailyFinalizedDate === getISTDate();

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
      dailyLocked,
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
