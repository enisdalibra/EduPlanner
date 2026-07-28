import Dexie, { type Table } from 'dexie';

export const CURRENT_DATABASE_VERSION = 7;
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
}

export interface Student { 
  id: string; 
  classId: string; 
  name: string; 
  nis: string; 
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
  subjectId?: string;
  title: string; 
  content: string; 
  type: 'guru' | 'materi' | 'evaluasi'; 
  createdAt: Date; 
  isTaught?: boolean;
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

    this.version(CURRENT_DATABASE_VERSION).stores({
      schedules: 'id, classId, recurrenceType, startDate'
    });
  }
}

export const db = new EduPlannerDB();


