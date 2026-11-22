import crypto from "node:crypto";
import type { AstroCookies } from "astro";
import db from "./db";

export const SESSION_COOKIE_NAME = "wedding_admin_session";
const LEGACY_COOKIE_NAME = "wedding_admin_auth";
const SESSION_TTL_MS = 24 * 60 * 60 * 1000;

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

export const createAdminSession = (
  cookies: AstroCookies,
  request: Request
): void => {
  const now = Date.now();
  const expiresAt = now + SESSION_TTL_MS;
  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = sha256Hex(rawToken);

  db.prepare("DELETE FROM admin_sessions WHERE expires_at <= ?").run(now);
  db.prepare(
    "INSERT INTO admin_sessions (token_hash, expires_at, created_at) VALUES (?, ?, ?)"
  ).run(tokenHash, expiresAt, now);

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

export const isAdminAuthenticated = (cookies: AstroCookies): boolean => {
  const rawToken = cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!rawToken || rawToken.length < 32) return false;

  const tokenHash = sha256Hex(rawToken);
  const now = Date.now();
  const session = db
    .prepare(
      "SELECT token_hash FROM admin_sessions WHERE token_hash = ? AND expires_at > ?"
    )
    .get(tokenHash, now) as { token_hash: string } | undefined;

  return Boolean(session);
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
