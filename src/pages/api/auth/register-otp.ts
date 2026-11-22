import type { APIRoute } from "astro";
import db from "../../../lib/db";
import { createAndSendOtp } from "../../../lib/otp";
import {
  hashPassword,
  isValidUsername,
  isValidWeddingSlug,
  normalizeUsername,
  normalizeWeddingSlug,
  validatePasswordStrength,
} from "../../../lib/password";
import { checkRateLimit, getClientIp } from "../../../lib/rateLimit";
import { normalizeWaPhone, resolveOriginDomain } from "../../../lib/whatsapp";

const JSON_HEADERS = {
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
};

export const POST: APIRoute = async ({ request, url, clientAddress }) => {
  const ip = getClientIp(request, clientAddress);
  if (!checkRateLimit(`reg-otp:${ip}`, 5, 15 * 60 * 1000)) {
    return new Response(
      JSON.stringify({
        error: "Terlalu banyak permintaan OTP pendaftaran. Coba lagi 15 menit lagi.",
      }),
      { status: 429, headers: JSON_HEADERS }
    );
  }

  let body: Record<string, unknown> = {};
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return new Response(JSON.stringify({ error: "Data pendaftaran tidak valid." }), {
      status: 400,
      headers: JSON_HEADERS,
    });
  }

  const username = normalizeUsername(String(body.username || ""));
  const password = String(body.password || "");
  const fullName = String(body.fullName || "").trim().slice(0, 80);
  const brideNickname = String(body.brideNickname || "").trim().slice(0, 40);
  const groomNickname = String(body.groomNickname || "").trim().slice(0, 40);
  const rawSlug = String(
    body.slug || `${brideNickname}-${groomNickname}`
  );
  const slug = normalizeWeddingSlug(rawSlug);
  const phone = normalizeWaPhone(String(body.phone || ""));

  if (!isValidUsername(username)) {
    return new Response(
      JSON.stringify({
        error:
          "Username harus 3–32 karakter (huruf kecil, angka, titik, garis bawah, atau tanda hubung).",
      }),
      { status: 400, headers: JSON_HEADERS }
    );
  }

  const pwdErr = validatePasswordStrength(password);
  if (pwdErr) {
    return new Response(JSON.stringify({ error: pwdErr }), {
      status: 400,
      headers: JSON_HEADERS,
    });
  }

  if (!brideNickname || !groomNickname) {
    return new Response(
      JSON.stringify({ error: "Nama panggilan mempelai wanita & pria wajib diisi." }),
      { status: 400, headers: JSON_HEADERS }
    );
  }

  if (!isValidWeddingSlug(slug)) {
    return new Response(
      JSON.stringify({
        error:
          "Alamat URL undangan (slug) harus 4–50 karakter huruf kecil/angka/tanda hubung dan bukan kata terlarang (contoh: fera-yahya).",
      }),
      { status: 400, headers: JSON_HEADERS }
    );
  }

  if (!phone) {
    return new Response(
      JSON.stringify({
        error: "Nomor WhatsApp wajib valid (contoh: 081234567890) untuk menerima kode OTP.",
      }),
      { status: 400, headers: JSON_HEADERS }
    );
  }

  const existingUser = db
    .prepare("SELECT id FROM users WHERE username = ? LIMIT 1")
    .get(username);
  if (existingUser) {
    return new Response(
      JSON.stringify({ error: `Username "${username}" sudah digunakan.` }),
      { status: 409, headers: JSON_HEADERS }
    );
  }

  const existingSlug = db
    .prepare("SELECT id FROM weddings WHERE slug = ? LIMIT 1")
    .get(slug);
  if (existingSlug) {
    return new Response(
      JSON.stringify({
        error: `Alamat undangan "/u/${slug}" sudah dipakai pasangan lain. Pilih nama URL lain.`,
      }),
      { status: 409, headers: JSON_HEADERS }
    );
  }

  const passwordHash = hashPassword(password);
  const otpResult = await createAndSendOtp({
    phone,
    purpose: "register",
    payload: {
      username,
      passwordHash,
      fullName: fullName || `${brideNickname} & ${groomNickname}`,
      brideNickname,
      groomNickname,
      slug,
    },
    originDomain: resolveOriginDomain(request, url),
  });

  if (!otpResult.ok || (otpResult.error && !otpResult.devOtp)) {
    return new Response(
      JSON.stringify({
        error:
          otpResult.error ||
          "Gagal mengirim kode OTP ke WhatsApp. Hubungi Superadmin.",
      }),
      { status: 502, headers: JSON_HEADERS }
    );
  }

  return new Response(
    JSON.stringify({
      success: true,
      phone: otpResult.normalizedPhone,
      slug,
      sentViaWa: otpResult.sentViaWa,
      expiresInMinutes: otpResult.expiresInMinutes,
      ...(otpResult.devOtp ? { devOtp: otpResult.devOtp } : {}),
    }),
    { status: 200, headers: JSON_HEADERS }
  );
};
