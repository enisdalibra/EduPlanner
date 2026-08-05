import { db, type Class, type ClassEnrollment } from '@/db/database';
import { validateClass, validateClassEnrollment, ValidationError } from '@/lib/validation';
import { DomainNotFoundError } from '@/lib/domainErrors';
import { assertClassWritable } from '@/lib/classAccess';

const today = () => new Date().toISOString().slice(0, 10);

export async function getClasses(options: { includeArchived?: boolean; academicPeriodId?: string } = {}) {
  let classes = await db.classes.toArray();
  if (!options.includeArchived) classes = classes.filter((cls) => !cls.archivedAt);
  if (options.academicPeriodId) classes = classes.filter((cls) => cls.academicPeriodId === options.academicPeriodId);
  return classes;
}

export async function getClass(id: string) {
  return db.classes.get(id);
}

async function resolvePeriodId(academicPeriodId?: string) {
  if (academicPeriodId) return academicPeriodId;
  const active = await db.academicPeriods.filter((period) => period.isActive).first();
  if (!active) throw new ValidationError('Create or activate an academic period before creating a class.');
  return active.id;
}

export async function createClass(name: string, description?: string, academicPeriodId?: string) {
  const periodId = await resolvePeriodId(academicPeriodId);
  const newClass: Class = {
    id: crypto.randomUUID(),
    name: name.trim(),
    description: description?.trim(),
    academicPeriodId: periodId,
  };
  validateClass(newClass);
  return db.transaction('rw', [db.academicPeriods, db.classes], async () => {
    if (!(await db.academicPeriods.get(periodId))) throw new DomainNotFoundError('Academic period', periodId);
    await db.classes.add(newClass);
    return newClass;
  });
}

export async function updateClass(id: string, name: string, description?: string, academicPeriodId?: string) {
  const updates = {
    name: name.trim(),
    description: description?.trim(),
    ...(academicPeriodId ? { academicPeriodId } : {}),
  };
  validateClass(updates, true);
  return db.transaction('rw', [db.academicPeriods, db.classes], async () => {
    const current = await assertClassWritable(db, id);
    if (academicPeriodId && !(await db.academicPeriods.get(academicPeriodId))) {
      throw new DomainNotFoundError('Academic period', academicPeriodId);
    }
    validateClass({ ...current, ...updates });
    await db.classes.update(id, updates);
    return 1;
  });
}

export async function archiveClass(id: string, archivedAt = new Date().toISOString()) {
  return db.transaction('rw', [db.classes, db.classEnrollments], async () => {
    const cls = await db.classes.get(id);
    if (!cls) throw new DomainNotFoundError('Class', id);
    await db.classes.update(id, { archivedAt });
    await db.classEnrollments.where('classId').equals(id).filter((item) => !item.endedAt).modify({ endedAt: archivedAt.slice(0, 10) });
  });
}

export async function unarchiveClass(id: string) {
  return db.transaction('rw', [db.classes, db.classEnrollments], async () => {
    const cls = await db.classes.get(id);
    if (!cls) throw new DomainNotFoundError('Class', id);
    const archiveDate = cls.archivedAt?.slice(0, 10);
    await db.classes.update(id, { archivedAt: undefined });
    if (archiveDate) {
      await db.classEnrollments.where('classId').equals(id)
        .filter((item) => item.endedAt === archiveDate)
        .modify({ endedAt: undefined });
    }
  });
}

export async function enrollStudent(classId: string, studentId: string, enrolledAt = today()) {
  const enrollment: ClassEnrollment = { id: crypto.randomUUID(), classId, studentId, enrolledAt };
  validateClassEnrollment(enrollment);
  return db.transaction('rw', [db.classes, db.students, db.classEnrollments], async () => {
    await assertClassWritable(db, classId);
    if (!(await db.students.get(studentId))) throw new DomainNotFoundError('Student', studentId);
    const existing = await db.classEnrollments.where('[classId+studentId]').equals([classId, studentId]).first();
    if (existing) {
      await db.classEnrollments.update(existing.id, { enrolledAt, endedAt: undefined });
      return { ...existing, enrolledAt, endedAt: undefined };
    }
    await db.classEnrollments.add(enrollment);
    return enrollment;
  });
}

