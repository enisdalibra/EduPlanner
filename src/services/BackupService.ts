import {
  db,
  type Attendance,
  type Class,
  type Grade,
  type Note,
  type Profile,
  type Schedule,
  type Student,
  type StudentNote,
  type Subject,
  type Task,
  type TeachingSession,
  type AcademicPeriod,
  type ClassEnrollment,
} from "@/db/database";
import {
  validateAttendance,
  validateClass,
  validateGrade,
  validateNote,
  validateProfile,
  validateSchedule,
  validateStudent,
  validateStudentNote,
  validateSubject,
  validateTask,
  validateTeachingSession,
  validateAcademicPeriod,
  validateClassEnrollment,
  ValidationError,
} from "@/lib/validation";
import {
  BackupMigrationService,
  type BackupMigrationMetadata,
} from "@/services/backup/BackupMigrationService";
import { validateBackupIntegrity } from "@/services/backup/BackupIntegrityValidator";
import {
  BACKUP_FORMAT,
  BACKUP_TABLE_NAMES,
  BACKUP_VERSION,
  MAX_BACKUP_FILE_BYTES,
  MAX_BACKUP_RECORDS_PER_TABLE,
  BackupValidationError,
  hasOwn,
  isBackupRecord,
  type BackupData,
  type BackupEnvelope,
  type BackupRecord,
  type BackupTableName,
} from "@/services/backup/BackupSchema";

export {
  BACKUP_FORMAT,
  BACKUP_TABLE_NAMES,
  BACKUP_VERSION,
  MAX_BACKUP_FILE_BYTES,
  MAX_BACKUP_RECORDS_PER_TABLE,
  BackupValidationError,
} from "@/services/backup/BackupSchema";
export type {
  BackupData,
  BackupEnvelope,
  BackupRecord,
  BackupTableName,
} from "@/services/backup/BackupSchema";
export type {
  BackupMigrationMetadata,
  BackupMigrationWarning,
} from "@/services/backup/BackupMigrationService";

export interface BackupInspection extends BackupMigrationMetadata {
  counts: Record<BackupTableName, number>;
}

export type RestoreResult = BackupInspection;

export interface RecoverySnapshot {
  payload: string;
  fileName: string;
  createdAt: string;
  counts: Record<BackupTableName, number>;
}

function assertString(record: BackupRecord, key: string, tableName: BackupTableName, index: number): void {
  if (typeof record[key] !== "string") {
    throw new BackupValidationError(
      `Backup table "${tableName}" record ${index + 1} has an invalid "${key}" field.`,
    );
  }
}

function assertNonEmptyString(record: BackupRecord, key: string, tableName: BackupTableName, index: number): void {
  assertString(record, key, tableName, index);
  if (String(record[key]).trim() === "") {
    throw new BackupValidationError(
      `Backup table "${tableName}" record ${index + 1} has an empty "${key}" field.`,
    );
  }
}

function assertNumber(record: BackupRecord, key: string, tableName: BackupTableName, index: number): void {
  if (typeof record[key] !== "number" || !Number.isFinite(record[key])) {
    throw new BackupValidationError(
      `Backup table "${tableName}" record ${index + 1} has an invalid "${key}" field.`,
    );
  }
}

function assertOptionalString(record: BackupRecord, key: string, tableName: BackupTableName, index: number): void {
  if (hasOwn(record, key) && record[key] !== undefined && typeof record[key] !== "string") {
    throw new BackupValidationError(
      `Backup table "${tableName}" record ${index + 1} has an invalid "${key}" field.`,
    );
  }
}

