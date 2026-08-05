import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  type TestSubject = { assignedStudents?: string[] };
  const attendanceDelete = vi.fn();
  const gradeDelete = vi.fn();
  const studentNoteDelete = vi.fn();
  const enrollmentDelete = vi.fn();
  const subjectModify = vi.fn<
    (modifier: (subject: TestSubject) => void) => Promise<void>
  >();
  const subjectFilter = vi.fn<
    (predicate: (subject: TestSubject) => boolean) => { modify: typeof subjectModify }
  >(() => ({ modify: subjectModify }));

  return {
    attendanceDelete,
    gradeDelete,
    studentNoteDelete,
    enrollmentDelete,
    subjectModify,
    studentDelete: vi.fn(),
    attendanceEquals: vi.fn(() => ({ delete: attendanceDelete })),
    gradeEquals: vi.fn(() => ({ delete: gradeDelete })),
    studentNoteEquals: vi.fn(() => ({ delete: studentNoteDelete })),
    attendanceWhere: vi.fn(),
    gradeWhere: vi.fn(),
    studentNoteWhere: vi.fn(),
    enrollmentWhere: vi.fn(),
    subjectFilter,
    transaction: vi.fn(),
  };
});

vi.mock("@/db/database", () => {
  const db = {
    students: { delete: mocks.studentDelete },
    attendances: { where: mocks.attendanceWhere },
    grades: { where: mocks.gradeWhere },
    studentNotes: { where: mocks.studentNoteWhere },
    classEnrollments: { where: mocks.enrollmentWhere },
    subjects: { filter: mocks.subjectFilter },
    transaction: mocks.transaction,
  };

  return { db };
});

import { db } from "@/db/database";
import { deleteStudent } from "@/features/students/api";

describe("Students API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.attendanceWhere.mockReturnValue({ equals: mocks.attendanceEquals });
    mocks.gradeWhere.mockReturnValue({ equals: mocks.gradeEquals });
    mocks.studentNoteWhere.mockReturnValue({ equals: mocks.studentNoteEquals });
    mocks.enrollmentWhere.mockReturnValue({ equals: vi.fn(() => ({ delete: mocks.enrollmentDelete })) });
    mocks.attendanceDelete.mockResolvedValue(undefined);
    mocks.gradeDelete.mockResolvedValue(undefined);
    mocks.studentNoteDelete.mockResolvedValue(undefined);
    mocks.subjectModify.mockResolvedValue(undefined);
    mocks.studentDelete.mockResolvedValue(undefined);
    mocks.transaction.mockImplementation(async (...args: unknown[]) => {
      const callback = args.at(-1) as () => Promise<void>;
      await callback();
    });
  });

  it("deletes student-owned data and subject enrollment in one transaction", async () => {
    await deleteStudent("student-1");

    expect(mocks.transaction).toHaveBeenCalledWith(
      "rw",
      [db.students, db.classEnrollments, db.attendances, db.grades, db.studentNotes, db.subjects],
      expect.any(Function),
    );
    expect(mocks.attendanceWhere).toHaveBeenCalledWith("studentId");
    expect(mocks.attendanceEquals).toHaveBeenCalledWith("student-1");
    expect(mocks.gradeEquals).toHaveBeenCalledWith("student-1");
    expect(mocks.studentNoteEquals).toHaveBeenCalledWith("student-1");
    expect(mocks.studentDelete).toHaveBeenCalledWith("student-1");

    const predicate = mocks.subjectFilter.mock.calls[0][0];
    expect(predicate({ assignedStudents: ["student-1"] })).toBe(true);
    expect(predicate({ assignedStudents: ["student-2"] })).toBe(false);

    const modifier = mocks.subjectModify.mock.calls[0][0];
    const subject = { assignedStudents: ["student-1", "student-2", "student-1"] };
    modifier(subject);
    expect(subject.assignedStudents).toEqual(["student-2"]);
  });

  it("does not delete the student record when related cleanup fails", async () => {
    mocks.attendanceDelete.mockRejectedValueOnce(new Error("cleanup failed"));

    await expect(deleteStudent("student-1")).rejects.toThrow("cleanup failed");

    expect(mocks.studentDelete).not.toHaveBeenCalled();
  });
});
