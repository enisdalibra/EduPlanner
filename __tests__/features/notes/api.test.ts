import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getNotes, createNote, updateNote, deleteNote } from '@/features/notes/api';
import { db } from '@/db/database';

vi.mock('@/db/database', () => ({
  db: {
    notes: {
      where: vi.fn().mockReturnThis(),
      equals: vi.fn().mockReturnThis(),
      reverse: vi.fn().mockReturnThis(),
      sortBy: vi.fn(),
      get: vi.fn(),
      add: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    classes: {
      get: vi.fn(),
    },
    subjects: {
      get: vi.fn(),
    },
    teachingSessions: {
      filter: vi.fn().mockReturnThis(),
      modify: vi.fn(),
    },
    transaction: vi.fn(async (...args: unknown[]) => {
      const callback = args.at(-1) as () => unknown;
      return callback();
    }),
  }
}));

describe('Notes API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(db.notes.get).mockResolvedValue({ id: '1' } as any);
  });

  it('should get notes by type', async () => {
    vi.mocked((db.notes as any).sortBy).mockResolvedValue([{ id: '1', type: 'guru' }] as any);
    const result = await getNotes('guru');
    expect(result).toEqual([{ id: '1', type: 'guru' }]);
    expect(db.notes.where).toHaveBeenCalledWith('type');
  });

  it('should create a note', async () => {
    const result = await createNote('Title', 'Content', 'guru');
    expect(result).toHaveProperty('title', 'Title');
    expect(db.notes.add).toHaveBeenCalled();
  });

  it('should update a note', async () => {
    await updateNote('1', { title: 'Updated Title' });
    expect(db.notes.update).toHaveBeenCalledWith('1', { title: 'Updated Title' });
  });

  it('should delete a note', async () => {
    await deleteNote('1');
    expect(db.teachingSessions.filter).toHaveBeenCalled();
    expect((db.teachingSessions as any).modify).toHaveBeenCalledWith({
      noteId: undefined,
    });
    expect(db.notes.delete).toHaveBeenCalledWith('1');
  });
});
