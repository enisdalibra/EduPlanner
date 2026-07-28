import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PwaUpdateBanner } from '@/components/pwa/PwaUpdateBanner';
import { useUiStore } from '@/store/uiStore';

describe('PwaUpdateBanner', () => {
  beforeEach(() => {
    act(() => useUiStore.getState().setLanguage('id'));
  });

  it('requires an explicit update choice and allows postponing it', () => {
    const onDismiss = vi.fn();
    const onUpdate = vi.fn();

    render(
      <PwaUpdateBanner
        isUpdating={false}
        updateFailed={false}
        onDismiss={onDismiss}
        onUpdate={onUpdate}
      />,
    );

    expect(screen.getByText('Pembaruan EduPlanner tersedia')).toBeInTheDocument();
    expect(screen.getByText(/Simpan pekerjaan Anda terlebih dahulu/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Nanti' }));
    fireEvent.click(screen.getByRole('button', { name: 'Perbarui sekarang' }));

    expect(onDismiss).toHaveBeenCalledOnce();
    expect(onUpdate).toHaveBeenCalledOnce();
  });

  it('reports update progress and failure in both supported languages', () => {
    const { rerender } = render(
      <PwaUpdateBanner
        isUpdating
        updateFailed={false}
        onDismiss={vi.fn()}
        onUpdate={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: 'Memperbarui...' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Nanti' })).toBeDisabled();

    act(() => useUiStore.getState().setLanguage('en'));
    rerender(
      <PwaUpdateBanner
        isUpdating={false}
        updateFailed
        onDismiss={vi.fn()}
        onUpdate={vi.fn()}
      />,
    );

    expect(screen.getByText('An EduPlanner update is available')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent(
      'The update could not be applied',
    );
  });
});
