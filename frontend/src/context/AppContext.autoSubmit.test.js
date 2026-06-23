import { reducer } from './AppContext';
import INITIAL_BLUEPRINT from '../data/blueprint';

const baseState = {
  appView: 'planning',
  xp: 0, streak: 0, buffers: 2,
  lastResetDate: null, lastBufferResetMonth: null, dailyFinalizedDate: null,
  blueprint: JSON.parse(JSON.stringify(INITIAL_BLUEPRINT)),
  activeSprint: {
    selectedQuestIds: [], completedTodayIds: [], completedWeeklyIds: [],
    sprintStartDate: null, yesterdayProgress: null,
    dailyCompletionHistory: [], questDailyCompletionCounts: {},
  },
  avgCompletion: 0, sprintCount: 0,
  launchError: null, submissionResult: null,
  lastSprintQuestIds: [], autoSubmittedMessage: null, focusItems: [],
};

// A real blueprint quest id (used elsewhere in the suite).
const QUEST_ID = 'f1-rA-g0-q0';

describe('LOAD_STATE — view can never be tracking without an active mission', () => {
  it('forces planning when a stale appView:tracking is loaded with no mission', () => {
    const next = reducer(baseState, {
      type: 'LOAD_STATE',
      payload: { appView: 'tracking', activeSprint: { selectedQuestIds: [], sprintStartDate: null } },
    });
    expect(next.appView).toBe('planning');
  });

  it('still enters tracking when there IS an active mission', () => {
    const next = reducer(baseState, {
      type: 'LOAD_STATE',
      payload: { appView: 'tracking', activeSprint: { selectedQuestIds: [QUEST_ID], sprintStartDate: '2026-06-22' } },
    });
    expect(next.appView).toBe('tracking');
  });

  it('preserves a valid no-mission view such as hq-visit', () => {
    const next = reducer(baseState, {
      type: 'LOAD_STATE',
      payload: { appView: 'hq-visit', activeSprint: { selectedQuestIds: [], sprintStartDate: null } },
    });
    expect(next.appView).toBe('hq-visit');
  });
});

describe('AUTO_SUBMIT_SPRINT — uses the same result overlay as a manual submit', () => {
  const withSprint = {
    ...baseState,
    activeSprint: {
      ...baseState.activeSprint,
      selectedQuestIds: [QUEST_ID],
      completedWeeklyIds: [QUEST_ID],
      sprintStartDate: '2026-06-15',
    },
  };

  it('sets submissionResult (the manual-format overlay) instead of a plain toast', () => {
    const next = reducer(withSprint, { type: 'AUTO_SUBMIT_SPRINT' });
    expect(next.submissionResult).not.toBeNull();
    expect(typeof next.submissionResult.percentage).toBe('number');
    expect(next.autoSubmittedMessage).toBeNull();
  });

  it('routes straight to planning and clears the sprint', () => {
    const next = reducer(withSprint, { type: 'AUTO_SUBMIT_SPRINT' });
    expect(next.appView).toBe('planning');
    expect(next.activeSprint.sprintStartDate).toBeNull();
    expect(next.activeSprint.selectedQuestIds).toEqual([]);
  });
});
