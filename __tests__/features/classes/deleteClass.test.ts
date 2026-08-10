import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const makeTable = () => ({
    where: vi.fn().mockReturnThis(),
    equals: vi.fn().mockReturnThis(),
    modify: vi.fn(),
    delete: vi.fn(),
  });
  return {
    classes: { get: vi.fn(), delete: vi.fn() },
    enrollments: makeTable(), attendances: makeTable(), grades: makeTable(), notes: makeTable(),
    tasks: makeTable(), teachingSessions: makeTable(), schedules: makeTable(),
    transaction: vi.fn(),
  };
});

vi.mock('@/db/database', () => ({ db: {
  classes: mocks.classes,
  classEnrollments: mocks.enrollments,
  attendances: mocks.attendances,
  grades: mocks.grades,
  notes: mocks.notes,
  tasks: mocks.tasks,
  teachingSessions: mocks.teachingSessions,
  schedules: mocks.schedules,
  transaction: mocks.transaction,
} }));

import { db } from '@/db/database';
import { deleteClass } from '@/features/classes/api';

describe('deleteClass', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.classes.get.mockResolvedValue({ id: 'class-1', name: 'Class', academicPeriodId: 'period-1' });
    mocks.transaction.mockImplementation(async (...args: unknown[]) => (args.at(-1) as () => Promise<void>)());
  });

  it('deletes class-owned records and enrollments without deleting student profiles', async () => {
    await deleteClass('class-1');
    expect(mocks.notes.where).toHaveBeenCalledWith('classIds');
    expect(mocks.notes.modify).toHaveBeenCalled();
    expect(mocks.enrollments.where).toHaveBeenCalledWith('classId');
    for (const table of [mocks.attendances, mocks.grades, mocks.notes, mocks.tasks, mocks.teachingSessions, mocks.schedules]) {
      expect(table.where).toHaveBeenCalledWith('classId');
      expect(table.delete).toHaveBeenCalled();
    }
    expect(mocks.classes.delete).toHaveBeenCalledWith('class-1');
    expect(mocks.transaction).toHaveBeenCalledWith('rw', [db.classes, db.classEnrollments, db.attendances, db.grades, db.notes, db.tasks, db.teachingSessions, db.schedules], expect.any(Function));
  });

  it('does not delete the class when related cleanup fails', async () => {
    mocks.schedules.delete.mockRejectedValueOnce(new Error('cleanup failed'));
    await expect(deleteClass('class-1')).rejects.toThrow('cleanup failed');
    expect(mocks.classes.delete).not.toHaveBeenCalled();
  });
});
