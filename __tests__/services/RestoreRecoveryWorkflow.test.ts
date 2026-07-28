import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  inspect: vi.fn(),
  createSnapshot: vi.fn(),
  restore: vi.fn(),
}));

vi.mock("@/services/BackupService", () => ({
  BackupService: {
    inspectExportPayload: mocks.inspect,
    createRecoverySnapshot: mocks.createSnapshot,
    restoreExportPayload: mocks.restore,
  },
}));

import { RestoreRecoveryWorkflow } from "@/services/RestoreRecoveryWorkflow";

const inspection = {
  source: "current" as const,
  sourceVersion: 1,
  targetVersion: 1 as const,
  exportedAt: "2026-07-24T00:00:00.000Z",
  databaseVersion: 7,
  warnings: [],
  initializedEmptyTables: [],
  counts: {},
};
const recoverySnapshot = {
  payload: '{"recovery":true}',
  fileName: "eduplanner_pre_restore_20260724_090807.json",
  createdAt: "2026-07-24T02:08:07.000Z",
  counts: {},
};

describe("RestoreRecoveryWorkflow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.inspect.mockReturnValue(inspection);
    mocks.createSnapshot.mockResolvedValue(recoverySnapshot);
    mocks.restore.mockResolvedValue(inspection);
  });

  it("validates the candidate before creating a recovery snapshot", async () => {
    mocks.inspect.mockImplementation(() => {
      throw new Error("invalid candidate");
    });

    await expect(RestoreRecoveryWorkflow.run("invalid", {
      downloadRecoverySnapshot: vi.fn(),
      confirmRecoverySaved: vi.fn(),
    })).rejects.toThrow("invalid candidate");

    expect(mocks.createSnapshot).not.toHaveBeenCalled();
    expect(mocks.restore).not.toHaveBeenCalled();
  });

  it("does not restore when recovery download fails", async () => {
    await expect(RestoreRecoveryWorkflow.run("candidate", {
      downloadRecoverySnapshot: () => {
        throw new Error("download failed");
      },
      confirmRecoverySaved: vi.fn(),
    })).rejects.toThrow("download failed");

    expect(mocks.restore).not.toHaveBeenCalled();
  });

  it("does not download or restore when snapshot creation fails", async () => {
    const download = vi.fn();
    mocks.createSnapshot.mockRejectedValue(new Error("snapshot failed"));

    await expect(RestoreRecoveryWorkflow.run("candidate", {
      downloadRecoverySnapshot: download,
      confirmRecoverySaved: vi.fn(),
    })).rejects.toThrow("snapshot failed");

    expect(download).not.toHaveBeenCalled();
    expect(mocks.restore).not.toHaveBeenCalled();
  });

  it("returns cancelled after download when the user does not confirm", async () => {
    const download = vi.fn();
    const result = await RestoreRecoveryWorkflow.run("candidate", {
      downloadRecoverySnapshot: download,
      confirmRecoverySaved: () => false,
    });

    expect(download).toHaveBeenCalledWith(recoverySnapshot);
    expect(result.status).toBe("cancelled");
    expect(mocks.restore).not.toHaveBeenCalled();
  });

  it("restores only after snapshot download and explicit confirmation", async () => {
    const order: string[] = [];
    mocks.createSnapshot.mockImplementation(async () => {
      order.push("snapshot");
      return recoverySnapshot;
    });
    mocks.restore.mockImplementation(async () => {
      order.push("restore");
      return inspection;
    });

    const result = await RestoreRecoveryWorkflow.run("candidate", {
      downloadRecoverySnapshot: () => {
        order.push("download");
      },
      confirmRecoverySaved: () => {
        order.push("confirm");
        return true;
      },
    });

    expect(order).toEqual(["snapshot", "download", "confirm", "restore"]);
    expect(result.status).toBe("restored");
  });
});
