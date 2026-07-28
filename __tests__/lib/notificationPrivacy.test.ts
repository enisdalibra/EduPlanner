import { describe, expect, it } from 'vitest';

import { selectScheduleNotificationContent } from '@/lib/notificationPrivacy';

describe('notification privacy', () => {
  const privateContent = {
    title: 'EduPlanner Reminder',
    body: 'Open EduPlanner to view the reminder.',
  };
  const detailedContent = {
    title: 'Class Starting Soon',
    body: 'Class 10A (Biology) starts at 08:00.',
  };

  it('hides schedule details by default', () => {
    expect(
      selectScheduleNotificationContent(false, privateContent, detailedContent),
    ).toEqual(privateContent);
  });

  it('shows schedule details only after an explicit opt-in', () => {
    expect(
      selectScheduleNotificationContent(true, privateContent, detailedContent),
    ).toEqual(detailedContent);
  });
});
