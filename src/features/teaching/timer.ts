import { format } from 'date-fns';

import type { Class } from '@/db/database';
import type { ActiveTimer } from '@/store/timerStore';
import { recordTeachingSession } from './api';

export const isClassAvailableForTimer = (cls: Class) => !cls.archivedAt;

export async function completeTeachingTimer(activeTimer: ActiveTimer, now = Date.now()) {
  const durationMinutes = Math.round((now - activeTimer.startTime) / 60000);

  await recordTeachingSession({
    classId: activeTimer.classId,
    subjectId: activeTimer.subjectId === 'none' ? undefined : activeTimer.subjectId,
    noteId: activeTimer.noteId,
    date: format(now, 'yyyy-MM-dd'),
    startTime: activeTimer.startTime,
    endTime: now,
    durationMinutes,
  });

  return durationMinutes;
}
