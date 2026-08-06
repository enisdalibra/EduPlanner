import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getClasses, getClass, createClass, updateClass } from '@/features/classes/api';
import { db } from '@/db/database';

vi.mock('@/db/database', () => {
  const mockTable = {
    where: vi.fn().mockReturnThis(),
    equals: vi.fn().mockReturnThis(),
    anyOf: vi.fn().mockReturnThis(),
    delete: vi.fn(),
    modify: vi.fn(),
    toArray: vi.fn(),
    get: vi.fn(),
    add: vi.fn(),
    update: vi.fn(),
    sortBy: vi.fn(),
    bulkAdd: vi.fn(),
    filter: vi.fn().mockReturnThis(),
    first: vi.fn(),
  };

  return {
    db: {
      classes: { ...mockTable },
      students: { ...mockTable },
      academicPeriods: { ...mockTable },
      classEnrollments: { ...mockTable },
      attendances: { ...mockTable },
      grades: { ...mockTable },
      notes: { ...mockTable },
      tasks: { ...mockTable },
      teachingSessions: { ...mockTable },
      studentNotes: { ...mockTable },
      transaction: vi.fn(async (...args) => {
        const cb = args[args.length - 1];
        return cb();
      }),
    }
  };
});

describe('Classes API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(db.academicPeriods.get).mockResolvedValue({ id: 'period-1', name: '2026/2027', startDate: '2026-07-01', endDate: '2027-06-30', isActive: true });
  });

  it('should exclude archived classes by default', async () => {
    const mockData = [
      { id: '1', name: 'Class 1' },
      { id: '2', name: 'Archived Class', archivedAt: '2026-08-06T00:00:00.000Z' },
    ];
    vi.mocked(db.classes.toArray).mockResolvedValue(mockData as any);
    
    const result = await getClasses();
    expect(result).toEqual([mockData[0]]);
    expect(db.classes.toArray).toHaveBeenCalled();
  });

  it('should include archived classes only when explicitly requested', async () => {
    const mockData = [
      { id: '1', name: 'Class 1' },
      { id: '2', name: 'Archived Class', archivedAt: '2026-08-06T00:00:00.000Z' },
    ];
    vi.mocked(db.classes.toArray).mockResolvedValue(mockData as any);

    await expect(getClasses({ includeArchived: true })).resolves.toEqual(mockData);
  });

  it('should fetch class by id', async () => {
    const mockData = { id: '1', name: 'Class 1' };
    vi.mocked(db.classes.get).mockResolvedValue(mockData as any);
    
    const result = await getClass('1');
    expect(result).toEqual(mockData);
    expect(db.classes.get).toHaveBeenCalledWith('1');
  });

  it('should create a class', async () => {
    const result = await createClass('Class 1', 'Desc', 'period-1');
    expect(result).toHaveProperty('name', 'Class 1');
    expect(db.classes.add).toHaveBeenCalled();
  });

  it('should update a class', async () => {
    vi.mocked(db.classes.update).mockResolvedValue(1);
    vi.mocked(db.classes.get).mockResolvedValue({ id: '1', name: 'Class 1', description: 'Desc', academicPeriodId: 'period-1' });
    const result = await updateClass('1', 'Class 1 Updated', 'Desc Updated');
    expect(result).toBe(1);
    expect(db.classes.update).toHaveBeenCalledWith('1', { name: 'Class 1 Updated', description: 'Desc Updated' });
  });

});
