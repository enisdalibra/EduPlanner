import type { EduPlannerDB } from '@/db/database';
import { DomainNotFoundError } from '@/lib/domainErrors';

export interface OptionalClassSubjectRelations {
  classId?: string;
  subjectId?: string;
}

export async function assertOptionalClassSubjectRelations(
  database: EduPlannerDB,
  relations: OptionalClassSubjectRelations,
): Promise<void> {
  if (relations.classId && !(await database.classes.get(relations.classId))) {
    throw new DomainNotFoundError('Class', relations.classId);
  }
  if (relations.subjectId && !(await database.subjects.get(relations.subjectId))) {
    throw new DomainNotFoundError('Subject', relations.subjectId);
  }
}

export async function assertStudentIdsExist(
  database: EduPlannerDB,
  studentIds: string[],
): Promise<void> {
  if (!studentIds.length) return;

  const students = await database.students.bulkGet(studentIds);
  const missingIndex = students.findIndex((student) => student === undefined);
  if (missingIndex !== -1) {
    throw new DomainNotFoundError('Student', studentIds[missingIndex]);
  }
}
