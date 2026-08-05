import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { Class, Schedule, Subject, Task } from '@/db/database';
import { useCalendarModel } from '@/features/calendar/hooks/useCalendarModel';

describe('useCalendarModel', () => {
  const classes: Class[] = [{ id: 'class-1', name: 'Class 1', academicPeriodId: 'period-1' }];
  const subjects: Subject[] = [{ id: 'subject-1', name: 'Math' }];
  const tasks: Task[] = [
    { id: 'task-1', title: 'Selected', date: '2026-07-20', status: 'pending' },
    { id: 'task-2', title: 'Other', date: '2026-07-21', status: 'pending' },
  ];
  const schedules: Schedule[] = [
    {
      id: 'late',
      classId: 'class-1',
      subjectId: 'subject-1',
      recurrenceType: 'daily',
      recurrenceCount: 1,
      startTime: '10:00',
      endTime: '11:00',
      startDate: '2026-07-20',
      notificationEarlyMinutes: 0,
    },
    {
      id: 'early',
      classId: 'class-1',
      recurrenceType: 'daily',
      recurrenceCount: 1,
      startTime: '08:00',
      endTime: '09:00',
      startDate: '2026-07-20',
      notificationEarlyMinutes: 0,
    },
  ];

  it('builds the month grid, selected tasks, and sorted schedule occurrences', () => {
    const { result } = renderHook(() => useCalendarModel({
      currentMonth: new Date('2026-07-01T12:00:00'),
      selectedDate: new Date('2026-07-20T12:00:00'),
      language: 'id',
      tasks,
      classes,
      subjects,
      schedules,
    }));

    expect(result.current.weekdays).toEqual(['MIN', 'SEN', 'SEL', 'RAB', 'KAM', 'JUM', 'SAB']);
    expect(result.current.gridDays.length).toBeGreaterThanOrEqual(35);
    expect(result.current.selectedDateTasks.map((task) => task.id)).toEqual(['task-1']);
    expect(result.current.schedulesByDateStr['2026-07-20'].map(({ schedule }) => schedule.id))
      .toEqual(['early', 'late']);
    expect(result.current.schedulesByDateStr['2026-07-20'][0].cls).toEqual(classes[0]);
  });
});
