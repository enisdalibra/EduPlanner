import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getStudentsByClass: vi.fn(),
  getAttendanceRecord: vi.fn(),
  replaceAttendanceSnapshot: vi.fn(),
  saveAttendance: vi.fn(),
}));

vi.mock('@/features/classes/api', () => ({
  getStudentsByClass: mocks.getStudentsByClass,
}));

vi.mock('@/features/attendance/api', () => ({
  getAttendanceRecord: mocks.getAttendanceRecord,
  replaceAttendanceSnapshot: mocks.replaceAttendanceSnapshot,
  saveAttendance: mocks.saveAttendance,
}));

import { useAttendanceEditor } from '@/features/attendance/hooks/useAttendanceEditor';

describe('useAttendanceEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getStudentsByClass.mockResolvedValue([
      { id: 'student-1', classId: 'class-1', name: 'Budi', nis: '101' },
      { id: 'student-2', classId: 'class-1', name: 'Siti', nis: '102' },
    ]);
    mocks.getAttendanceRecord.mockResolvedValue([
      {
        id: 'attendance-1',
        classId: 'class-1',
        studentId: 'student-1',
        date: '2026-07-20',
        status: 'izin',
      },
    ]);
  });

  it('loads class students and combines saved attendance with hadir defaults', async () => {
    const availableSubjects: [] = [];
    const onSubjectUnavailable = vi.fn();
    const { result } = renderHook(() => useAttendanceEditor({
      classId: 'class-1',
      subjectId: 'none',
      date: '2026-07-20',
      availableSubjects,
      onSubjectUnavailable,
    }));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.students.map((student) => student.id)).toEqual(['student-1', 'student-2']);
    expect(result.current.drafts).toMatchObject({
      'student-1': { id: 'attendance-1', status: 'izin' },
      'student-2': { status: 'hadir' },
    });
  });

  it('updates one or every attendance draft without touching persistence', async () => {
    const onSubjectUnavailable = vi.fn();
    const availableSubjects: [] = [];
    const { result } = renderHook(() => useAttendanceEditor({
      classId: 'class-1',
      subjectId: 'none',
      date: '2026-07-20',
      availableSubjects,
      onSubjectUnavailable,
    }));
    await waitFor(() => expect(result.current.students).toHaveLength(2));

    act(() => result.current.setStatus('student-2', 'sakit'));
    expect(result.current.drafts['student-2'].status).toBe('sakit');

    act(() => result.current.setAllStatus('alpa'));
    expect(Object.values(result.current.drafts).map((draft) => draft.status)).toEqual(['alpa', 'alpa']);
    expect(mocks.saveAttendance).not.toHaveBeenCalled();
  });
});
