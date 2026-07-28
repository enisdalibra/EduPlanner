import { beforeEach, describe, expect, it } from 'vitest';
import { migratePersistedSyncState, useSyncStore } from '@/store/syncStore';

describe('syncStore', () => {
  beforeEach(() => {
    useSyncStore.setState({
      autoSyncEnabled: false,
      lastSynced: null,
      isSyncing: false,
      provider: 'disconnected',
    });
  });

  it('migrates legacy null and gdrive providers to an explicit disconnected state', () => {
    expect(migratePersistedSyncState({
      provider: null,
      autoSyncEnabled: true,
      lastSynced: 100,
    })).toEqual({
      provider: 'disconnected',
      autoSyncEnabled: false,
      lastSynced: 100,
    });
    expect(migratePersistedSyncState({ provider: 'gdrive', autoSyncEnabled: true })).toEqual({
      provider: 'disconnected',
      autoSyncEnabled: false,
      lastSynced: null,
    });
  });

  it('preserves valid mock settings and prevents auto-sync while disconnected', () => {
    expect(migratePersistedSyncState({
      provider: 'mock',
      autoSyncEnabled: true,
      lastSynced: 200,
    })).toEqual({ provider: 'mock', autoSyncEnabled: true, lastSynced: 200 });

    useSyncStore.getState().setAutoSync(true);
    expect(useSyncStore.getState().autoSyncEnabled).toBe(false);

    useSyncStore.getState().setProvider('mock');
    useSyncStore.getState().setAutoSync(true);
    expect(useSyncStore.getState().autoSyncEnabled).toBe(true);

    useSyncStore.getState().setProvider('disconnected');
    expect(useSyncStore.getState().autoSyncEnabled).toBe(false);
  });
});
