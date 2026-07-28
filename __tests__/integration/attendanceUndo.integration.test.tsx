import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { db } from '@/db/database';
import { useAttendanceEditor } from '@/features/attendance/hooks/useAttendanceEditor';
import { getAttendanceRecord } from '@/features/attendance/api';
import { useActionHistoryStore } from '@/store/actionHistoryStore';
import { deleteTestDatabase, resetTestDatabase } from './testDatabase';

describe('attendance undo IndexedDB integration', () => {
  beforeEach(async () => {
    await resetTestDatabase();
    await db.classes.add({ id: 'class-1', name: 'Class 1' });
    await db.students.add({
      id: 'student-1',
      classId: 'class-1',
      name: 'Budi',
      nis: '101',
    });
    useActionHistoryStore.getState().clearHistory();
  });

  afterEach(async () => {
    useActionHistoryStore.getState().clearHistory();
    await deleteTestDatabase();
  });

  it('removes a first save on undo and recreates it on redo', async () => {
    const onSubjectUnavailable = vi.fn();
    const { result, unmount } = renderHook(() => useAttendanceEditor({
      classId: 'class-1',
      subjectId: 'none',
      date: '2026-07-19',
      availableSubjects: [],
      onSubjectUnavailable,
    }));

    await waitFor(() => expect(result.current.students).toHaveLength(1));
    act(() => result.current.setStatus('student-1', 'sakit'));
    await act(async () => result.current.save());

    expect(await getAttendanceRecord('class-1', '2026-07-19')).toMatchObject([
      { studentId: 'student-1', status: 'sakit' },
    ]);
    expect(useActionHistoryStore.getState().past).toHaveLength(1);

    await act(async () => useActionHistoryStore.getState().undo());
    expect(await getAttendanceRecord('class-1', '2026-07-19')).toEqual([]);
    expect(useActionHistoryStore.getState().future).toHaveLength(1);

    await act(async () => useActionHistoryStore.getState().redo());
    expect(await getAttendanceRecord('class-1', '2026-07-19')).toMatchObject([
      { studentId: 'student-1', status: 'sakit' },
    ]);
    unmount();
  });
});
