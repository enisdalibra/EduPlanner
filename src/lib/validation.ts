import type {
  Attendance,
  Grade,
  Student,
  Class,
  Subject,
  Note,
  Profile,
  Schedule,
  StudentNote,
  Task,
  TeachingSession,
  AcademicPeriod,
  ClassEnrollment,
} from '@/db/database';

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export const INPUT_LIMITS = {
  personName: 120,
  identifier: 50,
  entityName: 120,
  title: 200,
  shortText: 120,
  description: 5_000,
  noteContent: 500_000,
  studentNote: 10_000,
  email: 254,
  url: 2_048,
  tag: 50,
  tagsPerTask: 20,
} as const;

function assertMaxLength(
  value: unknown,
  field: string,
  maximum: number,
): void {
  if (typeof value === 'string' && value.length > maximum) {
    throw new ValidationError(`${field} must not exceed ${maximum} characters`);
  }
}

export function validateStudent(student: Partial<Student>, isUpdate = false) {
  if (!isUpdate || student.name !== undefined) {
    if (!student.name || student.name.trim() === '') {
      throw new ValidationError('Student name is required');
    }
    assertMaxLength(student.name, 'Student name', INPUT_LIMITS.personName);
  }
  if (!isUpdate || student.nis !== undefined) {
    if (!student.nis || student.nis.trim() === '') {
      throw new ValidationError('Student NIS is required');
    }
    assertMaxLength(student.nis, 'Student NIS', INPUT_LIMITS.identifier);
  }
}

export function validateGrade(grade: Partial<Grade>, isUpdate = false) {
  if (!isUpdate || grade.studentId !== undefined) {
    if (!grade.studentId) {
      throw new ValidationError('Student ID is required for grade');
    }
  }
  if (!isUpdate || grade.classId !== undefined) {
    if (!grade.classId) {
      throw new ValidationError('Class ID is required for grade');
    }
  }
  if (!isUpdate || grade.evaluationName !== undefined) {
    if (!grade.evaluationName || grade.evaluationName.trim() === '') {
      throw new ValidationError('Evaluation name is required');
    }
    assertMaxLength(grade.evaluationName, 'Evaluation name', INPUT_LIMITS.entityName);
  }
  if (!isUpdate || grade.score !== undefined) {
    if (typeof grade.score !== 'number' || isNaN(grade.score)) {
      throw new ValidationError('Grade score must be a valid number');
    }
    if (grade.score < 0 || grade.score > 100) {
      throw new ValidationError('Grade score must be between 0 and 100');
    }
  }
}

export function validateAttendance(attendance: Partial<Attendance>, isUpdate = false) {
  if (!isUpdate || attendance.studentId !== undefined) {
    if (!attendance.studentId) {
      throw new ValidationError('Student ID is required for attendance');
    }
  }
  if (!isUpdate || attendance.classId !== undefined) {
    if (!attendance.classId) {
      throw new ValidationError('Class ID is required for attendance');
    }
  }
  if (!isUpdate || attendance.date !== undefined) {
    if (!attendance.date) {
      throw new ValidationError('Date is required for attendance');
    }
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(attendance.date)) {
      throw new ValidationError('Date must be in YYYY-MM-DD format');
    }
  }
  if (!isUpdate || attendance.status !== undefined) {
    const validStatuses = ['hadir', 'sakit', 'izin', 'alpa'];
    if (!attendance.status || !validStatuses.includes(attendance.status)) {
      throw new ValidationError('Invalid attendance status');
    }
  }
}

export function validateClass(cls: Partial<Class>, isUpdate = false) {
  if (!isUpdate || cls.name !== undefined) {
    if (!cls.name || cls.name.trim() === '') {
      throw new ValidationError('Class name is required');
    }
    assertMaxLength(cls.name, 'Class name', INPUT_LIMITS.entityName);
  }
  if (!isUpdate || cls.academicPeriodId !== undefined) {
    if (!cls.academicPeriodId) throw new ValidationError('Academic period is required for class');
  }
  assertMaxLength(cls.description, 'Class description', INPUT_LIMITS.description);
}

