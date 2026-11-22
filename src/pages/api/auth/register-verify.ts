import type { APIRoute } from "astro";
import { createUserSession } from "../../../lib/auth";
import db, { seedWeddingDefaults } from "../../../lib/db";
import { verifyOtpCode } from "../../../lib/otp";

const JSON_HEADERS = {
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
};

interface RegisterPayload {
  username: string;
  passwordHash: string;
  fullName: string;
  brideNickname: string;
  groomNickname: string;
  slug: string;
}

export const POST: APIRoute = async ({ request, cookies }) => {
  let body: { phone?: string; code?: string } = {};
  try {
    body = (await request.json()) as { phone?: string; code?: string };
  } catch {
    return new Response(JSON.stringify({ error: "Permintaan tidak valid." }), {
      status: 400,
      headers: JSON_HEADERS,
    });
  }

  const verified = verifyOtpCode({
    phone: String(body.phone || ""),
    purpose: "register",
    code: String(body.code || ""),
  });

  if (!verified.ok) {
    return new Response(JSON.stringify({ error: verified.error }), {
      status: 400,
      headers: JSON_HEADERS,
    });
  }

  let payload: RegisterPayload;
  try {
    payload = JSON.parse(verified.payloadJson) as RegisterPayload;
  } catch {
    return new Response(
      JSON.stringify({ error: "Data pendaftaran tidak valid. Ulangi pendaftaran." }),
      { status: 400, headers: JSON_HEADERS }
    );
  }

  // Pastikan username & slug masih tersedia
  const dupUser = db
    .prepare("SELECT id FROM users WHERE username = ? LIMIT 1")
    .get(payload.username);
  if (dupUser) {
    return new Response(
      JSON.stringify({ error: `Username "${payload.username}" sudah digunakan.` }),
      { status: 409, headers: JSON_HEADERS }
    );
  }

  const dupSlug = db
    .prepare("SELECT id FROM weddings WHERE slug = ? LIMIT 1")
    .get(payload.slug);
  if (dupSlug) {
    return new Response(
      JSON.stringify({ error: `Alamat undangan "/u/${payload.slug}" sudah dipakai.` }),
      { status: 409, headers: JSON_HEADERS }
    );
  }

  let createdUserId = 0;
  let createdWeddingId = 0;
  const title = `Undangan ${payload.brideNickname} & ${payload.groomNickname}`;

  const tx = db.transaction(() => {
    const wRes = db
      .prepare(
        "INSERT INTO weddings (slug, title, status, is_demo) VALUES (?, ?, 'active', 0)"
      )
      .run(payload.slug, title);
    createdWeddingId = Number(wRes.lastInsertRowid);

    const uRes = db
      .prepare(
        `INSERT INTO users
          (username, password_hash, role, wedding_id, full_name, phone, phone_verified, status)
         VALUES (?, ?, 'couple_owner', ?, ?, ?, 1, 'active')`
      )
      .run(
        payload.username,
        payload.passwordHash,
        createdWeddingId,
        payload.fullName,
        verified.normalizedPhone
      );
    createdUserId = Number(uRes.lastInsertRowid);
  });

  try {
    tx();
  } catch (err) {
    console.error("Gagal membuat tenant/user baru:", err);
    return new Response(
      JSON.stringify({ error: "Gagal menyimpan akun baru. Silakan coba lagi." }),
      { status: 500, headers: JSON_HEADERS }
    );
  }

  seedWeddingDefaults(createdWeddingId, {
    BRIDE_NICKNAME: payload.brideNickname,
    BRIDE_FULLNAME: payload.brideNickname,
    GROOM_NICKNAME: payload.groomNickname,
    GROOM_FULLNAME: payload.groomNickname,
    WA_ADMIN_NUMBERS: verified.normalizedPhone,
  });

  createUserSession(cookies, request, createdUserId, null);

  return new Response(
    JSON.stringify({
      success: true,
      slug: payload.slug,
      invitationUrl: `/u/${payload.slug}`,
      redirectTo: "/admin",
    }),
    { status: 201, headers: JSON_HEADERS }
  );
};
