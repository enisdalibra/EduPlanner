import {
  BACKUP_FORMAT,
  BACKUP_TABLE_NAMES,
  BACKUP_VERSION,
  BackupValidationError,
  hasOwn,
  isBackupRecord,
  type BackupRecord,
  type BackupTableName,
} from "./BackupSchema";

export const LEGACY_BACKUP_VERSION = 0;

export const LEGACY_REQUIRED_TABLES = [
  "classes",
  "students",
  "attendances",
  "grades",
  "notes",
  "tasks",
] as const satisfies readonly BackupTableName[];

export const LEGACY_OPTIONAL_TABLES = [
  "profile",
  "subjects",
  "teachingSessions",
  "studentNotes",
  "schedules",
] as const satisfies readonly BackupTableName[];

export interface BackupMigrationWarning {
  code: "initialized-empty-table";
  table: BackupTableName;
  message: string;
}

export interface BackupMigrationMetadata {
  source: "current" | "legacy";
  sourceVersion: number;
  targetVersion: typeof BACKUP_VERSION;
  exportedAt?: string;
  databaseVersion?: number;
  warnings: BackupMigrationWarning[];
  initializedEmptyTables: BackupTableName[];
}

export interface RawMigratedBackup {
  data: Record<BackupTableName, unknown>;
  migration: BackupMigrationMetadata;
}

const VERSIONED_ENVELOPE_KEYS = new Set([
  "version",
  "data",
  "exportedAt",
  "databaseVersion",
]);
const KNOWN_LEGACY_KEYS = new Set<string>(BACKUP_TABLE_NAMES);

function migrateCurrentEnvelope(value: BackupRecord): RawMigratedBackup {
  if (value.format !== BACKUP_FORMAT) {
    throw new BackupValidationError(`Unsupported backup format: ${String(value.format)}.`);
  }
  if (!Number.isInteger(value.version)) {
    throw new BackupValidationError("Backup version is missing or invalid.");
  }
  if ((value.version as number) > BACKUP_VERSION) {
    throw new BackupValidationError(
      `Backup version ${String(value.version)} was created by a newer EduPlanner release. Upgrade the application before restoring it.`,
    );
  }
  if (value.version !== 1 && value.version !== BACKUP_VERSION) {
    throw new BackupValidationError(`Unsupported backup version: ${String(value.version)}.`);
  }
  if (!isBackupRecord(value.data)) {
    throw new BackupValidationError("Backup data is missing or invalid.");
  }
  if (
    typeof value.exportedAt !== "string" ||
    Number.isNaN(new Date(value.exportedAt).getTime())
  ) {
    throw new BackupValidationError("Backup export date is missing or invalid.");
  }
  if (
    typeof value.databaseVersion !== "number" ||
    !Number.isInteger(value.databaseVersion) ||
    value.databaseVersion < 1
  ) {
    throw new BackupValidationError("Backup database version is missing or invalid.");
  }

  const data = value.version === 1
    ? migrateMembershipData(value.data as Record<string, unknown>, value.exportedAt as string)
    : value.data as Record<BackupTableName, unknown>;
  return {
    data,
    migration: {
      source: "current",
      sourceVersion: value.version as number,
      targetVersion: BACKUP_VERSION,
      exportedAt: value.exportedAt,
      databaseVersion: value.databaseVersion,
      warnings: [],
      initializedEmptyTables: [],
    },
  };
}

function migrateMembershipData(data: Record<string, unknown>, referenceDate?: string): Record<BackupTableName, unknown> {
  const date = referenceDate && !Number.isNaN(new Date(referenceDate).getTime())
    ? new Date(referenceDate)
    : new Date();
  const year = date.getUTCMonth() >= 6 ? date.getUTCFullYear() : date.getUTCFullYear() - 1;
  const periodId = crypto.randomUUID();
  const startDate = `${year}-07-01`;
  const endDate = `${year + 1}-06-30`;
  const classes = Array.isArray(data.classes)
    ? data.classes.map((item) => isBackupRecord(item) ? { ...item, academicPeriodId: periodId } : item)
    : data.classes;
  const classIds = new Set(
    Array.isArray(classes) ? classes.filter(isBackupRecord).map((item) => String(item.id)) : [],
  );
  const enrollments: BackupRecord[] = [];
  const students = Array.isArray(data.students)
    ? data.students.map((item) => {
        if (!isBackupRecord(item)) return item;
        const student = { ...item };
        if (typeof student.classId === 'string' && classIds.has(student.classId)) {
          enrollments.push({
            id: crypto.randomUUID(),
            studentId: String(student.id),
            classId: student.classId,
            enrolledAt: startDate,
          });
        }
        delete student.classId;
        return student;
      })
    : data.students;
  return {
    ...Object.fromEntries(BACKUP_TABLE_NAMES.map((name) => [name, data[name] ?? []])),
    classes,
    students,
    academicPeriods: [{ id: periodId, name: 'Periode Saat Ini', startDate, endDate, isActive: true }],
    classEnrollments: enrollments,
  } as Record<BackupTableName, unknown>;
}

function migrateLegacyV0(value: BackupRecord): RawMigratedBackup {
  const ambiguousKey = Object.keys(value).find((key) => VERSIONED_ENVELOPE_KEYS.has(key));
  if (ambiguousKey) {
    throw new BackupValidationError(
      `Backup is ambiguous: versioned field "${ambiguousKey}" is present without a valid "format" field.`,
    );
  }

  const unknownKeys = Object.keys(value).filter((key) => !KNOWN_LEGACY_KEYS.has(key));
  if (unknownKeys.length > 0) {
    throw new BackupValidationError(
      `Legacy backup contains unknown root field${unknownKeys.length === 1 ? "" : "s"}: ${unknownKeys.join(", ")}.`,
    );
  }

  const missingRequired = LEGACY_REQUIRED_TABLES.filter((tableName) => !hasOwn(value, tableName));
  if (missingRequired.length > 0) {
    throw new BackupValidationError(
      `Legacy backup is incomplete. Missing required table${missingRequired.length === 1 ? "" : "s"}: ${missingRequired.join(", ")}.`,
    );
  }

  const initializedEmptyTables = LEGACY_OPTIONAL_TABLES.filter(
    (tableName) => !hasOwn(value, tableName),
  );
  const warnings = initializedEmptyTables.map((table): BackupMigrationWarning => ({
    code: "initialized-empty-table",
    table,
    message: `Legacy backup v0 did not export "${table}"; it will be initialized as an empty table.`,
  }));

  const legacyData = Object.fromEntries(
      BACKUP_TABLE_NAMES.map((tableName) => [
        tableName,
        hasOwn(value, tableName) ? value[tableName] : [],
      ]),
    ) as Record<BackupTableName, unknown>;
  return {
    data: migrateMembershipData(legacyData),
    migration: {
      source: "legacy",
      sourceVersion: LEGACY_BACKUP_VERSION,
      targetVersion: BACKUP_VERSION,
      warnings,
      initializedEmptyTables: [...initializedEmptyTables],
    },
  };
}

export class BackupMigrationService {
  static migrate(value: unknown): RawMigratedBackup {
    if (!isBackupRecord(value)) {
      throw new BackupValidationError("Backup root must be an object.");
    }
    if (hasOwn(value, "format")) return migrateCurrentEnvelope(value);
    return migrateLegacyV0(value);
  }
}
