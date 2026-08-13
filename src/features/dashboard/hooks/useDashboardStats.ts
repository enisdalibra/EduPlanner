import { useEffect, useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { format, subMonths } from 'date-fns';
import { id as localeId } from 'date-fns/locale';

import { db, type TeachingSession } from '@/db/database';
import { getScheduleOccurrences } from '@/lib/scheduleUtils';

export function calculateTeachingStats(
  sessions: TeachingSession[],
  chartMonths: 6 | 12,
  language: 'id' | 'en',
  now = new Date(),
) {
  const locale = language === 'id' ? localeId : undefined;
  let totalMinutes = 0;
  let totalSessions = 0;
  const sessionsByMonth = new Map<string, { minutes: number; sessions: number }>();
  for (const session of sessions) {
    const key = session.date.slice(0, 7);
    const current = sessionsByMonth.get(key) ?? { minutes: 0, sessions: 0 };
    current.minutes += session.durationMinutes;
    current.sessions += 1;
    sessionsByMonth.set(key, current);
  }

  const chartData = Array.from({ length: chartMonths }, (_, index) => {
    const date = subMonths(now, chartMonths - 1 - index);
    const key = format(date, 'yyyy-MM');
    const monthStats = sessionsByMonth.get(key) ?? { minutes: 0, sessions: 0 };
    totalMinutes += monthStats.minutes;
    totalSessions += monthStats.sessions;
    return {
      month: format(date, 'MMM yyyy', { locale }),
      hours: Number((monthStats.minutes / 60).toFixed(1)),
      sessions: monthStats.sessions,
    };
  });
  return {
    chartData,
    totalHours: Number((totalMinutes / 60).toFixed(1)),
    totalSessions,
  };
}

export function useDashboardStats(chartMonths: 6 | 12, language: 'id' | 'en') {
  const [storageUsage, setStorageUsage] = useState({ percent: 0, used: '0MB' });

  useEffect(() => {
    void navigator.storage?.estimate().then((estimate) => {
      if (estimate.usage === undefined || estimate.quota === undefined) return;
      setStorageUsage({
        percent: Math.max(Math.round((estimate.usage / estimate.quota) * 100), 1),
        used: `${(estimate.usage / (1024 * 1024)).toFixed(1)}MB`,
      });
    });
  }, []);

  const stats = useLiveQuery(async () => {
    const now = new Date();
    const today = format(now, 'yyyy-MM-dd');
    const [classes, enrollments, notes, tasks, grades, attendances, schedules, teachingSessions, subjects] = await Promise.all([
      db.classes.toArray(),
      db.classEnrollments.toArray(),
      db.notes.toArray(),
      db.tasks.toArray(),
      db.grades.toArray(),
      db.attendances.where('date').equals(today).toArray(),
      db.schedules.toArray(),
      db.teachingSessions.toArray(),
      db.subjects.toArray(),
    ]);
    const activeClassIds = new Set(classes.filter((cls) => !cls.archivedAt).map(({ id }) => id));
    const activeStudentIds = new Set(enrollments.filter((item) => !item.endedAt && activeClassIds.has(item.classId)).map(({ studentId }) => studentId));
    const studentsCount = activeStudentIds.size;
    const classesCount = activeClassIds.size;

    const presentToday = new Set(attendances.filter((attendance) => attendance.status === 'hadir').map(({ studentId }) => studentId)).size;
    const recordedToday = new Set(attendances.map(({ studentId }) => studentId)).size;
    const attendancePercent = studentsCount ? Math.min(100, (presentToday / studentsCount) * 100) : 0;
    const attendanceOthersPercent = studentsCount
      ? Math.min(100, ((recordedToday - presentToday) / studentsCount) * 100)
      : 0;
    const studentsWithGrades = new Set(grades.map((grade) => grade.studentId)).size;
    const gradesPercent = studentsCount ? (studentsWithGrades / studentsCount) * 100 : 0;
    const averageGrade = grades.length
      ? grades.reduce((sum, grade) => sum + grade.score, 0) / grades.length
      : 0;
    const completedTasks = tasks.filter((task) => task.status === 'completed').length;
    const tasksPercent = tasks.length ? (completedTasks / tasks.length) * 100 : 0;
    const guruNotes = notes.filter((note) => note.type === 'guru').length;
    const notesMaximum = Math.max(notes.length, 5);
    const nowTime = format(now, 'HH:mm');
    const classesById = new Map(classes.map((item) => [item.id, item]));
    const subjectsById = new Map(subjects.map((item) => [item.id, item]));

    const todayClasses = schedules.flatMap((schedule) => {
      const occursToday = getScheduleOccurrences(schedule, now)
        .some((occurrence) => format(occurrence, 'yyyy-MM-dd') === today);
      const cls = classesById.get(schedule.classId);
      if (!occursToday || !cls) return [];
      const status = schedule.endTime < nowTime
        ? 'finished'
        : schedule.startTime <= nowTime && nowTime <= schedule.endTime
          ? 'ongoing'
          : 'upcoming';
      return [{
        schedule,
        class: cls,
        subject: schedule.subjectId ? subjectsById.get(schedule.subjectId) : undefined,
        status: status as 'finished' | 'ongoing' | 'upcoming',
      }];
    }).sort((a, b) => a.schedule.startTime.localeCompare(b.schedule.startTime));

    return {
      classes: classesCount,
      students: studentsCount,
      notes,
      tasks,
      activeTasks: tasks.filter((task) => task.status === 'pending').length,
      todayClasses,
      teachingSessions,
      subjects,
      bars: {
        attendance: { main: attendancePercent, other: attendanceOthersPercent },
        grades: { main: gradesPercent, other: averageGrade },
        tasks: {
          main: tasksPercent,
          other: tasks.length ? ((tasks.length - completedTasks) / tasks.length) * 100 : 0,
        },
        notes: {
          main: (guruNotes / notesMaximum) * 100,
          other: ((notes.length - guruNotes) / notesMaximum) * 100,
        },
      },
    };
  });

  const teachingStats = useMemo(
    () => stats?.teachingSessions
      ? calculateTeachingStats(stats.teachingSessions, chartMonths, language)
      : { chartData: [], totalHours: 0, totalSessions: 0 },
    [stats?.teachingSessions, chartMonths, language],
  );
  return { stats, teachingStats, storageUsage };
}
