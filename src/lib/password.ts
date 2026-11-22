import crypto from "node:crypto";

export const RESERVED_SLUGS = new Set([
  "admin",
  "superadmin",
  "api",
  "auth",
  "login",
  "masuk",
  "daftar",
  "register",
  "logout",
  "keluar",
  "lupa-password",
  "reset-password",
  "demo",
  "u",
  "checkin",
  "qrcode",
  "uploads",
  "assets",
  "static",
  "404",
  "500",
]);

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = crypto.scryptSync(password, salt, 64).toString("hex");
  return `scrypt$${salt}$${derived}`;
}

export function verifyPasswordHash(password: string, stored: string): boolean {
  if (!password || !stored) return false;
  const parts = stored.split("$");
  if (parts.length !== 3 || parts[0] !== "scrypt") return false;
  const [, salt, hexHash] = parts;
  if (!salt || !hexHash) return false;
  try {
    const expected = Buffer.from(hexHash, "hex");
    const actual = crypto.scryptSync(password, salt, expected.length);
    if (actual.length !== expected.length) return false;
    return crypto.timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

export function normalizeUsername(raw: string): string {
  return String(raw || "")
    .trim()
    .toLowerCase();
}

export function isValidUsername(username: string): boolean {
  return /^[a-z0-9._-]{3,32}$/.test(username);
}

export function normalizeWeddingSlug(raw: string): string {
  return String(raw || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function isValidWeddingSlug(slug: string): boolean {
  if (!/^[a-z0-9][a-z0-9-]{2,48}[a-z0-9]$/.test(slug)) return false;
  if (RESERVED_SLUGS.has(slug)) return false;
  return true;
}

export function validatePasswordStrength(password: string): string | null {
  if (typeof password !== "string" || password.length < 6) {
    return "Password minimal 6 karakter.";
  }
  if (password.length > 128) {
    return "Password maksimal 128 karakter.";
  }
  return null;
}
