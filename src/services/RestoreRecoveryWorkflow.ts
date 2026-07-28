import {
  BackupService,
  type BackupInspection,
  type RecoverySnapshot,
  type RestoreResult,
} from "@/services/BackupService";

export interface RestoreRecoveryWorkflowOptions {
  downloadRecoverySnapshot: (snapshot: RecoverySnapshot) => void | Promise<void>;
  confirmRecoverySaved: (snapshot: RecoverySnapshot) => boolean | Promise<boolean>;
}

export interface PreparedRestore {
  payload: string | unknown;
  inspection: BackupInspection;
  recoverySnapshot: RecoverySnapshot;
}

export type RestoreRecoveryWorkflowResult =
  | {
      status: "cancelled";
      inspection: BackupInspection;
      recoverySnapshot: RecoverySnapshot;
    }
  | {
      status: "restored";
      inspection: BackupInspection;
      recoverySnapshot: RecoverySnapshot;
      restore: RestoreResult;
    };

export class RestoreRecoveryWorkflow {
  static async prepare(
    payload: string | unknown,
    downloadRecoverySnapshot: RestoreRecoveryWorkflowOptions["downloadRecoverySnapshot"],
  ): Promise<PreparedRestore> {
    const inspection = BackupService.inspectExportPayload(payload);
    const recoverySnapshot = await BackupService.createRecoverySnapshot();
    await downloadRecoverySnapshot(recoverySnapshot);
    return { payload, inspection, recoverySnapshot };
  }

  static async complete(prepared: PreparedRestore): Promise<RestoreResult> {
    return BackupService.restoreExportPayload(prepared.payload);
  }

  static async run(
    payload: string | unknown,
    options: RestoreRecoveryWorkflowOptions,
  ): Promise<RestoreRecoveryWorkflowResult> {
    const prepared = await this.prepare(payload, options.downloadRecoverySnapshot);
    const confirmed = await options.confirmRecoverySaved(prepared.recoverySnapshot);
    if (!confirmed) {
      return {
        status: "cancelled",
        inspection: prepared.inspection,
        recoverySnapshot: prepared.recoverySnapshot,
      };
    }

    const restore = await this.complete(prepared);
    return {
      status: "restored",
      inspection: prepared.inspection,
      recoverySnapshot: prepared.recoverySnapshot,
      restore,
    };
  }
}
