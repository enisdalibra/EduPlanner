import { parseISO, addDays, addWeeks, isAfter, format } from 'date-fns';
import type { Schedule } from '@/db/database';

/**
 * Expands a schedule's recurrence pattern and returns all matching dates
 * up to the specified limitDate (inclusive).
 */
export function getScheduleOccurrences(schedule: Schedule, limitDate: Date): Date[] {
  const occurrences: Date[] = [];
  
  let start: Date;
  try {
    start = parseISO(schedule.startDate);
  } catch (e) {
    return [];
  }

  if (schedule.recurrenceType === 'daily') {
    let current = start;
    let count = 0;
    while (true) {
      if (schedule.recurrenceCount !== undefined && count >= schedule.recurrenceCount) break;
      if (schedule.endDate && format(current, 'yyyy-MM-dd') > schedule.endDate) break;
      if (isAfter(current, limitDate)) break;
      
      occurrences.push(current);
      current = addDays(current, 1);
      count++;
    }
  } else if (schedule.recurrenceType === 'weekly') {
    // Weekly on a specific dayOfWeek (0-6).
    // Note: The first occurrence must be at or after startDate.
    if (schedule.dayOfWeek === undefined) return [];
    
    let current = start;
    // Find the first matching weekday at or after startDate
    while (current.getDay() !== schedule.dayOfWeek) {
      current = addDays(current, 1);
    }
    
    let count = 0;
    while (true) {
      if (schedule.recurrenceCount !== undefined && count >= schedule.recurrenceCount) break;
      if (schedule.endDate && format(current, 'yyyy-MM-dd') > schedule.endDate) break;
      if (isAfter(current, limitDate)) break;
      
      occurrences.push(current);
      current = addWeeks(current, 1);
      count++;
    }
  } else if (schedule.recurrenceType === 'monthly') {
    // Monthly on a specific dayOfMonth (1-31).
    if (schedule.dayOfMonth === undefined) return [];
    
    const targetDay = schedule.dayOfMonth;
    let year = start.getFullYear();
    let month = start.getMonth(); // 0-11
    
    let count = 0;
    while (true) {
      // Find candidate date for this year and month
      // Clamping targetDay to the last day of month if it overflows
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      const actualDay = Math.min(targetDay, daysInMonth);
      const candidate = new Date(year, month, actualDay);
      
      if (candidate >= start) {
        if (schedule.recurrenceCount !== undefined && count >= schedule.recurrenceCount) break;
        if (schedule.endDate && format(candidate, 'yyyy-MM-dd') > schedule.endDate) break;
        if (isAfter(candidate, limitDate)) break;
        
        occurrences.push(candidate);
        count++;
      }
      
      // Move to next month
      month++;
      if (month > 11) {
        month = 0;
        year++;
      }
    }
  }
  
  return occurrences;
}