function assertRecordSchema(tableName: BackupTableName, record: BackupRecord, index: number): void {
  const requiredStrings: Partial<Record<BackupTableName, string[]>> = {
    profile: ["name", "school"],
    subjects: ["name"],
    classes: ["name", "academicPeriodId"],
    students: ["name", "nis"],
    attendances: ["classId", "studentId", "date", "status"],
    grades: ["classId", "studentId", "evaluationName"],
    notes: ["title", "content", "type"],
    tasks: ["title", "date", "status"],
    teachingSessions: ["classId", "date"],
    studentNotes: ["studentId", "content"],
    schedules: ["classId", "startTime", "endTime", "recurrenceType", "startDate"],
    academicPeriods: ["name", "startDate", "endDate"],
    classEnrollments: ["studentId", "classId", "enrolledAt"],
  };
  requiredStrings[tableName]?.forEach((key) => assertString(record, key, tableName, index));

  const nonEmptyStrings: Partial<Record<BackupTableName, string[]>> = {
    subjects: ["name"],
    classes: ["name", "academicPeriodId"],
    students: ["name", "nis"],
    attendances: ["classId", "studentId", "date", "status"],
    grades: ["classId", "studentId", "evaluationName"],
    notes: ["title", "type"],
    tasks: ["title", "date", "status"],
    teachingSessions: ["classId", "date"],
    studentNotes: ["studentId"],
    schedules: ["classId", "startTime", "endTime", "recurrenceType", "startDate"],
    academicPeriods: ["name", "startDate", "endDate"],
    classEnrollments: ["studentId", "classId", "enrolledAt"],
  };
  nonEmptyStrings[tableName]?.forEach((key) =>
    assertNonEmptyString(record, key, tableName, index),
  );

  if (tableName === "grades") assertNumber(record, "score", tableName, index);
  if (tableName === "teachingSessions") {
    ["startTime", "endTime", "durationMinutes"].forEach((key) =>
      assertNumber(record, key, tableName, index),
    );
  }
  if (tableName === "schedules") {
    assertNumber(record, "notificationEarlyMinutes", tableName, index);
  }
  if (tableName === "subjects" && hasOwn(record, "assignedStudents")) {
    if (!Array.isArray(record.assignedStudents) || record.assignedStudents.some((id) => typeof id !== "string")) {
      throw new BackupValidationError(
        `Backup table "subjects" record ${index + 1} has an invalid "assignedStudents" field.`,
      );
    }
  }
  if (tableName === "academicPeriods" && typeof record.isActive !== "boolean") {
    throw new BackupValidationError(
      `Backup table "academicPeriods" record ${index + 1} has an invalid "isActive" field.`,
    );
  }

  [
    "classId", "subjectId", "studentId", "noteId", "description", "email", "role", "avatar",
    "startTime", "endTime", "deadline", "endDate",
  ]
    .filter((key) => tableName !== "teachingSessions" || (key !== "startTime" && key !== "endTime"))
    .forEach((key) => assertOptionalString(record, key, tableName, index));

  if (tableName === "tasks" && hasOwn(record, "tags")) {
    if (!Array.isArray(record.tags) || record.tags.some((tag) => typeof tag !== "string")) {
      throw new BackupValidationError(
        `Backup table "tasks" record ${index + 1} has an invalid "tags" field.`,
      );
    }
  }
  if (tableName === "notes" && hasOwn(record, "isTaught") && typeof record.isTaught !== "boolean") {
    throw new BackupValidationError(
      `Backup table "notes" record ${index + 1} has an invalid "isTaught" field.`,
    );
  }
  if (tableName === "schedules") {
    for (const key of ["dayOfWeek", "dayOfMonth", "recurrenceCount"]) {
      if (hasOwn(record, key) && record[key] !== undefined) {
        assertNumber(record, key, tableName, index);
      }
    }
  }

  const allowedEnums: Partial<Record<BackupTableName, Record<string, string[]>>> = {
    attendances: { status: ["hadir", "sakit", "izin", "alpa"] },
    notes: { type: ["guru", "materi", "evaluasi"] },
    tasks: { status: ["pending", "completed"] },
    schedules: { recurrenceType: ["daily", "weekly", "monthly"] },
  };
  for (const [key, values] of Object.entries(allowedEnums[tableName] ?? {})) {
    if (!values.includes(String(record[key]))) {
      throw new BackupValidationError(
        `Backup table "${tableName}" record ${index + 1} has an invalid "${key}" value.`,
      );
    }
  }
}

