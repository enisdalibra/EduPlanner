import type { EduPlannerDB, Student } from '@/db/database';
import { DomainNotFoundError } from '@/lib/domainErrors';
import { ValidationError } from '@/lib/validation';

export interface AcademicRelationInput {
  classId: string;
  studentId: string;
  subjectId?: string;
}

export interface AcademicRelationCache {
  classes: Map<string, boolean>;
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
  let classExists = cache.classes.get(relation.classId);
  if (classExists === undefined) {
    classExists = (await database.classes.get(relation.classId)) !== undefined;
    cache.classes.set(relation.classId, classExists);
  }
  if (!classExists) throw new DomainNotFoundError('Class', relation.classId);

  let student = cache.students.get(relation.studentId);
  if (!cache.students.has(relation.studentId)) {
    student = await database.students.get(relation.studentId);
    cache.students.set(relation.studentId, student);
  }
  if (!student) throw new DomainNotFoundError('Student', relation.studentId);
  if (student.classId !== relation.classId) {
    throw new ValidationError(
      `Student "${relation.studentId}" belongs to class "${student.classId}", not "${relation.classId}".`,
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
