import { db, type Class } from '@/db/database';
import { validateClass } from '@/lib/validation';
import { DomainNotFoundError } from '@/lib/domainErrors';

export async function getClasses() {
  return await db.classes.toArray();
}

export async function getClass(id: string) {
  return await db.classes.get(id);
}

export async function createClass(name: string, description?: string) {
  const newClass: Class = {
    id: crypto.randomUUID(),
    name: name.trim(),
    description: description?.trim()
  };
  validateClass(newClass);
  await db.classes.add(newClass);
  return newClass;
}

export async function updateClass(id: string, name: string, description?: string) {
  const updates = { name: name.trim(), description: description?.trim() };
  validateClass(updates, true);
  const updated = await db.classes.update(id, updates);
  if (updated === 0) throw new DomainNotFoundError('Class', id);
  return updated;
}

export async function deleteClass(id: string) {
  await db.transaction(
    'rw',
    [
      db.classes,
      db.students,
      db.attendances,
      db.grades,
      db.notes,
      db.tasks,
      db.teachingSessions,
      db.schedules,
      db.studentNotes,
      db.subjects,
    ],
    async () => {
      const classStudents = db.students.where('classId').equals(id);
      const studentIds = (await classStudents.toArray()).map((student) => student.id);

      if (studentIds.length > 0) {
        await db.studentNotes.where('studentId').anyOf(studentIds).delete();
        const studentIdSet = new Set(studentIds);
        await db.subjects
          .filter((subject) =>
            subject.assignedStudents?.some((studentId) => studentIdSet.has(studentId)) ?? false
          )
          .modify((subject) => {
            subject.assignedStudents = subject.assignedStudents?.filter(
              (studentId) => !studentIdSet.has(studentId)
            );
          });
      }

      await db.attendances.where('classId').equals(id).delete();
      await db.grades.where('classId').equals(id).delete();
      await db.notes.where('classId').equals(id).delete();
      await db.tasks.where('classId').equals(id).delete();
      await db.teachingSessions.where('classId').equals(id).delete();
      await db.schedules.where('classId').equals(id).delete();
      await classStudents.delete();
      await db.classes.delete(id);
    }
  );
}

export async function getStudentsByClass(classId: string) {
  return await db.students.where('classId').equals(classId).sortBy('name');
}
