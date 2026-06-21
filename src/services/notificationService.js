import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";

const CHANNEL_ID = "glowup-reminders";
const WAKE_ALARM_CHANNEL_ID = "glowup-wake-alarm";
const WATER_NOTIFICATION_IDS = Array.from({ length: 8 }, (_, index) => 4100 + index);
const SLEEP_NOTIFICATION_ID = 4200;
const WAKE_ALARM_NOTIFICATION_ID = 4210;
const AI_COACH_NOTIFICATION_ID = 4300;
const WORKOUT_NOTIFICATION_IDS = Array.from({ length: 7 }, (_, index) => 4401 + index);

export const isCapacitorAndroid = () =>
  Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android";

export const hasNativeLocalNotifications = () =>
  isCapacitorAndroid() && Capacitor.isPluginAvailable("LocalNotifications");

const toAppPermission = (permission) => {
  if (permission === "granted") return "granted";
  if (permission === "denied") return "denied";
  return "default";
};

export async function getAppNotificationPermission() {
  if (hasNativeLocalNotifications()) {
    const status = await LocalNotifications.checkPermissions();
    return toAppPermission(status.display);
  }

  if ("Notification" in window) {
    return Notification.permission;
  }

  return "unsupported";
}

async function ensureNotificationChannel() {
  if (!hasNativeLocalNotifications()) return;

  await LocalNotifications.createChannel({
    id: CHANNEL_ID,
    name: "GlowUp reminders",
    description: "Water, sleep, workout and AI coach reminders",
    importance: 4,
    visibility: 1,
    vibration: true,
    lights: true,
    lightColor: "#ec4899",
  });
}

async function ensureWakeAlarmChannel() {
  if (!hasNativeLocalNotifications()) return;

  await LocalNotifications.createChannel({
    id: WAKE_ALARM_CHANNEL_ID,
    name: "GlowUp wake alarm",
    description: "Morning wake alarm with vibration",
    importance: 5,
    visibility: 1,
    vibration: true,
    lights: true,
    lightColor: "#ec4899",
  });
}

export async function requestAppNotificationPermission() {
  if (hasNativeLocalNotifications()) {
    const current = await LocalNotifications.checkPermissions();
    if (current.display === "granted") {
      await ensureNotificationChannel();
      await ensureWakeAlarmChannel();
      return "granted";
    }

    const next = await LocalNotifications.requestPermissions();
    const permission = toAppPermission(next.display);
    if (permission === "granted") {
      await ensureNotificationChannel();
      await ensureWakeAlarmChannel();
    }
    return permission;
  }

  if ("Notification" in window) {
    return Notification.requestPermission();
  }

  return "unsupported";
}

export async function showAppNotification({ id = 4001, title, body }) {
  if (hasNativeLocalNotifications()) {
    await ensureNotificationChannel();
    await LocalNotifications.schedule({
      notifications: [
        {
          id,
          title,
          body,
          channelId: CHANNEL_ID,
          autoCancel: true,
          schedule: { at: new Date(Date.now() + 1000) },
        },
      ],
    });
    return;
  }

  if ("Notification" in window && Notification.permission === "granted") {
    new Notification(title, { body });
  }
}

async function cancelNativeNotifications(ids) {
  if (!hasNativeLocalNotifications()) return;

  await LocalNotifications.cancel({
    notifications: ids.map((id) => ({ id })),
  });
}

export async function scheduleNativeWaterReminders({
  enabled,
  intervalHours,
  waterConsumedMl,
  waterGoal,
}) {
  if (!hasNativeLocalNotifications()) return;

  await cancelNativeNotifications(WATER_NOTIFICATION_IDS);
  if (!enabled) return;

  const permission = await getAppNotificationPermission();
  if (permission !== "granted") return;

  await ensureNotificationChannel();
  const hours = Math.max(1, Number(intervalHours) || 2);
  const now = Date.now();

  await LocalNotifications.schedule({
    notifications: WATER_NOTIFICATION_IDS.map((id, index) => ({
      id,
      title: "GlowUp вода",
      body: `Час випити воду. Зараз: ${waterConsumedMl}/${waterGoal} мл.`,
      channelId: CHANNEL_ID,
      autoCancel: true,
      schedule: {
        at: new Date(now + (index + 1) * hours * 60 * 60 * 1000),
        allowWhileIdle: true,
      },
      extra: { type: "water-reminder" },
    })),
  });
}

