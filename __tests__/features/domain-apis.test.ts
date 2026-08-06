import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  classGet: vi.fn(),
  subjectGet: vi.fn(),
  noteGet: vi.fn(),
  taskGet: vi.fn(),
  taskAdd: vi.fn(),
  taskUpdate: vi.fn(),
  scheduleGet: vi.fn(),
  scheduleAdd: vi.fn(),
  sessionAdd: vi.fn(),
  profilePut: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock('@/db/database', () => ({
  db: {
    classes: { get: mocks.classGet },
    subjects: { get: mocks.subjectGet },
    notes: { get: mocks.noteGet },
    tasks: { get: mocks.taskGet, add: mocks.taskAdd, update: mocks.taskUpdate },
    schedules: { get: mocks.scheduleGet, add: mocks.scheduleAdd },
    teachingSessions: { add: mocks.sessionAdd },
    profile: { put: mocks.profilePut },
    transaction: mocks.transaction,
  },
}));

import { createTask, toggleTaskStatus } from '@/features/calendar/api';
import { saveProfile } from '@/features/profile/api';
import { createSchedule } from '@/features/schedules/api';
import { recordTeachingSession } from '@/features/teaching/api';

describe('bounded feature mutation APIs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.transaction.mockImplementation(async (...args: unknown[]) => {
      const callback = args.at(-1) as () => Promise<unknown>;
      return callback();
    });
    mocks.classGet.mockResolvedValue({ id: 'c1', name: 'Class 1' });
    mocks.subjectGet.mockResolvedValue({ id: 'subject-1', name: 'Math' });
    mocks.noteGet.mockResolvedValue({ id: 'note-1', title: 'Material' });
  });

  it('validates task relations and owns task status changes', async () => {
    const task = await createTask({
      title: 'Prepare lesson',
      date: '2026-07-20',
      classId: 'c1',
      status: 'pending',
    });
    expect(mocks.taskAdd).toHaveBeenCalledWith(task);

    mocks.taskGet.mockResolvedValue(task);
    await expect(toggleTaskStatus(task.id)).resolves.toBe('completed');
    expect(mocks.taskUpdate).toHaveBeenCalledWith(task.id, { status: 'completed' });
  });

  it('validates schedule relations before storing a schedule', async () => {
    const schedule = await createSchedule({
      classId: 'c1',
      subjectId: 'subject-1',
      recurrenceType: 'weekly',
      dayOfWeek: 1,
      startTime: '08:00',
      endTime: '09:00',
      startDate: '2026-07-20',
      notificationEarlyMinutes: 15,
    });
    expect(mocks.scheduleAdd).toHaveBeenCalledWith(schedule);
  });

  it('records teaching sessions only after validating related entities', async () => {
    const session = await recordTeachingSession({
      classId: 'c1',
      subjectId: 'subject-1',
      noteId: 'note-1',
      date: '2026-07-20',
      startTime: 100,
      endTime: 200,
      durationMinutes: 2,
    });
    expect(mocks.sessionAdd).toHaveBeenCalledWith(session);
  });

  it('finishes a teaching session that started before its class was archived', async () => {
    mocks.classGet.mockResolvedValue({
      id: 'c1',
      name: 'Class 1',
      archivedAt: new Date(150).toISOString(),
    });

    await expect(recordTeachingSession({
      classId: 'c1',
      date: '2026-07-20',
      startTime: 100,
      endTime: 200,
      durationMinutes: 2,
    })).resolves.toBeDefined();
    expect(mocks.sessionAdd).toHaveBeenCalledOnce();
  });

  it('rejects a teaching session started after its class was archived', async () => {
    mocks.classGet.mockResolvedValue({
      id: 'c1',
      name: 'Class 1',
      archivedAt: new Date(50).toISOString(),
    });

    await expect(recordTeachingSession({
      classId: 'c1',
      date: '2026-07-20',
      startTime: 100,
      endTime: 200,
      durationMinutes: 2,
    })).rejects.toThrow(/archived/);
    expect(mocks.sessionAdd).not.toHaveBeenCalled();
  });

  it('normalizes profile fields in the profile API', async () => {
    const profile = await saveProfile({
      name: '  Guru  ',
      school: '  SMA 1  ',
      email: ' guru@example.com ',
    });
    expect(profile).toMatchObject({ name: 'Guru', school: 'SMA 1', email: 'guru@example.com' });
    expect(mocks.profilePut).toHaveBeenCalledWith(profile);
  });
});
