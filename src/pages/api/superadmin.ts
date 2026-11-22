import type { APIRoute } from "astro";
import {
  requireSuperadminSession,
  setSessionImpersonation,
} from "../../lib/auth";
import db, {
  getPlatformConfig,
  setPlatformConfig,
  type UserRecord,
  type WeddingRecord,
} from "../../lib/db";
import {
  hashPassword,
  isValidUsername,
  normalizeUsername,
  validatePasswordStrength,
  verifyPasswordHash,
} from "../../lib/password";
import {
  PLATFORM_WA_TEMPLATES,
  WaGatewayClient,
  formatWaGatewayError,
  getWaCredentials,
  normalizeWaPhone,
  resolveOriginDomain,
} from "../../lib/whatsapp";

const JSON_HEADERS = {
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
};

export const GET: APIRoute = async ({ cookies }) => {
  const session = requireSuperadminSession(cookies);
  if (!session) {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: JSON_HEADERS,
    });
  }

  const weddings = db
    .prepare("SELECT * FROM weddings ORDER BY is_demo DESC, id DESC")
    .all() as WeddingRecord[];

  const users = db
    .prepare(
      "SELECT id, username, role, wedding_id, full_name, phone, phone_verified, status, created_at FROM users ORDER BY id ASC"
    )
    .all() as Array<Omit<UserRecord, "password_hash">>;

  const rsvpCounts = Object.fromEntries(
    (
      db
        .prepare("SELECT wedding_id, COUNT(*) as c FROM rsvps GROUP BY wedding_id")
        .all() as Array<{ wedding_id: number; c: number }>
    ).map((r) => [r.wedding_id, r.c])
  );
  const guestCounts = Object.fromEntries(
    (
      db
        .prepare("SELECT wedding_id, COUNT(*) as c FROM guests GROUP BY wedding_id")
        .all() as Array<{ wedding_id: number; c: number }>
    ).map((r) => [r.wedding_id, r.c])
  );

  const enrichedWeddings = weddings.map((w) => ({
    ...w,
    publicUrl: w.is_demo ? "/demo" : `/u/${w.slug}`,
    rsvpCount: rsvpCounts[w.id] || 0,
    guestCount: guestCounts[w.id] || 0,
    members: users.filter((u) => u.wedding_id === w.id),
  }));

  const orders = db
    .prepare(
      `SELECT b.*, w.slug AS wedding_slug, w.title AS wedding_title
       FROM billing_orders b
       JOIN weddings w ON w.id = b.wedding_id
       ORDER BY CASE b.status WHEN 'pending' THEN 0 ELSE 1 END, b.id DESC
       LIMIT 100`
    )
    .all();

  const platformConfig = getPlatformConfig();

  return new Response(
    JSON.stringify({
      stats: {
        totalWeddings: weddings.length,
        activeWeddings: weddings.filter((w) => w.status === "active").length,
        totalUsers: users.filter((u) => u.role !== "superadmin").length,
        totalRsvps: Object.values(rsvpCounts).reduce((a, b) => a + b, 0),
        pendingOrders: (orders as Array<{ status: string }>).filter(
          (o) => o.status === "pending"
        ).length,
      },
      weddings: enrichedWeddings,
      orders,
      platformConfig,
      currentAdmin: {
        userId: session.userId,
        username: session.username,
        fullName: session.fullName,
        phone: session.phone,
      },
    }),
    { status: 200, headers: JSON_HEADERS }
  );
};

