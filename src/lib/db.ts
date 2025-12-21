import Database from "better-sqlite3";
const DB_NAME = import.meta.env.DB_NAME || process.env.DB_NAME || "wedding.db";
const db = new Database(DB_NAME);
db.pragma("journal_mode = WAL");
db.exec(`
  CREATE TABLE IF NOT EXISTS rsvps (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guest_name TEXT NOT NULL,
    phone TEXT,
    attendance TEXT,
    guest_count INTEGER,
    message TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS wishes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    message TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
`);

export default db;
