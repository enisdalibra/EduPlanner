import Dexie, { type Table } from 'dexie';

export const CURRENT_DATABASE_VERSION = 9;
export const DEFAULT_DATABASE_NAME = 'EduPlannerDB';

export interface Profile {
  id: string;
  name: string;
  school: string;
  role?: string;
  email?: string;
  avatar?: string;
}

export interface Subject {
  id: string;
  name: string;
  description?: string;
  assignedStudents?: string[]; // IDs of the students enrolled
}

export interface Class { 
  id: string; 
  name: string; 
  description?: string; 
  academicPeriodId: string;
  archivedAt?: string;
}

export interface Student { 
  id: string; 
  name: string; 
  nis: string; 
}

export interface AcademicPeriod {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
}

export interface ClassEnrollment {
  id: string;
  studentId: string;
  classId: string;
  enrolledAt: string;
  endedAt?: string;
}

export interface Attendance { 
  id: string; 
  classId: string; 
  studentId: string; 
  subjectId?: string;
  date: string; 
  status: 'hadir' | 'sakit' | 'izin' | 'alpa'; 
}

export interface Grade { 
  id: string; 
  classId: string; 
  studentId: string;
  subjectId?: string; 
  evaluationName: string; 
  score: number; 
}

export interface Note { 
  id: string; 
  classId?: string; 
  /** Classes that can access a teaching material. Empty means general/unassigned. */
  classIds?: string[];
  subjectId?: string;
  title: string; 
  content: string; 
  type: 'guru' | 'materi' | 'evaluasi'; 
  createdAt: Date; 
  isTaught?: boolean;
  /** Per-class teaching progress for shared materials. */
  taughtClassIds?: string[];
}

export interface Task { 
  id: string; 
  title: string; 
  date: string; 
  startTime?: string;
  endTime?: string;
  deadline?: string;
  description?: string;
  tags?: string[];
  classId?: string;
  subjectId?: string;
  status: 'pending' | 'completed'; 
}

export interface TeachingSession {
  id: string;
  classId: string;
  subjectId?: string;
  noteId?: string;
  date: string;
  startTime: number;
  endTime: number;
  durationMinutes: number;
}

export interface Schedule {
  id: string;
  classId: string;
  subjectId?: string;
  dayOfWeek?: number; // 0-6
  dayOfMonth?: number; // 1-31
  startTime: string; // "HH:MM"
  endTime: string; // "HH:MM"
  recurrenceType: 'daily' | 'weekly' | 'monthly';
  recurrenceCount?: number;
  endDate?: string;
  startDate: string; // "YYYY-MM-DD"
  notificationEarlyMinutes: number; // 0 for off
}

export interface StudentNote {
  id: string;
  studentId: string;
  content: string;
  createdAt: Date;
}

export class EduPlannerDB extends Dexie {
  profile!: Table<Profile, string>;
  subjects!: Table<Subject, string>;
  classes!: Table<Class, string>;
  students!: Table<Student, string>;
  academicPeriods!: Table<AcademicPeriod, string>;
  classEnrollments!: Table<ClassEnrollment, string>;
  attendances!: Table<Attendance, string>;
  grades!: Table<Grade, string>;
  notes!: Table<Note, string>;
  tasks!: Table<Task, string>;
  teachingSessions!: Table<TeachingSession, string>;
  studentNotes!: Table<StudentNote, string>;
  schedules!: Table<Schedule, string>;