export const POST: APIRoute = async ({ request, cookies, url }) => {
  const session = requireSuperadminSession(cookies);
  if (!session) {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: JSON_HEADERS,
    });
  }

  let body: Record<string, unknown> = {};
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return new Response(JSON.stringify({ error: "Permintaan tidak valid." }), {
      status: 400,
      headers: JSON_HEADERS,
    });
  }

  const action = String(body.action || "");

  if (action === "save_platform_wa") {
    const keys = [
      "WA_BASE_URL",
      "WA_API_KEY",
      "WA_API_SECRET",
      "PLATFORM_NAME",
      "PAYMENT_BANK_NAME",
      "PAYMENT_BANK_ACCOUNT",
      "PAYMENT_BANK_HOLDER",
      "PAYMENT_WHATSAPP_CONFIRM",
    ] as const;
    for (const k of keys) {
      if (typeof body[k] === "string") {
        setPlatformConfig(k, (body[k] as string).trim());
      }
    }
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: JSON_HEADERS,
    });
  }

  if (action === "approve_order" || action === "reject_order") {
    const orderId = Number(body.orderId || 0);
    const adminNote = String(body.adminNote || "").trim().slice(0, 300);
    const order = db
      .prepare("SELECT * FROM billing_orders WHERE id = ? LIMIT 1")
      .get(orderId) as
      | {
          id: number;
          wedding_id: number;
          requested_total_quota: number;
          status: string;
        }
      | undefined;

    if (!order) {
      return new Response(JSON.stringify({ error: "Tagihan tidak ditemukan." }), {
        status: 404,
        headers: JSON_HEADERS,
      });
    }
    if (order.status !== "pending") {
      return new Response(
        JSON.stringify({ error: "Tagihan ini sudah diproses sebelumnya." }),
        { status: 400, headers: JSON_HEADERS }
      );
    }

    const nowIso = new Date().toISOString();
    if (action === "approve_order") {
      const tx = db.transaction(() => {
        db.prepare(
          "UPDATE billing_orders SET status = 'paid', admin_note = ?, verified_at = ? WHERE id = ?"
        ).run(adminNote || "Pembayaran terverifikasi", nowIso, order.id);
        db.prepare(
          "UPDATE weddings SET guest_quota_limit = MAX(guest_quota_limit, ?) WHERE id = ?"
        ).run(order.requested_total_quota, order.wedding_id);
      });
      tx();
    } else {
      db.prepare(
        "UPDATE billing_orders SET status = 'rejected', admin_note = ?, verified_at = ? WHERE id = ?"
      ).run(adminNote || "Pembayaran ditolak", nowIso, order.id);
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: JSON_HEADERS,
    });
  }

  if (action === "test_platform_wa" || action === "sync_otp_template") {
    const cfg = getPlatformConfig();
    const creds = getWaCredentials(cfg, {
      baseUrl: typeof body.WA_BASE_URL === "string" ? body.WA_BASE_URL : undefined,
      keyId: typeof body.WA_API_KEY === "string" ? body.WA_API_KEY : undefined,
      secret:
        typeof body.WA_API_SECRET === "string" ? body.WA_API_SECRET : undefined,
    });
    if (!creds) {
      return new Response(
        JSON.stringify({
          error:
            "URL Gateway, API Key, dan HMAC Secret Platform wajib diisi terlebih dahulu.",
        }),
        { status: 400, headers: JSON_HEADERS }
      );
    }

    try {
      const client = new WaGatewayClient(creds, {
        timeoutMs: 15_000,
        maxRetries: 0,
        originDomain: resolveOriginDomain(request, url),
      });
      if (action === "test_platform_wa") {
        const res = await client.ping();
        return new Response(JSON.stringify({ success: true, ...res }), {
          status: 200,
          headers: JSON_HEADERS,
        });
      }
      const res = await client.syncTemplates(PLATFORM_WA_TEMPLATES, {
        pratinjau: false,
        hapusYangTidakAda: false,
      });
      return new Response(JSON.stringify({ success: true, result: res }), {
        status: 200,
        headers: JSON_HEADERS,
      });
    } catch (err) {
      const formatted = formatWaGatewayError(err, {
        baseUrl: creds.baseUrl,
        context: action === "test_platform_wa" ? "ping" : "sync",
      });
      return new Response(JSON.stringify({ error: formatted.message }), {
        status: formatted.status >= 500 ? formatted.status : 400,
        headers: JSON_HEADERS,
      });
    }
  }

  if (action === "impersonate") {
    const weddingId = Number(body.weddingId || 0);
    const exists = db
      .prepare("SELECT id FROM weddings WHERE id = ? LIMIT 1")
      .get(weddingId);
    if (!exists) {
      return new Response(JSON.stringify({ error: "Undangan tidak ditemukan." }), {
        status: 404,
        headers: JSON_HEADERS,
      });
    }
    setSessionImpersonation(cookies, weddingId);
    return new Response(
      JSON.stringify({ success: true, redirectTo: "/admin" }),
      { status: 200, headers: JSON_HEADERS }
    );
  }

  if (action === "toggle_wedding_status") {
    const weddingId = Number(body.weddingId || 0);
    const wedding = db
      .prepare("SELECT * FROM weddings WHERE id = ? LIMIT 1")
      .get(weddingId) as WeddingRecord | undefined;
    if (!wedding) {
      return new Response(JSON.stringify({ error: "Undangan tidak ditemukan." }), {
        status: 404,
        headers: JSON_HEADERS,
      });
    }
    if (wedding.is_demo) {
      return new Response(
        JSON.stringify({ error: "Undangan demo tidak dapat dinonaktifkan." }),
        { status: 400, headers: JSON_HEADERS }
      );
    }
    const nextStatus = wedding.status === "active" ? "suspended" : "active";
    db.prepare("UPDATE weddings SET status = ? WHERE id = ?").run(
      nextStatus,
      weddingId
    );
    return new Response(
      JSON.stringify({ success: true, status: nextStatus }),
      { status: 200, headers: JSON_HEADERS }
    );
  }

  if (action === "delete_wedding") {
    const weddingId = Number(body.weddingId || 0);
    const wedding = db
      .prepare("SELECT * FROM weddings WHERE id = ? LIMIT 1")
      .get(weddingId) as WeddingRecord | undefined;
    if (!wedding) {
      return new Response(JSON.stringify({ error: "Undangan tidak ditemukan." }), {
        status: 404,
        headers: JSON_HEADERS,
      });
    }
    if (wedding.is_demo) {
      return new Response(
        JSON.stringify({ error: "Undangan demo tidak dapat dihapus." }),
        { status: 400, headers: JSON_HEADERS }
      );
    }

    const delTx = db.transaction(() => {
      const userIds = (
        db
          .prepare("SELECT id FROM users WHERE wedding_id = ?")
          .all(weddingId) as Array<{ id: number }>
      ).map((u) => u.id);
      for (const uid of userIds) {
        db.prepare("DELETE FROM admin_sessions WHERE user_id = ?").run(uid);
      }
      db.prepare("DELETE FROM users WHERE wedding_id = ?").run(weddingId);
      db.prepare("DELETE FROM wedding_config WHERE wedding_id = ?").run(weddingId);
      db.prepare("DELETE FROM rsvps WHERE wedding_id = ?").run(weddingId);
      db.prepare("DELETE FROM wishes WHERE wedding_id = ?").run(weddingId);
      db.prepare("DELETE FROM guests WHERE wedding_id = ?").run(weddingId);
      db.prepare("DELETE FROM wa_invitations WHERE wedding_id = ?").run(weddingId);
      db.prepare("DELETE FROM planner_todos WHERE wedding_id = ?").run(weddingId);
      db.prepare("DELETE FROM planner_budget WHERE wedding_id = ?").run(weddingId);
      db.prepare("DELETE FROM planner_savings WHERE wedding_id = ?").run(weddingId);
      db.prepare("DELETE FROM planner_essentials WHERE wedding_id = ?").run(weddingId);
      db.prepare("DELETE FROM planner_journal WHERE wedding_id = ?").run(weddingId);
      db.prepare("DELETE FROM planner_idempotency WHERE wedding_id = ?").run(weddingId);
      db.prepare("DELETE FROM weddings WHERE id = ?").run(weddingId);
    });
    delTx();

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: JSON_HEADERS,
    });
  }

  if (action === "update_superadmin_account") {
    const me = db
      .prepare("SELECT * FROM users WHERE id = ? LIMIT 1")
      .get(session.userId) as UserRecord | undefined;
    if (!me) {
      return new Response(JSON.stringify({ error: "Akun tidak ditemukan." }), {
        status: 404,
        headers: JSON_HEADERS,
      });
    }

    const nextUsername = body.username
      ? normalizeUsername(String(body.username))
      : me.username;
    if (!isValidUsername(nextUsername)) {
      return new Response(
        JSON.stringify({ error: "Format username Superadmin tidak valid." }),
        { status: 400, headers: JSON_HEADERS }
      );
    }
    if (nextUsername !== me.username) {
      const dup = db
        .prepare("SELECT id FROM users WHERE username = ? AND id != ? LIMIT 1")
        .get(nextUsername, me.id);
      if (dup) {
        return new Response(
          JSON.stringify({ error: `Username "${nextUsername}" sudah digunakan.` }),
          { status: 409, headers: JSON_HEADERS }
        );
      }
    }

    const rawPhone =
      typeof body.phone === "string" ? body.phone.trim() : me.phone;
    const phone = rawPhone ? normalizeWaPhone(rawPhone) : "";
    if (rawPhone && !phone) {
      return new Response(
        JSON.stringify({ error: "Format nomor WhatsApp tidak valid." }),
        { status: 400, headers: JSON_HEADERS }
      );
    }

    const fullName =
      typeof body.fullName === "string" && body.fullName.trim()
        ? body.fullName.trim().slice(0, 80)
        : me.full_name;

    if (typeof body.newPassword === "string" && body.newPassword) {
      if (
        !verifyPasswordHash(String(body.currentPassword || ""), me.password_hash)
      ) {
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
        "UPDATE users SET username = ?, full_name = ?, phone = ?, password_hash = ? WHERE id = ?"
      ).run(nextUsername, fullName, phone, hashPassword(body.newPassword), me.id);
    } else {
      db.prepare(
        "UPDATE users SET username = ?, full_name = ?, phone = ? WHERE id = ?"
      ).run(nextUsername, fullName, phone, me.id);
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: JSON_HEADERS,
    });
  }

  return new Response(JSON.stringify({ error: "Aksi tidak dikenali." }), {
    status: 400,
    headers: JSON_HEADERS,
  });
};
