import type {
  Attendance,
  Class,
  Grade,
  Note,
  Profile,
  Schedule,
  Student,
  StudentNote,
  Subject,
  Task,
  TeachingSession,
} from "@/db/database";
import {
  BackupValidationError,
  type BackupData,
} from "@/services/backup/BackupSchema";
import {
  checkIntegritySnapshot,
  type IntegrityReport,
  type IntegritySnapshot,
} from "@/services/IntegrityService";

export class BackupIntegrityError extends BackupValidationError {
  readonly report: IntegrityReport;

  constructor(report: IntegrityReport) {
    const firstIssue = report.issues[0];
    const remainingIssues = report.summary.total - 1;
    super(
      `Restored backup failed integrity validation: ${firstIssue.message}` +
        (remainingIssues > 0
          ? ` (${remainingIssues} additional issue${remainingIssues === 1 ? "" : "s"}).`
          : ""),
    );
    this.name = "BackupIntegrityError";
    this.report = report;
  }
}

function toIntegritySnapshot(data: BackupData): IntegritySnapshot {
  // BackupService performs structural validation before this adapter runs.
  return {
    profile: data.profile as unknown as Profile[],
    subjects: data.subjects as unknown as Subject[],
    classes: data.classes as unknown as Class[],
    students: data.students as unknown as Student[],
    attendances: data.attendances as unknown as Attendance[],
    grades: data.grades as unknown as Grade[],
    notes: data.notes as unknown as Note[],
    tasks: data.tasks as unknown as Task[],
    teachingSessions: data.teachingSessions as unknown as TeachingSession[],
    studentNotes: data.studentNotes as unknown as StudentNote[],
    schedules: data.schedules as unknown as Schedule[],
  };
}

export function validateBackupIntegrity(data: BackupData): IntegrityReport {
  const report = checkIntegritySnapshot(toIntegritySnapshot(data));
  if (!report.isHealthy) throw new BackupIntegrityError(report);
  return report;
}
