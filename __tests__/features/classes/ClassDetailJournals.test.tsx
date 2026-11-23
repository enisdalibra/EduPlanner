import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { db } from '@/db/database';
import { ClassDetailView } from '@/features/classes/ClassDetailView';
import { deleteTestDatabase, resetTestDatabase } from '../../integration/testDatabase';

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

function renderClassDetail(classId: string) {
  return render(
    <MemoryRouter initialEntries={[`/classes/${classId}`]}>
      <Routes>
        <Route path="/classes/:id" element={<ClassDetailView />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('ClassDetailView teacher journals tab', () => {
  beforeEach(async () => {
    await resetTestDatabase();
    await db.classes.bulkAdd([
      { id: 'class-a', name: 'Kelas XIB', academicPeriodId: 'period-test' },
      { id: 'class-b', name: 'Kelas XIC', academicPeriodId: 'period-test' },
      {
        id: 'class-archived',
        name: 'Kelas Lama',
        academicPeriodId: 'period-test',
        archivedAt: '2026-06-30T00:00:00.000Z',
      },
    ]);
    await db.notes.bulkAdd([
      {
        id: 'journal-a',
        classId: 'class-a',
        title: 'Jurnal Khusus XIB',
        content: 'Catatan pertemuan kelas XIB',
        type: 'guru',
        createdAt: new Date('2026-11-20T08:00:00Z'),
      },
      {
        id: 'journal-b',
        classId: 'class-b',
        title: 'Jurnal Khusus XIC',
        content: 'Catatan pertemuan kelas XIC',
        type: 'guru',
        createdAt: new Date('2026-11-21T08:00:00Z'),
      },
      {
        id: 'journal-general',
        title: 'Jurnal Umum Semua Kelas',
        content: 'Catatan umum tanpa kelas',
        type: 'guru',
        createdAt: new Date('2026-11-22T08:00:00Z'),
      },
      {
        id: 'material-a',
        classIds: ['class-a'],
        title: 'Materi XIB',
        content: 'Isi materi XIB',
        type: 'materi',
        createdAt: new Date('2026-11-22T09:00:00Z'),
      },
    ]);
  });

  afterEach(async () => {
    await deleteTestDatabase();
  });

  it('shows only teacher journals belonging to the opened class', async () => {
    renderClassDetail('class-a');

    const journalsTab = await screen.findByRole('tab', { name: /jurnal guru/i });
    fireEvent.click(journalsTab);

    await waitFor(() => {
      expect(screen.getByText('Jurnal Khusus XIB')).toBeInTheDocument();
    });

    expect(screen.queryByText('Jurnal Khusus XIC')).not.toBeInTheDocument();
    expect(screen.queryByText('Jurnal Umum Semua Kelas')).not.toBeInTheDocument();
    expect(screen.queryByText('Materi XIB')).not.toBeInTheDocument();
  });

  it('creates a new teacher journal scoped directly to the opened class', async () => {
    renderClassDetail('class-a');

    const journalsTab = await screen.findByRole('tab', { name: /jurnal guru/i });
    fireEvent.click(journalsTab);

    const addButton = await screen.findByRole('button', { name: /tulis catatan/i });
    fireEvent.click(addButton);

    const titleInput = await screen.findByPlaceholderText(/jurnal kelas xii/i);
    const contentInput = screen.getByPlaceholderText(/tulis catatan jurnal/i);
    const classInput = screen.getByDisplayValue('Kelas XIB');

    expect(classInput).toBeDisabled();

    fireEvent.change(titleInput, { target: { value: 'Jurnal Baru XIB' } });
    fireEvent.change(contentInput, { target: { value: 'Refleksi mengajar hari ini di XIB.' } });
    fireEvent.click(screen.getByRole('button', { name: /simpan/i }));

    await waitFor(() => {
      expect(screen.getByText('Jurnal Baru XIB')).toBeInTheDocument();
    });

    const saved = await db.notes.where('[classId+type]').equals(['class-a', 'guru']).toArray();
    expect(saved.some((n) => n.title === 'Jurnal Baru XIB' && n.classId === 'class-a')).toBe(true);
  });

  it('disables adding journals when the opened class is archived', async () => {
    renderClassDetail('class-archived');

    const journalsTab = await screen.findByRole('tab', { name: /jurnal guru/i });
    fireEvent.click(journalsTab);

    const addButton = await screen.findByRole('button', { name: /tulis catatan/i });
    expect(addButton).toBeDisabled();
  });
});
