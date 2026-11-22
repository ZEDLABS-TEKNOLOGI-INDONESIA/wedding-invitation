import crypto from "node:crypto";
import type { AstroCookies } from "astro";
import db, {
  DEFAULT_WEDDING_ID,
  getWeddingById,
  type UserRecord,
} from "./db";
import { normalizeUsername, verifyPasswordHash } from "./password";

export const SESSION_COOKIE_NAME = "wedding_admin_session";
const LEGACY_COOKIE_NAME = "wedding_admin_auth";
const SESSION_TTL_MS = 24 * 60 * 60 * 1000;

export interface AuthSession {
  userId: number;
  username: string;
  role: "superadmin" | "couple_owner" | "couple_partner";
  fullName: string;
  phone: string;
  weddingId: number;
  weddingSlug: string;
  weddingTitle: string;
  isDemo: boolean;
  impersonating: boolean;
}

const sha256 = (value: string): Buffer =>
  crypto.createHash("sha256").update(value).digest();

const sha256Hex = (value: string): string =>
  crypto.createHash("sha256").update(value).digest("hex");

export const isSecureRequest = (request: Request): boolean => {
  const forwardedProto = request.headers
    .get("x-forwarded-proto")
    ?.split(",")[0]
    ?.trim()
    .toLowerCase();
  if (forwardedProto) {
    return forwardedProto === "https";
  }
  try {
    return new URL(request.url).protocol === "https:";
  } catch {
    return import.meta.env.PROD;
  }
};

export const getConfiguredAdminPassword = (): string | null => {
  const runtimePassword = process.env.ADMIN_PASSWORD?.trim();
  if (runtimePassword) return runtimePassword;

  const buildPassword = import.meta.env.ADMIN_PASSWORD?.trim();
  if (buildPassword) return buildPassword;

  return null;
};

export const verifyAdminPassword = (input: string): boolean => {
  const configured = getConfiguredAdminPassword();
  if (!configured) {
    console.error(
      "[AUTH] ADMIN_PASSWORD belum dikonfigurasi di environment variable."
    );
    return false;
  }
  if (!input || typeof input !== "string") return false;

  const inputDigest = sha256(input);
  const configuredDigest = sha256(configured);
  return crypto.timingSafeEqual(inputDigest, configuredDigest);
};

export const authenticateUser = (
  rawUsername: string,
  password: string
): UserRecord | null => {
  const username = normalizeUsername(rawUsername);
  if (!username || !password) return null;
  const user = db
    .prepare("SELECT * FROM users WHERE username = ? LIMIT 1")
    .get(username) as UserRecord | undefined;
  if (!user || user.status !== "active") return null;
  if (!verifyPasswordHash(password, user.password_hash)) return null;
  return user;
};

export const createUserSession = (
  cookies: AstroCookies,
  request: Request,
  userId: number,
  impersonatingWeddingId?: number | null
): void => {
  const now = Date.now();
  const expiresAt = now + SESSION_TTL_MS;
  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = sha256Hex(rawToken);

  db.prepare("DELETE FROM admin_sessions WHERE expires_at <= ?").run(now);
  db.prepare(
    `INSERT INTO admin_sessions (token_hash, expires_at, created_at, user_id, impersonating_wedding_id)
     VALUES (?, ?, ?, ?, ?)`
  ).run(tokenHash, expiresAt, now, userId, impersonatingWeddingId ?? null);

  cookies.set(SESSION_COOKIE_NAME, rawToken, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: isSecureRequest(request),
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
  });

  if (cookies.has(LEGACY_COOKIE_NAME)) {
    cookies.delete(LEGACY_COOKIE_NAME, { path: "/" });
  }
};

export const setSessionImpersonation = (
  cookies: AstroCookies,
  weddingId: number | null
): boolean => {
  const rawToken = cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!rawToken || rawToken.length < 32) return false;
  const tokenHash = sha256Hex(rawToken);
  const res = db
    .prepare(
      "UPDATE admin_sessions SET impersonating_wedding_id = ? WHERE token_hash = ?"
    )
    .run(weddingId, tokenHash);
  return res.changes > 0;
};

export const createAdminSession = (
  cookies: AstroCookies,
  request: Request
): void => {
  const superadmin = db
    .prepare("SELECT id FROM users WHERE role = 'superadmin' ORDER BY id ASC LIMIT 1")
    .get() as { id: number } | undefined;
  if (superadmin) {
    createUserSession(cookies, request, superadmin.id, DEFAULT_WEDDING_ID);
    return;
  }
  createUserSession(cookies, request, 0, DEFAULT_WEDDING_ID);
};