  constructor(databaseName = DEFAULT_DATABASE_NAME) {
    super(databaseName);
    
    this.version(1).stores({
      classes: 'id, name',
      students: 'id, classId, name',
      attendances: 'id, [classId+date], studentId', 
      grades: 'id, [classId+evaluationName], studentId',
      notes: 'id, classId, type',
      tasks: 'id, date, status'
    });

    this.version(2).stores({
      profile: 'id',
      subjects: 'id, name',
      attendances: 'id, [classId+date], [classId+subjectId+date], studentId, subjectId', 
      grades: 'id, [classId+evaluationName], [classId+subjectId+evaluationName], studentId, subjectId',
      notes: 'id, classId, subjectId, type',
      tasks: 'id, date, status, classId, subjectId'
    });

    this.version(3).stores({
      teachingSessions: 'id, classId, subjectId, date, [classId+subjectId]'
    });

    this.version(4).stores({
      studentNotes: 'id, studentId'
    });

    // Version 5: Comprehensive index optimization for frequent query patterns
    // Attendance: compound indexes for class+date and class+subject+date filtering
    // Grades: compound index for class+subject queries (used heavily in gradebook)
    // Notes: [classId+type] compound for filtered note queries by class & type
    // Tasks: [classId+date] compound for calendar date-range queries by class
    // Students: nis index for NIS lookups, [classId+name] for sorted class rosters
    this.version(5).stores({
      attendances: 'id, [classId+date], [classId+subjectId+date], studentId, subjectId, classId',
      grades: 'id, [classId+evaluationName], [classId+subjectId+evaluationName], [classId+subjectId], studentId, subjectId, classId',
      notes: 'id, classId, subjectId, type, [classId+type]',
      tasks: 'id, date, status, classId, subjectId, [classId+date]',
      students: 'id, classId, name, nis, [classId+name]'
    });

    this.version(6).stores({
      attendances: 'id, [classId+date], [classId+subjectId+date], studentId, subjectId, classId, date'
    });

    this.version(7).stores({
      schedules: 'id, classId, recurrenceType, startDate'
    });

    this.version(8).stores({
      academicPeriods: 'id, name, isActive, startDate, endDate',
      classes: 'id, academicPeriodId, archivedAt, name',
      students: 'id, name, nis',
      classEnrollments: 'id, &[classId+studentId], classId, studentId, endedAt',
    }).upgrade(async (transaction) => {
      const now = new Date();
      const academicYearStart = now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1;
      const periodId = crypto.randomUUID();
      const formatDate = (date: Date) => date.toISOString().slice(0, 10);

      await transaction.table('academicPeriods').add({
        id: periodId,
        name: 'Periode Saat Ini',
        startDate: formatDate(new Date(academicYearStart, 6, 1)),
        endDate: formatDate(new Date(academicYearStart + 1, 5, 30)),
        isActive: true,
      });

      await transaction.table('classes').toCollection().modify((cls: Record<string, unknown>) => {
        cls.academicPeriodId = periodId;
      });

      const legacyStudents = await transaction.table('students').toArray() as Array<{
        id: string;
        classId?: string;
      }>;
      const classIds = new Set(
        (await transaction.table('classes').toArray() as Array<{ id: string }>).map(({ id }) => id),
      );
      const enrollments = legacyStudents
        .filter((student) => student.classId && classIds.has(student.classId))
        .map((student) => ({
          id: crypto.randomUUID(),
          studentId: student.id,
          classId: student.classId,
          enrolledAt: formatDate(new Date(academicYearStart, 6, 1)),
        }));
      if (enrollments.length > 0) {
        await transaction.table('classEnrollments').bulkAdd(enrollments);
      }
      await transaction.table('students').toCollection().modify((student: Record<string, unknown>) => {
        delete student.classId;
      });
    });

    // Version 9: a teaching material can be shared with multiple classes.
    this.version(CURRENT_DATABASE_VERSION).stores({
      notes: 'id, classId, *classIds, subjectId, type, [classId+type]',
    }).upgrade(async (transaction) => {
      await transaction.table('notes').toCollection().modify((note: Note) => {
        if (note.type !== 'materi') return;
        note.classIds = note.classIds ?? (note.classId ? [note.classId] : []);
        note.taughtClassIds = note.taughtClassIds ?? (
          note.isTaught && note.classId ? [note.classId] : []
        );
        delete note.classId;
        delete note.isTaught;
      });
    });
  }
}

export const db = new EduPlannerDB();


