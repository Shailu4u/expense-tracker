import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import * as RecurringRepo from '@/features/recurring/repository';
import { fromISO } from '@/utils/date';

export async function ensurePermissions(): Promise<boolean> {
  const settings = await Notifications.getPermissionsAsync();
  if (settings.granted) return true;
  const r = await Notifications.requestPermissionsAsync();
  return r.granted;
}

export async function configureChannel(): Promise<void> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('reminders', {
      name: 'Bill reminders',
      importance: Notifications.AndroidImportance.DEFAULT,
      enableVibrate: true,
    });
  }
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

export async function scheduleReminder(rec: RecurringRepo.Recurring): Promise<string | null> {
  if (!rec.reminderMinutesBefore) return null;
  const ok = await ensurePermissions();
  if (!ok) return null;
  const due = fromISO(rec.nextDue);
  const triggerAt = new Date(due.getTime() - rec.reminderMinutesBefore * 60 * 1000);
  if (triggerAt <= new Date()) return null;
  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Bill reminder',
      body: `${rec.templateMeta?.merchant ?? 'A recurring item'} is due soon`,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: triggerAt,
      channelId: 'reminders',
    },
  });
  return id;
}

export async function cancelAll(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}
