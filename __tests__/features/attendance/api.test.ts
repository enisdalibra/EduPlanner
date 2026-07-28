import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getAttendanceRecord, getAttendanceByStudent, replaceAttendanceSnapshot, saveAttendance } from '@/features/attendance/api';
import { db } from '@/db/database';

vi.mock('@/db/database', () => ({
  db: {
    classes: {
      get: vi.fn().mockResolvedValue({ id: 'c1', name: 'Class 1' }),
    },
    students: {
      get: vi.fn().mockResolvedValue({ id: 's1', classId: 'c1', name: 'Student 1', nis: '1' }),
    },
    subjects: {
      get: vi.fn().mockResolvedValue({ id: 'subject-1', name: 'Math' }),
    },
    attendances: {
      where: vi.fn().mockReturnThis(),
      equals: vi.fn().mockReturnThis(),
      between: vi.fn().mockReturnThis(),
      filter: vi.fn().mockReturnThis(),
      primaryKeys: vi.fn(),
      toArray: vi.fn(),
      bulkPut: vi.fn(),
      bulkDelete: vi.fn(),
      bulkGet: vi.fn().mockResolvedValue([]),
    },
    transaction: vi.fn(async (...args) => {
      const callback = args.at(-1) as () => Promise<unknown>;
      return callback();
    }),
  }
}));

describe('Attendance API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(db.attendances.toArray).mockResolvedValue([]);
    vi.mocked(db.attendances.bulkGet).mockResolvedValue([]);
  });

  it('should get attendance record by class and date', async () => {
    vi.mocked(db.attendances.toArray).mockResolvedValue([{ id: '1', status: 'hadir' }] as any);
    const result = await getAttendanceRecord('c1', '2023-01-01');
    expect(result).toEqual([{ id: '1', status: 'hadir' }]);
    expect(db.attendances.where).toHaveBeenCalledWith('[classId+date]');
  });

  it('should get attendance record by student', async () => {
    vi.mocked(db.attendances.toArray).mockResolvedValue([{ id: '1', status: 'hadir' }] as any);
    const result = await getAttendanceByStudent('s1');
    expect(result).toEqual([{ id: '1', status: 'hadir' }]);
    expect(db.attendances.where).toHaveBeenCalledWith('studentId');
  });

  it('should save attendance records via bulkPut', async () => {
    const records = [{ studentId: 's1', classId: 'c1', date: '2023-01-01', status: 'hadir' as const }];
    await saveAttendance(records as any);
    expect(db.attendances.bulkPut).toHaveBeenCalled();
  });

  it('atomically replaces an empty attendance snapshot for undo', async () => {
    vi.mocked((db.attendances as any).primaryKeys).mockResolvedValue(['new-record']);
    await replaceAttendanceSnapshot('c1', '2023-01-01', undefined, []);
    expect(db.transaction).toHaveBeenCalledWith(
      'rw',
      [db.attendances, db.classes, db.students, db.subjects],
      expect.any(Function),
    );
    expect(db.attendances.bulkDelete).toHaveBeenCalledWith(['new-record']);
    expect(db.attendances.bulkPut).not.toHaveBeenCalled();
  });
});
