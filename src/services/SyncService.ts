import { BackupService } from '@/services/BackupService';
import { getSyncProvider } from '@/services/sync/providers';
import type {
  SyncProviderId,
  SyncProviderStatus,
  SyncRestoreResult,
  SyncUploadResult,
} from '@/services/sync/SyncProvider';

export class SyncService {
  static getProviderStatus(providerId: SyncProviderId): SyncProviderStatus {
    return getSyncProvider(providerId).getStatus();
  }

  static async uploadBackup(providerId: SyncProviderId): Promise<SyncUploadResult> {
    const payload = await BackupService.generateExportPayload();
    return getSyncProvider(providerId).uploadBackup(payload);
  }

  static async restoreFromProvider(providerId: SyncProviderId): Promise<SyncRestoreResult> {
    return getSyncProvider(providerId).restoreBackup();
  }
}
