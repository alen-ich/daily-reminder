import { bot } from "./bot";
import { registerStartCommand } from "./commands/start";
import { registerHelpCommand } from "./commands/help";
import { registerMessageHandlers } from "./handlers/messages";

// Register all commands & handlers
registerStartCommand(bot);
registerHelpCommand(bot);
registerMessageHandlers(bot);

// Start the bot
bot.start();
console.log("🤖 Bot is running...");