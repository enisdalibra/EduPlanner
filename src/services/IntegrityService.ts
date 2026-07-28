import {
  db,
  type Attendance,
  type Class,
  type EduPlannerDB,
  type Grade,
  type Note,
  type Profile,
  type Schedule,
  type Student,
  type StudentNote,
  type Subject,
  type Task,
  type TeachingSession,
} from '@/db/database';

export const INTEGRITY_TABLE_NAMES = [
  'profile',
  'subjects',
  'classes',
  'students',
  'attendances',
  'grades',
  'notes',
  'tasks',
  'teachingSessions',
  'studentNotes',
  'schedules',
] as const;

export type IntegrityTableName = (typeof INTEGRITY_TABLE_NAMES)[number];
export type IntegrityIssueKind = 'orphan' | 'mismatch' | 'duplicate';

export interface IntegrityIssue {
  kind: IntegrityIssueKind;
  table: IntegrityTableName;
  recordId: string;
  field: string;
  message: string;
  referencedId?: string;
  duplicateOf?: string;
}

export interface IntegrityReport {
  checkedAt: Date;
  scannedRecords: number;
  isHealthy: boolean;
  summary: Record<IntegrityIssueKind, number> & { total: number };
  issues: IntegrityIssue[];
}

export interface IntegritySnapshot {
  profile: Profile[];
  subjects: Subject[];
  classes: Class[];
  students: Student[];
  attendances: Attendance[];
  grades: Grade[];
  notes: Note[];
  tasks: Task[];
  teachingSessions: TeachingSession[];
  studentNotes: StudentNote[];
  schedules: Schedule[];
}

type ReferencedTable = 'classes' | 'students' | 'subjects' | 'notes';

function compositeKey(parts: Array<string | undefined>): string {
  return JSON.stringify(parts.map((part) => part ?? null));
}

function addOrphan(
  issues: IntegrityIssue[],
  table: IntegrityTableName,
  recordId: string,
  field: string,
  referencedId: string | undefined,
  referencedTable: ReferencedTable,
  validIds: Set<string>,
): void {
  if (referencedId !== undefined && !validIds.has(referencedId)) {
    issues.push({
      kind: 'orphan',
      table,
      recordId,
      field,
      referencedId,
      message: `${table}.${field} references missing ${referencedTable} record "${referencedId}".`,
    });
  }
}

function addDuplicate(
  issues: IntegrityIssue[],
  table: IntegrityTableName,
  recordId: string,
  field: string,
  key: string,
  seen: Map<string, string>,
): void {
  const duplicateOf = seen.get(key);
  if (duplicateOf) {
    issues.push({
      kind: 'duplicate',
      table,
      recordId,
      field,
      duplicateOf,
      message: `${table} record "${recordId}" duplicates ${field} from record "${duplicateOf}".`,
    });
    return;
  }
  seen.set(key, recordId);
}

function checkStudentDuplicates(students: Student[], issues: IntegrityIssue[]): void {
  const seenNis = new Map<string, string>();
  for (const student of students) {
    addDuplicate(
      issues,
      'students',
      student.id,
      'nis',
      student.nis.trim().toLocaleLowerCase(),
      seenNis,
    );
  }
}

function checkSubjectAssignments(subjects: Subject[], studentIds: Set<string>, issues: IntegrityIssue[]): void {
  for (const subject of subjects) {
    const seenAssignments = new Set<string>();
    for (const studentId of subject.assignedStudents ?? []) {
      addOrphan(
        issues,
        'subjects',
        subject.id,
        'assignedStudents',
        studentId,
        'students',
        studentIds,
      );
      if (seenAssignments.has(studentId)) {
        issues.push({
          kind: 'duplicate',
          table: 'subjects',
          recordId: subject.id,
          field: 'assignedStudents',
          referencedId: studentId,
          duplicateOf: subject.id,
          message: `subjects record "${subject.id}" assigns student "${studentId}" more than once.`,
        });
      }
      seenAssignments.add(studentId);
    }
  }
}

function checkStudentClassMismatch(
  table: 'attendances' | 'grades',
  record: Attendance | Grade,
  studentsById: Map<string, Student>,
  classIds: Set<string>,
  issues: IntegrityIssue[],
): void {
  const student = studentsById.get(record.studentId);
  if (student && classIds.has(record.classId) && student.classId !== record.classId) {
    issues.push({
      kind: 'mismatch',
      table,
      recordId: record.id,
      field: 'classId',
      referencedId: record.classId,
      message: `${table} record "${record.id}" belongs to class "${record.classId}", but student "${student.id}" belongs to class "${student.classId}".`,
    });
  }
}

