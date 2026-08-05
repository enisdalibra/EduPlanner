import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { RestorePreviewDialog } from "@/features/settings/components/RestorePreviewDialog";
import {
  BACKUP_TABLE_NAMES,
  type BackupInspection,
  type RecoverySnapshot,
} from "@/services/BackupService";

const counts = Object.fromEntries(
  BACKUP_TABLE_NAMES.map((tableName, index) => [tableName, index + 1]),
) as BackupInspection["counts"];

const legacyInspection: BackupInspection = {
  source: "legacy",
  sourceVersion: 0,
  targetVersion: 2,
  warnings: [{
    code: "initialized-empty-table",
    table: "schedules",
    message: "Schedules are missing.",
  }],
  initializedEmptyTables: ["schedules"],
  counts,
};

const recoverySnapshot: RecoverySnapshot = {
  payload: '{"recovery":true}',
  fileName: "eduplanner_pre_restore_20260724_090807.json",
  createdAt: "2026-07-24T02:08:07.000Z",
  counts,
};

describe("RestorePreviewDialog", () => {
  it("shows metadata, all table counts, migration warnings, and integrity status", () => {
    render(
      <RestorePreviewDialog
        open
        inspection={legacyInspection}
        recoverySnapshot={null}
        isWorking={false}
        onCancel={vi.fn()}
        onPrepareRecovery={vi.fn()}
        onRestore={vi.fn()}
      />,
    );

    expect(screen.getByText("Tinjau Restore Backup")).toBeInTheDocument();
    expect(screen.getByText("Format legacy")).toBeInTheDocument();
    expect(screen.getByText("0 → 2")).toBeInTheDocument();
    expect(screen.getByText("Valid")).toBeInTheDocument();
    expect(screen.getByText(/Tabel Jadwal tidak tersedia/)).toBeInTheDocument();
    expect(screen.getAllByText(/^\d+$/)).toHaveLength(BACKUP_TABLE_NAMES.length + 1);
  });

  it("requires explicit approval before downloading the recovery snapshot", () => {
    const onPrepareRecovery = vi.fn();
    render(
      <RestorePreviewDialog
        open
        inspection={legacyInspection}
        recoverySnapshot={null}
        isWorking={false}
        onCancel={vi.fn()}
        onPrepareRecovery={onPrepareRecovery}
        onRestore={vi.fn()}
      />,
    );

    const action = screen.getByRole("button", { name: /Unduh Recovery/i });
    expect(action).toBeDisabled();

    fireEvent.click(screen.getByRole("checkbox"));
    expect(action).toBeEnabled();
    fireEvent.click(action);
    expect(onPrepareRecovery).toHaveBeenCalledOnce();
  });

  it("requires a second acknowledgement after the recovery download", () => {
    const onRestore = vi.fn();
    const { rerender } = render(
      <RestorePreviewDialog
        open
        inspection={legacyInspection}
        recoverySnapshot={null}
        isWorking={false}
        onCancel={vi.fn()}
        onPrepareRecovery={vi.fn()}
        onRestore={onRestore}
      />,
    );
    fireEvent.click(screen.getByRole("checkbox"));

    rerender(
      <RestorePreviewDialog
        open
        inspection={legacyInspection}
        recoverySnapshot={recoverySnapshot}
        isWorking={false}
        onCancel={vi.fn()}
        onPrepareRecovery={vi.fn()}
        onRestore={onRestore}
      />,
    );

    expect(screen.getByText(recoverySnapshot.fileName)).toBeInTheDocument();
    const restore = screen.getByRole("button", { name: /Restore Sekarang/i });
    expect(restore).toBeDisabled();
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(restore);
    expect(onRestore).toHaveBeenCalledOnce();
  });
});
