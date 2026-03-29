import { Bot } from "grammy";

export function registerHelpCommand(bot: Bot) {
  bot.command("help", (ctx) => {
    ctx.reply(
      "📖 Available commands:\n" +
      "/start - Welcome message\n" +
      "/help - Show this help menu"
    );
  });
}