function normalizeRecords(tableName: BackupTableName, value: unknown): BackupRecord[] {
  if (!Array.isArray(value)) {
    throw new BackupValidationError(`Backup table "${tableName}" must be an array.`);
  }
  if (value.length > MAX_BACKUP_RECORDS_PER_TABLE) {
    throw new BackupValidationError(
      `Backup table "${tableName}" exceeds the ${MAX_BACKUP_RECORDS_PER_TABLE} record limit.`,
    );
  }

  const ids = new Set<string>();

  return value.map((item, index) => {
    if (!isBackupRecord(item) || typeof item.id !== "string" || item.id.trim() === "") {
      throw new BackupValidationError(
        `Backup table "${tableName}" contains an invalid record at index ${index}.`,
      );
    }

    if (ids.has(item.id)) {
      throw new BackupValidationError(
        `Backup table "${tableName}" contains duplicate id "${item.id}".`,
      );
    }
    ids.add(item.id);

    const record = { ...item };
    assertRecordSchema(tableName, record, index);
    if (tableName === "notes" || tableName === "studentNotes") {
      if (!hasOwn(record, "createdAt")) {
        throw new BackupValidationError(
          `Backup table "${tableName}" record ${index + 1} is missing "createdAt".`,
        );
      }
      const createdAt = record.createdAt;
      if (!(createdAt instanceof Date) && typeof createdAt !== "string" && typeof createdAt !== "number") {
        throw new BackupValidationError(
          `Backup table "${tableName}" contains an invalid createdAt value at index ${index}.`,
        );
      }
      const date = createdAt instanceof Date ? createdAt : new Date(createdAt);

      if (Number.isNaN(date.getTime())) {
        throw new BackupValidationError(
          `Backup table "${tableName}" contains an invalid createdAt value at index ${index}.`,
        );
      }
      record.createdAt = date;
    }

    validateBackupRecordDomain(tableName, record);
    return record;
  });
}

function validateBackupRecordDomain(
  tableName: BackupTableName,
  record: BackupRecord,
): void {
  try {
    switch (tableName) {
      case "profile":
        validateProfile(record as unknown as Profile);
        break;
      case "subjects":
        validateSubject(record as unknown as Subject);
        break;
      case "classes":
        validateClass(record as unknown as Class);
        break;
      case "students":
        validateStudent(record as unknown as Student);
        break;
      case "attendances":
        validateAttendance(record as unknown as Attendance);
        break;
      case "grades":
        validateGrade(record as unknown as Grade);
        break;
      case "notes":
        validateNote(record as unknown as Note);
        break;
      case "tasks":
        validateTask(record as unknown as Task);
        break;
      case "teachingSessions":
        validateTeachingSession(record as unknown as TeachingSession);
        break;
      case "studentNotes":
        validateStudentNote(record as unknown as StudentNote);
        break;
      case "schedules":
        validateSchedule(record as unknown as Schedule);
        break;
      case "academicPeriods":
        validateAcademicPeriod(record as unknown as AcademicPeriod);
        break;
      case "classEnrollments":
        validateClassEnrollment(record as unknown as ClassEnrollment);
        break;
    }
  } catch (error) {
    if (error instanceof ValidationError) {
      throw new BackupValidationError(
        `Backup table "${tableName}" record failed domain validation: ${error.message}.`,
      );
    }
    throw error;
  }
}

function normalizeMigratedBackup(backupData: Record<BackupTableName, unknown>): BackupData {
  return Object.fromEntries(
    BACKUP_TABLE_NAMES.map((tableName) => {
      if (!hasOwn(backupData, tableName)) {
        throw new BackupValidationError(`Backup table "${tableName}" is missing.`);
      }
      return [tableName, normalizeRecords(tableName, backupData[tableName])];
    }),
  ) as BackupData;
}

function parseBackup(payload: string | unknown): {
  data: BackupData;
  migration: BackupMigrationMetadata;
} {
  let value: unknown = payload;
  if (typeof payload === "string") {
    try {
      value = JSON.parse(payload);
    } catch {
      throw new BackupValidationError("Backup file is not valid JSON.");
    }
  }

  const migrated = BackupMigrationService.migrate(value);
  const data = normalizeMigratedBackup(migrated.data);
  validateBackupIntegrity(data);
  return {
    data,
    migration: migrated.migration,
  };
}