export const getAuthSession = (cookies: AstroCookies): AuthSession | null => {
  const rawToken = cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!rawToken || rawToken.length < 32) return null;

  const tokenHash = sha256Hex(rawToken);
  const now = Date.now();
  const row = db
    .prepare(
      `SELECT token_hash, user_id, impersonating_wedding_id
       FROM admin_sessions
       WHERE token_hash = ? AND expires_at > ?`
    )
    .get(tokenHash, now) as
    | {
        token_hash: string;
        user_id: number | null;
        impersonating_wedding_id: number | null;
      }
    | undefined;

  if (!row) return null;

  // Kompatibilitas sesi lama sebelum migrasi SaaS
  let user: UserRecord | undefined;
  if (row.user_id) {
    user = db
      .prepare("SELECT * FROM users WHERE id = ? LIMIT 1")
      .get(row.user_id) as UserRecord | undefined;
  } else {
    user = db
      .prepare("SELECT * FROM users WHERE role = 'superadmin' ORDER BY id ASC LIMIT 1")
      .get() as UserRecord | undefined;
  }

  if (!user || user.status !== "active") return null;

  const isSuper = user.role === "superadmin";
  const targetWeddingId = isSuper
    ? row.impersonating_wedding_id || DEFAULT_WEDDING_ID
    : user.wedding_id || 0;

  const wedding = targetWeddingId ? getWeddingById(targetWeddingId) : undefined;
  if (!isSuper && (!wedding || wedding.status !== "active")) {
    return null;
  }

  const effectiveWedding = wedding || getWeddingById(DEFAULT_WEDDING_ID);

  return {
    userId: user.id,
    username: user.username,
    role: user.role,
    fullName: user.full_name || user.username,
    phone: user.phone || "",
    weddingId: effectiveWedding?.id || DEFAULT_WEDDING_ID,
    weddingSlug: effectiveWedding?.slug || "demo",
    weddingTitle: effectiveWedding?.title || "Undangan Pernikahan",
    isDemo: Boolean(effectiveWedding?.is_demo),
    impersonating: Boolean(isSuper && row.impersonating_wedding_id),
  };
};

export const isAdminAuthenticated = (cookies: AstroCookies): boolean =>
  Boolean(getAuthSession(cookies));

export const requireSuperadminSession = (
  cookies: AstroCookies
): AuthSession | null => {
  const session = getAuthSession(cookies);
  if (!session || session.role !== "superadmin") return null;
  return session;
};

export const destroyAdminSession = (cookies: AstroCookies): void => {
  const rawToken = cookies.get(SESSION_COOKIE_NAME)?.value;
  if (rawToken) {
    const tokenHash = sha256Hex(rawToken);
    db.prepare("DELETE FROM admin_sessions WHERE token_hash = ?").run(
      tokenHash
    );
  }
  cookies.delete(SESSION_COOKIE_NAME, { path: "/" });
  if (cookies.has(LEGACY_COOKIE_NAME)) {
    cookies.delete(LEGACY_COOKIE_NAME, { path: "/" });
  }
};

// Signed guest ownership cookie so guests can update their own RSVP/Wish
// without allowing arbitrary visitors to overwrite someone else's entry.
const FALLBACK_GUEST_SECRET = crypto.randomBytes(32).toString("hex");

const getGuestSigningSecret = (): string =>
  process.env.SESSION_SECRET?.trim() ||
  process.env.ADMIN_PASSWORD?.trim() ||
  FALLBACK_GUEST_SECRET;

const signPayload = (payload: string): string =>
  crypto
    .createHmac("sha256", getGuestSigningSecret())
    .update(payload)
    .digest("base64url");

export const getOwnedGuestIds = (
  cookies: AstroCookies,
  cookieName: string
): number[] => {
  const raw = cookies.get(cookieName)?.value;
  if (!raw) return [];
  const parts = raw.split(".");
  if (parts.length !== 2) return [];
  const [payloadB64, signature] = parts;
  const expectedSig = signPayload(payloadB64);

  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expectedSig);
  if (
    sigBuf.length !== expBuf.length ||
    !crypto.timingSafeEqual(sigBuf, expBuf)
  ) {
    return [];
  }

  try {
    const parsed = JSON.parse(
      Buffer.from(payloadB64, "base64url").toString("utf8")
    );
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (id): id is number => Number.isInteger(id) && id > 0
    );
  } catch {
    return [];
  }
};

export const addOwnedGuestId = (
  cookies: AstroCookies,
  request: Request,
  cookieName: string,
  id: number
): void => {
  const current = getOwnedGuestIds(cookies, cookieName);
  const updated = Array.from(new Set([...current, id])).slice(-20);
  const payloadB64 = Buffer.from(JSON.stringify(updated), "utf8").toString(
    "base64url"
  );
  const signature = signPayload(payloadB64);

  cookies.set(cookieName, `${payloadB64}.${signature}`, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: isSecureRequest(request),
    maxAge: 60 * 60 * 24 * 30,
  });
};