export function checkIntegritySnapshot(snapshot: IntegritySnapshot): IntegrityReport {
  const issues: IntegrityIssue[] = [];
  const classIds = new Set(snapshot.classes.map(({ id }) => id));
  const studentIds = new Set(snapshot.students.map(({ id }) => id));
  const subjectIds = new Set(snapshot.subjects.map(({ id }) => id));
  const noteIds = new Set(snapshot.notes.map(({ id }) => id));
  const studentsById = new Map(snapshot.students.map((student) => [student.id, student]));

  for (const student of snapshot.students) {
    addOrphan(issues, 'students', student.id, 'classId', student.classId, 'classes', classIds);
  }
  checkStudentDuplicates(snapshot.students, issues);
  checkSubjectAssignments(snapshot.subjects, studentIds, issues);

  const attendanceKeys = new Map<string, string>();
  for (const attendance of snapshot.attendances) {
    addOrphan(issues, 'attendances', attendance.id, 'classId', attendance.classId, 'classes', classIds);
    addOrphan(issues, 'attendances', attendance.id, 'studentId', attendance.studentId, 'students', studentIds);
    addOrphan(issues, 'attendances', attendance.id, 'subjectId', attendance.subjectId, 'subjects', subjectIds);
    checkStudentClassMismatch('attendances', attendance, studentsById, classIds, issues);
    addDuplicate(
      issues,
      'attendances',
      attendance.id,
      'classId+studentId+subjectId+date',
      compositeKey([attendance.classId, attendance.studentId, attendance.subjectId, attendance.date]),
      attendanceKeys,
    );
  }

  const gradeKeys = new Map<string, string>();
  for (const grade of snapshot.grades) {
    addOrphan(issues, 'grades', grade.id, 'classId', grade.classId, 'classes', classIds);
    addOrphan(issues, 'grades', grade.id, 'studentId', grade.studentId, 'students', studentIds);
    addOrphan(issues, 'grades', grade.id, 'subjectId', grade.subjectId, 'subjects', subjectIds);
    checkStudentClassMismatch('grades', grade, studentsById, classIds, issues);
    addDuplicate(
      issues,
      'grades',
      grade.id,
      'classId+studentId+subjectId+evaluationName',
      compositeKey([grade.classId, grade.studentId, grade.subjectId, grade.evaluationName.trim()]),
      gradeKeys,
    );
  }

  for (const note of snapshot.notes) {
    addOrphan(issues, 'notes', note.id, 'classId', note.classId, 'classes', classIds);
    addOrphan(issues, 'notes', note.id, 'subjectId', note.subjectId, 'subjects', subjectIds);
  }
  for (const task of snapshot.tasks) {
    addOrphan(issues, 'tasks', task.id, 'classId', task.classId, 'classes', classIds);
    addOrphan(issues, 'tasks', task.id, 'subjectId', task.subjectId, 'subjects', subjectIds);
  }
  for (const session of snapshot.teachingSessions) {
    addOrphan(issues, 'teachingSessions', session.id, 'classId', session.classId, 'classes', classIds);
    addOrphan(issues, 'teachingSessions', session.id, 'subjectId', session.subjectId, 'subjects', subjectIds);
    addOrphan(issues, 'teachingSessions', session.id, 'noteId', session.noteId, 'notes', noteIds);
  }
  for (const studentNote of snapshot.studentNotes) {
    addOrphan(
      issues,
      'studentNotes',
      studentNote.id,
      'studentId',
      studentNote.studentId,
      'students',
      studentIds,
    );
  }
  for (const schedule of snapshot.schedules) {
    addOrphan(issues, 'schedules', schedule.id, 'classId', schedule.classId, 'classes', classIds);
    addOrphan(issues, 'schedules', schedule.id, 'subjectId', schedule.subjectId, 'subjects', subjectIds);
  }

  const summary = {
    orphan: issues.filter(({ kind }) => kind === 'orphan').length,
    mismatch: issues.filter(({ kind }) => kind === 'mismatch').length,
    duplicate: issues.filter(({ kind }) => kind === 'duplicate').length,
    total: issues.length,
  };

  return {
    checkedAt: new Date(),
    scannedRecords: Object.values(snapshot).reduce((total, records) => total + records.length, 0),
    isHealthy: issues.length === 0,
    summary,
    issues,
  };
}

export async function checkDatabaseIntegrity(database: EduPlannerDB = db): Promise<IntegrityReport> {
  const tables = INTEGRITY_TABLE_NAMES.map((tableName) => database.table(tableName));
  const snapshot = await database.transaction('r', tables, async (): Promise<IntegritySnapshot> => ({
    profile: await database.profile.toArray(),
    subjects: await database.subjects.toArray(),
    classes: await database.classes.toArray(),
    students: await database.students.toArray(),
    attendances: await database.attendances.toArray(),
    grades: await database.grades.toArray(),
    notes: await database.notes.toArray(),
    tasks: await database.tasks.toArray(),
    teachingSessions: await database.teachingSessions.toArray(),
    studentNotes: await database.studentNotes.toArray(),
    schedules: await database.schedules.toArray(),
  }));

  return checkIntegritySnapshot(snapshot);
}
