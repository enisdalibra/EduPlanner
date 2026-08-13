import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { useLiveQuery } from 'dexie-react-hooks';
import { format, isSameDay } from 'date-fns';
import { db } from '@/db/database';
import { selectScheduleNotificationContent } from '@/lib/notificationPrivacy';
import { getScheduleOccurrences } from '@/lib/scheduleUtils';
import { useTranslation } from '@/hooks/useTranslation';
import { useUiStore } from '@/store/uiStore';

export function useNotificationScheduler() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const showNotificationDetails = useUiStore((state) => state.showNotificationDetails);
  const [permission, setPermission] = useState<NotificationPermission>(() =>
    typeof window !== 'undefined' && 'Notification' in window
      ? Notification.permission
      : 'denied',
  );

  useEffect(() => {
    const refreshPermission = () => {
      if ('Notification' in window) setPermission(Notification.permission);
    };

    window.addEventListener('focus', refreshPermission);
    window.addEventListener('eduplanner:notification-permission-changed', refreshPermission);
    document.addEventListener('visibilitychange', refreshPermission);
    return () => {
      window.removeEventListener('focus', refreshPermission);
      window.removeEventListener('eduplanner:notification-permission-changed', refreshPermission);
      document.removeEventListener('visibilitychange', refreshPermission);
    };
  }, []);

  const notificationsEnabled = permission === 'granted';
  const schedules = useLiveQuery(
    () => notificationsEnabled
      ? db.schedules.filter((schedule) => schedule.notificationEarlyMinutes > 0).toArray()
      : [],
    [notificationsEnabled],
    [],
  );
  const classes = useLiveQuery(
    () => notificationsEnabled ? db.classes.toArray() : [],
    [notificationsEnabled],
    [],
  );
  const subjects = useLiveQuery(
    () => notificationsEnabled ? db.subjects.toArray() : [],
    [notificationsEnabled],
    [],
  );

  useEffect(() => {
    if (!notificationsEnabled || schedules.length === 0) return;

    const checkSchedulesAndNotify = () => {
      // Check browser notification permission first
      if (typeof window === 'undefined' || !('Notification' in window) || Notification.permission !== 'granted') {
        return;
      }

      const now = new Date();
      const todayStr = format(now, 'yyyy-MM-dd');

      schedules.forEach(schedule => {
        // Skip if reminders are disabled
        if (!schedule.notificationEarlyMinutes || schedule.notificationEarlyMinutes === 0) return;

        const cls = classes.find(c => c.id === schedule.classId);
        if (!cls) return;

        // Verify if the schedule has a session today
        const occurrences = getScheduleOccurrences(schedule, now);
        const isScheduledToday = occurrences.some(date => isSameDay(date, now));
        if (!isScheduledToday) return;

        // Calculate early reminder target time
        const [startHour, startMin] = schedule.startTime.split(':').map(Number);
        if (isNaN(startHour) || isNaN(startMin)) return;

        const classStartToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), startHour, startMin, 0);
        const alertTime = new Date(classStartToday.getTime() - schedule.notificationEarlyMinutes * 60 * 1000);

        // We only trigger when current time is past alertTime but before class starts
        if (now >= alertTime && now < classStartToday) {
          const sessionKey = `notified-${schedule.id}-${todayStr}`;
          
          if (!sessionStorage.getItem(sessionKey)) {
            sessionStorage.setItem(sessionKey, 'true');
            
            const subj = subjects?.find(s => s.id === schedule.subjectId);
            const subjectName = subj ? subj.name : '';

            // Native browser push notification
            const detailedBody = t(
              subjectName
                ? 'scheduling.notificationBody'
                : 'scheduling.notificationBodyNoSubject',
              {
                className: cls.name,
                subjectName,
                startTime: schedule.startTime,
              },
            );
            const { title, body } = selectScheduleNotificationContent(
              showNotificationDetails,
              {
                title: t('scheduling.notificationTitlePrivate'),
                body: t('scheduling.notificationBodyPrivate'),
              },
              {
                title: t('scheduling.notificationTitle'),
                body: detailedBody,
              },
            );

            try {
              const notification = new Notification(title, {
                body,
                tag: `class-${schedule.id}-${todayStr}`,
                requireInteraction: true
              });

              notification.onclick = () => {
                window.focus();
                navigate(`/classes/${cls.id}`);
                notification.close();
              };
            } catch (err) {
              console.error('Failed to trigger Notification:', err);
            }
          }
        }
      });
    };

    // Run once on load/update
    checkSchedulesAndNotify();

    // Check every 30 seconds
    const intervalId = setInterval(checkSchedulesAndNotify, 30000);

    return () => clearInterval(intervalId);
  }, [notificationsEnabled, schedules, classes, subjects, showNotificationDetails, navigate, t]);
}
