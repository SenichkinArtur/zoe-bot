import Database from "better-sqlite3";
import type { Schedule, ScheduleRecord, User } from "./types.js";
import type { Dayjs } from "dayjs";

const DB_DATE_FORMAT = "DD.MM.YYYY";

const db = new Database("zoe.db", {
  // verbose: console.log,
});

export const dbInit = () => {
  db.pragma("journal_mode = WAL");

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      telegram_user_id INTEGER UNIQUE,
      group_number TEXT,
      locale TEXT
    )
  `);
  db.exec(`
    CREATE TABLE IF NOT EXISTS schedules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT UNIQUE NOT NULL,
      queues TEXT NOT NULL,       -- JSON: {"1.1": "...", "1.2": "...", ...}
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT
    )
  `);
};

export const insertUser = (telegramUserId: number) => {
  try {
    const insertUser = db.prepare(
      "INSERT INTO users (telegram_user_id) VALUES (?)",
    );
    insertUser.run(telegramUserId);
  } catch (e) {
    console.error(e);
  }
};

export const removeUserByTgUserId = (telegramUserId: number) => {
  try {
    const stmt = db.prepare(
      "DELETE FROM users WHERE telegram_user_id = ?",
    );
    stmt.run(telegramUserId);
  } catch (e) {
    console.error(e);
  }
};

export const getUserByTelegramUserId = (
  telegramUserId: number,
): User | undefined => {
  try {
    const getUser = db.prepare(
      "SELECT * FROM users WHERE telegram_user_id = ?",
    );
    return getUser.get(telegramUserId) as User | undefined;
  } catch (e) {
    console.error(e);
  }
};

export const setUserGroupNumberById = (
  userId: number,
  groupNumber: number,
) => {
  try {
    const stmt = db.prepare("UPDATE users SET group_number = ? WHERE id = ?");
    stmt.run(groupNumber, userId);
  } catch (e) {
    console.error(e);
  }
};

export const insertSchedule = (date: Dayjs, schedule: Schedule) => {
  try {
    const insertSchedule = db.prepare(
      "INSERT INTO schedules (date, queues) VALUES (?, ?)",
    );
    insertSchedule.run(date.format(DB_DATE_FORMAT), JSON.stringify(schedule));
  } catch (e) {
    console.error(e);
  }
};

export const checkIfScheduleExistsByDate = (date: Dayjs) => {
  const checkSchedule = db.prepare(
    "SELECT EXISTS (SELECT 1 FROM schedules WHERE date = ?) AS exists_flag",
  );
  const result = checkSchedule.get(date.format(DB_DATE_FORMAT)) as
    | { exists_flag: number }
    | undefined;

  return result?.exists_flag;
};

export const getScheduleByDate = (date: Dayjs): Schedule | null => {
  const getSchedule = db.prepare("SELECT * FROM schedules WHERE date = ?");
  const schedule = getSchedule.get(date.format(DB_DATE_FORMAT)) as
    | ScheduleRecord
    | undefined;

  return schedule?.queues || null;
};
