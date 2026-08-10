import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { TimePicker } from '@/components/ui/time-picker';

describe('TimePicker', () => {
  it('keeps changes local until the user confirms them', async () => {
    const onChange = vi.fn();
    render(<TimePicker value="08:30" onChange={onChange} />);

    fireEvent.click(screen.getByRole('button', { name: '08:30' }));
    await screen.findByText('Pilih waktu');
    fireEvent.click(screen.getByRole('button', { name: 'PM' }));

    expect(onChange).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'OK' }));
    expect(onChange).toHaveBeenCalledWith('20:30');
  });

  it('supports precise keyboard-style hour and minute entry', async () => {
    const onChange = vi.fn();
    render(<TimePicker value="09:15" onChange={onChange} />);

    fireEvent.click(screen.getByRole('button', { name: '09:15' }));
    fireEvent.click(await screen.findByTitle('Gunakan input angka'));
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Jam' }), { target: { value: '7' } });
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Menit' }), { target: { value: '42' } });
    fireEvent.click(screen.getByRole('button', { name: 'OK' }));

    await waitFor(() => expect(onChange).toHaveBeenCalledWith('07:42'));
  });

  it('discards draft changes when cancelled', async () => {
    const onChange = vi.fn();
    render(<TimePicker value="08:00" onChange={onChange} />);

    fireEvent.click(screen.getByRole('button', { name: '08:00' }));
    fireEvent.click(await screen.findByRole('button', { name: 'PM' }));
    fireEvent.click(screen.getByRole('button', { name: 'Batal' }));

    expect(onChange).not.toHaveBeenCalled();
  });
});
