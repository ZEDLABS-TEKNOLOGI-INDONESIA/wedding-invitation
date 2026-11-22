import type { APIRoute } from "astro";
import db from "../../../lib/db";
import { verifyOtpCode } from "../../../lib/otp";
import { hashPassword, validatePasswordStrength } from "../../../lib/password";

const JSON_HEADERS = {
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
};

export const POST: APIRoute = async ({ request }) => {
  let body: { phone?: string; code?: string; newPassword?: string } = {};
  try {
    body = (await request.json()) as {
      phone?: string;
      code?: string;
      newPassword?: string;
    };
  } catch {
    return new Response(JSON.stringify({ error: "Permintaan tidak valid." }), {
      status: 400,
      headers: JSON_HEADERS,
    });
  }

  const pwdErr = validatePasswordStrength(String(body.newPassword || ""));
  if (pwdErr) {
    return new Response(JSON.stringify({ error: pwdErr }), {
      status: 400,
      headers: JSON_HEADERS,
    });
  }

  const verified = verifyOtpCode({
    phone: String(body.phone || ""),
    purpose: "reset_password",
    code: String(body.code || ""),
  });

  if (!verified.ok) {
    return new Response(JSON.stringify({ error: verified.error }), {
      status: 400,
      headers: JSON_HEADERS,
    });
  }

  let userId = 0;
  try {
    const parsed = JSON.parse(verified.payloadJson) as { userId?: number };
    userId = Number(parsed.userId || 0);
  } catch {
    userId = 0;
  }

  if (!userId) {
    return new Response(
      JSON.stringify({ error: "Sesi reset password tidak valid." }),
      { status: 400, headers: JSON_HEADERS }
    );
  }

  const newHash = hashPassword(String(body.newPassword));
  db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(
    newHash,
    userId
  );
  // Putuskan sesi lama agar lebih aman
  db.prepare("DELETE FROM admin_sessions WHERE user_id = ?").run(userId);

  return new Response(
    JSON.stringify({
      success: true,
      message: "Password berhasil diperbarui. Silakan masuk dengan password baru.",
    }),
    { status: 200, headers: JSON_HEADERS }
  );
};
