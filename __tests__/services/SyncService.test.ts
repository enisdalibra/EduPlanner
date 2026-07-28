import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  generateExportPayload: vi.fn(),
  getSyncProvider: vi.fn(),
  getStatus: vi.fn(),
  uploadBackup: vi.fn(),
  restoreBackup: vi.fn(),
}));

vi.mock('@/services/BackupService', () => ({
  BackupService: { generateExportPayload: mocks.generateExportPayload },
}));

vi.mock('@/services/sync/providers', () => ({
  getSyncProvider: mocks.getSyncProvider,
}));

import { SyncService } from '@/services/SyncService';

describe('SyncService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSyncProvider.mockReturnValue({
      getStatus: mocks.getStatus,
      uploadBackup: mocks.uploadBackup,
      restoreBackup: mocks.restoreBackup,
    });
  });

  it('generates a complete backup before handing it to the selected provider', async () => {
    mocks.generateExportPayload.mockResolvedValue('{"backup":true}');
    mocks.uploadBackup.mockResolvedValue({ providerId: 'mock', uploadedAt: 123 });

    await expect(SyncService.uploadBackup('mock')).resolves.toEqual({
      providerId: 'mock',
      uploadedAt: 123,
    });

    expect(mocks.getSyncProvider).toHaveBeenCalledWith('mock');
    expect(mocks.uploadBackup).toHaveBeenCalledWith('{"backup":true}');
  });

  it('returns the provider restore contract without converting it to any or null', async () => {
    const restoreResult = {
      status: 'available',
      providerId: 'mock',
      payload: '{"backup":true}',
      uploadedAt: 123,
    };
    mocks.restoreBackup.mockResolvedValue(restoreResult);

    await expect(SyncService.restoreFromProvider('mock')).resolves.toEqual(restoreResult);
    expect(mocks.getSyncProvider).toHaveBeenCalledWith('mock');
  });

  it('exposes the selected provider status to the UI', () => {
    mocks.getStatus.mockReturnValue({
      id: 'disconnected',
      state: 'disconnected',
      canSync: false,
      label: 'Disconnected',
      description: 'No provider.',
    });

    expect(SyncService.getProviderStatus('disconnected')).toMatchObject({
      state: 'disconnected',
      canSync: false,
    });
  });
});
