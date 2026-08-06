import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { TimeTrackerWidget } from '@/components/shared/TimeTrackerWidget';

const mocks = vi.hoisted(() => ({
  getClasses: vi.fn(),
  startTimer: vi.fn(),
  stopTimer: vi.fn(),
  clearTimer: vi.fn(),
}));

vi.mock('@/features/classes/api', () => ({
  getClasses: mocks.getClasses,
}));

vi.mock('@/db/database', () => ({
  db: { subjects: { toArray: vi.fn(() => []) } },
}));

vi.mock('dexie-react-hooks', () => ({
  useLiveQuery: (query: () => unknown) => query(),
}));

vi.mock('@/store/timerStore', () => ({
  useTimerStore: () => ({
    activeTimer: null,
    startTimer: mocks.startTimer,
    stopTimer: mocks.stopTimer,
    clearTimer: mocks.clearTimer,
  }),
}));

vi.mock('@/features/teaching/timer', () => ({
  completeTeachingTimer: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

vi.mock('@/hooks/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string) => ({
      'timeTracker.btnStart': 'Mulai Mengajar',
      'timeTracker.title': 'Pencatat Waktu',
      'timeTracker.desc': 'Catat waktu mengajar.',
      'timeTracker.selectClass': 'Pilih Kelas *',
      'timeTracker.selectClassPlaceholder': 'Pilih Kelas...',
      'timeTracker.selectSubject': 'Mata Pelajaran',
      'timeTracker.selectSubjectPlaceholder': 'Semua / Umum',
      'timeTracker.general': '-- Umum --',
      'timeTracker.startTimer': 'Mulai Waktu',
    }[key] ?? key),
  }),
}));

describe('TimeTrackerWidget class picker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getClasses.mockReturnValue([
      { id: 'active-1', name: 'Kelas Aktif', academicPeriodId: 'period-1' },
    ]);
  });

  it('loads the picker from the active-class API without requesting archives', async () => {
    render(<TimeTrackerWidget />);

    fireEvent.click(screen.getByRole('button', { name: /Mulai Mengajar/ }));
    const [classPicker] = await screen.findAllByRole('combobox');
    fireEvent.click(classPicker);

    await waitFor(() => {
      expect(screen.getByRole('option', { name: 'Kelas Aktif' })).toBeInTheDocument();
    });
    expect(mocks.getClasses).toHaveBeenCalledWith();
    expect(screen.queryByText('Kelas Arsip')).not.toBeInTheDocument();
  });
});
