import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { hashPassword, normalizeUsername } from "./password";

const DB_DIR = path.resolve(process.cwd(), "database");
const rawDbName = process.env.DB_NAME?.trim() || "wedding.db";
const safeDbName = path.basename(rawDbName).endsWith(".db")
  ? path.basename(rawDbName)
  : `${path.basename(rawDbName)}.db`;
const DB_FILE = path.join(DB_DIR, safeDbName);
const OLD_DB_FILE = path.resolve(process.cwd(), "wedding.db");

if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

if (fs.existsSync(OLD_DB_FILE) && !fs.existsSync(DB_FILE)) {
  fs.renameSync(OLD_DB_FILE, DB_FILE);
}

const db = new Database(DB_FILE);
db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS rsvps (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guest_name TEXT NOT NULL,
    phone TEXT,
    attendance TEXT,
    guest_count INTEGER,
    message TEXT,
    reminder_sent_at TEXT DEFAULT '',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS wishes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    message TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS config (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS admin_sessions (
    token_hash TEXT PRIMARY KEY,
    expires_at INTEGER NOT NULL,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS wa_invitations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guest_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    address TEXT DEFAULT 'Di Tempat',
    invitation_url TEXT NOT NULL,
    job_id TEXT DEFAULT '',
    reference_id TEXT DEFAULT '',
    status TEXT DEFAULT 'queued',
    error_message TEXT DEFAULT '',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS guests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    phone TEXT DEFAULT '',
    address TEXT DEFAULT 'Di Tempat',
    group_name TEXT DEFAULT '',
    quota INTEGER DEFAULT 2,
    checked_in INTEGER DEFAULT 0,
    checked_in_at TEXT DEFAULT '',
    checked_in_pax INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS planner_todos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    phase TEXT DEFAULT 'H-3 Bulan',
    category TEXT DEFAULT 'Umum',
    due_date TEXT DEFAULT '',
    pic TEXT DEFAULT 'Bersama',
    done INTEGER DEFAULT 0,
    notes TEXT DEFAULT '',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS planner_budget (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    category TEXT DEFAULT 'Lainnya',
    estimated_cost INTEGER DEFAULT 0,
    actual_cost INTEGER DEFAULT 0,
    paid_amount INTEGER DEFAULT 0,
    payment_status TEXT DEFAULT 'belum',
    vendor_phone TEXT DEFAULT '',
    due_date TEXT DEFAULT '',
    notes TEXT DEFAULT '',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS planner_savings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    entry_date TEXT NOT NULL,
    contributor TEXT DEFAULT 'Bersama',
    entry_type TEXT DEFAULT 'setor',
    amount INTEGER NOT NULL,
    note TEXT DEFAULT '',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS planner_essentials (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    kind TEXT NOT NULL DEFAULT 'seserahan',
    title TEXT NOT NULL,
    price INTEGER DEFAULT 0,
    status TEXT DEFAULT 'rencana',
    owner TEXT DEFAULT 'Bersama',
    done_groom INTEGER DEFAULT 0,
    done_bride INTEGER DEFAULT 0,
    notes TEXT DEFAULT '',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS planner_journal (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    entry_date TEXT NOT NULL,
    author TEXT DEFAULT 'Bersama',
    mood TEXT DEFAULT 'bersyukur',
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS planner_idempotency (
    idempotency_key TEXT PRIMARY KEY,
    resource TEXT NOT NULL,
    response_json TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS weddings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    is_demo INTEGER NOT NULL DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'couple_owner',
    wedding_id INTEGER,
    full_name TEXT NOT NULL DEFAULT '',
    phone TEXT NOT NULL DEFAULT '',
    phone_verified INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (wedding_id) REFERENCES weddings(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS otp_codes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    phone TEXT NOT NULL,
    purpose TEXT NOT NULL,
    code_hash TEXT NOT NULL,
    payload_json TEXT DEFAULT '',
    attempts INTEGER NOT NULL DEFAULT 0,
    expires_at INTEGER NOT NULL,
    used_at INTEGER DEFAULT 0,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS platform_config (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS wedding_config (
    wedding_id INTEGER NOT NULL,
    key TEXT NOT NULL,
    value TEXT NOT NULL,
    PRIMARY KEY (wedding_id, key),
    FOREIGN KEY (wedding_id) REFERENCES weddings(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS billing_orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    wedding_id INTEGER NOT NULL,
    invoice_code TEXT UNIQUE NOT NULL,
    current_quota INTEGER NOT NULL DEFAULT 200,
    requested_total_quota INTEGER NOT NULL,
    added_guests INTEGER NOT NULL,
    amount INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    payment_method TEXT NOT NULL DEFAULT 'Transfer Bank / QRIS',
    payment_note TEXT NOT NULL DEFAULT '',
    proof_url TEXT NOT NULL DEFAULT '',
    admin_note TEXT NOT NULL DEFAULT '',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    verified_at TEXT DEFAULT '',
    FOREIGN KEY (wedding_id) REFERENCES weddings(id) ON DELETE CASCADE
  );
`);

const DEFAULT_CONFIG: Record<string, string> = {
  BRIDE_NICKNAME: "Fey",
  BRIDE_FULLNAME: "Fera Oktapia",
  BRIDE_PARENTS: "Putri tercinta dari Bpk. [Nama Ayah] & Ibu [Nama Ibu]",
  BRIDE_INSTAGRAM: "feraoktapia___",
  BRIDE_IMAGE: "/assets/bride-placeholder.svg",
  GROOM_NICKNAME: "Yaya",
  GROOM_FULLNAME: "Yahya Zulfikri",
  GROOM_PARENTS: "Putra tercinta dari Bpk. [Nama Ayah] & Ibu [Nama Ibu]",
  GROOM_INSTAGRAM: "zulfikriyahya_",
  GROOM_IMAGE: "/assets/groom-placeholder.svg",
  VENUE_NAME: "The Royal Azure Ballroom",
  VENUE_ADDRESS: "Jl. Taman Makam Pahlawan No.48, Kab. Pandeglang, Banten",
  VENUE_LAT: "-6.3032707",
  VENUE_LNG: "106.1011039",
  AKAD_TITLE: "Akad Nikah",
  AKAD_DAY: "Minggu",
  AKAD_DATE: "11 Oktober 2025",
  AKAD_START: "08:00",
  AKAD_END: "10:00",
  AKAD_ISO_START: "2025-10-11T08:00:00+07:00",
  AKAD_ISO_END: "2025-10-11T10:00:00+07:00",
  RESEPSI_TITLE: "Resepsi Pernikahan",
  RESEPSI_DAY: "Minggu",
  RESEPSI_DATE: "11 Oktober 2025",
  RESEPSI_START: "11:00",
  RESEPSI_END: "14:00",
  RESEPSI_ISO_START: "2025-10-11T11:00:00+07:00",
  RESEPSI_ISO_END: "2025-10-11T14:00:00+07:00",
  HERO_IMAGE: "/assets/hero-default.svg",
  ENVELOPE_IMAGE: "",
  HERO_CITY: "Kab. Pandeglang, Banten",
  EVENT_TIMEZONE: "WIB",
  GIFT_ADDRESS: "",
  MUSIC_URL: "",
  PUBLIC_THEME: "ocean",
  PUBLIC_DEFAULT_MODE: "system",
  PUBLIC_ALLOW_THEME_SWITCH: "true",
  PUBLIC_ANIMATION: "doves",
  PUBLIC_ORNAMENT: "botanical",
  RSVP_MAX_GUESTS: "20",
  BANK_ACCOUNTS: JSON.stringify([
    { bank: "Bank BCA", number: "1234567890", name: "Fera Oktapia" },
    { bank: "Bank Mandiri", number: "0987655432", name: "Yahya Zulfikri" },
  ]),
  LOVE_STORY: JSON.stringify([
    {
      date: "2020",
      title: "Awal Pertemuan",
      desc: "Atas izin Allah, kami dipertemukan dalam suasana yang sederhana namun penuh makna.",
    },
    {
      date: "2022",
      title: "Menjalin Harapan",
      desc: "Dengan niat baik, kami memutuskan untuk saling mengenal dan membangun komitmen menuju ridho-Nya.",
    },
    {
      date: "2025",
      title: "Ikatan Suci",
      desc: "Insya Allah, kami memantapkan hati untuk menyempurnakan separuh agama dalam ikatan pernikahan.",
    },
  ]),
  GALLERY_IMAGES: JSON.stringify([
    "/assets/gallery-1.svg",
    "/assets/gallery-2.svg",
    "/assets/gallery-3.svg",
    "/assets/gallery-4.svg",
    "/assets/gallery-5.svg",
    "/assets/gallery-6.svg",
  ]),
  TEXT_SALAM_OPENING: "Assalamu'alaikum Warahmatullahi Wabarakatuh",
  TEXT_QUOTE_AR_RUM: `"Dan di antara tanda-tanda (kebesaran)-Nya ialah Dia menciptakan pasangan-pasangan untukmu dari jenismu sendiri, agar kamu cenderung dan merasa tenteram kepadanya, dan Dia menjadikan di antaramu rasa kasih dan sayang. Sesungguhnya pada yang demikian itu benar-benar terdapat tanda-tanda (kebesaran Allah) bagi kaum yang berpikir."`,
  TEXT_QUOTE_SOURCE: "QS. Ar-Rum: 21",
  TEXT_INVITATION:
    "Dengan segala kerendahan hati dan tanpa mengurangi rasa hormat, perkenankan kami mengundang Bapak/Ibu/Saudara/i beserta keluarga untuk berkenan hadir dan memberikan doa restu pada hari bahagia pernikahan kami:",
  TEXT_CLOSING:
    "Merupakan suatu kehormatan dan kebahagiaan yang tiada terkira bagi kami apabila Bapak/Ibu/Saudara/i berkenan hadir serta melimpahkan doa restu kepada kedua mempelai.",
  TEXT_SALAM_CLOSING: "Wassalamu'alaikum Warahmatullahi Wabarakatuh",
  TEXT_SIGNATURE: "Kami yang berbahagia,",
  TEXT_FAMILY: "Segenap Keluarga Besar Kedua Mempelai",
  TEXT_GIFT_TITLE: "Tanda Kasih",
  TEXT_GIFT_DESC:
    "Kehadiran serta untaian doa restu Bapak/Ibu/Saudara/i merupakan anugerah terindah bagi kami. Namun, apabila Bapak/Ibu/Saudara/i bermaksud menyampaikan tanda kasih, kami menerimanya dengan segala kerendahan hati dan rasa syukur.",
  WA_BASE_URL: "https://whatsapp.zedlabs.id",
  WA_API_KEY: "",
  WA_API_SECRET: "",
  WA_ADMIN_NUMBERS: "",
  WA_NOTIFY_ADMIN_RSVP: "true",
  WA_NOTIFY_ADMIN_WISH: "true",
  WA_AUTO_CONFIRM_GUEST: "true",
  WA_AUTO_REMINDER_H1: "true",
  PLANNER_SAVINGS_TARGET: "50000000",
};

try {
  db.exec("ALTER TABLE rsvps ADD COLUMN reminder_sent_at TEXT DEFAULT ''");
} catch {
  // Kolom reminder_sent_at sudah ada
}

// Migrasi kolom multi-tenant (idempoten untuk database eksisting)
const TENANT_TABLES = [
  "rsvps",
  "wishes",
  "wa_invitations",
  "guests",
  "planner_todos",
  "planner_budget",
  "planner_savings",
  "planner_essentials",
  "planner_journal",
  "planner_idempotency",
];

for (const tbl of TENANT_TABLES) {
  try {
    db.exec(
      `ALTER TABLE ${tbl} ADD COLUMN wedding_id INTEGER NOT NULL DEFAULT 1`
    );
  } catch {
    // Kolom wedding_id sudah ada
  }
}

try {
  db.exec("ALTER TABLE admin_sessions ADD COLUMN user_id INTEGER");
} catch {
  // Kolom user_id sudah ada
}
try {
  db.exec(
    "ALTER TABLE admin_sessions ADD COLUMN impersonating_wedding_id INTEGER"
  );
} catch {
  // Kolom impersonating_wedding_id sudah ada
}
try {
  db.exec(
    "ALTER TABLE weddings ADD COLUMN guest_quota_limit INTEGER NOT NULL DEFAULT 200"
  );
} catch {
  // Kolom guest_quota_limit sudah ada
}
try {
  db.exec("ALTER TABLE users ADD COLUMN avatar_url TEXT NOT NULL DEFAULT ''");
} catch {
  // Kolom avatar_url sudah ada
}
for (const sql of [
  "ALTER TABLE billing_orders ADD COLUMN sender_name TEXT NOT NULL DEFAULT ''",
  "ALTER TABLE billing_orders ADD COLUMN sender_bank TEXT NOT NULL DEFAULT ''",
  "ALTER TABLE billing_orders ADD COLUMN due_at TEXT NOT NULL DEFAULT ''",
  "ALTER TABLE billing_orders ADD COLUMN submitted_at TEXT NOT NULL DEFAULT ''",
  "ALTER TABLE billing_orders ADD COLUMN invoice_sent_at TEXT NOT NULL DEFAULT ''",
]) {
  try {
    db.exec(sql);
  } catch {
    // Kolom sudah ada
  }
}

export const DEFAULT_WEDDING_ID = 1;

export interface WeddingRecord {
  id: number;
  slug: string;
  title: string;
  status: "active" | "suspended";
  is_demo: number;
  guest_quota_limit?: number;
  created_at: string;
}

export interface UserRecord {
  id: number;
  username: string;
  password_hash: string;
  role: "superadmin" | "couple_owner" | "couple_partner";
  wedding_id: number | null;
  full_name: string;
  phone: string;
  avatar_url?: string;
  phone_verified: number;
  status: "active" | "suspended";
  created_at: string;
}

export const seedWeddingDefaults = (
  weddingId: number,
  overrides: Record<string, string> = {}
): void => {
  const stmt = db.prepare(
    "INSERT OR IGNORE INTO wedding_config (wedding_id, key, value) VALUES (?, ?, ?)"
  );
  const upsert = db.prepare(
    "INSERT OR REPLACE INTO wedding_config (wedding_id, key, value) VALUES (?, ?, ?)"
  );
  const run = db.transaction(() => {
    for (const [key, value] of Object.entries(DEFAULT_CONFIG)) {
      stmt.run(weddingId, key, value);
    }
    for (const [key, value] of Object.entries(overrides)) {
      if (key in DEFAULT_CONFIG) {
        upsert.run(weddingId, key, value);
      }
    }
  });
  run();
};

// 1. Seed tenant demo (id = 1) dan migrasikan config lama ke wedding_config(1)
const demoExists = db.prepare("SELECT id FROM weddings WHERE id = 1").get() as
  | { id: number }
  | undefined;

if (!demoExists) {
  db.prepare(
    "INSERT INTO weddings (id, slug, title, status, is_demo) VALUES (1, 'demo', 'Undangan Demo (Fey & Yaya)', 'active', 1)"
  ).run();
}

const legacyConfigRows = db
  .prepare("SELECT key, value FROM config")
  .all() as Array<{ key: string; value: string }>;

const demoConfigCount = (
  db
    .prepare("SELECT COUNT(*) as c FROM wedding_config WHERE wedding_id = 1")
    .get() as { c: number }
).c;

if (demoConfigCount === 0 && legacyConfigRows.length > 0) {
  const copyStmt = db.prepare(
    "INSERT OR IGNORE INTO wedding_config (wedding_id, key, value) VALUES (1, ?, ?)"
  );
  const copyTx = db.transaction(() => {
    for (const row of legacyConfigRows) {
      if (row.key === "TELEGRAM_BOT_TOKEN" || row.key === "TELEGRAM_CHAT_ID") {
        continue;
      }
      copyStmt.run(row.key, row.value);
    }
  });
  copyTx();
}
seedWeddingDefaults(DEFAULT_WEDDING_ID);

// Perbarui judul tenant demo sesuai nama mempelai yang tersimpan
const demoBride = (
  db
    .prepare(
      "SELECT value FROM wedding_config WHERE wedding_id = 1 AND key = 'BRIDE_NICKNAME'"
    )
    .get() as { value: string } | undefined
)?.value;
const demoGroom = (
  db
    .prepare(
      "SELECT value FROM wedding_config WHERE wedding_id = 1 AND key = 'GROOM_NICKNAME'"
    )
    .get() as { value: string } | undefined
)?.value;
if (demoBride && demoGroom) {
  db.prepare("UPDATE weddings SET title = ? WHERE id = 1 AND is_demo = 1").run(
    `Demo | ${demoBride} & ${demoGroom}`
  );
}

// 2. Seed platform_config (untuk WhatsApp Gateway OTP & Reset Password Superadmin)
const DEFAULT_PLATFORM_CONFIG: Record<string, string> = {
  WA_BASE_URL:
    legacyConfigRows.find((r) => r.key === "WA_BASE_URL")?.value ||
    "https://whatsapp.zedlabs.id",
  WA_API_KEY: legacyConfigRows.find((r) => r.key === "WA_API_KEY")?.value || "",
  WA_API_SECRET:
    legacyConfigRows.find((r) => r.key === "WA_API_SECRET")?.value || "",
  PLATFORM_NAME: "Wedding Management",
  PAYMENT_BANK_NAME: "Bank BCA",
  PAYMENT_BANK_ACCOUNT: "",
  PAYMENT_BANK_HOLDER: "ZEDLABS Teknologi Indonesia",
  PAYMENT_WHATSAPP_CONFIRM: "",
};
const insertPlatformDefault = db.prepare(
  "INSERT OR IGNORE INTO platform_config (key, value) VALUES (?, ?)"
);
for (const [k, v] of Object.entries(DEFAULT_PLATFORM_CONFIG)) {
  insertPlatformDefault.run(k, v);
}
// Migrasikan nama platform default lama & URL CDN bawaan ke aset lokal native
db.prepare(
  "UPDATE platform_config SET value = 'Wedding Management' WHERE key = 'PLATFORM_NAME' AND value = 'Wedding Platform'"
).run();
db.prepare(
  "UPDATE wedding_config SET value = '/assets/bride-placeholder.svg' WHERE key = 'BRIDE_IMAGE' AND value LIKE 'https://placehold.co/%'"
).run();
db.prepare(
  "UPDATE wedding_config SET value = '/assets/groom-placeholder.svg' WHERE key = 'GROOM_IMAGE' AND value LIKE 'https://placehold.co/%'"
).run();
db.prepare(
  "UPDATE wedding_config SET value = '/assets/hero-default.svg' WHERE key = 'HERO_IMAGE' AND value LIKE 'https://images.unsplash.com/%'"
).run();
db.prepare(
  "UPDATE wedding_config SET value = '' WHERE key = 'MUSIC_URL' AND value LIKE 'https://www.bensound.com/%'"
).run();
db.prepare(
  "UPDATE wedding_config SET value = ? WHERE key = 'GALLERY_IMAGES' AND value LIKE '%https://placehold.co/%'"
).run(DEFAULT_CONFIG.GALLERY_IMAGES);

// 3. Seed Superadmin awal jika belum ada di tabel users
const existingSuperadmin = db
  .prepare("SELECT id FROM users WHERE role = 'superadmin' LIMIT 1")
  .get() as { id: number } | undefined;

if (!existingSuperadmin) {
  const initialUsername = normalizeUsername(
    process.env.SUPERADMIN_USERNAME?.trim() || "superadmin"
  );
  const initialPassword =
    process.env.SUPERADMIN_PASSWORD?.trim() ||
    process.env.ADMIN_PASSWORD?.trim() ||
    "admin123";
  const initialPhone = process.env.SUPERADMIN_PHONE?.trim() || "";
  db.prepare(
    `INSERT OR IGNORE INTO users
      (username, password_hash, role, wedding_id, full_name, phone, phone_verified, status)
     VALUES (?, ?, 'superadmin', NULL, 'Superadmin Platform', ?, 1, 'active')`
  ).run(initialUsername, hashPassword(initialPassword), initialPhone);
}

export const getWeddingBySlug = (slug: string): WeddingRecord | undefined => {
  const clean = String(slug || "")
    .trim()
    .toLowerCase();
  if (!clean) return undefined;
  return db
    .prepare("SELECT * FROM weddings WHERE slug = ? LIMIT 1")
    .get(clean) as WeddingRecord | undefined;
};

export const getWeddingById = (id: number): WeddingRecord | undefined => {
  return db.prepare("SELECT * FROM weddings WHERE id = ? LIMIT 1").get(id) as
    | WeddingRecord
    | undefined;
};

export const getConfig = (
  weddingId: number = DEFAULT_WEDDING_ID
): Record<string, string> => {
  const rows = db
    .prepare("SELECT key, value FROM wedding_config WHERE wedding_id = ?")
    .all(weddingId) as { key: string; value: string }[];
  return {
    ...DEFAULT_CONFIG,
    ...Object.fromEntries(rows.map((r) => [r.key, r.value])),
  };
};

export const setConfig = (
  key: string,
  value: string,
  weddingId: number = DEFAULT_WEDDING_ID
): void => {
  db.prepare(
    "INSERT OR REPLACE INTO wedding_config (wedding_id, key, value) VALUES (?, ?, ?)"
  ).run(weddingId, key, value);
};

export const getPlatformConfig = (): Record<string, string> => {
  const rows = db.prepare("SELECT key, value FROM platform_config").all() as {
    key: string;
    value: string;
  }[];
  return Object.fromEntries(rows.map((r) => [r.key, r.value]));
};

export const setPlatformConfig = (key: string, value: string): void => {
  db.prepare(
    "INSERT OR REPLACE INTO platform_config (key, value) VALUES (?, ?)"
  ).run(key, value);
};

export const PRIVATE_CONFIG_KEYS = new Set([
  "WA_BASE_URL",
  "WA_API_KEY",
  "WA_API_SECRET",
  "WA_ADMIN_NUMBERS",
  "WA_NOTIFY_ADMIN_RSVP",
  "WA_NOTIFY_ADMIN_WISH",
  "WA_AUTO_CONFIRM_GUEST",
  "WA_AUTO_REMINDER_H1",
  "PLANNER_SAVINGS_TARGET",
]);

export const getPublicConfig = (
  weddingId: number = DEFAULT_WEDDING_ID
): Record<string, string> => {
  const full = getConfig(weddingId);
  const safe: Record<string, string> = {};
  for (const [key, value] of Object.entries(full)) {
    if (!PRIVATE_CONFIG_KEYS.has(key)) {
      safe[key] = value;
    }
  }
  return safe;
};

export const ALLOWED_CONFIG_KEYS = new Set(Object.keys(DEFAULT_CONFIG));

export const getDbPath = () => DB_FILE;
export default db;
