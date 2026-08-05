import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { db } from '@/db/database';
import { endEnrollment, getStudentsByClass, promoteStudents, unarchiveClass } from '@/features/classes/api';
import { saveGrade } from '@/features/grades/api';
import { createStudent } from '@/features/students/api';
import { deleteTestDatabase, resetTestDatabase } from './testDatabase';

describe('multi-class enrollment and promotion', () => {
  beforeEach(async () => {
    await resetTestDatabase();
    await db.academicPeriods.add({ id: 'period-next', name: '2027/2028', startDate: '2027-07-01', endDate: '2028-06-30', isActive: false });
    await db.classes.bulkAdd([
      { id: 'class-xa', name: 'XA', academicPeriodId: 'period-test' },
      { id: 'class-extra', name: 'Klub Sains', academicPeriodId: 'period-test' },
      { id: 'class-xia', name: 'XIA', academicPeriodId: 'period-next' },
      { id: 'class-xib', name: 'XIB', academicPeriodId: 'period-next' },
    ]);
  });

  afterEach(deleteTestDatabase);

  it('links an existing NIS to multiple classes without duplicating the student profile', async () => {
    const first = await createStudent('class-xa', 'Budi', '1001');
    const linked = await createStudent('class-extra', 'Budi', '1001');

    expect(linked.id).toBe(first.id);
    expect(await db.students.count()).toBe(1);
    expect(await getStudentsByClass('class-xa')).toEqual([expect.objectContaining({ id: first.id })]);
    expect(await getStudentsByClass('class-extra')).toEqual([expect.objectContaining({ id: first.id })]);

    await endEnrollment('class-xa', first.id, '2027-06-30');
    expect(await getStudentsByClass('class-xa')).toEqual([]);
    expect(await getStudentsByClass('class-extra')).toHaveLength(1);
  });

  it('promotes a student to multiple targets atomically and makes the archived source read-only', async () => {
    const student = await createStudent('class-xa', 'Siti', '1002');
    await promoteStudents({
      sourceClassId: 'class-xa',
      targetPeriodId: 'period-next',
      assignments: [{ studentId: student.id, targetClassIds: ['class-xia', 'class-xib'] }],
      archiveSource: true,
    });

    expect((await db.classes.get('class-xa'))?.archivedAt).toBeTruthy();
    expect(await getStudentsByClass('class-xia')).toHaveLength(1);
    expect(await getStudentsByClass('class-xib')).toHaveLength(1);
    await expect(saveGrade('class-xa', student.id, 'Kuis', 90)).rejects.toThrow(/archived/);
    await unarchiveClass('class-xa');
    expect(await getStudentsByClass('class-xa')).toHaveLength(1);
  });

  it('rolls back every assignment when a target does not belong to the selected period', async () => {
    const student = await createStudent('class-xa', 'Ani', '1003');
    await expect(promoteStudents({
      sourceClassId: 'class-xa',
      targetPeriodId: 'period-next',
      assignments: [{ studentId: student.id, targetClassIds: ['class-xia', 'class-extra'] }],
      archiveSource: true,
    })).rejects.toThrow(/target period/);

    expect(await getStudentsByClass('class-xia')).toEqual([]);
    expect((await db.classes.get('class-xa'))?.archivedAt).toBeUndefined();
  });
});
