import type { APIRoute } from "astro";
import { getAuthSession } from "../../../lib/auth";
import db, { type UserRecord } from "../../../lib/db";
import {
  hashPassword,
  isValidUsername,
  normalizeUsername,
  validatePasswordStrength,
  verifyPasswordHash,
} from "../../../lib/password";
import { normalizeWaPhone } from "../../../lib/whatsapp";

const JSON_HEADERS = {
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
};

function sanitizeUser(u: UserRecord) {
  return {
    id: u.id,
    username: u.username,
    role: u.role,
    fullName: u.full_name,
    phone: u.phone,
    avatarUrl: u.avatar_url || "",
    status: u.status,
    createdAt: u.created_at,
  };
}

export const GET: APIRoute = async ({ cookies }) => {
  const session = getAuthSession(cookies);
  if (!session) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: JSON_HEADERS,
    });
  }

  const members = db
    .prepare(
      `SELECT * FROM users
       WHERE wedding_id = ? AND role IN ('couple_owner', 'couple_partner')
       ORDER BY CASE role WHEN 'couple_owner' THEN 0 ELSE 1 END, id ASC`
    )
    .all(session.weddingId) as UserRecord[];

  const owner = members.find((m) => m.role === "couple_owner") || null;
  const partner = members.find((m) => m.role === "couple_partner") || null;

  return new Response(
    JSON.stringify({
      currentUser: {
        userId: session.userId,
        username: session.username,
        role: session.role,
        fullName: session.fullName,
        phone: session.phone,
        avatarUrl: session.avatarUrl,
      },
      wedding: {
        id: session.weddingId,
        slug: session.weddingSlug,
        title: session.weddingTitle,
        isDemo: session.isDemo,
        publicUrl: session.isDemo ? "/demo" : `/u/${session.weddingSlug}`,
      },
      owner: owner ? sanitizeUser(owner) : null,
      partner: partner ? sanitizeUser(partner) : null,
      canManagePartner:
        session.role === "couple_owner" || session.role === "superadmin",
    }),
    { status: 200, headers: JSON_HEADERS }
  );
};

