import { describe, expect, it } from "vitest";

import {
  LEGACY_BACKUP_VERSION,
  LEGACY_OPTIONAL_TABLES,
  LEGACY_REQUIRED_TABLES,
  BackupMigrationService,
} from "@/services/backup/BackupMigrationService";
import {
  BACKUP_FORMAT,
  BACKUP_TABLE_NAMES,
  BACKUP_VERSION,
  BackupValidationError,
} from "@/services/backup/BackupSchema";

function legacyV0(overrides: Record<string, unknown> = {}) {
  return {
    classes: [],
    students: [],
    attendances: [],
    grades: [],
    notes: [],
    tasks: [],
    ...overrides,
  };
}

function currentEnvelope(overrides: Record<string, unknown> = {}) {
  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: "2026-07-24T00:00:00.000Z",
    databaseVersion: 7,
    data: Object.fromEntries(BACKUP_TABLE_NAMES.map((tableName) => [tableName, []])),
    ...overrides,
  };
}

describe("BackupMigrationService", () => {
  it("documents an exact legacy v0 table contract", () => {
    expect([...LEGACY_REQUIRED_TABLES, ...LEGACY_OPTIONAL_TABLES].sort()).toEqual(
      BACKUP_TABLE_NAMES.filter((name) => name !== 'academicPeriods' && name !== 'classEnrollments').sort(),
    );
  });

  it("passes the current envelope through without migration warnings", () => {
    const result = BackupMigrationService.migrate(currentEnvelope());

    expect(result.migration).toEqual({
      source: "current",
      sourceVersion: BACKUP_VERSION,
      targetVersion: BACKUP_VERSION,
      exportedAt: "2026-07-24T00:00:00.000Z",
      databaseVersion: 7,
      warnings: [],
      initializedEmptyTables: [],
    });
    expect(Object.keys(result.data)).toEqual(BACKUP_TABLE_NAMES);
  });

  it("migrates a complete legacy v0 backup and reports every initialized table", () => {
    const result = BackupMigrationService.migrate(legacyV0({
      classes: [{ id: "class-1", name: "Class 1" }],
    }));

    expect(result.migration.source).toBe("legacy");
    expect(result.migration.sourceVersion).toBe(LEGACY_BACKUP_VERSION);
    expect(result.migration.targetVersion).toBe(BACKUP_VERSION);
    expect(result.migration.initializedEmptyTables).toEqual(LEGACY_OPTIONAL_TABLES);
    expect(result.migration.warnings).toHaveLength(LEGACY_OPTIONAL_TABLES.length);
    expect(result.data.classes).toEqual([expect.objectContaining({ id: "class-1", name: "Class 1", academicPeriodId: expect.any(String) })]);
    expect(result.data.academicPeriods).toHaveLength(1);
    for (const tableName of LEGACY_OPTIONAL_TABLES) {
      expect(result.data[tableName]).toEqual([]);
      expect(result.migration.warnings).toContainEqual(expect.objectContaining({
        code: "initialized-empty-table",
        table: tableName,
      }));
    }
  });

  it("preserves optional legacy tables that are explicitly present", () => {
    const result = BackupMigrationService.migrate(legacyV0({
      profile: [{ id: "profile-1", name: "Teacher", school: "School" }],
      subjects: [],
    }));

    expect(result.data.profile).toEqual([
      { id: "profile-1", name: "Teacher", school: "School" },
    ]);
    expect(result.migration.initializedEmptyTables).not.toContain("profile");
    expect(result.migration.initializedEmptyTables).not.toContain("subjects");
  });

  it("rejects incomplete, unknown, and ambiguous legacy roots", () => {
    const incomplete = legacyV0();
    delete incomplete.tasks;
    expect(() => BackupMigrationService.migrate(incomplete)).toThrow(
      /Missing required table: tasks/,
    );

    expect(() => BackupMigrationService.migrate({
      ...legacyV0(),
      schoolExport: [],
    })).toThrow(/unknown root field: schoolExport/);

    expect(() => BackupMigrationService.migrate({
      ...legacyV0(),
      version: 0,
    })).toThrow(/ambiguous.*without a valid "format"/);

    expect(() => BackupMigrationService.migrate({ classes: [] })).toThrow(
      /Missing required tables/,
    );
  });

  it("rejects invalid, unsupported, and future versioned envelopes", () => {
    expect(() => BackupMigrationService.migrate(currentEnvelope({
      version: BACKUP_VERSION + 1,
    }))).toThrow(/newer EduPlanner release/);

    expect(() => BackupMigrationService.migrate(currentEnvelope({
      version: 0,
    }))).toThrow(/Unsupported backup version: 0/);

    expect(() => BackupMigrationService.migrate(currentEnvelope({
      version: "1",
    }))).toThrow(/version is missing or invalid/);

    expect(() => BackupMigrationService.migrate(currentEnvelope({
      format: "other-format",
    }))).toThrow(/Unsupported backup format/);

    expect(() => BackupMigrationService.migrate(currentEnvelope({
      exportedAt: "not-a-date",
    }))).toThrow(/export date is missing or invalid/);

    expect(() => BackupMigrationService.migrate(currentEnvelope({
      databaseVersion: 0,
    }))).toThrow(/database version is missing or invalid/);

    expect(() => BackupMigrationService.migrate(null)).toThrow(BackupValidationError);
  });
});
