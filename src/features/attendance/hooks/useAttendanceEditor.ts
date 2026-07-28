import { useEffect, useMemo, useState } from 'react';
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
}

export function useAttendanceEditor({
  classId,
  subjectId,
  date,
  availableSubjects,
  onSubjectUnavailable,
}: AttendanceEditorOptions) {
  const { t } = useTranslation();
  const [drafts, setDrafts] = useState<Record<string, AttendanceDraft>>({});
  const [students, setStudents] = useState<{ id: string; name: string }[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let active = true;
    async function loadData() {
      if (!classId) return;
      setIsLoading(true);
      try {
        const classStudents = await getStudentsByClass(classId);
        if (subjectId !== 'none' && !availableSubjects.some((subject) => subject.id === subjectId)) {
          onSubjectUnavailable();
        }
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
        }
      } finally {
        if (active) setIsLoading(false);
      }
    }
    void loadData();
    return () => { active = false; };
  }, [classId, subjectId, date, availableSubjects, onSubjectUnavailable]);

  const setStatus = (studentId: string, status: AttendanceStatus) => {
    setDrafts((current) => ({
      ...current,
      [studentId]: { ...current[studentId], status },
    }));
  };

  const setAllStatus = (status: AttendanceStatus) => {
    setDrafts((current) => Object.fromEntries(
      Object.entries(current).map(([studentId, draft]) => [studentId, { ...draft, status }]),
    ));
  };

  const save = async () => {
    if (!classId) return;
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

      useActionHistoryStore.getState().pushAction({
        description: `Simpan Absensi ${date}`,
        undo: async () => {
          await replaceAttendanceSnapshot(classId, date, selectedSubject, previousRecords);
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
  return { drafts, students, isLoading, setStatus, setAllStatus, save, chartData };
}
