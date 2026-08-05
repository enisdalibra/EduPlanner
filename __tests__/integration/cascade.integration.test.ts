import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { db } from '@/db/database';
import { deleteClass } from '@/features/classes/api';
import { deleteStudent } from '@/features/students/api';
import { deleteSubject } from '@/features/subjects/api';
import { checkDatabaseIntegrity } from '@/services/IntegrityService';
import { deleteTestDatabase, resetTestDatabase } from './testDatabase';

async function seedRelatedRecords(): Promise<void> {
  await db.transaction('rw', db.tables, async () => {
    await db.classes.bulkAdd([
      { id: 'class-delete', name: 'Delete', academicPeriodId: 'period-test' },
      { id: 'class-keep', name: 'Keep', academicPeriodId: 'period-test' },
    ]);
    await db.students.bulkAdd([
      { id: 'student-delete-1', name: 'A', nis: '101' },
      { id: 'student-delete-2', name: 'B', nis: '102' },
      { id: 'student-keep', name: 'C', nis: '103' },
    ]);
    await db.classEnrollments.bulkAdd([
      { id: 'ed1', classId: 'class-delete', studentId: 'student-delete-1', enrolledAt: '2026-07-01' },
      { id: 'ed2', classId: 'class-delete', studentId: 'student-delete-2', enrolledAt: '2026-07-01' },
      { id: 'ek', classId: 'class-keep', studentId: 'student-keep', enrolledAt: '2026-07-01' },
    ]);
    await db.subjects.add({
      id: 'subject-1',
      name: 'Subject',
      assignedStudents: ['student-delete-1', 'student-delete-2', 'student-keep'],
    });
    await db.attendances.bulkAdd([
      { id: 'attendance-delete', classId: 'class-delete', studentId: 'student-delete-1', date: '2026-07-19', status: 'hadir' },
      { id: 'attendance-keep', classId: 'class-keep', studentId: 'student-keep', date: '2026-07-19', status: 'izin' },
    ]);
    await db.grades.bulkAdd([
      { id: 'grade-delete', classId: 'class-delete', studentId: 'student-delete-1', evaluationName: 'Kuis', score: 90 },
      { id: 'grade-keep', classId: 'class-keep', studentId: 'student-keep', evaluationName: 'Kuis', score: 80 },
    ]);
    await db.studentNotes.bulkAdd([
      { id: 'student-note-delete', studentId: 'student-delete-1', content: 'Delete', createdAt: new Date() },
      { id: 'student-note-keep', studentId: 'student-keep', content: 'Keep', createdAt: new Date() },
    ]);
    await db.notes.bulkAdd([
      { id: 'note-delete', classId: 'class-delete', title: 'Delete', content: '', type: 'guru', createdAt: new Date() },
      { id: 'note-keep', classId: 'class-keep', title: 'Keep', content: '', type: 'guru', createdAt: new Date() },
    ]);
    await db.tasks.bulkAdd([
      { id: 'task-delete', classId: 'class-delete', title: 'Delete', date: '2026-07-19', status: 'pending' },
      { id: 'task-keep', classId: 'class-keep', title: 'Keep', date: '2026-07-19', status: 'pending' },
    ]);
    await db.teachingSessions.bulkAdd([
      { id: 'session-delete', classId: 'class-delete', date: '2026-07-19', startTime: 1, endTime: 2, durationMinutes: 1 },
      { id: 'session-keep', classId: 'class-keep', date: '2026-07-19', startTime: 1, endTime: 2, durationMinutes: 1 },
    ]);
    await db.schedules.bulkAdd([
      { id: 'schedule-delete', classId: 'class-delete', startTime: '08:00', endTime: '09:00', recurrenceType: 'weekly', startDate: '2026-07-19', notificationEarlyMinutes: 0 },
      { id: 'schedule-keep', classId: 'class-keep', startTime: '09:00', endTime: '10:00', recurrenceType: 'weekly', startDate: '2026-07-19', notificationEarlyMinutes: 0 },
    ]);
  });
}

