import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getGradesByClass,
  saveGrade,
  getEvaluationsForClass,
  renameEvaluation,
} from '@/features/grades/api';
import { db } from '@/db/database';
import { INPUT_LIMITS } from '@/lib/validation';

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
    grades: {
      where: vi.fn().mockReturnThis(),
      equals: vi.fn().mockReturnThis(),
      between: vi.fn().mockReturnThis(),
      filter: vi.fn().mockReturnThis(),
      toArray: vi.fn(),
      put: vi.fn(),
      add: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    }
    ,
    transaction: vi.fn(async (...args) => {
      const callback = args.at(-1) as () => Promise<unknown>;
      return callback();
    }),
  }
}));

describe('Grades API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should get grades by class', async () => {
    vi.mocked(db.grades.toArray).mockResolvedValue([{ id: '1', score: 90 }] as any);
    const result = await getGradesByClass('c1');
    expect(result).toEqual([{ id: '1', score: 90 }]);
    expect(db.grades.where).toHaveBeenCalledWith('classId');
  });

  it('should save a grade', async () => {
    vi.mocked(db.grades.toArray).mockResolvedValue([] as any);
    await saveGrade('c1', 's1', 'Midterm', 95);
    expect(db.grades.add).toHaveBeenCalled();
  });

  it('should get unique evaluations for a class', async () => {
    const mockGrades = [
      { evaluationName: 'Quiz 1' },
      { evaluationName: 'Quiz 1' },
      { evaluationName: 'Midterm' }
    ];
    vi.mocked(db.grades.toArray).mockResolvedValue(mockGrades as any);
    const result = await getEvaluationsForClass('c1');
    expect(result).toEqual(['Midterm', 'Quiz 1']);
  });

  it('normalizes and validates the target name before an atomic rename', async () => {
    vi.mocked(db.grades.toArray)
      .mockResolvedValueOnce([
        {
          id: 'grade-1',
          classId: 'c1',
          studentId: 's1',
          evaluationName: 'Quiz',
          score: 90,
        },
      ] as any)
      .mockResolvedValueOnce([] as any);

    await expect(
      renameEvaluation('c1', ' Quiz ', ' Final '),
    ).resolves.toBe(1);
    expect(db.transaction).toHaveBeenCalled();
    expect(db.grades.update).toHaveBeenCalledWith('grade-1', {
      evaluationName: 'Final',
    });

    vi.clearAllMocks();
    await expect(
      renameEvaluation(
        'c1',
        'Quiz',
        'x'.repeat(INPUT_LIMITS.entityName + 1),
      ),
    ).rejects.toThrow(/must not exceed/);
    expect(db.transaction).not.toHaveBeenCalled();
  });
});