export function validateAcademicPeriod(period: Partial<AcademicPeriod>, isUpdate = false) {
  if (!isUpdate || period.name !== undefined) {
    if (!period.name?.trim()) throw new ValidationError('Academic period name is required');
    assertMaxLength(period.name, 'Academic period name', INPUT_LIMITS.entityName);
  }
  for (const field of ['startDate', 'endDate'] as const) {
    if ((!isUpdate || period[field] !== undefined) && !/^\d{4}-\d{2}-\d{2}$/.test(period[field] ?? '')) {
      throw new ValidationError(`Academic period ${field} must be in YYYY-MM-DD format`);
    }
  }
  if (period.startDate && period.endDate && period.startDate > period.endDate) {
    throw new ValidationError('Academic period start date must not be after end date');
  }
}

export function validateClassEnrollment(enrollment: Partial<ClassEnrollment>) {
  if (!enrollment.studentId) throw new ValidationError('Student ID is required for enrollment');
  if (!enrollment.classId) throw new ValidationError('Class ID is required for enrollment');
  if (!enrollment.enrolledAt || !/^\d{4}-\d{2}-\d{2}$/.test(enrollment.enrolledAt)) {
    throw new ValidationError('Enrollment date must be in YYYY-MM-DD format');
  }
  if (enrollment.endedAt !== undefined) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(enrollment.endedAt)) {
      throw new ValidationError('Enrollment end date must be in YYYY-MM-DD format');
    }
    if (enrollment.endedAt < enrollment.enrolledAt) {
      throw new ValidationError('Enrollment end date must not precede enrollment date');
    }
  }
}

export function validateSubject(subject: Partial<Subject>, isUpdate = false) {
  if (!isUpdate || subject.name !== undefined) {
    if (!subject.name || subject.name.trim() === '') {
      throw new ValidationError('Subject name is required');
    }
    assertMaxLength(subject.name, 'Subject name', INPUT_LIMITS.entityName);
  }
  assertMaxLength(subject.description, 'Subject description', INPUT_LIMITS.description);
  if (subject.assignedStudents !== undefined) {
    if (
      !Array.isArray(subject.assignedStudents) ||
      subject.assignedStudents.some(
        (studentId) => typeof studentId !== 'string' || studentId.trim() === '',
      )
    ) {
      throw new ValidationError('Subject assignments must contain non-empty student IDs');
    }
    if (new Set(subject.assignedStudents).size !== subject.assignedStudents.length) {
      throw new ValidationError('Subject assignments must not contain duplicate student IDs');
    }
  }
}

export function validateNote(note: Partial<Note>, isUpdate = false) {
  if (!isUpdate || note.title !== undefined) {
    if (!note.title || note.title.trim() === '') {
      throw new ValidationError('Note title is required');
    }
    assertMaxLength(note.title, 'Note title', INPUT_LIMITS.title);
  }
  if (!isUpdate || note.type !== undefined) {
    const validTypes = ['guru', 'materi', 'evaluasi'];
    if (!note.type || !validTypes.includes(note.type)) {
      throw new ValidationError('Invalid note type');
    }
  }
  for (const field of ['classIds', 'taughtClassIds'] as const) {
    const ids = note[field];
    if (ids !== undefined) {
      if (!Array.isArray(ids) || ids.some((id) => typeof id !== 'string' || id.trim() === '')) {
        throw new ValidationError(`Note ${field} must contain valid class IDs`);
      }
      if (new Set(ids).size !== ids.length) {
        throw new ValidationError(`Note ${field} must not contain duplicate class IDs`);
      }
    }
  }
  assertMaxLength(note.content, 'Note content', INPUT_LIMITS.noteContent);
}

