import type {
  SyncProvider,
  SyncProviderStatus,
  SyncRestoreResult,
  SyncUploadResult,
} from '@/services/sync/SyncProvider';

export const MOCK_BACKUP_PAYLOAD_KEY = 'eduplanner_mock_backup_payload';
export const MOCK_BACKUP_TIME_KEY = 'eduplanner_mock_cloud_backup_time';

export class LocalMockSyncProvider implements SyncProvider {
  readonly id = 'mock' as const;

  constructor(private readonly storage: Storage) {}

  getStatus(): SyncProviderStatus {
    return {
      id: this.id,
      state: 'mock',
      label: 'Local Mock (Development Only)',
      canSync: true,
      description: 'Simulation only. Backup data remains in this browser and is not uploaded to cloud storage.',
    };
  }

  async uploadBackup(payload: string): Promise<SyncUploadResult> {
    const uploadedAt = Date.now();
    this.storage.setItem(MOCK_BACKUP_PAYLOAD_KEY, payload);
    this.storage.setItem(MOCK_BACKUP_TIME_KEY, String(uploadedAt));
    return { providerId: this.id, uploadedAt };
  }

  async restoreBackup(): Promise<SyncRestoreResult> {
    const payload = this.storage.getItem(MOCK_BACKUP_PAYLOAD_KEY);
    if (payload === null) return { status: 'empty', providerId: this.id };

    const storedTimestamp = Number(this.storage.getItem(MOCK_BACKUP_TIME_KEY));
    return {
      status: 'available',
      providerId: this.id,
      payload,
      uploadedAt: Number.isFinite(storedTimestamp) && storedTimestamp > 0 ? storedTimestamp : 0,
    };
  }
}
