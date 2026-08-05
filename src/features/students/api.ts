import { db, type Student, type StudentNote } from "@/db/database";
import { DomainNotFoundError } from "@/lib/domainErrors";
import { validateStudent, validateStudentNote } from "@/lib/validation";

export interface StudentBulkInput {
  name: string;
  nis: string;
  rowNumber?: number;
}

export type DuplicateNisPolicy = "reject" | "skip";

export interface StudentBulkImportResult {
  students: Student[];
  skipped: number;
  linked: number;
}

export class DuplicateNisError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DuplicateNisError";
  }
}

async function assertClassExists(classId: string): Promise<void> {
  if (!(await db.classes.get(classId))) throw new DomainNotFoundError("Class", classId);
}

export async function createStudent(classId: string, name: string, nis: string): Promise<Student> {
  const student: Student = {
    id: crypto.randomUUID(),
    name: name.trim(),
    nis: nis.trim(),
  };
  validateStudent(student);
  return db.transaction("rw", [db.classes, db.students, db.classEnrollments], async () => {
    await assertClassExists(classId);
    const cls = await db.classes.get(classId);
    if (cls?.archivedAt) throw new Error('Archived classes are read-only.');
    const existing = await db.students.where('nis').equals(student.nis).first();
    const resolved = existing ?? student;
    if (!existing) await db.students.add(student);
    const enrollment = await db.classEnrollments.where('[classId+studentId]').equals([classId, resolved.id]).first();
    if (enrollment) await db.classEnrollments.update(enrollment.id, { endedAt: undefined });
    else await db.classEnrollments.add({
      id: crypto.randomUUID(), classId, studentId: resolved.id, enrolledAt: new Date().toISOString().slice(0, 10),
    });
    return resolved;
  });
}

export async function updateStudent(id: string, updates: Partial<Student>): Promise<void> {
  const normalized: Partial<Student> = { ...updates };
  if (updates.name !== undefined) normalized.name = updates.name.trim();
  if (updates.nis !== undefined) normalized.nis = updates.nis.trim();
  validateStudent(normalized, true);
  await db.transaction("rw", db.students, async () => {
    if (!(await db.students.get(id))) throw new DomainNotFoundError("Student", id);
    await db.students.update(id, normalized);
  });
}

export async function addStudentsBulk(classId: string, studentsList: StudentBulkInput[]): Promise<Student[]> {
  return (await importStudentsBulk(classId, studentsList, 'skip')).students;
}

export async function importStudentsBulk(
  classId: string,
  studentsList: StudentBulkInput[],
  duplicatePolicy: DuplicateNisPolicy = "reject",
): Promise<StudentBulkImportResult> {
  if (duplicatePolicy !== 'reject' && duplicatePolicy !== 'skip') {
    throw new Error(`Unsupported duplicate NIS policy: ${String(duplicatePolicy)}`);
  }
  for (const student of studentsList) validateStudent(student);

  return db.transaction("rw", [db.classes, db.students, db.classEnrollments], async () => {
    await assertClassExists(classId);
    const cls = await db.classes.get(classId);
    if (cls?.archivedAt) throw new Error('Archived classes are read-only.');
    const uniqueNis = [...new Set(studentsList.map((student) => student.nis))];
    const existing = uniqueNis.length
      ? await db.students.where("nis").anyOf(uniqueNis).toArray()
      : [];
    const existingByNis = new Map(existing.map((student) => [student.nis, student]));
    const seenNis = new Set<string>();
    const accepted: StudentBulkInput[] = [];
    const duplicateRows: number[] = [];

    for (const [index, student] of studentsList.entries()) {
      if (seenNis.has(student.nis)) {
        duplicateRows.push(student.rowNumber ?? index + 1);
      } else {
        seenNis.add(student.nis);
        accepted.push(student);
      }
    }
    if (duplicatePolicy === "reject" && duplicateRows.length) {
      throw new DuplicateNisError(
        `NIS duplikat ditemukan pada baris ${duplicateRows.join(", ")}. Tidak ada data yang diimpor.`,
      );
    }

    const newStudents: Student[] = accepted
      .filter((item) => !existingByNis.has(item.nis))
      .map((item) => ({ id: crypto.randomUUID(), name: item.name, nis: item.nis }));
    if (newStudents.length) await db.students.bulkAdd(newStudents);
    const newByNis = new Map(newStudents.map((student) => [student.nis, student]));
    const students = accepted.map((item) => existingByNis.get(item.nis) ?? newByNis.get(item.nis)!);
    for (const student of students) {
      const enrollment = await db.classEnrollments.where('[classId+studentId]').equals([classId, student.id]).first();
      if (enrollment) await db.classEnrollments.update(enrollment.id, { endedAt: undefined });
      else await db.classEnrollments.add({
        id: crypto.randomUUID(), classId, studentId: student.id, enrolledAt: new Date().toISOString().slice(0, 10),
      });
    }
    return { students, skipped: duplicateRows.length, linked: students.length - newStudents.length };
  });
}

export async function addStudentNote(studentId: string, content: string): Promise<StudentNote> {
  const note: StudentNote = {
    id: crypto.randomUUID(),
    studentId,
    content: content.trim(),
    createdAt: new Date(),
  };
  validateStudentNote(note);
  return db.transaction("rw", [db.students, db.studentNotes], async () => {
    if (!(await db.students.get(studentId))) throw new DomainNotFoundError("Student", studentId);
    await db.studentNotes.add(note);
    return note;
  });
}

export async function deleteStudentNote(id: string): Promise<void> {
  await db.transaction("rw", db.studentNotes, async () => {
    if (!(await db.studentNotes.get(id))) throw new DomainNotFoundError("Student note", id);
    await db.studentNotes.delete(id);
  });
}

/**
 * Permanently removes a student and every record owned by that student.
 * Subject enrollment is stored as an array on Subject, so it must be cleaned
 * separately from the studentId-indexed tables.
 */
export async function deleteStudent(id: string): Promise<void> {
  await db.transaction(
    "rw",
    [db.students, db.classEnrollments, db.attendances, db.grades, db.studentNotes, db.subjects],
    async () => {
      await db.attendances.where("studentId").equals(id).delete();
      await db.grades.where("studentId").equals(id).delete();
      await db.studentNotes.where("studentId").equals(id).delete();
      await db.classEnrollments.where("studentId").equals(id).delete();
      await db.subjects
        .filter((subject) => subject.assignedStudents?.includes(id) ?? false)
        .modify((subject) => {
          subject.assignedStudents = subject.assignedStudents?.filter(
            (studentId) => studentId !== id,
          );
        });
      await db.students.delete(id);
    },
  );
}
