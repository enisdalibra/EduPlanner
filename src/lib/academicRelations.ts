import type { Class, EduPlannerDB, Student } from '@/db/database';
import { DomainNotFoundError } from '@/lib/domainErrors';
import { ValidationError } from '@/lib/validation';

export interface AcademicRelationInput {
  classId: string;
  studentId: string;
  subjectId?: string;
}

export interface AcademicRelationCache {
  classes: Map<string, Class | undefined>;
  students: Map<string, Student | undefined>;
  subjects: Map<string, boolean>;
}

export function createAcademicRelationCache(): AcademicRelationCache {
  return {
    classes: new Map(),
    students: new Map(),
    subjects: new Map(),
  };
}

export async function assertAcademicRelations(
  database: EduPlannerDB,
  relation: AcademicRelationInput,
  cache = createAcademicRelationCache(),
): Promise<void> {
  let cls = cache.classes.get(relation.classId);
  if (!cache.classes.has(relation.classId)) {
    cls = await database.classes.get(relation.classId);
    cache.classes.set(relation.classId, cls);
  }
  if (!cls) throw new DomainNotFoundError('Class', relation.classId);
  if (cls.archivedAt) throw new ValidationError(`Class "${relation.classId}" is archived and read-only.`);

  let student = cache.students.get(relation.studentId);
  if (!cache.students.has(relation.studentId)) {
    student = await database.students.get(relation.studentId);
    cache.students.set(relation.studentId, student);
  }
  if (!student) throw new DomainNotFoundError('Student', relation.studentId);
  const enrollment = await database.classEnrollments
    .where('[classId+studentId]')
    .equals([relation.classId, relation.studentId])
    .first();
  if (!enrollment) {
    throw new ValidationError(
      `Student "${relation.studentId}" has never been enrolled in class "${relation.classId}".`,
    );
  }

  if (relation.subjectId) {
    let subjectExists = cache.subjects.get(relation.subjectId);
    if (subjectExists === undefined) {
      subjectExists = (await database.subjects.get(relation.subjectId)) !== undefined;
      cache.subjects.set(relation.subjectId, subjectExists);
    }
    if (!subjectExists) throw new DomainNotFoundError('Subject', relation.subjectId);
  }
}
