import { useState } from 'react';
import { format } from 'date-fns';
import { toast } from 'sonner';

import type { Schedule } from '@/db/database';
import { createSchedule, deleteSchedule, updateSchedule } from '@/features/schedules/api';
import { useTranslation } from '@/hooks/useTranslation';

export type ScheduleEndCriteria = 'none' | 'count' | 'date';

export interface ScheduleDraft {
  subjectId: string;
  recurrenceType: Schedule['recurrenceType'];
  dayOfWeek: number;
  dayOfMonth: number;
  startTime: string;
  endTime: string;
  startDate: string;
  endCriteria: ScheduleEndCriteria;
  recurrenceCount: number;
  endDate: string;
  notificationEarlyMinutes: number;
}

export function createScheduleDraft(schedule?: Schedule, now = new Date()): ScheduleDraft {
  const today = format(now, 'yyyy-MM-dd');
  if (!schedule) {
    return {
      subjectId: 'none',
      recurrenceType: 'weekly',
      dayOfWeek: now.getDay(),
      dayOfMonth: now.getDate(),
      startTime: '08:00',
      endTime: '09:30',
      startDate: today,
      endCriteria: 'none',
      recurrenceCount: 10,
      endDate: today,
      notificationEarlyMinutes: 15,
    };
  }
  return {
    subjectId: schedule.subjectId ?? 'none',
    recurrenceType: schedule.recurrenceType,
    dayOfWeek: schedule.dayOfWeek ?? now.getDay(),
    dayOfMonth: schedule.dayOfMonth ?? now.getDate(),
    startTime: schedule.startTime,
    endTime: schedule.endTime,
    startDate: schedule.startDate,
    endCriteria: schedule.recurrenceCount ? 'count' : schedule.endDate ? 'date' : 'none',
    recurrenceCount: schedule.recurrenceCount ?? 10,
    endDate: schedule.endDate ?? today,
    notificationEarlyMinutes: schedule.notificationEarlyMinutes ?? 15,
  };
}

export function useScheduleEditor(classId: string, language: 'id' | 'en') {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<Schedule>();
  const [draft, setDraft] = useState<ScheduleDraft>(() => createScheduleDraft());

  const setField = <K extends keyof ScheduleDraft>(field: K, value: ScheduleDraft[K]) => {
    setDraft((current) => ({ ...current, [field]: value }));
  };

  const openAdd = () => {
    setEditingSchedule(undefined);
    setDraft(createScheduleDraft());
    setIsOpen(true);
  };

  const openEdit = (schedule: Schedule) => {
    setEditingSchedule(schedule);
    setDraft(createScheduleDraft(schedule));
    setIsOpen(true);
  };

  const save = async () => {
    if (!draft.startTime || !draft.endTime || !draft.startDate) {
      toast.error(t('scheduling.errorIncomplete'));
      return;
    }
    const input = {
      classId,
      subjectId: draft.subjectId === 'none' ? undefined : draft.subjectId,
      recurrenceType: draft.recurrenceType,
      dayOfWeek: draft.recurrenceType === 'weekly' ? draft.dayOfWeek : undefined,
      dayOfMonth: draft.recurrenceType === 'monthly' ? draft.dayOfMonth : undefined,
      startTime: draft.startTime,
      endTime: draft.endTime,
      startDate: draft.startDate,
      recurrenceCount: draft.endCriteria === 'count' ? draft.recurrenceCount : undefined,
      endDate: draft.endCriteria === 'date' ? draft.endDate : undefined,
      notificationEarlyMinutes: draft.notificationEarlyMinutes,
    };
    try {
      if (editingSchedule) await updateSchedule(editingSchedule.id, input);
      else await createSchedule(input);
      toast.success(t('scheduling.successAdd'));
      setIsOpen(false);
    } catch {
      toast.error(t('scheduling.errorSave'));
    }
  };

  const remove = async (id: string) => {
    if (!confirm(t('scheduling.confirmDelete'))) return;
    await deleteSchedule(id);
    toast.success(t('scheduling.successDelete'));
  };

  const getDayName = (day: number) => {
    const days = language === 'id'
      ? ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']
      : ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[day] ?? '';
  };

  return {
    isOpen,
    setIsOpen,
    editingSchedule,
    draft,
    setField,
    openAdd,
    openEdit,
    save,
    remove,
    getDayName,
  };
}

export type ScheduleEditor = ReturnType<typeof useScheduleEditor>;
