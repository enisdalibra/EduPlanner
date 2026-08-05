import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import { saveAttendance } from '@/features/attendance/api';
import { renameEvaluation, saveGrade } from '@/features/grades/api';
import { db, type Attendance } from '@/db/database';
import { INPUT_LIMITS } from '@/lib/validation';
import {
  deleteTestDatabase,
  resetTestDatabase,
} from './testDatabase';

describe('referentially safe academic writes', () => {
  beforeEach(async () => {
    await resetTestDatabase();
    await db.classes.bulkAdd([
      { id: 'class-a', name: 'Class A', academicPeriodId: 'period-test' },
      { id: 'class-b', name: 'Class B', academicPeriodId: 'period-test' },
    ]);
    await db.students.bulkAdd([
      { id: 'student-a', name: 'Student A', nis: 'A-1' },
      { id: 'student-c', name: 'Student C', nis: 'C-1' },
      { id: 'student-b', name: 'Student B', nis: 'B-1' },
    ]);
    await db.classEnrollments.bulkAdd([
      { id: 'ea', classId: 'class-a', studentId: 'student-a', enrolledAt: '2026-07-01' },
      { id: 'ec', classId: 'class-a', studentId: 'student-c', enrolledAt: '2026-07-01' },
      { id: 'eb', classId: 'class-b', studentId: 'student-b', enrolledAt: '2026-07-01' },
    ]);
    await db.subjects.add({ id: 'subject-a', name: 'Biology' });
  });

  afterAll(deleteTestDatabase);

  it('stores a grade only when all referenced entities agree', async () => {
    await saveGrade('class-a', 'student-a', ' Midterm ', 90, 'subject-a');
    await expect(db.grades.toArray()).resolves.toMatchObject([
      {
        classId: 'class-a',
        studentId: 'student-a',
        subjectId: 'subject-a',
        evaluationName: 'Midterm',
        score: 90,
      },
    ]);

    await expect(
      saveGrade('class-a', 'student-b', 'Quiz', 80, 'subject-a'),
    ).rejects.toThrow(/never been enrolled/);
    await expect(
      saveGrade('missing-class', 'student-a', 'Quiz', 80),
    ).rejects.toThrow(/Class/);
    await expect(
      saveGrade('class-a', 'missing-student', 'Quiz', 80),
    ).rejects.toThrow(/Student/);
    await expect(
      saveGrade('class-a', 'student-a', 'Quiz', 80, 'missing-subject'),
    ).rejects.toThrow(/Subject/);
    await expect(db.grades.count()).resolves.toBe(1);
  });

  it('renames evaluations atomically without bypassing limits or creating duplicates', async () => {
    await saveGrade('class-a', 'student-a', 'Quiz', 90, 'subject-a');
    await saveGrade('class-a', 'student-c', 'Final', 80, 'subject-a');

    await expect(
      renameEvaluation('class-a', ' Quiz ', ' Midterm ', 'subject-a'),
    ).resolves.toBe(1);
    await expect(
      db.grades.filter(({ evaluationName }) => evaluationName === 'Midterm').count(),
    ).resolves.toBe(1);

    await expect(
      renameEvaluation(
        'class-a',
        'Midterm',
        'x'.repeat(INPUT_LIMITS.entityName + 1),
        'subject-a',
      ),
    ).rejects.toThrow(/must not exceed/);
    await expect(
      db.grades.filter(({ evaluationName }) => evaluationName === 'Midterm').count(),
    ).resolves.toBe(1);

    await saveGrade('class-a', 'student-a', 'Final', 95, 'subject-a');
    await expect(
      renameEvaluation('class-a', 'Midterm', 'Final', 'subject-a'),
    ).rejects.toThrow(/target name already has a grade/);

    await expect(
      db.grades.filter(({ evaluationName }) => evaluationName === 'Midterm').count(),
    ).resolves.toBe(1);
    await expect(
      db.grades.filter(({ evaluationName }) => evaluationName === 'Final').count(),
    ).resolves.toBe(2);
  });

  it('rejects an invalid attendance batch without partially writing valid rows', async () => {
    const records: Attendance[] = [
      {
        id: 'valid-row',
        classId: 'class-a',
        studentId: 'student-a',
        subjectId: 'subject-a',
        date: '2026-07-28',
        status: 'hadir',
      },
      {
        id: 'invalid-row',
        classId: 'class-a',
        studentId: 'student-b',
        subjectId: 'subject-a',
        date: '2026-07-28',
        status: 'izin',
      },
    ];

    await expect(saveAttendance(records)).rejects.toThrow(/never been enrolled/);
    await expect(
      saveAttendance([
        {
          ...records[0],
          id: 'missing-subject-row',
          subjectId: 'missing-subject',
        },
      ]),
    ).rejects.toThrow(/Subject/);
    await expect(db.attendances.count()).resolves.toBe(0);
  });

  it('prevents an attendance id from overwriting a different record scope', async () => {
    await saveAttendance([
      {
        id: 'attendance-1',
        classId: 'class-a',
        studentId: 'student-a',
        date: '2026-07-28',
        status: 'hadir',
      },
    ]);

    await expect(
      saveAttendance([
        {
          id: 'attendance-1',
          classId: 'class-b',
          studentId: 'student-b',
          date: '2026-07-29',
          status: 'alpa',
        },
      ]),
    ).rejects.toThrow(/different record scope/);

    await expect(db.attendances.get('attendance-1')).resolves.toMatchObject({
      classId: 'class-a',
      studentId: 'student-a',
      date: '2026-07-28',
      status: 'hadir',
    });
  });

  it('rejects duplicate attendance natural keys with different ids', async () => {
    const base = {
      classId: 'class-a',
      studentId: 'student-a',
      date: '2026-07-28',
      status: 'hadir' as const,
    };
    await saveAttendance([{ id: 'attendance-1', ...base }]);

    await expect(
      saveAttendance([{ id: 'attendance-2', ...base, status: 'izin' }]),
    ).rejects.toThrow(/already exists/);
    await expect(db.attendances.count()).resolves.toBe(1);
  });
});
