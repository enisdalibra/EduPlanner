import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Icon } from "@/components/ui/icon";
import { useTranslation } from "@/hooks/useTranslation";
import {
  BACKUP_TABLE_NAMES,
  type BackupInspection,
  type BackupTableName,
  type RecoverySnapshot,
} from "@/services/BackupService";

interface RestorePreviewDialogProps {
  open: boolean;
  inspection: BackupInspection | null;
  recoverySnapshot: RecoverySnapshot | null;
  isWorking: boolean;
  onCancel: () => void;
  onPrepareRecovery: () => void | Promise<void>;
  onRestore: () => void | Promise<void>;
}

const TABLE_TRANSLATION_KEYS: Record<BackupTableName, string> = {
  profile: "settings.previewTableProfile",
  subjects: "settings.previewTableSubjects",
  classes: "settings.previewTableClasses",
  students: "settings.previewTableStudents",
  attendances: "settings.previewTableAttendances",
  grades: "settings.previewTableGrades",
  notes: "settings.previewTableNotes",
  tasks: "settings.previewTableTasks",
  teachingSessions: "settings.previewTableTeachingSessions",
  studentNotes: "settings.previewTableStudentNotes",
  schedules: "settings.previewTableSchedules",
};

export function RestorePreviewDialog({
  open,
  inspection,
  recoverySnapshot,
  isWorking,
  onCancel,
  onPrepareRecovery,
  onRestore,
}: RestorePreviewDialogProps) {
  const { t, language } = useTranslation();
  const [confirmed, setConfirmed] = useState(false);
  const recoveryReady = recoverySnapshot !== null;

  useEffect(() => {
    setConfirmed(false);
  }, [open, recoveryReady]);

  const totalRecords = useMemo(
    () => inspection
      ? Object.values(inspection.counts).reduce((total, count) => total + count, 0)
      : 0,
    [inspection],
  );

  if (!inspection) return null;

  const exportedAt = inspection.exportedAt
    ? new Intl.DateTimeFormat(language === "id" ? "id-ID" : "en-US", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(inspection.exportedAt))
    : t("settings.previewUnavailable");

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen && !isWorking) onCancel();
      }}
    >
      <DialogContent
        className="max-h-[90vh] overflow-y-auto sm:max-w-2xl"
        showCloseButton={false}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon name="fact_check" className="text-primary" />
            {t("settings.previewTitle")}
          </DialogTitle>
          <DialogDescription>{t("settings.previewDescription")}</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <PreviewMetric
            label={t("settings.previewSource")}
            value={inspection.source === "legacy"
              ? t("settings.previewSourceLegacy")
              : t("settings.previewSourceCurrent")}
          />
          <PreviewMetric
            label={t("settings.previewVersion")}
            value={`${inspection.sourceVersion} → ${inspection.targetVersion}`}
          />
          <PreviewMetric
            label={t("settings.previewDatabaseVersion")}
            value={inspection.databaseVersion?.toString() ?? t("settings.previewUnavailable")}
          />
          <PreviewMetric
            label={t("settings.previewTotalRecords")}
            value={totalRecords.toLocaleString(language === "id" ? "id-ID" : "en-US")}
          />
        </div>

        <div className="rounded-2xl border border-gray-200 p-4 dark:border-gray-700">
          <div className="mb-3 flex items-center justify-between gap-3">
            <span className="font-semibold">{t("settings.previewExportedAt")}</span>
            <span className="text-right text-gray-500 dark:text-gray-400">{exportedAt}</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="font-semibold">{t("settings.previewIntegrity")}</span>
            <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2.5 py-1 font-semibold text-success">
              <Icon name="verified" className="text-base" />
              {t("settings.previewIntegrityValid")}
            </span>
          </div>
        </div>

        <div>
          <h3 className="mb-3 font-semibold">{t("settings.previewTableCounts")}</h3>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {BACKUP_TABLE_NAMES.map((tableName) => (
              <div
                key={tableName}
                className="flex items-center justify-between rounded-xl bg-gray-50 px-3 py-2 dark:bg-gray-700/40"
              >
                <span>{t(TABLE_TRANSLATION_KEYS[tableName])}</span>
                <span className="font-mono font-semibold">{inspection.counts[tableName]}</span>
              </div>
            ))}
          </div>
        </div>

        {inspection.warnings.length > 0 && (
          <div className="rounded-2xl border border-warning/30 bg-warning/10 p-4 text-warning">
            <div className="mb-2 flex items-center gap-2 font-bold">
              <Icon name="warning" />
              {t("settings.previewMigrationWarnings")}
            </div>
            <ul className="list-disc space-y-1 pl-5 text-sm">
              {inspection.initializedEmptyTables.map((tableName) => (
                <li key={tableName}>
                  {t("settings.previewLegacyWarning", {
                    table: t(TABLE_TRANSLATION_KEYS[tableName]),
                  })}
                </li>
              ))}
            </ul>
          </div>
        )}

        {recoveryReady && (
          <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
            <div className="flex items-start gap-3">
              <Icon name="download_done" className="mt-0.5 text-primary" />
              <div>
                <p className="font-semibold">{t("settings.previewRecoveryCreated")}</p>
                <p className="mt-1 break-all font-mono text-xs text-gray-500 dark:text-gray-400">
                  {recoverySnapshot.fileName}
                </p>
              </div>
            </div>
          </div>
        )}

        <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-gray-200 p-4 dark:border-gray-700">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(event) => setConfirmed(event.target.checked)}
            disabled={isWorking}
            className="mt-1 h-4 w-4 accent-primary"
          />
          <span className="font-medium">
            {recoveryReady
              ? t("settings.previewConfirmRecoverySaved")
              : t("settings.previewConfirmReplace")}
          </span>
        </label>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={isWorking}>
            {t("settings.previewCancel")}
          </Button>
          {recoveryReady ? (
            <Button
              variant="destructive"
              onClick={onRestore}
              disabled={!confirmed || isWorking}
            >
              <Icon name="restore" className="mr-2" />
              {isWorking ? t("settings.mockRestoring") : t("settings.previewRestoreNow")}
            </Button>
          ) : (
            <Button
              onClick={onPrepareRecovery}
              disabled={!confirmed || isWorking}
            >
              <Icon name="download" className="mr-2" />
              {isWorking
                ? t("settings.previewPreparingRecovery")
                : t("settings.previewDownloadRecovery")}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PreviewMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-gray-50 p-3 dark:bg-gray-700/40">
      <div className="text-xs font-semibold uppercase tracking-wide text-gray-400">{label}</div>
      <div className="mt-1 font-bold">{value}</div>
    </div>
  );
}
