export type SyncProviderId = 'disconnected' | 'mock';

export interface SyncProviderStatus {
  id: SyncProviderId;
  state: 'disconnected' | 'mock';
  label: string;
  canSync: boolean;
  description: string;
}

export interface SyncUploadResult {
  providerId: SyncProviderId;
  uploadedAt: number;
}

export type SyncRestoreResult =
  | {
      status: 'available';
      providerId: SyncProviderId;
      payload: string;
      uploadedAt: number;
    }
  | {
      status: 'empty';
      providerId: SyncProviderId;
    }
  | {
      status: 'unavailable';
      providerId: SyncProviderId;
      reason: string;
    };

export interface SyncProvider {
  readonly id: SyncProviderId;
  getStatus(): SyncProviderStatus;
  uploadBackup(payload: string): Promise<SyncUploadResult>;
  restoreBackup(): Promise<SyncRestoreResult>;
}

export class SyncProviderUnavailableError extends Error {
  constructor(providerId: SyncProviderId) {
    super(`Sync provider "${providerId}" is unavailable.`);
    this.name = 'SyncProviderUnavailableError';
  }
}