export function validateTask(task: Partial<Task>, isUpdate = false) {
  if (!isUpdate || task.title !== undefined) {
    if (!task.title?.trim()) throw new ValidationError('Task title is required');
    assertMaxLength(task.title, 'Task title', INPUT_LIMITS.title);
  }
  if (!isUpdate || task.date !== undefined) {
    if (!task.date || !/^\d{4}-\d{2}-\d{2}$/.test(task.date)) {
      throw new ValidationError('Task date must be in YYYY-MM-DD format');
    }
  }
  if (!isUpdate || task.status !== undefined) {
    if (!task.status || !['pending', 'completed'].includes(task.status)) {
      throw new ValidationError('Invalid task status');
    }
  }
  assertMaxLength(task.description, 'Task description', INPUT_LIMITS.description);
  if (task.tags !== undefined) {
    if (!Array.isArray(task.tags) || task.tags.some((tag) => typeof tag !== 'string')) {
      throw new ValidationError('Task tags must be strings');
    }
    if (task.tags.length > INPUT_LIMITS.tagsPerTask) {
      throw new ValidationError(`Task must not have more than ${INPUT_LIMITS.tagsPerTask} tags`);
    }
    for (const tag of task.tags) assertMaxLength(tag, 'Task tag', INPUT_LIMITS.tag);
  }
}

export function validateSchedule(schedule: Partial<Schedule>, isUpdate = false) {
  if (!isUpdate || schedule.classId !== undefined) {
    if (!schedule.classId) throw new ValidationError('Class ID is required for schedule');
  }
  if (!isUpdate || schedule.recurrenceType !== undefined) {
    if (!schedule.recurrenceType || !['daily', 'weekly', 'monthly'].includes(schedule.recurrenceType)) {
      throw new ValidationError('Invalid schedule recurrence type');
    }
  }
  for (const field of ['startTime', 'endTime'] as const) {
    if ((!isUpdate || schedule[field] !== undefined) && !/^\d{2}:\d{2}$/.test(schedule[field] ?? '')) {
      throw new ValidationError(`Schedule ${field} must be in HH:MM format`);
    }
  }
  if ((!isUpdate || schedule.startDate !== undefined) && !/^\d{4}-\d{2}-\d{2}$/.test(schedule.startDate ?? '')) {
    throw new ValidationError('Schedule start date must be in YYYY-MM-DD format');
  }
  if (schedule.dayOfWeek !== undefined && (schedule.dayOfWeek < 0 || schedule.dayOfWeek > 6)) {
    throw new ValidationError('Schedule day of week must be between 0 and 6');
  }
  if (schedule.dayOfMonth !== undefined && (schedule.dayOfMonth < 1 || schedule.dayOfMonth > 31)) {
    throw new ValidationError('Schedule day of month must be between 1 and 31');
  }
  if (
    schedule.notificationEarlyMinutes !== undefined &&
    (!Number.isFinite(schedule.notificationEarlyMinutes) || schedule.notificationEarlyMinutes < 0)
  ) {
    throw new ValidationError('Schedule notification time must be a non-negative number');
  }
}

export function validateTeachingSession(session: Partial<TeachingSession>) {
  if (!session.classId) throw new ValidationError('Class ID is required for teaching session');
  if (!session.date || !/^\d{4}-\d{2}-\d{2}$/.test(session.date)) {
    throw new ValidationError('Teaching session date must be in YYYY-MM-DD format');
  }
  for (const field of ['startTime', 'endTime', 'durationMinutes'] as const) {
    if (typeof session[field] !== 'number' || !Number.isFinite(session[field])) {
      throw new ValidationError(`Teaching session ${field} must be a number`);
    }
  }
  if ((session.durationMinutes ?? -1) < 0) {
    throw new ValidationError('Teaching session duration must be non-negative');
  }
}

export function validateStudentNote(note: Partial<StudentNote>) {
  if (!note.studentId) throw new ValidationError('Student ID is required for note');
  if (!note.content?.trim()) throw new ValidationError('Student note content is required');
  assertMaxLength(note.content, 'Student note content', INPUT_LIMITS.studentNote);
}

export function validateProfile(profile: Partial<Profile>) {
  if (!profile.name?.trim()) throw new ValidationError('Profile name is required');
  assertMaxLength(profile.name, 'Profile name', INPUT_LIMITS.personName);
  assertMaxLength(profile.school, 'School name', INPUT_LIMITS.title);
  assertMaxLength(profile.role, 'Profile role', INPUT_LIMITS.shortText);
  assertMaxLength(profile.email, 'Profile email', INPUT_LIMITS.email);
  assertMaxLength(profile.avatar, 'Avatar URL', INPUT_LIMITS.url);
  if (profile.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email)) {
    throw new ValidationError('Profile email is invalid');
  }
}
