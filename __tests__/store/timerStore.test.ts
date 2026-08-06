import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useTimerStore } from '@/store/timerStore';

describe('timer store recovery', () => {
  beforeEach(() => {
    localStorage.clear();
    useTimerStore.setState({ activeTimer: null });
    vi.restoreAllMocks();
  });

  it('can cancel and clear a persisted active timer', () => {
    vi.spyOn(Date, 'now').mockReturnValue(123_456);
    useTimerStore.getState().startTimer('class-1', 'none');
    expect(useTimerStore.getState().activeTimer).toMatchObject({
      classId: 'class-1',
      startTime: 123_456,
    });

    useTimerStore.getState().stopTimer();

    expect(useTimerStore.getState().activeTimer).toBeNull();
    expect(JSON.parse(localStorage.getItem('eduplanner-timer') ?? '{}'))
      .toMatchObject({ state: { activeTimer: null } });
  });
});
