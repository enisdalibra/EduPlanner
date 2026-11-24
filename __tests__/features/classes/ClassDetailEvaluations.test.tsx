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

describe('ClassDetailView evaluations tab', () => {
  beforeEach(async () => {
    await resetTestDatabase();
    await db.classes.bulkAdd([
      { id: 'class-a', name: 'Kelas XIA', academicPeriodId: 'period-test' },
      { id: 'class-b', name: 'Kelas XIB', academicPeriodId: 'period-test' },
      {
        id: 'class-archived',
        name: 'Kelas Lama',
        academicPeriodId: 'period-test',
        archivedAt: '2026-06-30T00:00:00.000Z',
      },
    ]);
    await db.notes.bulkAdd([
      {
        id: 'eval-a',
        classId: 'class-a',
        title: 'Evaluasi Khusus XIA',
        content: '## Soal 1\nApa itu AI?\n\n* Kecerdasan Buatan [*]\n* Lainnya',
        type: 'evaluasi',
        createdAt: new Date('2026-11-20T08:00:00Z'),
      },
      {
        id: 'eval-b',
        classId: 'class-b',
        title: 'Evaluasi Khusus XIB',
        content: 'Soal untuk kelas XIB',
        type: 'evaluasi',
        createdAt: new Date('2026-11-21T08:00:00Z'),
      },
      {
        id: 'eval-general',
        title: 'Evaluasi Umum Semua Kelas',
        content: 'Soal umum tanpa kelas',
        type: 'evaluasi',
        createdAt: new Date('2026-11-22T08:00:00Z'),
      },
      {
        id: 'journal-a',
        classId: 'class-a',
        title: 'Jurnal XIA',
        content: 'Catatan jurnal XIA',
        type: 'guru',
        createdAt: new Date('2026-11-22T09:00:00Z'),
      },
    ]);
  });

  afterEach(async () => {
    await deleteTestDatabase();
  });

  it('places the evaluations tab directly after the teacher journals tab and shows only evaluations for the opened class', async () => {
    renderClassDetail('class-a');

    const tabs = await screen.findAllByRole('tab');
    const tabLabels = tabs.map((tab) => tab.textContent?.trim() ?? '');
    const journalsIndex = tabLabels.findIndex((label) => /jurnal guru/i.test(label));
    const evaluationsIndex = tabLabels.findIndex((label) => /soal evaluasi/i.test(label));

    expect(journalsIndex).toBeGreaterThan(-1);
    expect(evaluationsIndex).toBe(journalsIndex + 1);

    fireEvent.click(tabs[evaluationsIndex]);

    await waitFor(() => {
      expect(screen.getByText('Evaluasi Khusus XIA')).toBeInTheDocument();
    });

    expect(screen.queryByText('Evaluasi Khusus XIB')).not.toBeInTheDocument();
    expect(screen.queryByText('Evaluasi Umum Semua Kelas')).not.toBeInTheDocument();
    expect(screen.queryByText('Jurnal XIA')).not.toBeInTheDocument();
  });

  it('creates a new evaluation scoped directly to the opened class', async () => {
    renderClassDetail('class-a');

    const evaluationsTab = await screen.findByRole('tab', { name: /soal evaluasi/i });
    fireEvent.click(evaluationsTab);

    const addButton = await screen.findByRole('button', { name: /buat soal/i });
    fireEvent.click(addButton);

    const titleInput = await screen.findByPlaceholderText(/soal uts matematika/i);
    const contentInput = screen.getByPlaceholderText(/tulis butir soal evaluasi/i);
    const classInput = await screen.findByDisplayValue('Kelas XIA');

    expect(classInput).toBeDisabled();

    fireEvent.change(titleInput, { target: { value: 'Evaluasi Baru XIA' } });
    fireEvent.change(contentInput, { target: { value: '## Soal 1\nPertanyaan?\n\n* A [*]\n* B' } });
    fireEvent.click(screen.getByRole('button', { name: /simpan/i }));

    await waitFor(() => {
      expect(screen.getByText('Evaluasi Baru XIA')).toBeInTheDocument();
    });

    const saved = await db.notes.where('[classId+type]').equals(['class-a', 'evaluasi']).toArray();
    expect(saved.some((n) => n.title === 'Evaluasi Baru XIA' && n.classId === 'class-a')).toBe(true);
  });

  it('disables adding evaluations when the opened class is archived', async () => {
    renderClassDetail('class-archived');

    const evaluationsTab = await screen.findByRole('tab', { name: /soal evaluasi/i });
    fireEvent.click(evaluationsTab);

    const addButton = await screen.findByRole('button', { name: /buat soal/i });
    expect(addButton).toBeDisabled();
  });
});
