import { useEffect } from 'react';
import { useSyncStore } from '@/store/syncStore';
import { SyncService } from '@/services/SyncService';

// Sync interval: 5 minutes
const SYNC_INTERVAL_MS = 5 * 60 * 1000;

export function useAutoSync() {
  const { autoSyncEnabled, isSyncing, provider, setIsSyncing, setLastSynced } = useSyncStore();

  useEffect(() => {
    if (!autoSyncEnabled || provider === 'disconnected') return;

    const performSync = async () => {
      if (isSyncing) return;
      
      try {
        setIsSyncing(true);
        const result = await SyncService.uploadBackup(provider);
        setLastSynced(result.uploadedAt);
      } catch (error) {
        console.error("Auto-sync failed", error);
        // We don't want to spam toasts for background failures, maybe just console log
      } finally {
        setIsSyncing(false);
      }
    };

    const intervalId = setInterval(performSync, SYNC_INTERVAL_MS);

    return () => {
      clearInterval(intervalId);
    };
  }, [autoSyncEnabled, isSyncing, provider, setIsSyncing, setLastSynced]);
}
