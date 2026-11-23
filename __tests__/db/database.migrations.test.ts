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
      await legacy.table('notes').add({
        id: 'material-1',
        classId: 'class-1',
        title: 'Shared material',
        content: 'Content',
        type: 'materi',
        isTaught: true,
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
      'academicPeriods',
      'attendances',
      'classEnrollments',
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
    expect(await current.classEnrollments.where('[classId+studentId]').equals(['class-1', 'student-1']).first()).toBeDefined();
    expect((await current.classes.get('class-1'))?.academicPeriodId).toBeTruthy();
    expect(await current.attendances.get('attendance-1')).toMatchObject({ status: 'hadir' });
    expect(await current.grades.get('grade-1')).toMatchObject({ score: 90 });
    expect(await current.notes.get('note-1')).toMatchObject({ title: 'Note' });
    expect(await current.notes.get('material-1')).toMatchObject({
      classIds: ['class-1'],
      taughtClassIds: ['class-1'],
    });
    expect((await current.notes.get('material-1'))?.classId).toBeUndefined();
    expect(await current.tasks.get('task-1')).toMatchObject({ title: 'Task' });

    expect(current.students.schema.indexes.map(({ name }) => name)).toContain('nis');
    expect(current.attendances.schema.indexes.map(({ name }) => name)).toEqual(
      expect.arrayContaining(['date', '[classId+subjectId+date]']),
    );
    expect(current.grades.schema.indexes.map(({ name }) => name)).toContain('[classId+subjectId]');
    expect(current.notes.schema.indexes.map(({ name }) => name)).toContain('[classId+type]');
    expect(current.notes.schema.indexes.map(({ name }) => name)).toContain('classIds');
    expect(current.subjects.schema.indexes.map(({ name }) => name)).toContain('classIds');
    expect(current.tasks.schema.indexes.map(({ name }) => name)).toContain('[classId+date]');
    expect(current.schedules.schema.indexes.map(({ name }) => name)).toEqual(
      expect.arrayContaining(['classId', 'recurrenceType', 'startDate']),
    );

    current.close();
  });

  it('backfills subject.classIds from active student enrollments when upgrading from v9 to v10', async () => {
    const databaseName = `migration-v9-${crypto.randomUUID()}`;
    databaseNames.push(databaseName);
    const v9 = new Dexie(databaseName);
    v9.version(9).stores({
      profile: 'id',
      subjects: 'id, name',
      academicPeriods: 'id, name, isActive, startDate, endDate',
      classes: 'id, academicPeriodId, archivedAt, name',
      students: 'id, name, nis',
      classEnrollments: 'id, &[classId+studentId], classId, studentId, endedAt',
      attendances: 'id, [classId+date], [classId+subjectId+date], studentId, subjectId, classId, date',
      grades: 'id, [classId+evaluationName], [classId+subjectId+evaluationName], [classId+subjectId], studentId, subjectId, classId',
      notes: 'id, classId, *classIds, subjectId, type, [classId+type]',
      tasks: 'id, date, status, classId, subjectId, [classId+date]',
      teachingSessions: 'id, classId, subjectId, date, [classId+subjectId]',
      studentNotes: 'id, studentId',
      schedules: 'id, classId, recurrenceType, startDate',
    });
    await v9.open();
    await v9.transaction('rw', [v9.table('academicPeriods'), v9.table('classes'), v9.table('students'), v9.table('classEnrollments'), v9.table('subjects')], async () => {
      await v9.table('academicPeriods').add({ id: 'p1', name: '2026/2027', startDate: '2026-07-01', endDate: '2027-06-30', isActive: true });
      await v9.table('classes').bulkAdd([
        { id: 'c1', name: 'Kelas XA', academicPeriodId: 'p1' },
        { id: 'c2', name: 'Kelas XB', academicPeriodId: 'p1' },
      ]);
      await v9.table('students').bulkAdd([
        { id: 's1', name: 'Siswa Contoh 01', nis: 'DEMO-0001' },
        { id: 's2', name: 'Siswa Contoh 02', nis: 'DEMO-0002' },
      ]);
      await v9.table('classEnrollments').bulkAdd([
        { id: 'e1', classId: 'c1', studentId: 's1', enrolledAt: '2026-07-01' },
        { id: 'e2', classId: 'c2', studentId: 's2', enrolledAt: '2026-07-01', endedAt: '2026-08-01' },
      ]);
      await v9.table('subjects').add({
        id: 'subj-1',
        name: 'Informatika',
        assignedStudents: ['s1', 's2'],
      });
    });
    v9.close();

    const current = new EduPlannerDB(databaseName);
    await current.open();

    const migrated = await current.subjects.get('subj-1');
    expect(migrated?.classIds).toEqual(['c1']);
    current.close();
  });
});
