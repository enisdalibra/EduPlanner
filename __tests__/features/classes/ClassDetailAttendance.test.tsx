import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { format } from 'date-fns';
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

describe('ClassDetailView attendance tab', () => {
  const today = format(new Date(), 'yyyy-MM-dd');

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
    await db.students.bulkAdd([
      { id: 'student-a', name: 'Budi XIA', nis: '101' },
      { id: 'student-b', name: 'Siti XIB', nis: '201' },
      { id: 'student-archived', name: 'Andi Lama', nis: '301' },
    ]);
    await db.classEnrollments.bulkAdd([
      { id: 'enr-a', classId: 'class-a', studentId: 'student-a', enrolledAt: '2026-07-01' },
      { id: 'enr-b', classId: 'class-b', studentId: 'student-b', enrolledAt: '2026-07-01' },
      {
        id: 'enr-archived',
        classId: 'class-archived',
        studentId: 'student-archived',
        enrolledAt: '2025-07-01',
        endedAt: '2026-06-30',
      },
    ]);
    await db.attendances.bulkAdd([
      { id: 'att-a-1', classId: 'class-a', studentId: 'student-a', date: '2026-11-20', status: 'sakit' },
      { id: 'att-b-1', classId: 'class-b', studentId: 'student-b', date: '2026-11-21', status: 'alpa' },
      { id: 'att-b-today', classId: 'class-b', studentId: 'student-b', date: today, status: 'izin' },
      {
        id: 'att-archived-1',
        classId: 'class-archived',
        studentId: 'student-archived',
        date: '2026-06-10',
        status: 'hadir',
      },
    ]);
  });

  afterEach(async () => {
    await deleteTestDatabase();
  });

  it('shows only attendance and recap belonging to the opened class without a class selector', async () => {
    renderClassDetail('class-a');

    const attendanceTab = await screen.findByRole('tab', { name: /absensi/i });
    fireEvent.click(attendanceTab);

    await waitFor(() => {
      expect(screen.getByText('Budi XIA')).toBeInTheDocument();
    });

    expect(screen.queryByText('Siti XIB')).not.toBeInTheDocument();
    expect(screen.queryByText(/pilih kelas/i)).not.toBeInTheDocument();

    const recapTab = screen.getByRole('tab', { name: /rekap/i });
    fireEvent.click(recapTab);

    await waitFor(() => {
      expect(screen.getByText('S: 1')).toBeInTheDocument();
    });

    expect(screen.queryByText('Siti XIB')).not.toBeInTheDocument();
    expect(screen.getByText(/1 hari/i)).toBeInTheDocument();
  });

  it('saves daily attendance scoped strictly to the opened class', async () => {
    renderClassDetail('class-a');

    const attendanceTab = await screen.findByRole('tab', { name: /absensi/i });
    fireEvent.click(attendanceTab);

    await waitFor(() => {
      expect(screen.getByText('Budi XIA')).toBeInTheDocument();
    });

    const saveButton = await screen.findByRole('button', { name: /simpan presensi/i });
    fireEvent.click(screen.getByRole('button', { name: /^izin$/i }));
    fireEvent.click(saveButton);

    await waitFor(async () => {
      const saved = await db.attendances.where('[classId+date]').equals(['class-a', today]).toArray();
      expect(saved).toHaveLength(1);
      expect(saved[0]).toMatchObject({
        classId: 'class-a',
        studentId: 'student-a',
        date: today,
        status: 'izin',
      });
    });

    // Ensure class-b attendance for today remains untouched
    const otherClassToday = await db.attendances.where('[classId+date]').equals(['class-b', today]).toArray();
    expect(otherClassToday).toHaveLength(1);
    expect(otherClassToday[0].studentId).toBe('student-b');
  });

  it('renders archived class attendance in read-only mode', async () => {
    renderClassDetail('class-archived');

    const attendanceTab = await screen.findByRole('tab', { name: /absensi/i });
    fireEvent.click(attendanceTab);

    await waitFor(() => {
      expect(screen.getByText('Andi Lama')).toBeInTheDocument();
    });

    const saveButton = await screen.findByRole('button', { name: /simpan presensi/i });
    expect(saveButton).toBeDisabled();
    expect(screen.getByRole('button', { name: /^hadir$/i })).toBeDisabled();
  });
});
