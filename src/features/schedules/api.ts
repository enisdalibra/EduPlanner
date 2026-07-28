import { db, type Schedule } from '@/db/database';
import { DomainNotFoundError } from '@/lib/domainErrors';
import { validateSchedule } from '@/lib/validation';

export type ScheduleInput = Omit<Schedule, 'id'>;

async function assertScheduleRelations(schedule: Partial<Pick<Schedule, 'classId' | 'subjectId'>>): Promise<void> {
  if (schedule.classId && !(await db.classes.get(schedule.classId))) {
    throw new DomainNotFoundError('Class', schedule.classId);
  }
  if (schedule.subjectId && !(await db.subjects.get(schedule.subjectId))) {
    throw new DomainNotFoundError('Subject', schedule.subjectId);
  }
}

export async function createSchedule(input: ScheduleInput): Promise<Schedule> {
  const schedule: Schedule = { id: crypto.randomUUID(), ...input };
  validateSchedule(schedule);
  return db.transaction('rw', [db.schedules, db.classes, db.subjects], async () => {
    await assertScheduleRelations(schedule);
    await db.schedules.add(schedule);
    return schedule;
  });
}

export async function updateSchedule(id: string, updates: Partial<Schedule>): Promise<void> {
  validateSchedule(updates, true);
  await db.transaction('rw', [db.schedules, db.classes, db.subjects], async () => {
    if (!(await db.schedules.get(id))) throw new DomainNotFoundError('Schedule', id);
    await assertScheduleRelations(updates);
    await db.schedules.update(id, updates);
  });
}

export async function deleteSchedule(id: string): Promise<void> {
  await db.transaction('rw', db.schedules, async () => {
    if (!(await db.schedules.get(id))) throw new DomainNotFoundError('Schedule', id);
    await db.schedules.delete(id);
  });
}
