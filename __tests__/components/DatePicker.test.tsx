import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { DatePicker } from '@/components/ui/date-picker';

describe('DatePicker', () => {
  it('commits a calendar selection only after confirmation', async () => {
    const onChange = vi.fn();
    render(<DatePicker value="2026-08-10" onChange={onChange} />);

    fireEvent.click(screen.getByRole('button', { name: /10 Agt 2026/ }));
    await screen.findByText('Pilih tanggal');
    const day = document.querySelector<HTMLButtonElement>('[data-day="15/8/2026"]');
    expect(day).not.toBeNull();
    fireEvent.click(day!);

    expect(onChange).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'OK' }));
    expect(onChange).toHaveBeenCalledWith('2026-08-15');
  });

  it('discards a draft date when cancelled', async () => {
    const onChange = vi.fn();
    render(<DatePicker value="2026-08-10" onChange={onChange} />);

    fireEvent.click(screen.getByRole('button', { name: /10 Agt 2026/ }));
    fireEvent.click(await screen.findByRole('button', { name: 'Hari ini' }));
    fireEvent.click(screen.getByRole('button', { name: 'Batal' }));

    expect(onChange).not.toHaveBeenCalled();
  });

  it('can clear an optional date', async () => {
    const onChange = vi.fn();
    render(<DatePicker value="2026-08-10" onChange={onChange} />);

    fireEvent.click(screen.getByRole('button', { name: /10 Agt 2026/ }));
    fireEvent.click(await screen.findByRole('button', { name: 'Hapus' }));

    expect(onChange).toHaveBeenCalledWith('');
  });
});
