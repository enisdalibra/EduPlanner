import { DisconnectedSyncProvider } from '@/services/sync/DisconnectedSyncProvider';
import { LocalMockSyncProvider } from '@/services/sync/LocalMockSyncProvider';
import type { SyncProvider, SyncProviderId } from '@/services/sync/SyncProvider';

const disconnectedProvider = new DisconnectedSyncProvider();

export function getSyncProvider(providerId: SyncProviderId): SyncProvider {
  if (providerId === 'mock') return new LocalMockSyncProvider(globalThis.localStorage);
  return disconnectedProvider;
}
