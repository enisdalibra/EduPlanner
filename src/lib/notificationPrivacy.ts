export interface ScheduleNotificationContent {
  title: string;
  body: string;
}

export function selectScheduleNotificationContent(
  showDetails: boolean,
  privateContent: ScheduleNotificationContent,
  detailedContent: ScheduleNotificationContent,
): ScheduleNotificationContent {
  return showDetails ? detailedContent : privateContent;
}