export async function endEnrollment(classId: string, studentId: string, endedAt = today()) {
  return db.transaction('rw', [db.classes, db.classEnrollments], async () => {
    await assertClassWritable(db, classId);
    const enrollment = await db.classEnrollments.where('[classId+studentId]').equals([classId, studentId]).first();
    if (!enrollment) throw new DomainNotFoundError('Class enrollment', `${classId}:${studentId}`);
    validateClassEnrollment({ ...enrollment, endedAt });
    await db.classEnrollments.update(enrollment.id, { endedAt });
  });
}

export async function getStudentsByClass(classId: string, includeEnded = false) {
  let enrollments = await db.classEnrollments.where('classId').equals(classId).toArray();
  if (!includeEnded) enrollments = enrollments.filter((item) => !item.endedAt);
  const students = (await db.students.bulkGet(enrollments.map(({ studentId }) => studentId)))
    .filter((student): student is NonNullable<typeof student> => Boolean(student));
  return students.sort((a, b) => a.name.localeCompare(b.name));
}

export interface PromotionAssignment {
  studentId: string;
  targetClassIds: string[];
}

export async function promoteStudents(input: {
  sourceClassId: string;
  targetPeriodId: string;
  assignments: PromotionAssignment[];
  archiveSource?: boolean;
}) {
  return db.transaction('rw', [db.classes, db.students, db.academicPeriods, db.classEnrollments], async () => {
    await assertClassWritable(db, input.sourceClassId);
    if (!(await db.academicPeriods.get(input.targetPeriodId))) {
      throw new DomainNotFoundError('Academic period', input.targetPeriodId);
    }
    const sourceEnrollments = await db.classEnrollments.where('classId').equals(input.sourceClassId).toArray();
    const sourceStudentIds = new Set(sourceEnrollments.filter((item) => !item.endedAt).map(({ studentId }) => studentId));
    const targetIds = [...new Set(input.assignments.flatMap(({ targetClassIds }) => targetClassIds))];
    const targets = await db.classes.bulkGet(targetIds);
    for (const target of targets) {
      if (!target) throw new DomainNotFoundError('Target class', 'unknown');
      if (target.academicPeriodId !== input.targetPeriodId) throw new ValidationError('Every target class must belong to the selected target period.');
      if (target.archivedAt) throw new ValidationError(`Target class "${target.name}" is archived.`);
    }
    for (const assignment of input.assignments) {
      if (!sourceStudentIds.has(assignment.studentId)) {
        throw new ValidationError(`Student "${assignment.studentId}" is not active in the source class.`);
      }
      for (const classId of new Set(assignment.targetClassIds)) {
        const existing = await db.classEnrollments.where('[classId+studentId]').equals([classId, assignment.studentId]).first();
        if (existing) await db.classEnrollments.update(existing.id, { enrolledAt: today(), endedAt: undefined });
        else await db.classEnrollments.add({ id: crypto.randomUUID(), classId, studentId: assignment.studentId, enrolledAt: today() });
      }
    }
    if (input.archiveSource !== false) {
      const archivedAt = new Date().toISOString();
      await db.classes.update(input.sourceClassId, { archivedAt });
      await db.classEnrollments.where('classId').equals(input.sourceClassId).filter((item) => !item.endedAt).modify({ endedAt: archivedAt.slice(0, 10) });
    }
    return input.assignments.reduce((count, item) => count + new Set(item.targetClassIds).size, 0);
  });
}

export async function deleteClass(id: string) {
  await db.transaction(
    'rw',
    [db.classes, db.classEnrollments, db.attendances, db.grades, db.notes, db.tasks, db.teachingSessions, db.schedules],
    async () => {
      if (!(await db.classes.get(id))) throw new DomainNotFoundError('Class', id);
      await db.attendances.where('classId').equals(id).delete();
      await db.grades.where('classId').equals(id).delete();
      await db.notes.where('classId').equals(id).delete();
      await db.tasks.where('classId').equals(id).delete();
      await db.teachingSessions.where('classId').equals(id).delete();
      await db.schedules.where('classId').equals(id).delete();
      await db.classEnrollments.where('classId').equals(id).delete();
      await db.classes.delete(id);
    },
  );
}
