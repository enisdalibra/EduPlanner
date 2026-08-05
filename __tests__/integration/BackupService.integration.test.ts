import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { db } from '@/db/database';
import {
  BACKUP_TABLE_NAMES,
  BackupService,
  type BackupEnvelope,
} from '@/services/BackupService';
import { deleteTestDatabase, resetTestDatabase } from './testDatabase';

async function seedEveryTable(): Promise<void> {
  await db.transaction('rw', db.tables, async () => {
    await db.profile.add({ id: 'profile-1', name: 'Guru', school: 'SMA 1' });
    await db.subjects.add({
      id: 'subject-1',
      name: 'Matematika',
      assignedStudents: ['student-1'],
    });
    await db.classes.add({ id: 'class-1', name: 'Kelas 1', academicPeriodId: 'period-test' });
    await db.students.add({
      id: 'student-1',
      name: 'Budi',
      nis: '00101',
    });
    await db.classEnrollments.add({ id: 'enrollment-1', classId: 'class-1', studentId: 'student-1', enrolledAt: '2026-07-01' });
    await db.attendances.add({
      id: 'attendance-1',
      classId: 'class-1',
      studentId: 'student-1',
      subjectId: 'subject-1',
      date: '2026-07-19',
      status: 'hadir',
    });
    await db.grades.add({
      id: 'grade-1',
      classId: 'class-1',
      studentId: 'student-1',
      subjectId: 'subject-1',
      evaluationName: 'Kuis 1',
      score: 92,
    });
    await db.notes.add({
      id: 'note-1',
      classId: 'class-1',
      subjectId: 'subject-1',
      title: 'Materi',
      content: 'Isi materi',
      type: 'materi',
      createdAt: new Date('2026-07-19T01:02:03.000Z'),
    });
    await db.tasks.add({
      id: 'task-1',
      classId: 'class-1',
      subjectId: 'subject-1',
      title: 'Tugas',
      date: '2026-07-20',
      status: 'pending',
    });
    await db.teachingSessions.add({
      id: 'session-1',
      classId: 'class-1',
      subjectId: 'subject-1',
      noteId: 'note-1',
      date: '2026-07-19',
      startTime: 100,
      endTime: 200,
      durationMinutes: 60,
    });
    await db.studentNotes.add({
      id: 'student-note-1',
      studentId: 'student-1',
      content: 'Perlu pendampingan',
      createdAt: new Date('2026-07-19T04:05:06.000Z'),
    });
    await db.schedules.add({
      id: 'schedule-1',
      classId: 'class-1',
      subjectId: 'subject-1',
      startTime: '08:00',
      endTime: '09:00',
      recurrenceType: 'weekly',
      dayOfWeek: 1,
      startDate: '2026-07-19',
      notificationEarlyMinutes: 10,
    });
  });
}

describe('BackupService IndexedDB integration', () => {
  beforeEach(resetTestDatabase);
  afterEach(deleteTestDatabase);

  it('round-trips every table and restores Date values through real Dexie tables', async () => {
    await seedEveryTable();
    const original = await BackupService.generateExport();
    const payload = JSON.stringify(original);

    await db.transaction('rw', db.tables, async () => {
      await Promise.all(db.tables.map((table) => table.clear()));
    });
    expect(await Promise.all(db.tables.map((table) => table.count()))).toEqual(
      db.tables.map(() => 0),
    );

    const result = await BackupService.restoreExportPayload(payload);
    const restored = await BackupService.generateExport();

    expect(result.source).toBe('current');
    for (const tableName of BACKUP_TABLE_NAMES) {
      expect(result.counts[tableName]).toBe(1);
      expect(await db.table(tableName).count()).toBe(1);
      expect(restored.data[tableName]).toEqual(original.data[tableName]);
    }
    expect((await db.notes.get('note-1'))?.createdAt).toBeInstanceOf(Date);
    expect((await db.studentNotes.get('student-note-1'))?.createdAt).toBeInstanceOf(Date);
  });

  it('rolls back cleared and inserted records when a write fails mid-restore', async () => {
    await seedEveryTable();
    const original = await BackupService.generateExport();
    const replacement = structuredClone(original) as BackupEnvelope;
    replacement.data.classes = [{ id: 'replacement-class', name: 'Replacement' }];
    replacement.data.tasks = [{
      id: 'replacement-task',
      title: 'Replacement task',
      date: '2026-08-01',
      status: 'pending',
      uncloneable: () => undefined,
    }];

    await expect(BackupService.restoreExportPayload(replacement)).rejects.toThrow();

    const afterFailure = await BackupService.generateExport();
    for (const tableName of BACKUP_TABLE_NAMES) {
      expect(afterFailure.data[tableName]).toEqual(original.data[tableName]);
    }
    expect(await db.classes.get('replacement-class')).toBeUndefined();
  });

  it('rejects an incomplete legacy backup without changing existing data', async () => {
    await seedEveryTable();
    const original = await BackupService.generateExport();

    await expect(BackupService.restoreExportPayload({
      classes: [],
      students: [],
      attendances: [],
      grades: [],
      notes: [],
    })).rejects.toThrow(/Missing required table: tasks/);

    const afterFailure = await BackupService.generateExport();
    for (const tableName of BACKUP_TABLE_NAMES) {
      expect(afterFailure.data[tableName]).toEqual(original.data[tableName]);
    }
  });

  it('rejects an orphaned restore candidate without changing existing data', async () => {
    await seedEveryTable();
    const original = await BackupService.generateExport();
    const invalid = structuredClone(original) as BackupEnvelope;
    invalid.data.students = [{
      id: 'student-orphan',
      classId: 'missing-class',
      name: 'Synthetic Student',
      nis: 'SYNTHETIC-1',
    }];

    await expect(BackupService.restoreExportPayload(invalid)).rejects.toThrow(
      /classEnrollments|academicPeriodId/,
    );

    const afterFailure = await BackupService.generateExport();
    for (const tableName of BACKUP_TABLE_NAMES) {
      expect(afterFailure.data[tableName]).toEqual(original.data[tableName]);
    }
  });
});