describe('cascade deletion IndexedDB integration', () => {
  beforeEach(async () => {
    await resetTestDatabase();
    await seedRelatedRecords();
  });
  afterEach(deleteTestDatabase);

  it('deletes one student and its indexed relationships without touching peers', async () => {
    await deleteStudent('student-delete-1');

    expect(await db.students.get('student-delete-1')).toBeUndefined();
    expect(await db.attendances.where('studentId').equals('student-delete-1').count()).toBe(0);
    expect(await db.grades.where('studentId').equals('student-delete-1').count()).toBe(0);
    expect(await db.studentNotes.where('studentId').equals('student-delete-1').count()).toBe(0);
    expect(await db.classEnrollments.where('studentId').equals('student-delete-1').count()).toBe(0);
    expect((await db.subjects.get('subject-1'))?.assignedStudents).toEqual([
      'student-delete-2',
      'student-keep',
    ]);
    expect(await db.students.get('student-delete-2')).toBeDefined();
    expect(await db.students.get('student-keep')).toBeDefined();
    expect(await db.attendances.get('attendance-keep')).toBeDefined();
  });

  it('deletes a class graph while preserving every record owned by another class', async () => {
    await deleteClass('class-delete');

    expect(await db.classes.get('class-delete')).toBeUndefined();
    expect(await db.classEnrollments.where('classId').equals('class-delete').count()).toBe(0);
    expect(await db.attendances.where('classId').equals('class-delete').count()).toBe(0);
    expect(await db.grades.where('classId').equals('class-delete').count()).toBe(0);
    expect(await db.notes.where('classId').equals('class-delete').count()).toBe(0);
    expect(await db.tasks.where('classId').equals('class-delete').count()).toBe(0);
    expect(await db.teachingSessions.where('classId').equals('class-delete').count()).toBe(0);
    expect(await db.schedules.where('classId').equals('class-delete').count()).toBe(0);
    expect(await db.studentNotes.where('studentId').anyOf([
      'student-delete-1',
      'student-delete-2',
    ]).count()).toBe(1);
    expect((await db.subjects.get('subject-1'))?.assignedStudents).toEqual(['student-delete-1', 'student-delete-2', 'student-keep']);

    expect(await db.classes.get('class-keep')).toBeDefined();
    expect(await db.students.get('student-keep')).toBeDefined();
    expect(await db.students.get('student-delete-1')).toBeDefined();
    expect(await db.attendances.get('attendance-keep')).toBeDefined();
    expect(await db.grades.get('grade-keep')).toBeDefined();
    expect(await db.notes.get('note-keep')).toBeDefined();
    expect(await db.tasks.get('task-keep')).toBeDefined();
    expect(await db.teachingSessions.get('session-keep')).toBeDefined();
    expect(await db.schedules.get('schedule-keep')).toBeDefined();
    expect(await db.studentNotes.get('student-note-keep')).toBeDefined();
  });

  it('deletes a subject without leaving orphaned recurring schedules', async () => {
    await db.attendances.update('attendance-keep', { subjectId: 'subject-1' });
    await db.grades.update('grade-keep', { subjectId: 'subject-1' });
    await db.notes.update('note-keep', { subjectId: 'subject-1' });
    await db.tasks.update('task-keep', { subjectId: 'subject-1' });
    await db.teachingSessions.update('session-keep', { subjectId: 'subject-1' });
    await db.schedules.update('schedule-keep', { subjectId: 'subject-1' });

    await deleteSubject('subject-1');

    expect(await db.subjects.get('subject-1')).toBeUndefined();
    expect(await db.teachingSessions.get('session-keep')).toBeUndefined();
    expect((await db.attendances.get('attendance-keep'))?.subjectId).toBeUndefined();
    expect((await db.grades.get('grade-keep'))?.subjectId).toBeUndefined();
    expect((await db.notes.get('note-keep'))?.subjectId).toBeUndefined();
    expect((await db.tasks.get('task-keep'))?.subjectId).toBeUndefined();
    const preservedSchedule = await db.schedules.get('schedule-keep');
    expect(preservedSchedule).toMatchObject({
      id: 'schedule-keep',
      classId: 'class-keep',
    });
    expect(preservedSchedule?.subjectId).toBeUndefined();

    const integrity = await checkDatabaseIntegrity();
    expect(integrity.isHealthy).toBe(true);
    expect(integrity.summary.orphan).toBe(0);
  });
});
