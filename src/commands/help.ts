import { Bot } from "grammy";

export function registerHelpCommand(bot: Bot) {
  bot.command("help", (ctx) => {
    ctx.reply(
      "📖 Available commands:\n" +
      "/start - Welcome message\n" +
      "/help - Show this help menu\n" +
      "/water_reminder - Toggle hourly water reminders\n" +
      "/remind - Create custom reminder\n" +
      "/myreminders - List your reminders\n" +
      "/delreminder <id> - Delete a reminder\n" +
      "/togglereminder <id> - Enable/disable reminder\n" +
      "/sleepmode - Set quiet hours (22:00-07:00)"
    );
  });
}