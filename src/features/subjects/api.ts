import { db, type Subject } from '@/db/database';
import { validateSubject } from '@/lib/validation';
import { DomainNotFoundError } from '@/lib/domainErrors';
import { assertStudentIdsExist } from '@/lib/domainRelations';

export type SubjectUpdate = Partial<
  Pick<Subject, 'name' | 'description' | 'assignedStudents'>
>;

export async function createSubject(name: string, description?: string) {
  const normalizedName = name.trim();
  validateSubject({ name: normalizedName });
  const subject: Subject = {
    id: crypto.randomUUID(),
    name: normalizedName,
    description: description?.trim()
  };
  await db.subjects.add(subject);
  return subject;
}

export async function updateSubject(id: string, updates: SubjectUpdate) {
  const normalized: SubjectUpdate = {
    ...updates,
    ...(updates.name !== undefined ? { name: updates.name.trim() } : {}),
    ...(updates.description !== undefined
      ? { description: updates.description.trim() }
      : {}),
  };
  validateSubject(normalized, true);

  await db.transaction('rw', [db.subjects, db.students], async () => {
    if (!(await db.subjects.get(id))) throw new DomainNotFoundError('Subject', id);
    if (normalized.assignedStudents) {
      await assertStudentIdsExist(db, normalized.assignedStudents);
    }
    await db.subjects.update(id, normalized);
  });
}

export async function deleteSubject(id: string) {
  await db.transaction(
    'rw',
    [
      db.subjects,
      db.grades,
      db.attendances,
      db.tasks,
      db.notes,
      db.teachingSessions,
      db.schedules,
    ],
    async () => {
      if (!(await db.subjects.get(id))) throw new DomainNotFoundError('Subject', id);

      await db.teachingSessions.where('subjectId').equals(id).delete();
      await db.grades.where('subjectId').equals(id).modify({ subjectId: undefined });
      await db.attendances.where('subjectId').equals(id).modify({ subjectId: undefined });
      await db.tasks.where('subjectId').equals(id).modify({ subjectId: undefined });
      await db.notes.where('subjectId').equals(id).modify({ subjectId: undefined });

      // `subjectId` is optional and not indexed on schedules. Preserve the
      // recurring class schedule, but turn it into a general schedule before
      // deleting the subject so no orphan reference can remain.
      await db.schedules
        .filter((schedule) => schedule.subjectId === id)
        .modify({ subjectId: undefined });

      await db.subjects.delete(id);
    },
  );
}

export async function assignClassToSubject(subjectId: string, classId: string): Promise<string[]> {
  return db.transaction('rw', [db.subjects, db.classes, db.students], async () => {
    const subject = await db.subjects.get(subjectId);
    if (!subject) throw new DomainNotFoundError('Subject', subjectId);
    if (!(await db.classes.get(classId))) throw new DomainNotFoundError('Class', classId);

    const classStudents = await db.students.where('classId').equals(classId).toArray();
    const assignedStudents = [
      ...new Set([...(subject.assignedStudents ?? []), ...classStudents.map((student) => student.id)]),
    ];
    await db.subjects.update(subjectId, { assignedStudents });
    return assignedStudents;
  });
}

export async function removeStudentFromSubject(subjectId: string, studentId: string): Promise<string[]> {
  return db.transaction('rw', db.subjects, async () => {
    const subject = await db.subjects.get(subjectId);
    if (!subject) throw new DomainNotFoundError('Subject', subjectId);
    const assignedStudents = (subject.assignedStudents ?? []).filter((id) => id !== studentId);
    await db.subjects.update(subjectId, { assignedStudents });
    return assignedStudents;
  });
}
