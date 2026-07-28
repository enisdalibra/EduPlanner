import { useMemo } from 'react';
import {
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  startOfMonth,
  startOfWeek,
} from 'date-fns';

import type { Class, Schedule, Subject, Task } from '@/db/database';
import { getScheduleOccurrences } from '@/lib/scheduleUtils';

export interface CalendarScheduleOccurrence {
  schedule: Schedule;
  cls: Class;
  subject?: Subject;
}

interface CalendarModelInput {
  currentMonth: Date;
  selectedDate?: Date;
  language: 'id' | 'en';
  tasks?: Task[];
  classes?: Class[];
  subjects?: Subject[];
  schedules?: Schedule[];
}

export function useCalendarModel({
  currentMonth,
  selectedDate,
  language,
  tasks,
  classes,
  subjects,
  schedules,
}: CalendarModelInput) {
  const weekdays = useMemo(
    () => language === 'id'
      ? ['MIN', 'SEN', 'SEL', 'RAB', 'KAM', 'JUM', 'SAB']
      : ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'],
    [language],
  );

  const gridDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    return eachDayOfInterval({
      start: startOfWeek(monthStart, { weekStartsOn: 0 }),
      end: endOfWeek(endOfMonth(monthStart), { weekStartsOn: 0 }),
    });
  }, [currentMonth]);

  const schedulesByDateStr = useMemo(() => {
    const mapping: Record<string, CalendarScheduleOccurrence[]> = {};
    if (!schedules || !classes || gridDays.length === 0) return mapping;
    const limitDate = gridDays[gridDays.length - 1];

    for (const schedule of schedules) {
      const cls = classes.find((item) => item.id === schedule.classId);
      if (!cls) continue;
      const subject = subjects?.find((item) => item.id === schedule.subjectId);
      for (const occurrence of getScheduleOccurrences(schedule, limitDate)) {
        const dateKey = format(occurrence, 'yyyy-MM-dd');
        (mapping[dateKey] ??= []).push({ schedule, cls, subject });
      }
    }
    for (const occurrences of Object.values(mapping)) {
      occurrences.sort((a, b) => a.schedule.startTime.localeCompare(b.schedule.startTime));
    }
    return mapping;
  }, [schedules, classes, subjects, gridDays]);

  const selectedDateTasks = useMemo(() => {
    if (!selectedDate) return [];
    const dateKey = format(selectedDate, 'yyyy-MM-dd');
    return tasks?.filter((task) => task.date === dateKey) ?? [];
  }, [tasks, selectedDate]);

  return { weekdays, gridDays, schedulesByDateStr, selectedDateTasks };
}
