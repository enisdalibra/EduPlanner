import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const tableNames = [
    "profile",
    "subjects",
    "classes",
    "students",
    "attendances",
    "grades",
    "notes",
    "tasks",
    "teachingSessions",
    "studentNotes",
    "schedules",
    "academicPeriods",
    "classEnrollments",
  ] as const;
  const tables = Object.fromEntries(
    tableNames.map((name) => [
      name,
      {
        toArray: vi.fn(),
        clear: vi.fn(),
        bulkAdd: vi.fn(),
      },
    ]),
  ) as Record<(typeof tableNames)[number], {
    toArray: ReturnType<typeof vi.fn>;
    clear: ReturnType<typeof vi.fn>;
    bulkAdd: ReturnType<typeof vi.fn>;
  }>;

  const records = Object.fromEntries(
    tableNames.map((name) => [name, [] as Record<string, unknown>[]]),
  ) as Record<(typeof tableNames)[number], Record<string, unknown>[]>;

  return { tableNames, tables, records, transaction: vi.fn() };
});

vi.mock("@/db/database", () => ({
  db: {
    verno: 8,
    table: (name: (typeof mocks.tableNames)[number]) => mocks.tables[name],
    transaction: mocks.transaction,
  },
}));

import {
  BACKUP_FORMAT,
  BACKUP_TABLE_NAMES,
  BACKUP_VERSION,
  BackupService,
  BackupValidationError,
  MAX_BACKUP_FILE_BYTES,
  MAX_BACKUP_RECORDS_PER_TABLE,
} from "@/services/BackupService";

type TestBackup = Record<string, unknown> & {
  data: Partial<Record<(typeof BACKUP_TABLE_NAMES)[number], unknown>>;
};

function currentBackup(overrides: Record<string, unknown> = {}): TestBackup {
  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: "2026-07-19T00:00:00.000Z",
    databaseVersion: 8,
    data: {
      ...Object.fromEntries(BACKUP_TABLE_NAMES.map((name) => [name, []])),
      academicPeriods: [{ id: 'period-1', name: '2026/2027', startDate: '2026-07-01', endDate: '2027-06-30', isActive: true }],
    },
    ...overrides,
  } as TestBackup;
}

