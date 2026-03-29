import { Bot } from "grammy";

export function registerStartCommand(bot: Bot) {
  bot.command("start", (ctx) => {
    ctx.reply(
      `👋 Hello, ${ctx.from?.first_name}! I'm your bot.\nUse /help to see what I can do.`
    );
  });
}