export async function scheduleNativeSleepReminder({ enabled, reminderTime, sleepGoal }) {
  if (!hasNativeLocalNotifications()) return;

  await cancelNativeNotifications([SLEEP_NOTIFICATION_ID]);
  if (!enabled) return;

  const permission = await getAppNotificationPermission();
  if (permission !== "granted") return;

  const [hour, minute] = String(reminderTime || "22:30")
    .split(":")
    .map((value) => Number(value));

  await ensureNotificationChannel();
  await LocalNotifications.schedule({
    notifications: [
      {
        id: SLEEP_NOTIFICATION_ID,
        title: "GlowUp сон",
        body: `Час готуватися до сну. Ціль: ${sleepGoal} год для кращого відновлення.`,
        channelId: CHANNEL_ID,
        autoCancel: true,
        schedule: {
          on: {
            hour: Number.isFinite(hour) ? hour : 22,
            minute: Number.isFinite(minute) ? minute : 30,
          },
          repeats: true,
          allowWhileIdle: true,
        },
        extra: { type: "sleep-reminder" },
      },
    ],
  });
}

export async function scheduleNativeWorkoutReminders({
  enabled,
  reminderTime,
  weekdays,
}) {
  if (!hasNativeLocalNotifications()) return;

  await cancelNativeNotifications(WORKOUT_NOTIFICATION_IDS);
  if (!enabled || !weekdays?.length) return;

  const permission = await getAppNotificationPermission();
  if (permission !== "granted") return;

  const [hour, minute] = String(reminderTime || "18:00")
    .split(":")
    .map((value) => Number(value));
  const safeHour = Number.isFinite(hour) ? hour : 18;
  const safeMinute = Number.isFinite(minute) ? minute : 0;

  await ensureNotificationChannel();
  await LocalNotifications.schedule({
    notifications: weekdays.map((weekday, index) => ({
      id: WORKOUT_NOTIFICATION_IDS[index],
      title: "Час тренування",
      body: "Твоє тренування GlowUp готове. Почни з розминки й рухайся у своєму темпі.",
      channelId: CHANNEL_ID,
      autoCancel: true,
      schedule: {
        on: {
          weekday: Number(weekday),
          hour: safeHour,
          minute: safeMinute,
        },
        repeats: true,
        allowWhileIdle: true,
      },
      extra: { type: "workout-reminder" },
    })),
  });
}

export async function scheduleNativeWakeAlarm({ enabled, wakeTime }) {
  if (!hasNativeLocalNotifications()) return { scheduled: false };

  await cancelNativeNotifications([WAKE_ALARM_NOTIFICATION_ID]);
  if (!enabled || !wakeTime) return { scheduled: false };

  const permission = await getAppNotificationPermission();
  if (permission !== "granted") return { scheduled: false, permission };

  const [hour, minute] = String(wakeTime)
    .split(":")
    .map((value) => Number(value));

  if (!Number.isFinite(hour) || !Number.isFinite(minute)) {
    return { scheduled: false };
  }

  await ensureWakeAlarmChannel();
  await LocalNotifications.schedule({
    notifications: [
      {
        id: WAKE_ALARM_NOTIFICATION_ID,
        title: "GlowUp будильник",
        body: "Час прокидатися. Почни день м'яко: вода, кілька рухів і спокійний старт.",
        channelId: WAKE_ALARM_CHANNEL_ID,
        autoCancel: true,
        schedule: {
          on: { hour, minute },
          repeats: true,
          allowWhileIdle: true,
        },
        extra: { type: "wake-alarm" },
      },
    ],
  });

  return { scheduled: true, hour, minute };
}

export async function scheduleNativeAiCoachReminder({ enabled }) {
  if (!hasNativeLocalNotifications()) return;

  await cancelNativeNotifications([AI_COACH_NOTIFICATION_ID]);
  if (!enabled) return;

  const permission = await getAppNotificationPermission();
  if (permission !== "granted") return;

  await ensureNotificationChannel();
  await LocalNotifications.schedule({
    notifications: [
      {
        id: AI_COACH_NOTIFICATION_ID,
        title: "Чарлі з GlowUp",
        body: "Зайди на хвилинку: я підкажу, що краще зробити сьогодні.",
        channelId: CHANNEL_ID,
        autoCancel: true,
        schedule: {
          on: { hour: 9, minute: 0 },
          repeats: true,
          allowWhileIdle: true,
        },
        extra: { type: "ai-coach-reminder" },
      },
    ],
  });
}
