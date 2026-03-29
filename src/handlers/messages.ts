import { Bot } from "grammy";

export function registerMessageHandlers(bot: Bot) {
  bot.on("message:text", (ctx) => {
    const userText = ctx.message.text;
    ctx.reply(`You said: "${userText}"`);
  });
}