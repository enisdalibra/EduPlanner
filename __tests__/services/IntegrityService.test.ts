import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { EduPlannerDB } from '@/db/database';
import { checkDatabaseIntegrity } from '@/services/IntegrityService';

describe('checkDatabaseIntegrity', () => {
  let database: EduPlannerDB;

  beforeEach(async () => {
    database = new EduPlannerDB(`integrity-${crypto.randomUUID()}`);
    await database.open();
  });

  afterEach(async () => {
    database.close();
    await database.delete();
  });

  it('reports a healthy database when every relation is valid and unique', async () => {
    await database.classes.add({ id: 'class-1', name: 'Class 1' });
    await database.students.add({
      id: 'student-1',
      classId: 'class-1',
      name: 'Budi',
      nis: '1001',
    });
    await database.subjects.add({
      id: 'subject-1',
      name: 'Math',
      assignedStudents: ['student-1'],
    });
    await database.notes.add({
      id: 'note-1',
      classId: 'class-1',
      subjectId: 'subject-1',
      title: 'Material',
      content: 'Content',
      type: 'materi',
      createdAt: new Date(),
    });
    await database.attendances.add({
      id: 'attendance-1',
      classId: 'class-1',
      studentId: 'student-1',
      subjectId: 'subject-1',
      date: '2026-07-19',
      status: 'hadir',
    });
    await database.grades.add({
      id: 'grade-1',
      classId: 'class-1',
      studentId: 'student-1',
      subjectId: 'subject-1',
      evaluationName: 'Quiz 1',
      score: 90,
    });
    await database.tasks.add({
      id: 'task-1',
      title: 'Review',
      date: '2026-07-19',
      classId: 'class-1',
      subjectId: 'subject-1',
      status: 'pending',
    });
    await database.teachingSessions.add({
      id: 'session-1',
      classId: 'class-1',
      subjectId: 'subject-1',
      noteId: 'note-1',
      date: '2026-07-19',
      startTime: 1,
      endTime: 2,
      durationMinutes: 1,
    });
    await database.studentNotes.add({
      id: 'student-note-1',
      studentId: 'student-1',
      content: 'Progress',
      createdAt: new Date(),
    });
    await database.schedules.add({
      id: 'schedule-1',
      classId: 'class-1',
      subjectId: 'subject-1',
      startTime: '08:00',
      endTime: '09:00',
      recurrenceType: 'weekly',
      startDate: '2026-07-19',
      notificationEarlyMinutes: 10,
    });

    const report = await checkDatabaseIntegrity(database);

    expect(report.isHealthy).toBe(true);
    expect(report.scannedRecords).toBe(10);
    expect(report.summary).toEqual({ orphan: 0, mismatch: 0, duplicate: 0, total: 0 });
    expect(report.issues).toEqual([]);
  });

  it('accepts subjects without an assigned student list', async () => {
    await database.subjects.add({ id: 'subject-1', name: 'Math' });

    const report = await checkDatabaseIntegrity(database);

    expect(report.isHealthy).toBe(true);
    expect(report.scannedRecords).toBe(1);
  });

  it('detects orphaned references, class mismatches, and domain duplicates', async () => {
    await database.classes.bulkAdd([
      { id: 'class-1', name: 'Class 1' },
      { id: 'class-2', name: 'Class 2' },
    ]);
    await database.students.bulkAdd([
      { id: 'student-1', classId: 'class-1', name: 'Budi', nis: '1001' },
      { id: 'student-2', classId: 'class-2', name: 'Ani', nis: '1001' },
      { id: 'student-3', classId: 'missing-class', name: 'Citra', nis: '1003' },
    ]);
    await database.subjects.add({
      id: 'subject-1',
      name: 'Math',
      assignedStudents: ['student-1', 'missing-student', 'student-1'],
    });
    await database.attendances.bulkAdd([
      {
        id: 'attendance-1',
        classId: 'class-2',
        studentId: 'student-1',
        subjectId: 'subject-1',
        date: '2026-07-19',
        status: 'hadir',
      },
      {
        id: 'attendance-2',
        classId: 'class-2',
        studentId: 'student-1',
        subjectId: 'subject-1',
        date: '2026-07-19',
        status: 'sakit',
      },
      {
        id: 'attendance-3',
        classId: 'class-1',
        studentId: 'missing-student',
        date: '2026-07-20',
        status: 'alpa',
      },
    ]);
    await database.grades.bulkAdd([
      {
        id: 'grade-1',
        classId: 'class-1',
        studentId: 'student-1',
        subjectId: 'missing-subject',
        evaluationName: 'Quiz 1',
        score: 80,
      },
      {
        id: 'grade-2',
        classId: 'class-1',
        studentId: 'student-1',
        subjectId: 'missing-subject',
        evaluationName: 'Quiz 1',
        score: 90,
      },
    ]);
    await database.notes.add({
      id: 'note-1',
      subjectId: 'missing-subject',
      title: 'Note',
      content: '',
      type: 'guru',
      createdAt: new Date(),
    });
    await database.tasks.add({
      id: 'task-1',
      classId: 'missing-class',
      title: 'Task',
      date: '2026-07-19',
      status: 'pending',
    });
    await database.teachingSessions.add({
      id: 'session-1',
      classId: 'class-1',
      noteId: 'missing-note',
      date: '2026-07-19',
      startTime: 1,
      endTime: 2,
      durationMinutes: 1,
    });
    await database.studentNotes.add({
      id: 'student-note-1',
      studentId: 'missing-student',
      content: 'Orphan',
      createdAt: new Date(),
    });
    await database.schedules.add({
      id: 'schedule-1',
      classId: 'missing-class',
      startTime: '08:00',
      endTime: '09:00',
      recurrenceType: 'weekly',
      startDate: '2026-07-19',
      notificationEarlyMinutes: 0,
    });

    const report = await checkDatabaseIntegrity(database);

    expect(report.isHealthy).toBe(false);
    expect(report.summary).toEqual({ orphan: 10, mismatch: 2, duplicate: 4, total: 16 });
    expect(report.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: 'orphan', table: 'students', recordId: 'student-3', field: 'classId' }),
      expect.objectContaining({ kind: 'orphan', table: 'subjects', recordId: 'subject-1', referencedId: 'missing-student' }),
      expect.objectContaining({ kind: 'mismatch', table: 'attendances', recordId: 'attendance-1' }),
      expect.objectContaining({ kind: 'duplicate', table: 'students', recordId: 'student-2', duplicateOf: 'student-1' }),
      expect.objectContaining({ kind: 'duplicate', table: 'attendances', recordId: 'attendance-2', duplicateOf: 'attendance-1' }),
      expect.objectContaining({ kind: 'duplicate', table: 'grades', recordId: 'grade-2', duplicateOf: 'grade-1' }),
      expect.objectContaining({ kind: 'orphan', table: 'teachingSessions', recordId: 'session-1', field: 'noteId' }),
      expect.objectContaining({ kind: 'orphan', table: 'studentNotes', recordId: 'student-note-1' }),
      expect.objectContaining({ kind: 'orphan', table: 'schedules', recordId: 'schedule-1' }),
    ]));
  });
});
