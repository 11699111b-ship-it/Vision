import { reducer } from './AppContext';
import INITIAL_BLUEPRINT from '../data/blueprint';

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