export const POST: APIRoute = async ({ request, cookies }) => {
  const session = getAuthSession(cookies);
  if (!session) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: JSON_HEADERS,
    });
  }
  if (session.role !== "couple_owner" && session.role !== "superadmin") {
    return new Response(
      JSON.stringify({
        error: "Hanya pemilik akun utama yang dapat mendaftarkan akun pasangan.",
      }),
      { status: 403, headers: JSON_HEADERS }
    );
  }

  let body: {
    username?: string;
    password?: string;
    fullName?: string;
    phone?: string;
  } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return new Response(JSON.stringify({ error: "Data tidak valid." }), {
      status: 400,
      headers: JSON_HEADERS,
    });
  }

  // Maksimal 1 akun pasangan per undangan
  const existingPartner = db
    .prepare(
      "SELECT id FROM users WHERE wedding_id = ? AND role = 'couple_partner' LIMIT 1"
    )
    .get(session.weddingId);
  if (existingPartner) {
    return new Response(
      JSON.stringify({
        error:
          "Akun pasangan sudah terdaftar (maksimal 1 akun pasangan per undangan). Ubah atau hapus akun pasangan yang ada terlebih dahulu.",
      }),
      { status: 409, headers: JSON_HEADERS }
    );
  }

  const username = normalizeUsername(String(body.username || ""));
  const password = String(body.password || "");
  const fullName = String(body.fullName || "").trim().slice(0, 80);
  const rawPhone = String(body.phone || "").trim();
  const phone = rawPhone ? normalizeWaPhone(rawPhone) : "";

  if (!isValidUsername(username)) {
    return new Response(
      JSON.stringify({
        error: "Username pasangan harus 3–32 karakter (huruf kecil, angka, titik, _, -).",
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

  if (rawPhone && !phone) {
    return new Response(
      JSON.stringify({ error: "Format nomor WhatsApp pasangan tidak valid." }),
      { status: 400, headers: JSON_HEADERS }
    );
  }

  const dup = db
    .prepare("SELECT id FROM users WHERE username = ? LIMIT 1")
    .get(username);
  if (dup) {
    return new Response(
      JSON.stringify({ error: `Username "${username}" sudah digunakan.` }),
      { status: 409, headers: JSON_HEADERS }
    );
  }

  const res = db
    .prepare(
      `INSERT INTO users
        (username, password_hash, role, wedding_id, full_name, phone, phone_verified, status)
       VALUES (?, ?, 'couple_partner', ?, ?, ?, 1, 'active')`
    )
    .run(
      username,
      hashPassword(password),
      session.weddingId,
      fullName || username,
      phone
    );

  const created = db
    .prepare("SELECT * FROM users WHERE id = ?")
    .get(Number(res.lastInsertRowid)) as UserRecord;

  return new Response(
    JSON.stringify({ success: true, partner: sanitizeUser(created) }),
    { status: 201, headers: JSON_HEADERS }
  );
};

export const PATCH: APIRoute = async ({ request, cookies }) => {
  const session = getAuthSession(cookies);
  if (!session) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: JSON_HEADERS,
    });
  }

  let body: {
    action?: string;
    fullName?: string;
    phone?: string;
    avatarUrl?: string;
    currentPassword?: string;
    newPassword?: string;
    status?: string;
  } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return new Response(JSON.stringify({ error: "Data tidak valid." }), {
      status: 400,
      headers: JSON_HEADERS,
    });
  }

  if (body.action === "change_my_password") {
    const me = db
      .prepare("SELECT * FROM users WHERE id = ? LIMIT 1")
      .get(session.userId) as UserRecord | undefined;
    if (!me) {
      return new Response(JSON.stringify({ error: "Akun tidak ditemukan." }), {
        status: 404,
        headers: JSON_HEADERS,
      });
    }

    const fullName =
      typeof body.fullName === "string" && body.fullName.trim()
        ? body.fullName.trim().slice(0, 80)
        : me.full_name;
    const rawPhone =
      typeof body.phone === "string" ? body.phone.trim() : me.phone;
    const phone = rawPhone ? normalizeWaPhone(rawPhone) : "";
    if (rawPhone && !phone) {
      return new Response(
        JSON.stringify({ error: "Format nomor WhatsApp tidak valid." }),
        { status: 400, headers: JSON_HEADERS }
      );
    }

    let avatarUrl = me.avatar_url || "";
    if (typeof body.avatarUrl === "string") {
      const cleaned = body.avatarUrl.trim();
      if (
        cleaned === "" ||
        cleaned.startsWith("/api/media/") ||
        cleaned.startsWith("/uploads/")
      ) {
        avatarUrl = cleaned.slice(0, 300);
      } else {
        return new Response(
          JSON.stringify({ error: "URL foto profil tidak valid." }),
          { status: 400, headers: JSON_HEADERS }
        );
      }
    }

    if (body.newPassword) {
      if (!verifyPasswordHash(String(body.currentPassword || ""), me.password_hash)) {
        return new Response(
          JSON.stringify({ error: "Password saat ini tidak cocok." }),
          { status: 400, headers: JSON_HEADERS }
        );
      }
      const pwdErr = validatePasswordStrength(body.newPassword);
      if (pwdErr) {
        return new Response(JSON.stringify({ error: pwdErr }), {
          status: 400,
          headers: JSON_HEADERS,
        });
      }
      db.prepare(
        "UPDATE users SET full_name = ?, phone = ?, avatar_url = ?, password_hash = ? WHERE id = ?"
      ).run(fullName, phone, avatarUrl, hashPassword(body.newPassword), me.id);
    } else {
      db.prepare(
        "UPDATE users SET full_name = ?, phone = ?, avatar_url = ? WHERE id = ?"
      ).run(fullName, phone, avatarUrl, me.id);
    }

    return new Response(JSON.stringify({ success: true, avatarUrl }), {
      status: 200,
      headers: JSON_HEADERS,
    });
  }

  if (body.action === "update_partner") {
    if (session.role !== "couple_owner" && session.role !== "superadmin") {
      return new Response(
        JSON.stringify({ error: "Tidak diizinkan mengubah akun pasangan." }),
        { status: 403, headers: JSON_HEADERS }
      );
    }
    const partner = db
      .prepare(
        "SELECT * FROM users WHERE wedding_id = ? AND role = 'couple_partner' LIMIT 1"
      )
      .get(session.weddingId) as UserRecord | undefined;
    if (!partner) {
      return new Response(
        JSON.stringify({ error: "Akun pasangan belum terdaftar." }),
        { status: 404, headers: JSON_HEADERS }
      );
    }

    const fullName =
      typeof body.fullName === "string" && body.fullName.trim()
        ? body.fullName.trim().slice(0, 80)
        : partner.full_name;
    const rawPhone =
      typeof body.phone === "string" ? body.phone.trim() : partner.phone;
    const phone = rawPhone ? normalizeWaPhone(rawPhone) : "";
    if (rawPhone && !phone) {
      return new Response(
        JSON.stringify({ error: "Format nomor WhatsApp pasangan tidak valid." }),
        { status: 400, headers: JSON_HEADERS }
      );
    }
    const status =
      body.status === "suspended"
        ? "suspended"
        : body.status === "active"
          ? "active"
          : partner.status;

    if (body.newPassword) {
      const pwdErr = validatePasswordStrength(body.newPassword);
      if (pwdErr) {
        return new Response(JSON.stringify({ error: pwdErr }), {
          status: 400,
          headers: JSON_HEADERS,
        });
      }
      db.prepare(
        "UPDATE users SET full_name = ?, phone = ?, status = ?, password_hash = ? WHERE id = ?"
      ).run(fullName, phone, status, hashPassword(body.newPassword), partner.id);
    } else {
      db.prepare(
        "UPDATE users SET full_name = ?, phone = ?, status = ? WHERE id = ?"
      ).run(fullName, phone, status, partner.id);
    }

    if (status === "suspended") {
      db.prepare("DELETE FROM admin_sessions WHERE user_id = ?").run(partner.id);
    }

    const updated = db
      .prepare("SELECT * FROM users WHERE id = ?")
      .get(partner.id) as UserRecord;
    return new Response(
      JSON.stringify({ success: true, partner: sanitizeUser(updated) }),
      { status: 200, headers: JSON_HEADERS }
    );
  }

  return new Response(JSON.stringify({ error: "Aksi tidak dikenali." }), {
    status: 400,
    headers: JSON_HEADERS,
  });
};

export const DELETE: APIRoute = async ({ cookies }) => {
  const session = getAuthSession(cookies);
  if (!session) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: JSON_HEADERS,
    });
  }
  if (session.role !== "couple_owner" && session.role !== "superadmin") {
    return new Response(
      JSON.stringify({ error: "Hanya pemilik akun utama yang dapat menghapus akun pasangan." }),
      { status: 403, headers: JSON_HEADERS }
    );
  }

  const partner = db
    .prepare(
      "SELECT id FROM users WHERE wedding_id = ? AND role = 'couple_partner' LIMIT 1"
    )
    .get(session.weddingId) as { id: number } | undefined;

  if (!partner) {
    return new Response(
      JSON.stringify({ error: "Akun pasangan tidak ditemukan." }),
      { status: 404, headers: JSON_HEADERS }
    );
  }

  db.prepare("DELETE FROM admin_sessions WHERE user_id = ?").run(partner.id);
  db.prepare("DELETE FROM users WHERE id = ?").run(partner.id);

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: JSON_HEADERS,
  });
};
