import crypto from "node:crypto";
import db, { getPlatformConfig } from "./db";
import {
  PLATFORM_OTP_TEMPLATE_CODE,
  WaGatewayClient,
  formatWaGatewayError,
  getWaCredentials,
  normalizeWaPhone,
} from "./whatsapp";

export type OtpPurpose = "register" | "reset_password";

const OTP_TTL_MS = 10 * 60 * 1000;
const OTP_MAX_ATTEMPTS = 5;

const hashOtp = (phone: string, purpose: OtpPurpose, code: string): string =>
  crypto
    .createHash("sha256")
    .update(`${purpose}:${phone}:${code}`)
    .digest("hex");

export function generateOtpCode(): string {
  return String(crypto.randomInt(100000, 1000000));
}

export async function createAndSendOtp(params: {
  phone: string;
  purpose: OtpPurpose;
  payload?: Record<string, unknown>;
  originDomain?: string;
}): Promise<{
  ok: boolean;
  normalizedPhone: string;
  expiresInMinutes: number;
  sentViaWa: boolean;
  error?: string;
  devOtp?: string;
}> {
  const normalizedPhone = normalizeWaPhone(params.phone);
  if (!normalizedPhone) {
    return {
      ok: false,
      normalizedPhone: "",
      expiresInMinutes: 10,
      sentViaWa: false,
      error: "Format nomor WhatsApp tidak valid (contoh: 081234567890).",
    };
  }

  const now = Date.now();
  const code = generateOtpCode();
  const codeHash = hashOtp(normalizedPhone, params.purpose, code);
  const expiresAt = now + OTP_TTL_MS;

  // Hapus OTP lama yang belum terpakai untuk nomor & tujuan yang sama
  db.prepare(
    "DELETE FROM otp_codes WHERE phone = ? AND purpose = ? AND used_at = 0"
  ).run(normalizedPhone, params.purpose);

  db.prepare(
    `INSERT INTO otp_codes (phone, purpose, code_hash, payload_json, attempts, expires_at, used_at, created_at)
     VALUES (?, ?, ?, ?, 0, ?, 0, ?)`
  ).run(
    normalizedPhone,
    params.purpose,
    codeHash,
    params.payload ? JSON.stringify(params.payload) : "",
    expiresAt,
    now
  );

  const platformCfg = getPlatformConfig();
  const creds = getWaCredentials(platformCfg);
  const keperluan =
    params.purpose === "register"
      ? "pendaftaran akun undangan"
      : "reset password akun";

  if (!creds) {
    console.warn(
      `[OTP][${params.purpose}] WA Gateway Platform belum dikonfigurasi. Kode OTP untuk ${normalizedPhone}: ${code}`
    );
    return {
      ok: true,
      normalizedPhone,
      expiresInMinutes: 10,
      sentViaWa: false,
      devOtp: process.env.NODE_ENV !== "production" ? code : undefined,
      error:
        process.env.NODE_ENV === "production"
          ? "WhatsApp Gateway Platform untuk OTP belum dikonfigurasi oleh Superadmin."
          : undefined,
    };
  }

  try {
    const client = new WaGatewayClient(creds, {
      timeoutMs: 15_000,
      maxRetries: 1,
      originDomain: params.originDomain,
    });
    await client.sendMessage({
      templateCode: PLATFORM_OTP_TEMPLATE_CODE,
      recipient: normalizedPhone,
      variables: {
        kode_otp: code,
        keperluan,
        berlaku_menit: "10",
      },
      referenceId: `OTP-${params.purpose.toUpperCase()}-${now}`,
    });
    return {
      ok: true,
      normalizedPhone,
      expiresInMinutes: 10,
      sentViaWa: true,
    };
  } catch (err) {
    const formatted = formatWaGatewayError(err, {
      baseUrl: creds.baseUrl,
      context: "send",
    });
    console.error(
      `[OTP][${params.purpose}] Gagal kirim WA ke ${normalizedPhone}: ${formatted.message}`
    );
    return {
      ok: false,
      normalizedPhone,
      expiresInMinutes: 10,
      sentViaWa: false,
      error: `Gagal mengirim kode OTP via WhatsApp: ${formatted.message}`,
    };
  }
}

export function verifyOtpCode(params: {
  phone: string;
  purpose: OtpPurpose;
  code: string;
}):
  | { ok: true; payloadJson: string; normalizedPhone: string }
  | { ok: false; error: string } {
  const normalizedPhone = normalizeWaPhone(params.phone);
  const cleanCode = String(params.code || "").replace(/\D/g, "");
  if (!normalizedPhone || cleanCode.length !== 6) {
    return { ok: false, error: "Kode OTP harus berupa 6 digit angka." };
  }

  const now = Date.now();
  const row = db
    .prepare(
      `SELECT id, code_hash, payload_json, attempts, expires_at
       FROM otp_codes
       WHERE phone = ? AND purpose = ? AND used_at = 0
       ORDER BY id DESC LIMIT 1`
    )
    .get(normalizedPhone, params.purpose) as
    | {
        id: number;
        code_hash: string;
        payload_json: string;
        attempts: number;
        expires_at: number;
      }
    | undefined;

  if (!row) {
    return {
      ok: false,
      error: "Kode OTP tidak ditemukan atau sudah digunakan. Silakan minta kode baru.",
    };
  }

  if (row.expires_at <= now) {
    return {
      ok: false,
      error: "Kode OTP sudah kedaluwarsa. Silakan minta kode OTP baru.",
    };
  }

  if (row.attempts >= OTP_MAX_ATTEMPTS) {
    return {
      ok: false,
      error: "Terlalu banyak percobaan OTP salah. Silakan minta kode baru.",
    };
  }

  const expectedHash = hashOtp(normalizedPhone, params.purpose, cleanCode);
  const expectedBuf = Buffer.from(expectedHash, "hex");
  const actualBuf = Buffer.from(row.code_hash, "hex");

  if (
    expectedBuf.length !== actualBuf.length ||
    !crypto.timingSafeEqual(expectedBuf, actualBuf)
  ) {
    db.prepare("UPDATE otp_codes SET attempts = attempts + 1 WHERE id = ?").run(
      row.id
    );
    const remaining = Math.max(0, OTP_MAX_ATTEMPTS - (row.attempts + 1));
    return {
      ok: false,
      error: `Kode OTP tidak cocok. Sisa percobaan: ${remaining}.`,
    };
  }

  db.prepare("UPDATE otp_codes SET used_at = ? WHERE id = ?").run(now, row.id);
  return {
    ok: true,
    payloadJson: row.payload_json || "",
    normalizedPhone,
  };
}
