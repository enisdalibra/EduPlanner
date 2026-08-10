import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import { db } from '@/db/database';
import { createNote, deleteNote, updateNote } from '@/features/notes/api';
import { updateSubject } from '@/features/subjects/api';
import { checkDatabaseIntegrity } from '@/services/IntegrityService';
import { deleteTestDatabase, resetTestDatabase } from './testDatabase';

describe('referentially safe content and subject writes', () => {
  beforeEach(async () => {
    await resetTestDatabase();
    await db.classes.add({ id: 'class-a', name: 'Class A', academicPeriodId: 'period-test' });
    await db.students.add({
      id: 'student-a',
      name: 'Student A',
      nis: 'A-1',
    });
    await db.classEnrollments.add({ id: 'enrollment-a', classId: 'class-a', studentId: 'student-a', enrolledAt: '2026-07-01' });
    await db.subjects.add({ id: 'subject-a', name: 'Biology' });
  });

  afterAll(deleteTestDatabase);

  it('creates and updates notes only when optional parents exist', async () => {
    await expect(
      createNote(
        'Valid note',
        'Content',
        'materi',
        'class-a',
        'subject-a',
      ),
    ).resolves.toMatchObject({
      classIds: ['class-a'],
      subjectId: 'subject-a',
    });

    await expect(
      createNote('Missing class', '', 'guru', 'missing-class'),
    ).rejects.toThrow(/Class/);
    await expect(
      createNote('Missing subject', '', 'guru', undefined, 'missing-subject'),
    ).rejects.toThrow(/Subject/);
    expect(await db.notes.count()).toBe(1);

    const note = (await db.notes.toArray())[0];
    await expect(
      updateNote(note.id, { subjectId: 'missing-subject' }),
    ).rejects.toThrow(/Subject/);
    await expect(db.notes.get(note.id)).resolves.toMatchObject({
      subjectId: 'subject-a',
    });
  });

  it('saves and reloads one material for multiple specific classes', async () => {
    await db.classes.add({ id: 'class-b', name: 'Class B', academicPeriodId: 'period-test' });
    const material = await createNote('AI introduction', 'Content', 'materi');

    await updateNote(material.id, { classIds: ['class-a', 'class-b'] });

    expect(await db.notes.get(material.id)).toMatchObject({
      classIds: ['class-a', 'class-b'],
    });
    expect((await db.notes.where('classIds').equals('class-a').toArray()).map(({ id }) => id)).toContain(material.id);
    expect((await db.notes.where('classIds').equals('class-b').toArray()).map(({ id }) => id)).toContain(material.id);
  });

  it('keeps shared material editable when one assigned class is archived', async () => {
    const material = await createNote('Archived class material', 'Old content', 'materi', 'class-a');
    await db.classes.update('class-a', { archivedAt: new Date().toISOString() });

    await updateNote(material.id, { content: 'Updated content', classIds: ['class-a'] });

    expect(await db.notes.get(material.id)).toMatchObject({
      content: 'Updated content',
      classIds: ['class-a'],
    });
  });

  it('rejects missing or duplicate subject assignments without changing storage', async () => {
    await updateSubject('subject-a', { assignedStudents: ['student-a'] });
    await expect(db.subjects.get('subject-a')).resolves.toMatchObject({
      assignedStudents: ['student-a'],
    });

    await expect(
      updateSubject('subject-a', {
        assignedStudents: ['student-a', 'student-a'],
      }),
    ).rejects.toThrow(/duplicate/);
    await expect(
      updateSubject('subject-a', {
        assignedStudents: ['student-a', 'missing-student'],
      }),
    ).rejects.toThrow(/Student/);

    await expect(db.subjects.get('subject-a')).resolves.toMatchObject({
      assignedStudents: ['student-a'],
    });
  });

  it('preserves teaching history and removes its optional note link on deletion', async () => {
    const note = await createNote(
      'Lesson material',
      'Content',
      'materi',
      'class-a',
      'subject-a',
    );
    await db.teachingSessions.add({
      id: 'session-a',
      classId: 'class-a',
      subjectId: 'subject-a',
      noteId: note.id,
      date: '2026-07-28',
      startTime: 1,
      endTime: 2,
      durationMinutes: 1,
    });

    await deleteNote(note.id);

    expect(await db.notes.get(note.id)).toBeUndefined();
    const preservedSession = await db.teachingSessions.get('session-a');
    expect(preservedSession).toMatchObject({
      id: 'session-a',
      classId: 'class-a',
      subjectId: 'subject-a',
    });
    expect(preservedSession?.noteId).toBeUndefined();

    const integrity = await checkDatabaseIntegrity();
    expect(integrity.isHealthy).toBe(true);
    expect(integrity.summary.orphan).toBe(0);
  });
});
