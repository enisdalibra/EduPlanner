import {
  SyncProviderUnavailableError,
  type SyncProvider,
  type SyncProviderStatus,
  type SyncRestoreResult,
  type SyncUploadResult,
} from '@/services/sync/SyncProvider';

export class DisconnectedSyncProvider implements SyncProvider {
  readonly id = 'disconnected' as const;

  getStatus(): SyncProviderStatus {
    return {
      id: this.id,
      state: 'disconnected',
      label: 'Disconnected',
      canSync: false,
      description: 'No remote backup provider is connected.',
    };
  }

  async uploadBackup(_payload: string): Promise<SyncUploadResult> {
    throw new SyncProviderUnavailableError(this.id);
  }

  async restoreBackup(): Promise<SyncRestoreResult> {
    return {
      status: 'unavailable',
      providerId: this.id,
      reason: 'No remote backup provider is connected.',
    };
  }
}
