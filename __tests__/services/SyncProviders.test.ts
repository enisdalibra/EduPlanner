import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DisconnectedSyncProvider } from '@/services/sync/DisconnectedSyncProvider';
import {
  LocalMockSyncProvider,
  MOCK_BACKUP_PAYLOAD_KEY,
  MOCK_BACKUP_TIME_KEY,
} from '@/services/sync/LocalMockSyncProvider';
import { SyncProviderUnavailableError } from '@/services/sync/SyncProvider';

describe('sync providers', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('exposes disconnected as unavailable without pretending restore data exists', async () => {
    const provider = new DisconnectedSyncProvider();

    expect(provider.getStatus()).toMatchObject({
      id: 'disconnected',
      state: 'disconnected',
      canSync: false,
    });
    await expect(provider.uploadBackup('{}')).rejects.toBeInstanceOf(
      SyncProviderUnavailableError,
    );
    await expect(provider.restoreBackup()).resolves.toEqual({
      status: 'unavailable',
      providerId: 'disconnected',
      reason: 'No remote backup provider is connected.',
    });
  });

  it('round-trips a payload through the explicitly local mock provider', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(1_721_344_500_000);
    const provider = new LocalMockSyncProvider(localStorage);

    const upload = await provider.uploadBackup('{"version":1}');
    const restore = await provider.restoreBackup();

    expect(provider.getStatus()).toMatchObject({ id: 'mock', state: 'mock', canSync: true });
    expect(upload).toEqual({ providerId: 'mock', uploadedAt: 1_721_344_500_000 });
    expect(localStorage.getItem(MOCK_BACKUP_PAYLOAD_KEY)).toBe('{"version":1}');
    expect(localStorage.getItem(MOCK_BACKUP_TIME_KEY)).toBe('1721344500000');
    expect(restore).toEqual({
      status: 'available',
      providerId: 'mock',
      payload: '{"version":1}',
      uploadedAt: 1_721_344_500_000,
    });
  });

  it('uses an explicit empty restore result when no mock backup exists', async () => {
    const provider = new LocalMockSyncProvider(localStorage);

    await expect(provider.restoreBackup()).resolves.toEqual({
      status: 'empty',
      providerId: 'mock',
    });
  });
});