function assertPayloadSize(payload: string | unknown): void {
  if (
    typeof payload === "string" &&
    new TextEncoder().encode(payload).byteLength > MAX_BACKUP_FILE_BYTES
  ) {
    throw new BackupValidationError("Backup file exceeds the 25 MB size limit.");
  }
}

function inspectPreparedBackup(
  data: BackupData,
  migration: BackupMigrationMetadata,
): BackupInspection {
  return {
    counts: Object.fromEntries(
      BACKUP_TABLE_NAMES.map((tableName) => [tableName, data[tableName].length]),
    ) as Record<BackupTableName, number>,
    ...migration,
  };
}

function getTables() {
  return BACKUP_TABLE_NAMES.map((tableName) => db.table<BackupRecord, string>(tableName));
}

async function readAllBackupTables(): Promise<BackupData> {
  const entries = await Promise.all(
    BACKUP_TABLE_NAMES.map(async (tableName) => [
      tableName,
      await db.table<BackupRecord, string>(tableName).toArray(),
    ] as const),
  );
  return Object.fromEntries(entries) as BackupData;
}

function recoveryTimestamp(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
    "_",
    pad(date.getHours()),
    pad(date.getMinutes()),
    pad(date.getSeconds()),
  ].join("");
}

export class BackupService {
  static async generateExport(): Promise<BackupEnvelope> {
    const tables = getTables();
    const data = await db.transaction("r", tables, readAllBackupTables);

    return {
      format: BACKUP_FORMAT,
      version: BACKUP_VERSION,
      exportedAt: new Date().toISOString(),
      databaseVersion: db.verno,
      data,
    };
  }

  static async generateExportPayload(space = 0): Promise<string> {
    return JSON.stringify(await this.generateExport(), null, space);
  }

  static async createRecoverySnapshot(now = new Date()): Promise<RecoverySnapshot> {
    const backup = await this.generateExport();
    return {
      payload: JSON.stringify(backup, null, 2),
      fileName: `eduplanner_pre_restore_${recoveryTimestamp(now)}.json`,
      createdAt: backup.exportedAt,
      counts: Object.fromEntries(
        BACKUP_TABLE_NAMES.map((tableName) => [tableName, backup.data[tableName].length]),
      ) as Record<BackupTableName, number>,
    };
  }

  static inspectExportPayload(payload: string | unknown): BackupInspection {
    assertPayloadSize(payload);
    const { data, migration } = parseBackup(payload);
    return inspectPreparedBackup(data, migration);
  }

  static async restoreExportPayload(payload: string | unknown): Promise<RestoreResult> {
    // Validate before opening a write transaction so an invalid file cannot
    // clear any existing user data.
    assertPayloadSize(payload);
    const { data, migration } = parseBackup(payload);
    const inspection = inspectPreparedBackup(data, migration);
    const tables = getTables();

    await db.transaction("rw", tables, async () => {
      await Promise.all(tables.map((table) => table.clear()));

      for (const tableName of BACKUP_TABLE_NAMES) {
        const records = data[tableName];
        if (records.length > 0) {
          await db.table<BackupRecord, string>(tableName).bulkAdd(records);
        }
      }

      // Keep this read-back check inside the transaction: a failure aborts the
      // clear/insert operation and preserves the previous database.
      validateBackupIntegrity(await readAllBackupTables());
    });

    return inspection;
  }

  static async restoreExportFile(file: File): Promise<RestoreResult> {
    return this.restoreExportPayload(await this.readExportFile(file));
  }

  static async readExportFile(file: File): Promise<string> {
    const extension = file.name.split(".").pop()?.toLowerCase();
    if (extension !== "json") {
      throw new BackupValidationError("Backup file must use the .json extension.");
    }
    if (file.type && file.type !== "application/json" && file.type !== "text/json") {
      throw new BackupValidationError("Backup file type must be JSON.");
    }
    if (file.size === 0) {
      throw new BackupValidationError("Backup file is empty.");
    }
    if (file.size > MAX_BACKUP_FILE_BYTES) {
      throw new BackupValidationError("Backup file exceeds the 25 MB size limit.");
    }
    return file.text();
  }
}
