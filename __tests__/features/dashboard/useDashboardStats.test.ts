import { describe, expect, it } from 'vitest';

import type { TeachingSession } from '@/db/database';
import { calculateTeachingStats } from '@/features/dashboard/hooks/useDashboardStats';

describe('calculateTeachingStats', () => {
  it('groups teaching duration by month and returns accumulated totals', () => {
    const sessions: TeachingSession[] = [
      {
        id: 'session-1',
        classId: 'class-1',
        date: '2026-06-10',
        startTime: 1,
        endTime: 2,
        durationMinutes: 90,
      },
      {
        id: 'session-2',
        classId: 'class-1',
        date: '2026-07-10',
        startTime: 3,
        endTime: 4,
        durationMinutes: 30,
      },
    ];

    const result = calculateTeachingStats(
      sessions,
      6,
      'en',
      new Date('2026-07-19T12:00:00'),
    );

    expect(result.totalHours).toBe(2);
    expect(result.totalSessions).toBe(2);
    expect(result.chartData.slice(-2)).toMatchObject([
      { month: 'Jun 2026', hours: 1.5, sessions: 1 },
      { month: 'Jul 2026', hours: 0.5, sessions: 1 },
    ]);
  });
});
