import { Bot } from "grammy";
import { v4 as uuidv4 } from "uuid";
import {
  createReminder,
  getRemindersByChatId,
  getReminderByIdAndChatId,
  deleteReminderByIdAndChatId,
  toggleReminderByIdAndChatId,
  getUserSettings,
  setSleepHours,
  clearSleepHours,
  type Reminder,
} from "../database";

function parseInterval(input: string): number | null {
  const match = input.match(/(\d+)\s*(minutes?|hours?|mins?|hrs?)/i);
  if (!match || !match[1] || !match[2]) return null;

  const value = parseInt(match[1]);
  const unit = match[2].toLowerCase();

  if (unit.startsWith("hour") || unit.startsWith("hr")) {
    return value * 60;
  }
  return value;
}

function parseTimeOfDay(input: string): string | null {
  const match = input.match(/(\d{1,2}):(\d{2})(?:\s*(AM|PM))?/i);
  if (!match || !match[1] || !match[2]) return null;

  let hours = parseInt(match[1]);
  const minutes = parseInt(match[2]);
  const period = match[3]?.toUpperCase();

  if (period === "PM" && hours !== 12) hours += 12;
  if (period === "AM" && hours === 12) hours = 0;

  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;

  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
}

function calculateNextTrigger(reminder: Pick<Reminder, "type" | "interval_minutes" | "time_of_day">): number {
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
  return now;
}

export function registerReminderCommands(bot: Bot): void {
  bot.command("remind", (ctx) => {
    const args = ctx.match;
    if (!args) {
      ctx.reply("Usage:\n/remind \"message\" every 2 hours\n/remind \"message\" at 09:00");
      return;
    }

    let message = "";
    let type: "interval" | "scheduled" = "interval";
    let intervalMinutes: number | null = null;
    let timeOfDay: string | null = null;

    const everyMatch = args.match(/"([^"]+)"\s+every\s+(.+)/i);
    const atMatch = args.match(/"([^"]+)"\s+at\s+(.+)/i);

    if (everyMatch && everyMatch[1] && everyMatch[2]) {
      message = everyMatch[1];
      const parsedInterval = parseInterval(everyMatch[2]);
      if (!parsedInterval) {
        ctx.reply("Invalid interval. Example: /remind \"Drink water\" every 2 hours");
        return;
      }
      intervalMinutes = parsedInterval;
    } else if (atMatch && atMatch[1] && atMatch[2]) {
      message = atMatch[1];
      const parsedTime = parseTimeOfDay(atMatch[2]);
      if (!parsedTime) {
        ctx.reply("Invalid time. Example: /remind \"Meeting\" at 09:00 or 9:00 AM");
        return;
      }
      timeOfDay = parsedTime;
      type = "scheduled";
    } else {
      ctx.reply("Usage:\n/remind \"message\" every 2 hours\n/remind \"message\" at 09:00");
      return;
    }

    const id = uuidv4().slice(0, 8);
    const nextTrigger = calculateNextTrigger({ type, interval_minutes: intervalMinutes, time_of_day: timeOfDay });

    createReminder({
      id,
      chat_id: ctx.chat.id,
      message,
      type,
      interval_minutes: intervalMinutes,
      time_of_day: timeOfDay,
      next_trigger: nextTrigger,
      enabled: 1,
    });

    const scheduleText = type === "interval"
      ? `every ${intervalMinutes} minutes`
      : `daily at ${timeOfDay}`;

    ctx.reply(`✅ Reminder created!\n\n📝 "${message}"\n⏰ ${scheduleText}\n🆔 ID: ${id}`);
  });

  bot.command("myreminders", (ctx) => {
    const reminders = getRemindersByChatId(ctx.chat.id);

    if (reminders.length === 0) {
      ctx.reply("You have no reminders. Create one with /remind");
      return;
    }

    const lines = reminders.map((r) => {
      const status = r.enabled ? "🟢" : "🔴";
      const schedule = r.type === "interval"
        ? `${r.interval_minutes} min`
        : `daily at ${r.time_of_day}`;
      const nextDate = new Date(r.next_trigger).toLocaleString();
      return `${status} ${r.id}: "${r.message}" (${schedule})\n   Next: ${nextDate}`;
    });

    ctx.reply(`📋 Your reminders:\n\n${lines.join("\n\n")}`);
  });

  bot.command("delreminder", (ctx) => {
    const id = (ctx.match || "").trim();
    if (!id) {
      ctx.reply("Usage: /delreminder <id>\nUse /myreminders to see IDs");
      return;
    }

    const chatId = ctx.chat.id;
    const deleted = deleteReminderByIdAndChatId(id, chatId);

    if (!deleted) {
      ctx.reply("Reminder not found.");
      return;
    }

    ctx.reply("🗑️ Reminder deleted.");
  });

  bot.command("togglereminder", (ctx) => {
    const id = (ctx.match || "").trim();
    if (!id) {
      ctx.reply("Usage: /togglereminder <id>\nUse /myreminders to see IDs");
      return;
    }

    const chatId = ctx.chat.id;
    const reminder = getReminderByIdAndChatId(id, chatId);

    if (!reminder) {
      ctx.reply("Reminder not found.");
      return;
    }

    const toggled = toggleReminderByIdAndChatId(id, chatId);

    if (!toggled) {
      ctx.reply("Failed to toggle reminder.");
      return;
    }

    const newState = reminder.enabled === 1 ? 0 : 1;
    const status = newState === 1 ? "enabled" : "disabled";
    ctx.reply(`${newState === 1 ? "🟢" : "🔴"} Reminder ${status}: "${reminder.message}"`);
  });

  bot.command("sleepmode", (ctx) => {
    const args = ctx.match?.trim();

    if (!args || args.toLowerCase() === "off") {
      clearSleepHours(ctx.chat.id);
      ctx.reply("😴 Sleep mode disabled. You'll receive reminders 24/7.");
      return;
    }

    const match = args.match(/(\d{1,2}):(\d{2})\s*[-–]\s*(\d{1,2}):(\d{2})/i);
    if (!match) {
      ctx.reply("Usage:\n/sleepmode 22:00-07:00\n/sleepmode off");
      return;
    }

    const sleepStart = parseTimeOfDay(match[1] + ":" + match[2]);
    const sleepEnd = parseTimeOfDay(match[3] + ":" + match[4]);

    if (!sleepStart || !sleepEnd) {
      ctx.reply("Invalid time format. Example: /sleepmode 22:00-07:00");
      return;
    }

    setSleepHours(ctx.chat.id, sleepStart, sleepEnd);
    ctx.reply(`😴 Sleep mode set!\n\nNo reminders from ${sleepStart} to ${sleepEnd}.\n\nUse /sleepmode off to disable.`);
  });
}
