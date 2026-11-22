import type { APIRoute } from "astro";
import db, { type UserRecord } from "../../../lib/db";
import { createAndSendOtp } from "../../../lib/otp";
import { normalizeUsername } from "../../../lib/password";
import { checkRateLimit, getClientIp } from "../../../lib/rateLimit";
import { normalizeWaPhone, resolveOriginDomain } from "../../../lib/whatsapp";

const JSON_HEADERS = {
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
};

function maskPhone(phone: string): string {
  if (phone.length < 7) return phone;
  return `${phone.slice(0, 4)}****${phone.slice(-3)}`;
}

export const POST: APIRoute = async ({ request, url, clientAddress }) => {
  const ip = getClientIp(request, clientAddress);
  if (!checkRateLimit(`reset-otp:${ip}`, 5, 15 * 60 * 1000)) {
    return new Response(
      JSON.stringify({
        error: "Terlalu banyak permintaan reset password. Coba lagi 15 menit lagi.",
      }),
      { status: 429, headers: JSON_HEADERS }
    );
  }

  let body: { identifier?: string } = {};
  try {
    body = (await request.json()) as { identifier?: string };
  } catch {
    return new Response(JSON.stringify({ error: "Permintaan tidak valid." }), {
      status: 400,
      headers: JSON_HEADERS,
    });
  }

  const raw = String(body.identifier || "").trim();
  if (!raw) {
    return new Response(
      JSON.stringify({ error: "Masukkan username atau nomor WhatsApp terdaftar." }),
      { status: 400, headers: JSON_HEADERS }
    );
  }

  const normUser = normalizeUsername(raw);
  const normPhone = normalizeWaPhone(raw);

  let user: UserRecord | undefined;
  if (normPhone) {
    user = db
      .prepare(
        "SELECT * FROM users WHERE phone = ? AND status = 'active' ORDER BY id ASC LIMIT 1"
      )
      .get(normPhone) as UserRecord | undefined;
  }
  if (!user) {
    user = db
      .prepare(
        "SELECT * FROM users WHERE username = ? AND status = 'active' LIMIT 1"
      )
      .get(normUser) as UserRecord | undefined;
  }

  if (!user) {
    return new Response(
      JSON.stringify({
        error: "Akun tidak ditemukan atau sedang nonaktif.",
      }),
      { status: 404, headers: JSON_HEADERS }
    );
  }

  const userPhone = normalizeWaPhone(user.phone || "");
  if (!userPhone) {
    return new Response(
      JSON.stringify({
        error:
          "Akun ini belum memiliki nomor WhatsApp terdaftar. Hubungi Superadmin untuk reset password.",
      }),
      { status: 400, headers: JSON_HEADERS }
    );
  }

  const otpResult = await createAndSendOtp({
    phone: userPhone,
    purpose: "reset_password",
    payload: { userId: user.id, username: user.username },
    originDomain: resolveOriginDomain(request, url),
  });

  if (!otpResult.ok || (otpResult.error && !otpResult.devOtp)) {
    return new Response(
      JSON.stringify({
        error:
          otpResult.error ||
          "Gagal mengirim kode OTP reset password via WhatsApp.",
      }),
      { status: 502, headers: JSON_HEADERS }
    );
  }

  return new Response(
    JSON.stringify({
      success: true,
      phone: otpResult.normalizedPhone,
      maskedPhone: maskPhone(otpResult.normalizedPhone),
      username: user.username,
      sentViaWa: otpResult.sentViaWa,
      expiresInMinutes: otpResult.expiresInMinutes,
      ...(otpResult.devOtp ? { devOtp: otpResult.devOtp } : {}),
    }),
    { status: 200, headers: JSON_HEADERS }
  );
};
