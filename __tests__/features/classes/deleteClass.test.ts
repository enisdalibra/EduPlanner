import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  type TestSubject = { assignedStudents?: string[] };

  const makeClassRelation = () => {
    const deleteRecords = vi.fn();
    const equals = vi.fn(() => ({ delete: deleteRecords }));
    const where = vi.fn(() => ({ equals }));
    return { table: { where }, where, equals, deleteRecords };
  };

  const studentsDelete = vi.fn();
  const studentsToArray = vi.fn();
  const studentsEquals = vi.fn(() => ({
    toArray: studentsToArray,
    delete: studentsDelete,
  }));
  const studentsWhere = vi.fn(() => ({ equals: studentsEquals }));

  const studentNotesDelete = vi.fn();
  const studentNotesAnyOf = vi.fn(() => ({ delete: studentNotesDelete }));
  const studentNotesWhere = vi.fn(() => ({ anyOf: studentNotesAnyOf }));

  const subjectModify = vi.fn<
    (modifier: (subject: TestSubject) => void) => Promise<void>
  >();
  const subjectFilter = vi.fn<
    (predicate: (subject: TestSubject) => boolean) => { modify: typeof subjectModify }
  >(() => ({ modify: subjectModify }));

  return {
    attendances: makeClassRelation(),
    grades: makeClassRelation(),
    notes: makeClassRelation(),
    tasks: makeClassRelation(),
    teachingSessions: makeClassRelation(),
    schedules: makeClassRelation(),
    studentsDelete,
    studentsToArray,
    studentsEquals,
    studentsWhere,
    studentNotesDelete,
    studentNotesAnyOf,
    studentNotesWhere,
    subjectModify,
    subjectFilter,
    classDelete: vi.fn(),
    transaction: vi.fn(),
  };
});

vi.mock("@/db/database", () => {
  const db = {
    classes: { delete: mocks.classDelete },
    students: { where: mocks.studentsWhere },
    attendances: mocks.attendances.table,
    grades: mocks.grades.table,
    notes: mocks.notes.table,
    tasks: mocks.tasks.table,
    teachingSessions: mocks.teachingSessions.table,
    schedules: mocks.schedules.table,
    studentNotes: { where: mocks.studentNotesWhere },
    subjects: { filter: mocks.subjectFilter },
    transaction: mocks.transaction,
  };

  return { db };
});

import { db } from "@/db/database";
import { deleteClass } from "@/features/classes/api";

const classRelations = [
  mocks.attendances,
  mocks.grades,
  mocks.notes,
  mocks.tasks,
  mocks.teachingSessions,
  mocks.schedules,
];

describe("deleteClass", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.studentsToArray.mockResolvedValue([
      { id: "student-1", classId: "class-1" },
      { id: "student-2", classId: "class-1" },
    ]);
    mocks.studentsDelete.mockResolvedValue(undefined);
    mocks.studentNotesDelete.mockResolvedValue(undefined);
    mocks.subjectModify.mockResolvedValue(undefined);
    mocks.classDelete.mockResolvedValue(undefined);
    for (const relation of classRelations) {
      relation.deleteRecords.mockResolvedValue(undefined);
    }
    mocks.transaction.mockImplementation(async (...args: unknown[]) => {
      const callback = args.at(-1) as () => Promise<void>;
      await callback();
    });
  });

  it("removes every class-owned record and student reference atomically", async () => {
    await deleteClass("class-1");

    expect(mocks.transaction).toHaveBeenCalledWith(
      "rw",
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
      expect.any(Function),
    );
    expect(mocks.studentsWhere).toHaveBeenCalledWith("classId");
    expect(mocks.studentsEquals).toHaveBeenCalledWith("class-1");
    expect(mocks.studentNotesWhere).toHaveBeenCalledWith("studentId");
    expect(mocks.studentNotesAnyOf).toHaveBeenCalledWith(["student-1", "student-2"]);

    for (const relation of classRelations) {
      expect(relation.where).toHaveBeenCalledWith("classId");
      expect(relation.equals).toHaveBeenCalledWith("class-1");
      expect(relation.deleteRecords).toHaveBeenCalledOnce();
    }

    const predicate = mocks.subjectFilter.mock.calls[0][0];
    expect(predicate({ assignedStudents: ["other", "student-1"] })).toBe(true);
    expect(predicate({ assignedStudents: ["other"] })).toBe(false);

    const modifier = mocks.subjectModify.mock.calls[0][0];
    const subject = { assignedStudents: ["student-1", "other", "student-2"] };
    modifier(subject);
    expect(subject.assignedStudents).toEqual(["other"]);
    expect(mocks.studentsDelete).toHaveBeenCalledOnce();
    expect(mocks.classDelete).toHaveBeenCalledWith("class-1");
  });

  it("skips student-only cleanup when the class has no students", async () => {
    mocks.studentsToArray.mockResolvedValueOnce([]);

    await deleteClass("class-1");

    expect(mocks.studentNotesWhere).not.toHaveBeenCalled();
    expect(mocks.subjectFilter).not.toHaveBeenCalled();
    expect(mocks.schedules.deleteRecords).toHaveBeenCalledOnce();
    expect(mocks.classDelete).toHaveBeenCalledWith("class-1");
  });

  it("does not delete the class record when related cleanup fails", async () => {
    mocks.schedules.deleteRecords.mockRejectedValueOnce(new Error("cleanup failed"));

    await expect(deleteClass("class-1")).rejects.toThrow("cleanup failed");

    expect(mocks.classDelete).not.toHaveBeenCalled();
  });
});
