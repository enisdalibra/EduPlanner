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
  };

  return {
    db: {
      classes: { ...mockTable },
      students: { ...mockTable },
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
  });

  it('should fetch all classes', async () => {
    const mockData = [{ id: '1', name: 'Class 1' }];
    vi.mocked(db.classes.toArray).mockResolvedValue(mockData as any);
    
    const result = await getClasses();
    expect(result).toEqual(mockData);
    expect(db.classes.toArray).toHaveBeenCalled();
  });

  it('should fetch class by id', async () => {
    const mockData = { id: '1', name: 'Class 1' };
    vi.mocked(db.classes.get).mockResolvedValue(mockData as any);
    
    const result = await getClass('1');
    expect(result).toEqual(mockData);
    expect(db.classes.get).toHaveBeenCalledWith('1');
  });

  it('should create a class', async () => {
    const result = await createClass('Class 1', 'Desc');
    expect(result).toHaveProperty('name', 'Class 1');
    expect(db.classes.add).toHaveBeenCalled();
  });

  it('should update a class', async () => {
    vi.mocked(db.classes.update).mockResolvedValue(1);
    const result = await updateClass('1', 'Class 1 Updated', 'Desc Updated');
    expect(result).toBe(1);
    expect(db.classes.update).toHaveBeenCalledWith('1', { name: 'Class 1 Updated', description: 'Desc Updated' });
  });

});
