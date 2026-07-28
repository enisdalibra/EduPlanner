import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  classGet: vi.fn(),
  studentGet: vi.fn(),
  studentAdd: vi.fn(),
  studentUpdate: vi.fn(),
  studentBulkAdd: vi.fn(),
  studentToArray: vi.fn(),
  studentNoteAdd: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock('@/db/database', () => ({
  db: {
    classes: { get: mocks.classGet },
    students: {
      get: mocks.studentGet,
      add: mocks.studentAdd,
      update: mocks.studentUpdate,
      bulkAdd: mocks.studentBulkAdd,
      where: vi.fn(() => ({ anyOf: vi.fn(() => ({ toArray: mocks.studentToArray })) })),
    },
    studentNotes: { add: mocks.studentNoteAdd },
    attendances: {},
    grades: {},
    subjects: {},
    transaction: mocks.transaction,
  },
}));

import { db } from '@/db/database';
import {
  addStudentNote,
  createStudent,
  DuplicateNisError,
  importStudentsBulk,
  updateStudent,
} from '@/features/students/api';

describe('student mutation API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.transaction.mockImplementation(async (...args: unknown[]) => {
      const callback = args.at(-1) as () => Promise<unknown>;
      return callback();
    });
    mocks.classGet.mockResolvedValue({ id: 'c1', name: 'Class 1' });
    mocks.studentGet.mockResolvedValue({ id: 's1', classId: 'c1', name: 'Budi', nis: '101' });
    mocks.studentToArray.mockResolvedValue([]);
  });

  it('creates and updates students through a class-aware transaction', async () => {
    const created = await createStudent('c1', 'Budi', '101');
    expect(created).toMatchObject({ classId: 'c1', name: 'Budi', nis: '101' });
    expect(mocks.studentAdd).toHaveBeenCalledWith(created);

    await updateStudent('s1', { classId: 'c1', name: 'Budi Baru' });
    expect(mocks.studentUpdate).toHaveBeenCalledWith('s1', {
      classId: 'c1',
      name: 'Budi Baru',
    });
    expect(mocks.transaction).toHaveBeenCalledWith(
      'rw',
      [db.classes, db.students],
      expect.any(Function),
    );
  });

  it('rejects duplicate NIS before writing any imported student', async () => {
    mocks.studentToArray.mockResolvedValue([
      { id: 'existing', classId: 'c1', name: 'Existing', nis: '101' },
    ]);
    await expect(importStudentsBulk('c1', [
      { name: 'Budi', nis: '101', rowNumber: 2 },
      { name: 'Siti', nis: '102', rowNumber: 3 },
      { name: 'Ani', nis: '102', rowNumber: 4 },
    ])).rejects.toThrow(DuplicateNisError);
    expect(mocks.studentBulkAdd).not.toHaveBeenCalled();
  });

  it('stores private notes only after validating the owning student', async () => {
    const note = await addStudentNote('s1', '  Perlu pendampingan  ');
    expect(note.content).toBe('Perlu pendampingan');
    expect(mocks.studentNoteAdd).toHaveBeenCalledWith(note);
  });
});
