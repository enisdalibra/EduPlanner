import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { db } from '@/db/database';
import { MaterialEditView } from '@/features/notes/MaterialEditView';
import { deleteTestDatabase, resetTestDatabase } from '../../integration/testDatabase';

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

vi.mock('@/hooks/useTheme', () => ({
  useTheme: () => ({ theme: 'light', setTheme: vi.fn() }),
}));

function renderMaterialEdit(route: string) {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <Routes>
        <Route path="/materials/new" element={<MaterialEditView />} />
        <Route path="/materials/:id/edit" element={<MaterialEditView />} />
        <Route path="/materials" element={<div>Materials List</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('MaterialEditView multi-class and subject assignment', () => {
  beforeEach(async () => {
    await resetTestDatabase();
    await db.classes.bulkAdd([
      { id: 'kelas-xb', name: 'Kelas XB', academicPeriodId: 'period-test' },
      { id: 'kelas-xa', name: 'KelasXA', academicPeriodId: 'period-test' },
      {
        id: 'kelas-arsip',
        name: 'Kelas Arsip',
        academicPeriodId: 'period-test',
        archivedAt: '2026-06-30T00:00:00.000Z',
      },
    ]);
    await db.subjects.bulkAdd([
      { id: 'subj-info', name: 'Informatika X' },
      { id: 'subj-math', name: 'Matematika X' },
    ]);
  });

  afterEach(async () => {
    await deleteTestDatabase();
  });

  it('allows assigning a material to two classes and a subject directly even without student enrollments', async () => {
    renderMaterialEdit('/materials/new');

    const titleInput = await screen.findByPlaceholderText(/Misal: Bab 1/i);
    fireEvent.change(titleInput, { target: { value: 'CS10.1 — Pengantar Ilmu Komputer' } });

    const btnXB = await screen.findByRole('button', { name: 'Kelas XB' });
    const btnXA = await screen.findByRole('button', { name: 'KelasXA' });
    fireEvent.click(btnXB);
    fireEvent.click(btnXA);

    const subjectSelect = screen.getByRole('combobox') as HTMLSelectElement;
    // Subject must remain selectable even when the selected classes have no student enrollments yet
    expect(screen.getByRole('option', { name: 'Informatika X' })).toBeInTheDocument();
    fireEvent.change(subjectSelect, { target: { value: 'subj-info' } });
    expect(subjectSelect.value).toBe('subj-info');

    const saveButton = screen.getByRole('button', { name: /simpan|save/i });
    fireEvent.click(saveButton);

    await waitFor(async () => {
      const notes = await db.notes.where('type').equals('materi').toArray();
      expect(notes).toHaveLength(1);
      expect(notes[0]).toMatchObject({
        title: 'CS10.1 — Pengantar Ilmu Komputer',
        classIds: ['kelas-xb', 'kelas-xa'],
        subjectId: 'subj-info',
      });
    });
  });

  it('preserves existing subject selection in UI and DB when assigning two classes without student enrollments', async () => {
    await db.notes.add({
      id: 'mat-1',
      title: 'CS10.1',
      content: 'Konten materi',
      type: 'materi',
      classIds: [],
      subjectId: 'subj-info',
      createdAt: new Date('2026-11-23T00:00:00.000Z'),
    });

    renderMaterialEdit('/materials/mat-1/edit');

    const subjectSelect = (await screen.findByRole('combobox')) as HTMLSelectElement;
    await waitFor(() => {
      expect(subjectSelect.value).toBe('subj-info');
    });

    fireEvent.click(await screen.findByRole('button', { name: 'Kelas XB' }));
    fireEvent.click(await screen.findByRole('button', { name: 'KelasXA' }));

    // Must NOT fall back to "none" ("Tidak Terikat Mapel") visually or in state
    expect(subjectSelect.value).toBe('subj-info');

    fireEvent.click(screen.getByRole('button', { name: /simpan|save/i }));

    await waitFor(async () => {
      const updated = await db.notes.get('mat-1');
      expect(updated).toMatchObject({
        classIds: ['kelas-xb', 'kelas-xa'],
        subjectId: 'subj-info',
      });
    });
  });

  it('surfaces archived classes already assigned to a material so they can be toggled off', async () => {
    await db.notes.add({
      id: 'mat-archived',
      title: 'Materi Lama',
      content: 'Konten',
      type: 'materi',
      classIds: ['kelas-arsip', 'kelas-xa'],
      createdAt: new Date('2026-11-23T00:00:00.000Z'),
    });

    renderMaterialEdit('/materials/mat-archived/edit');

    const archivedBtn = await screen.findByRole('button', { name: /Kelas Arsip/i });
    expect(archivedBtn).toHaveAttribute('aria-pressed', 'true');
  });
});
