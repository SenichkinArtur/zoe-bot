import Database from "better-sqlite3";

export const db_init = () => {
  const db = new Database("zoe.db", {
    // verbose: console.log,
  });
  db.pragma("journal_mode = WAL");

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      telegram_id INTEGER UNIQUE,
      queue_number TEXT,
      locale TEXT
    )
  `);
  db.exec(`
    CREATE TABLE IF NOT EXISTS schedules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date DATE UNIQUE NOT NULL,
      queues TEXT NOT NULL,       -- JSON: {"1.1": "...", "1.2": "...", ...}
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
};
