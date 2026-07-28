import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { SyncProviderId } from '@/services/sync/SyncProvider';

export interface SyncState {
  autoSyncEnabled: boolean;
  setAutoSync: (enabled: boolean) => void;
  
  lastSynced: number | null;
  setLastSynced: (timestamp: number) => void;
  
  isSyncing: boolean;
  setIsSyncing: (syncing: boolean) => void;
  
  provider: SyncProviderId;
  setProvider: (provider: SyncProviderId) => void;
}

type PersistedSyncState = Pick<SyncState, 'autoSyncEnabled' | 'lastSynced' | 'provider'>;

export function migratePersistedSyncState(value: unknown): PersistedSyncState {
  const persisted = value && typeof value === 'object'
    ? value as Partial<Record<keyof PersistedSyncState, unknown>>
    : {};
  const provider: SyncProviderId = persisted.provider === 'mock' ? 'mock' : 'disconnected';

  return {
    provider,
    autoSyncEnabled: provider === 'mock' && persisted.autoSyncEnabled === true,
    lastSynced: typeof persisted.lastSynced === 'number' ? persisted.lastSynced : null,
  };
}

export const useSyncStore = create<SyncState>()(
  persist(
    (set) => ({
      autoSyncEnabled: false,
      setAutoSync: (enabled) => set((state) => ({
        autoSyncEnabled: state.provider === 'mock' ? enabled : false,
      })),
      
      lastSynced: null,
      setLastSynced: (timestamp) => set({ lastSynced: timestamp }),
      
      isSyncing: false,
      setIsSyncing: (syncing) => set({ isSyncing: syncing }),
      
      provider: 'disconnected',
      setProvider: (provider) => set((state) => ({
        provider,
        autoSyncEnabled: provider === 'mock' ? state.autoSyncEnabled : false,
      })),
    }),
    {
      name: 'eduplanner-sync-store',
      version: 1,
      migrate: migratePersistedSyncState,
      partialize: (state) => ({ 
        autoSyncEnabled: state.autoSyncEnabled, 
        lastSynced: state.lastSynced,
        provider: state.provider 
      }), // Don't persist isSyncing
    }
  )
);
