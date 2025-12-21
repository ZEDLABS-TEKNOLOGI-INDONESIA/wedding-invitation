import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

// 1. Determine Database Folder & Path
const DB_DIR = path.resolve(process.cwd(), "database");
const BACKUP_DIR = path.join(DB_DIR, "backup"); // Folder khusus backup
const DB_FILE = path.join(DB_DIR, "wedding.db");
const OLD_DB_FILE = path.resolve(process.cwd(), "wedding.db");

// 2. Create folders if they don't exist
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

// 3. Auto Migration
if (fs.existsSync(OLD_DB_FILE) && !fs.existsSync(DB_FILE)) {
  console.log("Moving database to /database folder...");
  fs.renameSync(OLD_DB_FILE, DB_FILE);
}

// 4. Database Connection
const db = new Database(DB_FILE);
db.pragma("journal_mode = WAL");

// 5. Initialize Tables
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

  CREATE TABLE IF NOT EXISTS backup_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    action_type TEXT NOT NULL,
    filename TEXT,
    status TEXT NOT NULL,
    details TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
`);

export const getDbPath = () => DB_FILE;
export const getBackupPath = () => BACKUP_DIR; // Export path backup
export default db;
