import type { EduPlannerDB } from '@/db/database';
import { DomainNotFoundError } from '@/lib/domainErrors';
import { ValidationError } from '@/lib/validation';

export async function assertClassWritable(database: EduPlannerDB, classId: string) {
  const cls = await database.classes.get(classId);
  if (!cls) throw new DomainNotFoundError('Class', classId);
  if (cls.archivedAt) throw new ValidationError(`Class "${classId}" is archived and read-only.`);
  return cls;
}
