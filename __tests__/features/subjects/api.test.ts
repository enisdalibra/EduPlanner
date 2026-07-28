import { describe, it, expect, vi, beforeEach } from 'vitest';
import { assignClassToSubject, createSubject, updateSubject, deleteSubject } from '@/features/subjects/api';
import { db } from '@/db/database';

vi.mock('@/db/database', () => {
  const mockTable = {
    where: vi.fn().mockReturnThis(),
    equals: vi.fn().mockReturnThis(),
    delete: vi.fn(),
    modify: vi.fn(),
    filter: vi.fn().mockReturnThis(),
    add: vi.fn(),
    update: vi.fn(),
    get: vi.fn(),
    toArray: vi.fn(),
  };

  return {
    db: {
      subjects: { ...mockTable },
      grades: { ...mockTable },
      attendances: { ...mockTable },
      tasks: { ...mockTable },
      notes: { ...mockTable },
      teachingSessions: { ...mockTable },
      schedules: { ...mockTable },
      classes: { ...mockTable },
      students: { ...mockTable },
      transaction: vi.fn(async (...args) => {
        const cb = args[args.length - 1];
        return cb();
      }),
    }
  };
});

describe('Subjects API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(db.subjects.get).mockResolvedValue({
      id: '1',
      name: 'Math',
    });
  });

  it('should create a subject', async () => {
    const result = await createSubject('Math', 'Mathematics');
    expect(result).toHaveProperty('name', 'Math');
    expect(db.subjects.add).toHaveBeenCalled();
  });

  it('should update a subject', async () => {
    await updateSubject('1', { name: 'Science' });
    expect(db.subjects.update).toHaveBeenCalledWith('1', { name: 'Science' });
  });

  it('should delete a subject', async () => {
    await deleteSubject('1');
    expect(db.transaction).toHaveBeenCalled();
    expect(db.schedules.filter).toHaveBeenCalled();
    expect((db.schedules as any).modify).toHaveBeenCalledWith({ subjectId: undefined });
    expect(db.subjects.delete).toHaveBeenCalledWith('1');
  });

  it('assigns every class student without duplicating existing enrollment', async () => {
    vi.mocked(db.subjects.get)
      .mockResolvedValueOnce({
        id: 'subject-1',
        name: 'Math',
        assignedStudents: ['s1'],
      })
      .mockResolvedValueOnce({ id: 'c1', name: 'Class 1' });
    vi.mocked(db.students.toArray).mockResolvedValue([
      { id: 's1', classId: 'c1', name: 'Budi', nis: '101' },
      { id: 's2', classId: 'c1', name: 'Siti', nis: '102' },
    ]);

    await expect(assignClassToSubject('subject-1', 'c1')).resolves.toEqual(['s1', 's2']);
    expect(db.subjects.update).toHaveBeenCalledWith('subject-1', {
      assignedStudents: ['s1', 's2'],
    });
  });
});
