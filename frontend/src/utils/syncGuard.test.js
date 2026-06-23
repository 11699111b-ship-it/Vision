import { shouldAcceptStateWrite } from './syncGuard';

const sprintState = (over = {}) => ({
  appView: 'tracking',
  activeSprint: { sprintStartDate: '2026-06-16T08:00:00Z', selectedQuestIds: ['q1', 'q2'], completedWeeklyIds: [] },
  ...over,
});
const planningState = (over = {}) => ({
  appView: 'planning',
  activeSprint: { sprintStartDate: null, selectedQuestIds: [], completedWeeklyIds: [] },
  ...over,
});

describe('shouldAcceptStateWrite', () => {
  it('accepts any write when nothing is stored yet', () => {
    expect(shouldAcceptStateWrite(planningState(), null)).toBe(true);
    expect(shouldAcceptStateWrite(sprintState(), null)).toBe(true);
  });

  it('REJECTS a stale planning write that would wipe an active sprint', () => {
    // The core bug: a backgrounded tab on the planning screen overwriting a live sprint.
    expect(shouldAcceptStateWrite(planningState(), sprintState())).toBe(false);
  });

  it('accepts a planning write that ended the sprint (submit/auto-submit/reset)', () => {
    const ended = planningState({ _sprintEnded: true });
    expect(shouldAcceptStateWrite(ended, sprintState())).toBe(true);
  });

  it('accepts launching a sprint over a planning state', () => {
    expect(shouldAcceptStateWrite(sprintState(), planningState())).toBe(true);
  });

  it('accepts normal tracking updates (tick/untick) within an active sprint', () => {
    const stored = sprintState();
    const ticked = sprintState({ activeSprint: { ...stored.activeSprint, completedWeeklyIds: ['q1'] } });
    const unticked = sprintState({ activeSprint: { ...stored.activeSprint, completedWeeklyIds: [] } });
    expect(shouldAcceptStateWrite(ticked, stored)).toBe(true);
    expect(shouldAcceptStateWrite(unticked, ticked)).toBe(true); // untick must persist
  });

  it('accepts switching from one sprint to another', () => {
    const newSprint = sprintState({ activeSprint: { sprintStartDate: '2026-06-23T08:00:00Z', selectedQuestIds: ['q9'], completedWeeklyIds: [] } });
    expect(shouldAcceptStateWrite(newSprint, sprintState())).toBe(true);
  });

  it('rejects malformed payloads', () => {
    expect(shouldAcceptStateWrite(null, sprintState())).toBe(false);
    expect(shouldAcceptStateWrite(undefined, sprintState())).toBe(false);
  });

  it('treats a sprint with a start date but no quests as not-active (orphan)', () => {
    const orphanStored = sprintState({ activeSprint: { sprintStartDate: '2026-06-16T08:00:00Z', selectedQuestIds: [], completedWeeklyIds: [] } });
    // Nothing meaningful to protect → a planning write is allowed through.
    expect(shouldAcceptStateWrite(planningState(), orphanStored)).toBe(true);
  });
});
