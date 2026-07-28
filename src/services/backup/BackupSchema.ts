export const BACKUP_FORMAT = "eduplanner-backup";
export const BACKUP_VERSION = 1;
export const MAX_BACKUP_FILE_BYTES = 25 * 1024 * 1024;
export const MAX_BACKUP_RECORDS_PER_TABLE = 100_000;

export const BACKUP_TABLE_NAMES = [
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
] as const;

export type BackupTableName = (typeof BACKUP_TABLE_NAMES)[number];
export type BackupRecord = Record<string, unknown>;
export type BackupData = Record<BackupTableName, BackupRecord[]>;

export interface BackupEnvelope {
  format: typeof BACKUP_FORMAT;
  version: typeof BACKUP_VERSION;
  exportedAt: string;
  databaseVersion: number;
  data: BackupData;
}

export class BackupValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BackupValidationError";
  }
}

export function isBackupRecord(value: unknown): value is BackupRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function hasOwn(record: BackupRecord, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(record, key);
}
