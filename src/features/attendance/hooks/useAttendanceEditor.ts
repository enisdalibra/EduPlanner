import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

import type { Attendance, Subject } from '@/db/database';
import { useTranslation } from '@/hooks/useTranslation';
import { AttendanceService, type AttendanceDraft, type AttendanceStatus } from '@/services/AttendanceService';
import { useActionHistoryStore } from '@/store/actionHistoryStore';
import { getStudentsByClass } from '@/features/classes/api';
import { getAttendanceRecord, replaceAttendanceSnapshot, saveAttendance } from '../api';

interface AttendanceEditorOptions {
  classId: string;
  subjectId: string;
  date: string;
  availableSubjects: Subject[];
  onSubjectUnavailable: () => void;
  includeHistorical?: boolean;
  readOnly?: boolean;
}

export function useAttendanceEditor({
  classId,
  subjectId,
  date,
  availableSubjects,
  onSubjectUnavailable,
  includeHistorical = false,
  readOnly = false,
}: AttendanceEditorOptions) {
  const { t } = useTranslation();
  const [drafts, setDrafts] = useState<Record<string, AttendanceDraft>>({});
  const [students, setStudents] = useState<{ id: string; name: string }[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const activeScopeRef = useRef({ classId, subjectId, date });
  const prevClassIdRef = useRef(classId);

  activeScopeRef.current = { classId, subjectId, date };

  useEffect(() => {
    if (subjectId !== 'none' && !availableSubjects.some((subject) => subject.id === subjectId)) {
      onSubjectUnavailable();
    }
  }, [subjectId, availableSubjects, onSubjectUnavailable]);

  useEffect(() => {
    let active = true;
    const classChanged = prevClassIdRef.current !== classId;
    prevClassIdRef.current = classId;

    async function loadData() {
      if (!classId) {
        setStudents([]);
        setDrafts({});
        setLoadError(false);
        return;
      }
      if (classChanged) {
        setStudents([]);
        setDrafts({});
      }
      setLoadError(false);
      setIsLoading(true);
      try {
        const classStudents = await getStudentsByClass(classId, includeHistorical);
        const selectedSubject = subjectId !== 'none' ? subjectId : undefined;
        const existingRecords = await getAttendanceRecord(classId, date, selectedSubject);
        if (!active) return;

        setStudents(classStudents);
        setDrafts(Object.fromEntries(classStudents.map((student) => {
          const existing = existingRecords.find((record) => record.studentId === student.id);
          return [student.id, {
            id: existing?.id,
            studentId: student.id,
            status: existing?.status ?? 'hadir',
          } satisfies AttendanceDraft];
        })));
      } catch {
        if (active) {
          setStudents([]);
          setDrafts({});
          setLoadError(true);
        }
      } finally {
        if (active) setIsLoading(false);
      }
    }
    void loadData();
    return () => { active = false; };
  }, [classId, subjectId, date, includeHistorical]);

  const setStatus = (studentId: string, status: AttendanceStatus) => {
    if (readOnly) return;
    setDrafts((current) => ({
      ...current,
      [studentId]: { ...current[studentId], status },
    }));
  };

  const setAllStatus = (status: AttendanceStatus) => {
    if (readOnly) return;
    setDrafts((current) => Object.fromEntries(
      Object.entries(current).map(([studentId, draft]) => [studentId, { ...draft, status }]),
    ));
  };

  const save = async () => {
    if (!classId || readOnly) return;
    setIsLoading(true);
    try {
      const selectedSubject = subjectId !== 'none' ? subjectId : undefined;
      const previousRecords = await getAttendanceRecord(classId, date, selectedSubject);
      const recordsToSave: Attendance[] = Object.values(drafts).map((draft) => ({
        id: draft.id || crypto.randomUUID(),
        classId,
        studentId: draft.studentId,
        subjectId: selectedSubject,
        date,
        status: draft.status,
      }));
      await saveAttendance(recordsToSave);
      toast.success(t('attendancePage.successSave'));

      const savedRecords = await getAttendanceRecord(classId, date, selectedSubject);
      const savedDrafts = Object.fromEntries(savedRecords.map((record) => [record.studentId, {
        id: record.id,
        studentId: record.studentId,
        status: record.status,
      } satisfies AttendanceDraft]));
      setDrafts(savedDrafts);

      const isSameScope = () =>
        activeScopeRef.current.classId === classId &&
        activeScopeRef.current.subjectId === subjectId &&
        activeScopeRef.current.date === date;

      useActionHistoryStore.getState().pushAction({
        description: `Simpan Absensi ${date}`,
        undo: async () => {
          await replaceAttendanceSnapshot(classId, date, selectedSubject, previousRecords);
          if (!isSameScope()) return;
          const previousDrafts = Object.fromEntries(previousRecords.map((record) => [record.studentId, {
            id: record.id,
            studentId: record.studentId,
            status: record.status,
          } satisfies AttendanceDraft]));
          setDrafts((current) => Object.fromEntries(Object.entries(current).map(([studentId, draft]) => [
            studentId,
            previousDrafts[studentId] ?? { ...draft, status: 'hadir' },
          ])));
        },
        redo: async () => {
          await saveAttendance(recordsToSave);
          if (!isSameScope()) return;
          setDrafts(savedDrafts);
        },
      });
    } catch {
      toast.error(t('attendancePage.errorSave'));
    } finally {
      setIsLoading(false);
    }
  };

  const chartData = useMemo(() => AttendanceService.calculateStatistics(drafts), [drafts]);
  return { drafts, students, isLoading, loadError, setStatus, setAllStatus, save, chartData };
}
