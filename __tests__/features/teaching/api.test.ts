import { beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '@/db/database';
import { DomainNotFoundError } from '@/lib/domainErrors';
import {
  recordTeachingSession,
  getTeachingSessions,
  deleteTeachingSession,
} from '@/features/teaching/api';

const mocks = vi.hoisted(() => ({
  classGet: vi.fn(),
  subjectGet: vi.fn(),
  noteGet: vi.fn(),
  sessionAdd: vi.fn(),
  sessionGet: vi.fn(),
  sessionDelete: vi.fn(),
  reverse: vi.fn(),
  sortBy: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock('@/db/database', () => ({
  db: {
    classes: { get: mocks.classGet },
    subjects: { get: mocks.subjectGet },
    notes: { get: mocks.noteGet },
    teachingSessions: {
      add: mocks.sessionAdd,
      get: mocks.sessionGet,
      delete: mocks.sessionDelete,
      reverse: mocks.reverse,
    },
    transaction: mocks.transaction,
  },
}));

describe('Teaching API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.transaction.mockImplementation(async (...args: unknown[]) => {
      const callback = args.at(-1) as () => Promise<unknown>;
      return callback();
    });
    mocks.classGet.mockResolvedValue({ id: 'c1', name: 'Class 1' });
    mocks.subjectGet.mockResolvedValue({ id: 's1', name: 'Math' });
    mocks.noteGet.mockResolvedValue({ id: 'n1', title: 'Calculus' });
    mocks.reverse.mockReturnValue({
      sortBy: mocks.sortBy,
    });
  });

  describe('recordTeachingSession', () => {
    it('creates and adds a valid teaching session', async () => {
      const session = await recordTeachingSession({
        classId: 'c1',
        subjectId: 's1',
        noteId: 'n1',
        date: '2026-08-21',
        startTime: 1000,
        endTime: 2000,
        durationMinutes: 60,
      });

      expect(session).toMatchObject({
        classId: 'c1',
        subjectId: 's1',
        noteId: 'n1',
        date: '2026-08-21',
        startTime: 1000,
        endTime: 2000,
        durationMinutes: 60,
      });
      expect(mocks.sessionAdd).toHaveBeenCalledWith(session);
    });

    it('rejects session if subject does not exist', async () => {
      mocks.subjectGet.mockResolvedValue(undefined);

      await expect(
        recordTeachingSession({
          classId: 'c1',
          subjectId: 'non-existent-subject',
          date: '2026-08-21',
          startTime: 1000,
          endTime: 2000,
          durationMinutes: 60,
        })
      ).rejects.toThrow(DomainNotFoundError);
    });

    it('rejects session if note does not exist', async () => {
      mocks.noteGet.mockResolvedValue(undefined);

      await expect(
        recordTeachingSession({
          classId: 'c1',
          noteId: 'non-existent-note',
          date: '2026-08-21',
          startTime: 1000,
          endTime: 2000,
          durationMinutes: 60,
        })
      ).rejects.toThrow(DomainNotFoundError);
    });
  });

  describe('getTeachingSessions', () => {
    it('retrieves teaching sessions sorted descending by startTime', async () => {
      const sampleSessions = [
        { id: '1', classId: 'c1', date: '2026-08-21', startTime: 2000, endTime: 3000, durationMinutes: 60 },
        { id: '2', classId: 'c1', date: '2026-08-20', startTime: 1000, endTime: 2000, durationMinutes: 60 },
      ];
      mocks.sortBy.mockResolvedValue(sampleSessions);

      const result = await getTeachingSessions();
      expect(mocks.reverse).toHaveBeenCalled();
      expect(mocks.sortBy).toHaveBeenCalledWith('startTime');
      expect(result).toEqual(sampleSessions);
    });
  });

  describe('deleteTeachingSession', () => {
    it('deletes an existing teaching session', async () => {
      mocks.sessionGet.mockResolvedValue({ id: 'ts-1', classId: 'c1' });

      await deleteTeachingSession('ts-1');
      expect(mocks.sessionGet).toHaveBeenCalledWith('ts-1');
      expect(mocks.sessionDelete).toHaveBeenCalledWith('ts-1');
    });

    it('throws DomainNotFoundError when deleting non-existent session', async () => {
      mocks.sessionGet.mockResolvedValue(undefined);

      await expect(deleteTeachingSession('unknown-id')).rejects.toThrow(
        DomainNotFoundError
      );
      expect(mocks.sessionDelete).not.toHaveBeenCalled();
    });
  });
});
