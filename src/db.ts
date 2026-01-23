import Database from "better-sqlite3";
import type { Statement } from "better-sqlite3";
import type { Schedule, ScheduleRecord, User } from "./types.js";
import type { Dayjs } from "dayjs";

const DB_DATE_FORMAT = "DD.MM.YYYY";

const db = new Database("zoe.db", {
  // verbose: console.log,
});

let insertUserStmt: Statement;
let removeUserByTgUserIdStmt: Statement;
let getUserByTgUserIdStmt: Statement;
let getAllUsersStmt: Statement;
let setUserGroupNumberByIdStmt: Statement;
let insertScheduleStmt: Statement;
let updateScheduleStmt: Statement;
let checkIfScheduleExistsByDateStmt: Statement;
let getScheduleByDateStmt: Statement;

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
      schedules TEXT NOT NULL,       -- JSON: {"1.1": "...", "1.2": "...", ...}
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT
    )
  `);
  // db.exec(`
  //   CREATE TABLE IF NOT EXISTS sent_messages (
  //     id INTEGER PRIMARY KEY AUTOINCREMENT,
  //     user_id INTEGER,
  //     date TEXT UNIQUE NOT NULL,
  //     schedule_text TEXT NOT NULL,
  //     sent_at TEXT DEFAULT CURRENT_TIMESTAMP,
  //   )
  // `);
  insertUserStmt = db.prepare(
    "INSERT INTO users (telegram_user_id) VALUES (?)",
  );
  removeUserByTgUserIdStmt = db.prepare(
    "DELETE FROM users WHERE telegram_user_id = ?",
  );
  getUserByTgUserIdStmt = db.prepare(
    "SELECT * FROM users WHERE telegram_user_id = ?",
  );
  getAllUsersStmt = db.prepare("SELECT * FROM users");
  setUserGroupNumberByIdStmt = db.prepare(
    "UPDATE users SET group_number = ? WHERE id = ?",
  );
  insertScheduleStmt = db.prepare(
    "INSERT INTO schedules (date, schedules) VALUES (?, ?)",
  );
  updateScheduleStmt = db.prepare(
    "UPDATE schedules SET schedules = ? WHERE date = ?",
  );
  checkIfScheduleExistsByDateStmt = db.prepare(
    "SELECT EXISTS (SELECT 1 FROM schedules WHERE date = ?) AS exists_flag",
  );
  getScheduleByDateStmt = db.prepare("SELECT * FROM schedules WHERE date = ?");
};

export const insertUser = (telegramUserId: number): boolean => {
  try {
    insertUserStmt.run(telegramUserId);
    return true;
  } catch (e) {
    console.error(e);
    return false;
  }
};

export const getAllUsers = (): User[] => {
  try {
    const users = getAllUsersStmt.all() as User[];

    return users;
  } catch (e) {
    console.error(e);
    return [];
  }
};

export const getUsersByGroupNumbers = (groupNumbers: string[]): User[] => {
  if (groupNumbers.length === 0) return [];

  try {
    const placeholders = groupNumbers.map(() => "?").join(", ");
    const stmt = db.prepare(
      `SELECT * FROM users WHERE group_number IN (${placeholders})`,
    );
    const users = stmt.all(...groupNumbers) as User[];

    return users;
  } catch (e) {
    console.error(e);
    return [];
  }
};

export const removeUserByTgUserId = (telegramUserId: number): boolean => {
  try {
    removeUserByTgUserIdStmt.run(telegramUserId);
    return true;
  } catch (e) {
    console.error(e);
    return false;
  }
};

export const getUserByTgUserId = (telegramUserId: number): User | null => {
  try {
    const user = getUserByTgUserIdStmt.get(telegramUserId) as User | undefined;
    return user || null;
  } catch (e) {
    console.error(e);
    return null;
  }
};

export const setUserGroupNumberById = (
  userId: number,
  groupNumber: string,
): boolean => {
  try {
    setUserGroupNumberByIdStmt.run(groupNumber, userId);
    return true;
  } catch (e) {
    console.error(e);
    return false;
  }
};

export const insertSchedule = (date: Dayjs, schedule: Schedule): boolean => {
  try {
    insertScheduleStmt.run(
      date.format(DB_DATE_FORMAT),
      JSON.stringify(schedule),
    );
    return true;
  } catch (e) {
    console.error(e);
    return false;
  }
};

export const updateSchedule = (date: Dayjs, schedule: Schedule): boolean => {
  try {
    updateScheduleStmt.run(
      JSON.stringify(schedule),
      date.format(DB_DATE_FORMAT),
    );
    return true;
  } catch (e) {
    console.error(e);
    return false;
  }
};

// export const checkIfScheduleExistsByDate = (date: Dayjs): boolean => {
//   try {
//     const result = checkIfScheduleExistsByDateStmt.get(
//       date.format(DB_DATE_FORMAT),
//     ) as { exists_flag: number } | undefined;

//     return !!result?.exists_flag;
//   } catch (e) {
//     console.error(e);
//     return false;
//   }
// };

export const getScheduleByDate = (date: Dayjs): Schedule | null => {
  try {
    const schedule = getScheduleByDateStmt.get(date.format(DB_DATE_FORMAT)) as
      | ScheduleRecord
      | undefined;

    return schedule ? JSON.parse(schedule.schedules) : null;
  } catch (e) {
    console.error(e);
    return null;
  }
};
