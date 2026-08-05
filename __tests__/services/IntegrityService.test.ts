import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { EduPlannerDB } from '@/db/database';
import { checkDatabaseIntegrity } from '@/services/IntegrityService';

describe('checkDatabaseIntegrity', () => {
  let database: EduPlannerDB;

  beforeEach(async () => {
    database = new EduPlannerDB(`integrity-${crypto.randomUUID()}`);
    await database.open();
    await database.academicPeriods.add({ id: 'period-1', name: '2026/2027', startDate: '2026-07-01', endDate: '2027-06-30', isActive: true });
  });

  afterEach(async () => { database.close(); await database.delete(); });

  it('reports a healthy database when enrollment-backed relations are valid', async () => {
    await database.classes.add({ id: 'class-1', name: 'Class 1', academicPeriodId: 'period-1' });
    await database.students.add({ id: 'student-1', name: 'Budi', nis: '1001' });
    await database.classEnrollments.add({ id: 'enrollment-1', classId: 'class-1', studentId: 'student-1', enrolledAt: '2026-07-01' });
    await database.attendances.add({ id: 'attendance-1', classId: 'class-1', studentId: 'student-1', date: '2026-07-19', status: 'hadir' });
    await database.grades.add({ id: 'grade-1', classId: 'class-1', studentId: 'student-1', evaluationName: 'Quiz', score: 90 });

    const report = await checkDatabaseIntegrity(database);
    expect(report.isHealthy).toBe(true);
    expect(report.summary.total).toBe(0);
    expect(report.scannedRecords).toBe(6);
  });

  it('detects orphan and duplicate enrollments plus academic records without membership', async () => {
    await database.classes.add({ id: 'class-1', name: 'Class 1', academicPeriodId: 'missing-period' });
    await database.students.bulkAdd([
      { id: 'student-1', name: 'Budi', nis: '1001' },
      { id: 'student-2', name: 'Ani', nis: '1001' },
    ]);
    await database.classEnrollments.add({ id: 'orphan-enrollment', classId: 'missing-class', studentId: 'student-1', enrolledAt: '2026-07-01' });
    await database.attendances.add({ id: 'attendance-1', classId: 'class-1', studentId: 'student-1', date: '2026-07-19', status: 'hadir' });

    const report = await checkDatabaseIntegrity(database);
    expect(report.isHealthy).toBe(false);
    expect(report.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: 'orphan', table: 'classes', field: 'academicPeriodId' }),
      expect.objectContaining({ kind: 'orphan', table: 'classEnrollments', field: 'classId' }),
      expect.objectContaining({ kind: 'duplicate', table: 'students', recordId: 'student-2' }),
      expect.objectContaining({ kind: 'mismatch', table: 'attendances', recordId: 'attendance-1' }),
    ]));
  });
});
