import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { Schedule } from '@/db/database';
import {
  createScheduleDraft,
  useScheduleEditor,
} from '@/features/classes/hooks/useScheduleEditor';

describe('useScheduleEditor', () => {
  it('creates stable defaults for a new weekly schedule', () => {
    const draft = createScheduleDraft(undefined, new Date('2026-07-19T12:00:00'));
    expect(draft).toMatchObject({
      subjectId: 'none',
      recurrenceType: 'weekly',
      dayOfWeek: 0,
      dayOfMonth: 19,
      startTime: '08:00',
      endTime: '09:30',
      startDate: '2026-07-19',
      endCriteria: 'none',
      notificationEarlyMinutes: 15,
    });
  });

  it('hydrates edit state and exposes localized weekday names', () => {
    const schedule: Schedule = {
      id: 'schedule-1',
      classId: 'class-1',
      subjectId: 'subject-1',
      recurrenceType: 'monthly',
      dayOfMonth: 15,
      startTime: '10:00',
      endTime: '11:30',
      startDate: '2026-07-01',
      recurrenceCount: 4,
      notificationEarlyMinutes: 30,
    };
    const { result } = renderHook(() => useScheduleEditor('class-1', 'en'));

    act(() => result.current.openEdit(schedule));

    expect(result.current.isOpen).toBe(true);
    expect(result.current.editingSchedule).toEqual(schedule);
    expect(result.current.draft).toMatchObject({
      subjectId: 'subject-1',
      recurrenceType: 'monthly',
      dayOfMonth: 15,
      endCriteria: 'count',
      recurrenceCount: 4,
    });
    expect(result.current.getDayName(1)).toBe('Monday');
  });

  it('updates one draft field without resetting the remaining form', () => {
    const { result } = renderHook(() => useScheduleEditor('class-1', 'id'));
    const originalStartTime = result.current.draft.startTime;

    act(() => result.current.setField('notificationEarlyMinutes', 60));

    expect(result.current.draft.notificationEarlyMinutes).toBe(60);
    expect(result.current.draft.startTime).toBe(originalStartTime);
  });
});
