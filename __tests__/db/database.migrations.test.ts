import Dexie from 'dexie';
import { afterEach, describe, expect, it } from 'vitest';
import { CURRENT_DATABASE_VERSION, EduPlannerDB } from '@/db/database';

describe('EduPlannerDB migrations', () => {
  const databaseNames: string[] = [];

  afterEach(async () => {
    await Promise.all(databaseNames.splice(0).map((name) => Dexie.delete(name)));
  });

  it('upgrades a populated v1 database to the latest schema without losing data', async () => {
    const databaseName = `migration-v1-${crypto.randomUUID()}`;
    databaseNames.push(databaseName);
    const legacy = new Dexie(databaseName);
    legacy.version(1).stores({
      classes: 'id, name',
      students: 'id, classId, name',
      attendances: 'id, [classId+date], studentId',
      grades: 'id, [classId+evaluationName], studentId',
      notes: 'id, classId, type',
      tasks: 'id, date, status',
    });
    await legacy.open();
    await legacy.transaction('rw', legacy.tables, async () => {
      await legacy.table('classes').add({ id: 'class-1', name: 'Class 1' });
      await legacy.table('students').add({
        id: 'student-1',
        classId: 'class-1',
        name: 'Budi',
        nis: '1001',
      });
      await legacy.table('attendances').add({
        id: 'attendance-1',
        classId: 'class-1',
        studentId: 'student-1',
        date: '2026-07-19',
        status: 'hadir',
      });
      await legacy.table('grades').add({
        id: 'grade-1',
        classId: 'class-1',
        studentId: 'student-1',
        evaluationName: 'Quiz 1',
        score: 90,
      });
      await legacy.table('notes').add({
        id: 'note-1',
        classId: 'class-1',
        title: 'Note',
        content: 'Content',
        type: 'guru',
        createdAt: new Date('2026-07-19T00:00:00.000Z'),
      });
      await legacy.table('tasks').add({
        id: 'task-1',
        title: 'Task',
        date: '2026-07-19',
        status: 'pending',
      });
    });
    legacy.close();

    const current = new EduPlannerDB(databaseName);
    await current.open();

    expect(current.verno).toBe(CURRENT_DATABASE_VERSION);
    expect(current.tables.map(({ name }) => name).sort()).toEqual([
      'attendances',
      'classes',
      'grades',
      'notes',
      'profile',
      'schedules',
      'studentNotes',
      'students',
      'subjects',
      'tasks',
      'teachingSessions',
    ]);
    expect(await current.classes.get('class-1')).toMatchObject({ name: 'Class 1' });
    expect(await current.students.get('student-1')).toMatchObject({ nis: '1001' });
    expect(await current.attendances.get('attendance-1')).toMatchObject({ status: 'hadir' });
    expect(await current.grades.get('grade-1')).toMatchObject({ score: 90 });
    expect(await current.notes.get('note-1')).toMatchObject({ title: 'Note' });
    expect(await current.tasks.get('task-1')).toMatchObject({ title: 'Task' });

    expect(current.students.schema.indexes.map(({ name }) => name)).toEqual(
      expect.arrayContaining(['nis', '[classId+name]']),
    );
    expect(current.attendances.schema.indexes.map(({ name }) => name)).toEqual(
      expect.arrayContaining(['date', '[classId+subjectId+date]']),
    );
    expect(current.grades.schema.indexes.map(({ name }) => name)).toContain('[classId+subjectId]');
    expect(current.notes.schema.indexes.map(({ name }) => name)).toContain('[classId+type]');
    expect(current.tasks.schema.indexes.map(({ name }) => name)).toContain('[classId+date]');
    expect(current.schedules.schema.indexes.map(({ name }) => name)).toEqual(
      expect.arrayContaining(['classId', 'recurrenceType', 'startDate']),
    );

    current.close();
  });
});