describe("BackupService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.transaction.mockImplementation(async (...args: unknown[]) => {
      const callback = args.at(-1) as () => Promise<unknown>;
      return callback();
    });
    for (const name of mocks.tableNames) {
      mocks.records[name] = [{ id: `${name}-1` }];
      mocks.tables[name].toArray.mockImplementation(async () => mocks.records[name]);
      mocks.tables[name].clear.mockImplementation(async () => {
        mocks.records[name] = [];
      });
      mocks.tables[name].bulkAdd.mockImplementation(async (records) => {
        mocks.records[name].push(...records);
      });
    }
  });

  it("exports a versioned snapshot containing all database tables", async () => {
    const payload = JSON.parse(await BackupService.generateExportPayload());

    expect(payload.format).toBe(BACKUP_FORMAT);
    expect(payload.version).toBe(BACKUP_VERSION);
    expect(payload.databaseVersion).toBe(8);
    expect(Object.keys(payload.data)).toEqual(BACKUP_TABLE_NAMES);
    for (const name of BACKUP_TABLE_NAMES) {
      expect(payload.data[name]).toEqual([{ id: `${name}-1` }]);
      expect(mocks.tables[name].toArray).toHaveBeenCalledOnce();
    }
    expect(mocks.transaction).toHaveBeenCalledWith("r", expect.any(Array), expect.any(Function));
  });

  it("atomically replaces all tables and restores date values", async () => {
    const backup = currentBackup();
    backup.data.classes = [{ id: "class-1", name: "Class 1", academicPeriodId: 'period-1' }];
    backup.data.students = [{
      id: "student-1",
      name: "Student 1",
      nis: "NIS-1",
    }];
    backup.data.classEnrollments = [{ id: 'enrollment-1', classId: 'class-1', studentId: 'student-1', enrolledAt: '2026-07-01' }];
    backup.data.notes = [{
      id: "note-1",
      title: "Catatan",
      content: "Isi",
      type: "guru",
      createdAt: "2026-01-02T03:04:05.000Z",
    }];
    backup.data.studentNotes = [{
      id: "student-note-1",
      studentId: "student-1",
      content: "Catatan siswa",
      createdAt: "2026-02-03T04:05:06.000Z",
    }];

    const result = await BackupService.restoreExportPayload(JSON.stringify(backup));

    expect(result.source).toBe("current");
    expect(result.counts.notes).toBe(1);
    expect(mocks.transaction).toHaveBeenCalledWith("rw", expect.any(Array), expect.any(Function));
    for (const name of BACKUP_TABLE_NAMES) {
      expect(mocks.tables[name].clear).toHaveBeenCalledOnce();
    }
    expect(mocks.tables.notes.bulkAdd.mock.calls[0][0][0].createdAt).toBeInstanceOf(Date);
    expect(mocks.tables.studentNotes.bulkAdd.mock.calls[0][0][0].createdAt).toBeInstanceOf(Date);
  });

  it("creates a complete timestamped recovery snapshot", async () => {
    const snapshot = await BackupService.createRecoverySnapshot(
      new Date(2026, 6, 24, 9, 8, 7),
    );
    const payload = JSON.parse(snapshot.payload);

    expect(snapshot.fileName).toBe("eduplanner_pre_restore_20260724_090807.json");
    expect(snapshot.createdAt).toBe(payload.exportedAt);
    expect(snapshot.counts).toEqual(
      Object.fromEntries(BACKUP_TABLE_NAMES.map((tableName) => [tableName, 1])),
    );
    expect(Object.keys(payload.data)).toEqual(BACKUP_TABLE_NAMES);
    expect(mocks.transaction).toHaveBeenCalledWith("r", expect.any(Array), expect.any(Function));
  });

  it("migrates a complete legacy backup and reports tables initialized empty", async () => {
    const legacyBackup = {
      classes: [{ id: "class-1", name: "Class 1" }],
      students: [],
      attendances: [],
      grades: [],
      notes: [],
      tasks: [],
    };

    const result = await BackupService.restoreExportPayload(legacyBackup);

    expect(result.source).toBe("legacy");
    expect(result.sourceVersion).toBe(0);
    expect(result.targetVersion).toBe(BACKUP_VERSION);
    expect(result.counts.classes).toBe(1);
    expect(result.counts.schedules).toBe(0);
    expect(result.initializedEmptyTables).toEqual([
      "profile",
      "subjects",
      "teachingSessions",
      "studentNotes",
      "schedules",
    ]);
    expect(result.warnings).toHaveLength(5);
    expect(mocks.tables.schedules.clear).toHaveBeenCalledOnce();
    expect(mocks.tables.schedules.bulkAdd).not.toHaveBeenCalled();
  });

  it("inspects migration warnings and counts without opening a transaction", () => {
    const preview = BackupService.inspectExportPayload({
      classes: [{ id: "class-1", name: "Class 1" }],
      students: [],
      attendances: [],
      grades: [],
      notes: [],
      tasks: [],
    });

    expect(preview).toMatchObject({
      source: "legacy",
      sourceVersion: 0,
      targetVersion: BACKUP_VERSION,
      counts: { classes: 1, schedules: 0 },
    });
    expect(preview.warnings).toHaveLength(5);
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("rejects incomplete legacy backups before changing existing data", async () => {
    const incompleteLegacy = {
      classes: [],
      students: [],
      attendances: [],
      grades: [],
      notes: [],
    };

    await expect(BackupService.restoreExportPayload(incompleteLegacy)).rejects.toThrow(
      /Missing required table: tasks/,
    );
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("rejects incomplete current backups before changing existing data", async () => {
    const backup = currentBackup();
    delete backup.data.schedules;

    await expect(BackupService.restoreExportPayload(backup)).rejects.toThrow(BackupValidationError);
    expect(mocks.transaction).not.toHaveBeenCalled();
    for (const name of BACKUP_TABLE_NAMES) {
      expect(mocks.tables[name].clear).not.toHaveBeenCalled();
    }
  });

  it("rejects malformed JSON and invalid records before changing existing data", async () => {
    await expect(BackupService.restoreExportPayload("not-json")).rejects.toThrow(
      "Backup file is not valid JSON.",
    );

    const backup = currentBackup();
    backup.data.classes = [{ name: "Missing id" }];
    await expect(BackupService.restoreExportPayload(backup)).rejects.toThrow(BackupValidationError);
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("rejects duplicate IDs and invalid domain fields before changing data", async () => {
    const duplicateBackup = currentBackup();
    duplicateBackup.data.classes = [
      { id: "class-1", name: "Class 1", academicPeriodId: 'period-1' },
      { id: "class-1", name: "Class 2", academicPeriodId: 'period-1' },
    ];
    await expect(BackupService.restoreExportPayload(duplicateBackup)).rejects.toThrow(/duplicate id/);

    const invalidStudentBackup = currentBackup();
    invalidStudentBackup.data.students = [
      { id: "student-1", name: "Budi", nis: 101 },
    ];
    await expect(BackupService.restoreExportPayload(invalidStudentBackup)).rejects.toThrow(/"nis" field/);
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("rejects over-limit user content before changing data", async () => {
    const backup = currentBackup();
    backup.data.classes = [{ id: "class-1", name: "x".repeat(121), academicPeriodId: 'period-1' }];

    await expect(BackupService.restoreExportPayload(backup)).rejects.toThrow(
      /must not exceed 120 characters/,
    );
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("rejects relationally invalid backups before opening a write transaction", async () => {
    const backup = currentBackup();
    backup.data.students = [{ id: "student-1", name: "Student 1", nis: "NIS-1" }];
    backup.data.classEnrollments = [{ id: 'enrollment-1', classId: 'missing-class', studentId: 'student-1', enrolledAt: '2026-07-01' }];

    await expect(BackupService.restoreExportPayload(backup)).rejects.toThrow(
      /classEnrollments.classId references missing classes/,
    );
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("fails the restore transaction when read-back integrity differs from the candidate", async () => {
    const backup = currentBackup();
    backup.data.classes = [{ id: "class-1", name: "Class 1", academicPeriodId: 'period-1' }];
    backup.data.students = [{
      id: "student-1",
      name: "Student 1",
      nis: "NIS-1",
    }];
    backup.data.classEnrollments = [{ id: 'enrollment-1', classId: 'class-1', studentId: 'student-1', enrolledAt: '2026-07-01' }];
    mocks.tables.classEnrollments.bulkAdd.mockImplementationOnce(async () => {
      mocks.records.classEnrollments.push({ id: 'corrupted', classId: 'missing-class', studentId: 'student-1', enrolledAt: '2026-07-01' });
    });

    await expect(BackupService.restoreExportPayload(backup)).rejects.toThrow(
      /classEnrollments.classId references missing classes/,
    );
    expect(mocks.transaction).toHaveBeenCalledWith("rw", expect.any(Array), expect.any(Function));
  });

  it("validates backup file extension, MIME type, and size before reading it", async () => {
    const invalidExtension = {
      name: "backup.txt",
      type: "application/json",
      size: 10,
      text: vi.fn(),
    } as unknown as File;
    await expect(BackupService.restoreExportFile(invalidExtension)).rejects.toThrow(/\.json extension/);
    expect(invalidExtension.text).not.toHaveBeenCalled();

    const invalidMime = {
      name: "backup.json",
      type: "text/plain",
      size: 10,
      text: vi.fn(),
    } as unknown as File;
    await expect(BackupService.restoreExportFile(invalidMime)).rejects.toThrow(/type must be JSON/);
    expect(invalidMime.text).not.toHaveBeenCalled();

    const oversized = {
      name: "backup.json",
      type: "application/json",
      size: MAX_BACKUP_FILE_BYTES + 1,
      text: vi.fn(),
    } as unknown as File;
    await expect(BackupService.restoreExportFile(oversized)).rejects.toThrow(/25 MB/);
    expect(oversized.text).not.toHaveBeenCalled();
  });

  it("rejects invalid field shapes, domain enums, and optional values", async () => {
    const cases: Array<{
      table: (typeof BACKUP_TABLE_NAMES)[number];
      value: unknown;
      message: RegExp;
    }> = [
      { table: "classes", value: [{ id: "class-1", name: " ", academicPeriodId: 'period-1' }], message: /empty "name"/ },
      {
        table: "grades",
        value: [{ id: "grade-1", classId: "class-1", studentId: "student-1", evaluationName: "Kuis", score: Number.NaN }],
        message: /invalid "score"/,
      },
      {
        table: "tasks",
        value: [{ id: "task-1", title: "Task", date: "2026-07-20", status: "pending", classId: 1 }],
        message: /invalid "classId"/,
      },
      {
        table: "subjects",
        value: [{ id: "subject-1", name: "Math", assignedStudents: "student-1" }],
        message: /invalid "assignedStudents"/,
      },
      {
        table: "subjects",
        value: [{ id: "subject-1", name: "Math", assignedStudents: [1] }],
        message: /invalid "assignedStudents"/,
      },
      {
        table: "tasks",
        value: [{ id: "task-1", title: "Task", date: "2026-07-20", status: "pending", tags: "school" }],
        message: /invalid "tags"/,
      },
      {
        table: "tasks",
        value: [{ id: "task-1", title: "Task", date: "2026-07-20", status: "pending", tags: [1] }],
        message: /invalid "tags"/,
      },
      {
        table: "notes",
        value: [{ id: "note-1", title: "Note", content: "", type: "guru", createdAt: 1, isTaught: "yes" }],
        message: /invalid "isTaught"/,
      },
      {
        table: "schedules",
        value: [{ id: "schedule-1", classId: "class-1", startTime: "08:00", endTime: "09:00", recurrenceType: "weekly", startDate: "2026-07-20", notificationEarlyMinutes: 0, dayOfWeek: "1" }],
        message: /invalid "dayOfWeek"/,
      },
      {
        table: "attendances",
        value: [{ id: "attendance-1", classId: "class-1", studentId: "student-1", date: "2026-07-20", status: "unknown" }],
        message: /invalid "status" value/,
      },
    ];

    for (const testCase of cases) {
      const backup = currentBackup();
      backup.data[testCase.table] = testCase.value;
      await expect(BackupService.restoreExportPayload(backup)).rejects.toThrow(testCase.message);
    }
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("rejects invalid table containers, record IDs, and date fields", async () => {
    const invalidTable = currentBackup();
    invalidTable.data.classes = {};
    await expect(BackupService.restoreExportPayload(invalidTable)).rejects.toThrow(/must be an array/);

    const oversizedTable = currentBackup();
    oversizedTable.data.classes = Array(MAX_BACKUP_RECORDS_PER_TABLE + 1).fill(null);
    await expect(BackupService.restoreExportPayload(oversizedTable)).rejects.toThrow(/record limit/);

    for (const invalidRecord of [null, { id: 1, name: "Class" }, { id: "", name: "Class" }]) {
      const backup = currentBackup();
      backup.data.classes = [invalidRecord];
      await expect(BackupService.restoreExportPayload(backup)).rejects.toThrow(/invalid record/);
    }

    for (const invalidNote of [
      { id: "note-1", title: "Note", content: "", type: "guru" },
      { id: "note-1", title: "Note", content: "", type: "guru", createdAt: {} },
      { id: "note-1", title: "Note", content: "", type: "guru", createdAt: "not-a-date" },
    ]) {
      const backup = currentBackup();
      backup.data.notes = [invalidNote];
      await expect(BackupService.restoreExportPayload(backup)).rejects.toThrow(/createdAt/);
    }
  });

  it("rejects unsupported envelopes before opening a transaction", async () => {
    await expect(BackupService.restoreExportPayload(null)).rejects.toThrow(/root must be an object/);
    await expect(BackupService.restoreExportPayload({ unknown: [] })).rejects.toThrow(
      /unknown root field/,
    );

    const unsupportedVersion = currentBackup({ version: BACKUP_VERSION + 1 });
    await expect(BackupService.restoreExportPayload(unsupportedVersion)).rejects.toThrow(
      /newer EduPlanner release/,
    );

    const missingData = currentBackup({ data: null });
    await expect(BackupService.restoreExportPayload(missingData)).rejects.toThrow(/data is missing/);

    const unsupportedFormat = currentBackup({ format: "other-format" });
    await expect(BackupService.restoreExportPayload(unsupportedFormat)).rejects.toThrow(/Unsupported backup format/);
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("rejects empty files and restores a valid JSON file", async () => {
    const emptyFile = new File([], "backup.json", { type: "application/json" });
    await expect(BackupService.restoreExportFile(emptyFile)).rejects.toThrow(/empty/);

    const validFile = new File([JSON.stringify(currentBackup())], "backup.json", {
      type: "application/json",
    });
    await expect(BackupService.restoreExportFile(validFile)).resolves.toMatchObject({
      source: "current",
    });
  });
});
