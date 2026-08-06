import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  recordTeachingSession: vi.fn(),
}));

vi.mock('@/features/teaching/api', () => ({
  recordTeachingSession: mocks.recordTeachingSession,
}));

import { completeTeachingTimer } from '@/features/teaching/timer';

describe('teaching timer policy', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.recordTeachingSession.mockResolvedValue(undefined);
  });

  it('maps a persisted timer into a teaching session consistently', async () => {
    const minutes = await completeTeachingTimer({
      classId: 'class-1',
      subjectId: 'none',
      startTime: new Date(2026, 7, 6, 8, 0).getTime(),
    }, new Date(2026, 7, 6, 8, 31).getTime());

    expect(minutes).toBe(31);
    expect(mocks.recordTeachingSession).toHaveBeenCalledWith(expect.objectContaining({
      classId: 'class-1',
      subjectId: undefined,
      date: '2026-08-06',
      durationMinutes: 31,
    }));
  });
});
