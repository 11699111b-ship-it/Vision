import { reducer, buildQuestLookup } from './AppContext';
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
  it('creates a focus with uppercase name, empty linkedQuestIds and customQuests', () => {
    const next = reducer(baseState, { type: 'ADD_FOCUS', name: 'job' });
    expect(next.focusItems).toHaveLength(1);
    expect(next.focusItems[0].name).toBe('JOB');
    expect(next.focusItems[0].linkedQuestIds).toEqual([]);
    expect(next.focusItems[0].customQuests).toEqual([]);
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

describe('DELETE_FOCUS strips custom quests from sprint', () => {
  it('removes the deleted focus custom quest ids from selectedQuestIds', () => {
    const state = {
      ...baseState,
      focusItems: [{
        id: 'focus-1', name: 'BODY', linkedQuestIds: [],
        customQuests: [{ id: 'focuscq-1', text: 'Cold plunge', frequency: 'Daily', tag: 'Daily Power-Up', epCost: 2 }],
      }],
      activeSprint: { ...baseState.activeSprint, selectedQuestIds: ['focuscq-1', 'f1-rA-g0-q0'] },
    };
    const next = reducer(state, { type: 'DELETE_FOCUS', focusId: 'focus-1' });
    expect(next.activeSprint.selectedQuestIds).not.toContain('focuscq-1');
    expect(next.activeSprint.selectedQuestIds).toContain('f1-rA-g0-q0');
  });
});

describe('ADD_FOCUS_CUSTOM_QUEST', () => {
  const state = {
    ...baseState,
    focusItems: [{ id: 'focus-1', name: 'BODY', linkedQuestIds: [], customQuests: [] }],
  };

  it('appends a custom quest with EP from its tag and auto-selects it', () => {
    const next = reducer(state, {
      type: 'ADD_FOCUS_CUSTOM_QUEST', focusId: 'focus-1',
      text: 'Cold plunge', frequency: 'Daily', tag: 'Big Missions',
    });
    expect(next.focusItems[0].customQuests).toHaveLength(1);
    const cq = next.focusItems[0].customQuests[0];
    expect(cq.text).toBe('Cold plunge');
    expect(cq.epCost).toBe(4);
    expect(next.activeSprint.selectedQuestIds).toContain(cq.id);
  });

  it('ignores empty text', () => {
    const next = reducer(state, {
      type: 'ADD_FOCUS_CUSTOM_QUEST', focusId: 'focus-1',
      text: '   ', frequency: 'Daily', tag: 'Daily Power-Up',
    });
    expect(next).toBe(state);
  });
});

describe('DELETE_FOCUS_CUSTOM_QUEST', () => {
  it('removes the custom quest and its sprint selection', () => {
    const state = {
      ...baseState,
      focusItems: [{
        id: 'focus-1', name: 'BODY', linkedQuestIds: [],
        customQuests: [{ id: 'focuscq-1', text: 'Cold plunge', frequency: 'Daily', tag: 'Daily Power-Up', epCost: 2 }],
      }],
      activeSprint: { ...baseState.activeSprint, selectedQuestIds: ['focuscq-1'] },
    };
    const next = reducer(state, { type: 'DELETE_FOCUS_CUSTOM_QUEST', focusId: 'focus-1', questId: 'focuscq-1' });
    expect(next.focusItems[0].customQuests).toHaveLength(0);
    expect(next.activeSprint.selectedQuestIds).not.toContain('focuscq-1');
  });
});

describe('buildQuestLookup with focus custom quests', () => {
  it('indexes focus custom quests with synthetic goal/room and custom goal id', () => {
    const focusItems = [{
      id: 'focus-1', name: 'BODY', linkedQuestIds: [],
      customQuests: [{ id: 'focuscq-1', text: 'Cold plunge', frequency: 'Daily', tag: 'Big Missions', epCost: 4 }],
    }];
    const lookup = buildQuestLookup(INITIAL_BLUEPRINT, focusItems);
    const entry = lookup['focuscq-1'];
    expect(entry).toBeDefined();
    expect(entry.goal.epCost).toBe(4);
    expect(entry.goal.id).toContain('custom');
    expect(entry.room.name).toBe('BODY');
    expect(entry.quest.text).toBe('Cold plunge');
  });
});
