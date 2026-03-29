import { bot } from "./bot";
import { registerStartCommand } from "./commands/start";
import { registerHelpCommand } from "./commands/help";
import { registerReminderCommands } from "./commands/reminders";
import { startScheduler } from "./scheduler";

// Register all commands & handlers
registerStartCommand(bot);
registerHelpCommand(bot);
registerReminderCommands(bot);

// Start the scheduler
startScheduler();

// Start the bot
bot.start();
console.log("🤖 Bot is running...");