import { db, type Schedule } from '@/db/database';
import { DomainNotFoundError } from '@/lib/domainErrors';
import { validateSchedule } from '@/lib/validation';
import { assertClassWritable } from '@/lib/classAccess';

export type ScheduleInput = Omit<Schedule, 'id'>;

async function assertScheduleRelations(schedule: Partial<Pick<Schedule, 'classId' | 'subjectId'>>): Promise<void> {
  if (schedule.classId) await assertClassWritable(db, schedule.classId);
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
    const current = await db.schedules.get(id);
    if (!current) throw new DomainNotFoundError('Schedule', id);
    await assertClassWritable(db, current.classId);
    await assertScheduleRelations(updates);
    await db.schedules.update(id, updates);
  });
}

export async function deleteSchedule(id: string): Promise<void> {
  await db.transaction('rw', [db.schedules, db.classes], async () => {
    const current = await db.schedules.get(id);
    if (!current) throw new DomainNotFoundError('Schedule', id);
    await assertClassWritable(db, current.classId);
    await db.schedules.delete(id);
  });
}
