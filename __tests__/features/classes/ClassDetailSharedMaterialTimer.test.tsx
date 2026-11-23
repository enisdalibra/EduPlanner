import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { db } from '@/db/database';
import { ClassDetailView } from '@/features/classes/ClassDetailView';
import { useTimerStore } from '@/store/timerStore';
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

describe('ClassDetailView shared material timer isolation', () => {
  beforeEach(async () => {
    await resetTestDatabase();
    useTimerStore.getState().clearTimer();
    await db.classes.bulkAdd([
      { id: 'class-a', name: 'Kelas XA', academicPeriodId: 'period-test' },
      { id: 'class-b', name: 'Kelas XB', academicPeriodId: 'period-test' },
    ]);
    await db.notes.add({
      id: 'shared-mat-1',
      classIds: ['class-a', 'class-b'],
      title: 'CS10.1 — Pengantar Ilmu Komputer',
      content: 'Materi bersama',
      type: 'materi',
      createdAt: new Date('2026-11-23T00:00:00.000Z'),
    });
  });

  afterEach(async () => {
    useTimerStore.getState().clearTimer();
    await deleteTestDatabase();
  });

  it('does not show active stop-timer controls in Class B when timer is running for the same shared material in Class A', async () => {
    useTimerStore.getState().startTimer('class-a', 'none', 'shared-mat-1');

    renderClassDetail('class-b');

    expect(await screen.findByText('CS10.1 — Pengantar Ilmu Komputer')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /selesai|stop/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /mulai mengajar|start teaching/i })).toBeInTheDocument();
  });
});
