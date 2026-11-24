import type { ClassEnrollment, Subject } from '@/db/database';

function buildStudentsByClass(
  enrollments: ClassEnrollment[],
  includeHistorical = false,
): Map<string, Set<string>> {
  const byClass = new Map<string, Set<string>>();
  for (const enrollment of enrollments) {
    if (!includeHistorical && enrollment.endedAt) continue;
    let studentSet = byClass.get(enrollment.classId);
    if (!studentSet) {
      studentSet = new Set<string>();
      byClass.set(enrollment.classId, studentSet);
    }
    studentSet.add(enrollment.studentId);
  }
  return byClass;
}

function isSubjectLinkedToClass(
  subject: Subject,
  classId: string,
  studentsByClass: Map<string, Set<string>>,
): boolean {
  if (subject.classIds?.includes(classId)) return true;
  const classStudents = studentsByClass.get(classId);
  if (!classStudents || classStudents.size === 0) return false;
  return (subject.assignedStudents ?? []).some((studentId) => classStudents.has(studentId));
}

/**
 * Returns subjects assigned to a specific class either directly via `subject.classIds`
 * or indirectly via student enrollments matching `subject.assignedStudents`.
 */
export function getSubjectsForClass(
  subjects: Subject[],
  classId: string,
  enrollments: ClassEnrollment[],
  includeHistorical = false,
): Subject[] {
  const studentsByClass = buildStudentsByClass(enrollments, includeHistorical);
  return subjects.filter((subject) => isSubjectLinkedToClass(subject, classId, studentsByClass));
}

/**
 * Partitions all subjects into:
 * - `shared`: subjects linked to every selected class (true intersection across `classIds`),
 *   or all subjects when `classIds` is empty (general access).
 * - `other`: remaining subjects, kept selectable so teachers can still assign shared materials
 *   across multiple classes without being blocked by empty or incomplete student rosters.
 */
export function partitionSubjectsForClasses(
  subjects: Subject[],
  classIds: string[],
  enrollments: ClassEnrollment[],
): { shared: Subject[]; other: Subject[] } {
  if (classIds.length === 0) {
    return { shared: subjects, other: [] };
  }

  const activeStudentsByClass = buildStudentsByClass(enrollments);
  const shared: Subject[] = [];
  const other: Subject[] = [];

  for (const subject of subjects) {
    const matchesEveryClass = classIds.every((classId) =>
      isSubjectLinkedToClass(subject, classId, activeStudentsByClass),
    );
    if (matchesEveryClass) {
      shared.push(subject);
    } else {
      other.push(subject);
    }
  }

  return { shared, other };
}
