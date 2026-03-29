import Database, { Database as DatabaseType } from "better-sqlite3";
import path from "path";
import fs from "fs";

const dataDir = path.join(__dirname, "../data");
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db: DatabaseType = new Database(path.join(dataDir, "reminders.db"));

db.exec(`
  CREATE TABLE IF NOT EXISTS reminders (
    id TEXT PRIMARY KEY,
    chat_id INTEGER NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('interval', 'scheduled')),
    interval_minutes INTEGER,
    time_of_day TEXT,
    next_trigger INTEGER NOT NULL,
    enabled INTEGER DEFAULT 1,
    created_at INTEGER NOT NULL
  )
`);

db.exec(`CREATE INDEX IF NOT EXISTS idx_reminders_chat_id ON reminders(chat_id)`);
db.exec(`CREATE INDEX IF NOT EXISTS idx_reminders_next_trigger ON reminders(next_trigger)`);

db.exec(`
  CREATE TABLE IF NOT EXISTS user_settings (
    chat_id INTEGER PRIMARY KEY,
    sleep_start TEXT,
    sleep_end TEXT
  )
`);

export interface Reminder {
  id: string;
  chat_id: number;
  message: string;
  type: "interval" | "scheduled";
  interval_minutes: number | null;
  time_of_day: string | null;
  next_trigger: number;
  enabled: number;
  created_at: number;
}

export function createReminder(reminder: Omit<Reminder, "created_at">): void {
  const stmt = db.prepare(`
    INSERT INTO reminders (id, chat_id, message, type, interval_minutes, time_of_day, next_trigger, enabled, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(
    reminder.id,
    reminder.chat_id,
    reminder.message,
    reminder.type,
    reminder.interval_minutes,
    reminder.time_of_day,
    reminder.next_trigger,
    reminder.enabled,
    Date.now()
  );
}

export function getRemindersByChatId(chatId: number): Reminder[] {
  const stmt = db.prepare("SELECT * FROM reminders WHERE chat_id = ? ORDER BY created_at DESC");
  return stmt.all(chatId) as Reminder[];
}

export function getReminderByIdAndChatId(id: string, chatId: number): Reminder | undefined {
  const stmt = db.prepare("SELECT * FROM reminders WHERE id = ? AND chat_id = ?");
  return stmt.get(id, chatId) as Reminder | undefined;
}

export function updateReminderTrigger(id: string, nextTrigger: number): void {
  const stmt = db.prepare("UPDATE reminders SET next_trigger = ? WHERE id = ?");
  stmt.run(nextTrigger, id);
}

export function deleteReminderByIdAndChatId(id: string, chatId: number): boolean {
  const stmt = db.prepare("DELETE FROM reminders WHERE id = ? AND chat_id = ?");
  const result = stmt.run(id, chatId);
  return result.changes > 0;
}

export function toggleReminderByIdAndChatId(id: string, chatId: number): boolean {
  const stmt = db.prepare("UPDATE reminders SET enabled = NOT enabled WHERE id = ? AND chat_id = ?");
  const result = stmt.run(id, chatId);
  return result.changes > 0;
}

export function getDueReminders(): Reminder[] {
  const now = Date.now();
  const stmt = db.prepare("SELECT * FROM reminders WHERE enabled = 1 AND next_trigger <= ?");
  return stmt.all(now) as Reminder[];
}

export interface UserSettings {
  chat_id: number;
  sleep_start: string | null;
  sleep_end: string | null;
}

export function getUserSettings(chatId: number): UserSettings | undefined {
  const stmt = db.prepare("SELECT * FROM user_settings WHERE chat_id = ?");
  return stmt.get(chatId) as UserSettings | undefined;
}

export function setSleepHours(chatId: number, sleepStart: string, sleepEnd: string): void {
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO user_settings (chat_id, sleep_start, sleep_end)
    VALUES (?, ?, ?)
  `);
  stmt.run(chatId, sleepStart, sleepEnd);
}

export function clearSleepHours(chatId: number): void {
  const stmt = db.prepare("DELETE FROM user_settings WHERE chat_id = ?");
  stmt.run(chatId);
}

export default db;
