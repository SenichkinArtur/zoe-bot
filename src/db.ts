import Database from "better-sqlite3";

export const db_init = () => {
  const db = new Database("zoe.db", {
    // verbose: console.log,
  });
  db.pragma("journal_mode = WAL");

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      telegram_id INEGER UNIQUE,
      queue_number TEXT
    )
  `);
};
