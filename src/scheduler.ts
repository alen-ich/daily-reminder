import { bot } from "./bot";
import {
  getDueReminders,
  updateReminderTrigger,
  getUserSettings,
  type Reminder,
} from "./database";

let schedulerInterval: NodeJS.Timeout | null = null;

function calculateNextTrigger(reminder: Reminder): number {
  const now = Date.now();
  if (reminder.type === "interval" && reminder.interval_minutes) {
    return now + reminder.interval_minutes * 60 * 1000;
  } else if (reminder.type === "scheduled" && reminder.time_of_day) {
    const parts = reminder.time_of_day.split(":");
    const hours = parseInt(parts[0] || "0");
    const minutes = parseInt(parts[1] || "0");
    const nextDate = new Date();
    nextDate.setHours(hours, minutes, 0, 0);
    if (nextDate.getTime() <= now) {
      nextDate.setDate(nextDate.getDate() + 1);
    }
    return nextDate.getTime();
  }
  return now + 60 * 60 * 1000;
}

function isSleepTime(chatId: number): boolean {
  const settings = getUserSettings(chatId);
  if (!settings?.sleep_start || !settings?.sleep_end) {
    return false;
  }

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const parseTime = (time: string) => {
    const parts = time.split(":");
    const h = parseInt(parts[0] || "0");
    const m = parseInt(parts[1] || "0");
    return h * 60 + m;
  };

  const sleepStart = parseTime(settings.sleep_start);
  const sleepEnd = parseTime(settings.sleep_end);

  if (sleepStart <= sleepEnd) {
    return currentMinutes >= sleepStart && currentMinutes < sleepEnd;
  } else {
    return currentMinutes >= sleepStart || currentMinutes < sleepEnd;
  }
}

function processReminders(): void {
  const dueReminders = getDueReminders();

  for (const reminder of dueReminders) {
    if (isSleepTime(reminder.chat_id)) {
      const nextTrigger = calculateNextTrigger(reminder);
      updateReminderTrigger(reminder.id, nextTrigger);
      continue;
    }

    bot.api.sendMessage(reminder.chat_id, `🔔 ${reminder.message}`);

    const nextTrigger = calculateNextTrigger(reminder);
    updateReminderTrigger(reminder.id, nextTrigger);
  }
}

export function startScheduler(): void {
  if (schedulerInterval) return;
  schedulerInterval = setInterval(processReminders, 60 * 1000);
  processReminders();
}

export function stopScheduler(): void {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
  }
}
