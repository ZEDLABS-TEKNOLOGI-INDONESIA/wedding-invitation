import type { APIRoute } from "astro";
import { getAuthSession } from "../../lib/auth";
import {
  FREE_GUEST_QUOTA,
  calculateGuestQuotaPrice,
  formatIdr,
} from "../../lib/billing";
import db, { getWeddingById } from "../../lib/db";

const VALID_ATTENDANCE = new Set(["hadir", "tidak_hadir", "ragu"]);
const JSON_HEADERS = {
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
};

const toPositiveInt = (val: unknown): number | null => {
  const num = typeof val === "number" ? val : Number(val);
  if (!Number.isInteger(num) || num <= 0) return null;
  return num;
};

export const POST: APIRoute = async ({ request, cookies }) => {
  const session = getAuthSession(cookies);
  if (!session) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: JSON_HEADERS,
    });
  }
  const weddingId = session.weddingId;

  try {
    const body = await request.json();
    if (!body || typeof body !== "object") {
      return new Response(JSON.stringify({ error: "Invalid request body" }), {
        status: 400,
        headers: JSON_HEADERS,
      });
    }

    const { action, id, ids, data } = body as {
      action?: unknown;
      id?: unknown;
      ids?: unknown;
      data?: Record<string, unknown>;
      items?: unknown[];
    };

    if (action === "delete_rsvp" || action === "delete_wish") {
      const rawList = Array.isArray(ids) ? ids : id !== undefined ? [id] : [];
      const targetIds = rawList
        .map(toPositiveInt)
        .filter((n): n is number => n !== null);

      if (targetIds.length === 0 || targetIds.length > 200) {
        return new Response(
          JSON.stringify({ error: "Daftar ID tidak valid (1-200 item)." }),
          { status: 400, headers: JSON_HEADERS }
        );
      }

      const placeholders = targetIds.map(() => "?").join(",");
      const table = action === "delete_rsvp" ? "rsvps" : "wishes";
      db.prepare(
        `DELETE FROM ${table} WHERE wedding_id = ? AND id IN (${placeholders})`
      ).run(weddingId, ...targetIds);
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: JSON_HEADERS,
      });
    }

    if (action === "update_rsvp") {
      const targetId = toPositiveInt(id);
      if (!targetId || !data || typeof data !== "object") {
        return new Response(
          JSON.stringify({ error: "ID atau data RSVP tidak valid." }),
          { status: 400, headers: JSON_HEADERS }
        );
      }

      const guest_name =
        typeof data.guest_name === "string" ? data.guest_name.trim() : "";
      const attendance =
        typeof data.attendance === "string" ? data.attendance.trim() : "";
      const rawCount = Number(data.guest_count);
      const guest_count =
        attendance === "hadir"
          ? Number.isInteger(rawCount) && rawCount >= 1 && rawCount <= 100
            ? rawCount
            : null
          : 0;
      const message =
        typeof data.message === "string" ? data.message.trim().slice(0, 500) : "";
      const hasPhone = typeof data.phone === "string";
      const phone = hasPhone ? (data.phone as string).trim().slice(0, 30) : null;

      if (!guest_name || guest_name.length > 100) {
        return new Response(
          JSON.stringify({ error: "Nama tamu wajib diisi (maks 100 karakter)." }),
          { status: 400, headers: JSON_HEADERS }
        );
      }
      if (!VALID_ATTENDANCE.has(attendance)) {
        return new Response(
          JSON.stringify({ error: "Status kehadiran tidak valid." }),
          { status: 400, headers: JSON_HEADERS }
        );
      }
      if (guest_count === null) {
        return new Response(
          JSON.stringify({ error: "Jumlah tamu harus antara 1 sampai 100." }),
          { status: 400, headers: JSON_HEADERS }
        );
      }

      if (hasPhone) {
        db.prepare(
          "UPDATE rsvps SET guest_name=?, phone=?, attendance=?, guest_count=?, message=? WHERE id=? AND wedding_id=?"
        ).run(guest_name, phone, attendance, guest_count, message, targetId, weddingId);
      } else {
        db.prepare(
          "UPDATE rsvps SET guest_name=?, attendance=?, guest_count=?, message=? WHERE id=? AND wedding_id=?"
        ).run(guest_name, attendance, guest_count, message, targetId, weddingId);
      }

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: JSON_HEADERS,
      });
    }

    if (action === "update_wish") {
      const targetId = toPositiveInt(id);
      if (!targetId || !data || typeof data !== "object") {
        return new Response(
          JSON.stringify({ error: "ID atau data ucapan tidak valid." }),
          { status: 400, headers: JSON_HEADERS }
        );
      }

      const name = typeof data.name === "string" ? data.name.trim() : "";
      const message =
        typeof data.message === "string" ? data.message.trim() : "";

      if (!name || name.length > 100 || !message || message.length > 1000) {
        return new Response(
          JSON.stringify({
            error: "Nama (maks 100) dan ucapan (maks 1000) wajib diisi.",
          }),
          { status: 400, headers: JSON_HEADERS }
        );
      }

      db.prepare(
        "UPDATE wishes SET name=?, message=? WHERE id=? AND wedding_id=?"
      ).run(name, message, targetId, weddingId);
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: JSON_HEADERS,
      });
    }

    if (action === "create_rsvp" || action === "import_rsvp") {
      const rawItems =
        action === "import_rsvp"
          ? Array.isArray(body.items)
            ? body.items
            : []
          : data && typeof data === "object"
            ? [data]
            : [];

      if (rawItems.length === 0 || rawItems.length > 500) {
        return new Response(
          JSON.stringify({
            error: "Jumlah data RSVP harus antara 1 sampai 500.",
          }),
          { status: 400, headers: JSON_HEADERS }
        );
      }

      const validRsvpCount = rawItems.filter(
        (raw: unknown) =>
          Boolean(raw) &&
          typeof raw === "object" &&
          typeof (raw as Record<string, unknown>).guest_name === "string" &&
          String((raw as Record<string, unknown>).guest_name).trim().length > 0
      ).length;
      const wedding = getWeddingById(weddingId);
      const quotaLimit = Math.max(
        FREE_GUEST_QUOTA,
        Number(wedding?.guest_quota_limit || FREE_GUEST_QUOTA)
      );
      const usedRsvps = (
        db
          .prepare("SELECT COUNT(*) as c FROM rsvps WHERE wedding_id = ?")
          .get(weddingId) as { c: number }
      ).c;
      const projectedTotal = usedRsvps + validRsvpCount;
      if (projectedTotal > quotaLimit) {
        const quote = calculateGuestQuotaPrice(projectedTotal, quotaLimit);
        return new Response(
          JSON.stringify({
            code: "QUOTA_EXCEEDED",
            error: `Seluruh impor ditolak karena melebihi batas kuota (${quotaLimit} kontak). Total akan menjadi ${projectedTotal} kontak. Silakan tambah kuota di halaman Kuota & Tagihan (${formatIdr(quote.amount)}).`,
            quotaLimit,
            usedGuests: usedRsvps,
            incomingCount: validRsvpCount,
            projectedTotal,
            quote,
          }),
          { status: 402, headers: JSON_HEADERS }
        );
      }

      const insertStmt = db.prepare(`
        INSERT INTO rsvps (wedding_id, guest_name, phone, attendance, guest_count, message, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      const nowIso = new Date().toISOString();
      const created: Array<{
        id: number;
        guest_name: string;
        phone: string;
        attendance: "hadir" | "tidak_hadir" | "ragu";
        guest_count: number;
        message: string;
        created_at: string;
      }> = [];

      const runInsert = db.transaction(() => {
        for (const raw of rawItems) {
          if (!raw || typeof raw !== "object") continue;
          const rec = raw as Record<string, unknown>;
          const guest_name =
            typeof rec.guest_name === "string"
              ? rec.guest_name.trim().slice(0, 100)
              : "";
          if (!guest_name) continue;

          const phone =
            typeof rec.phone === "string" ? rec.phone.trim().slice(0, 30) : "";
          const rawAtt =
            typeof rec.attendance === "string" ? rec.attendance.trim() : "hadir";
          const attendance = (
            VALID_ATTENDANCE.has(rawAtt) ? rawAtt : "hadir"
          ) as "hadir" | "tidak_hadir" | "ragu";
          const rawCount = Number(rec.guest_count);
          const guest_count =
            attendance === "hadir"
              ? Number.isInteger(rawCount) && rawCount >= 1 && rawCount <= 100
                ? rawCount
                : 1
              : 0;
          const message =
            typeof rec.message === "string"
              ? rec.message.trim().slice(0, 500)
              : "";

          const res = insertStmt.run(
            weddingId,
            guest_name,
            phone,
            attendance,
            guest_count,
            message,
            nowIso
          );
          created.push({
            id: Number(res.lastInsertRowid),
            guest_name,
            phone,
            attendance,
            guest_count,
            message,
            created_at: nowIso,
          });
        }
      });

      runInsert();

      if (created.length === 0) {
        return new Response(
          JSON.stringify({
            error: "Minimal satu data RSVP dengan nama tamu valid wajib diisi.",
          }),
          { status: 400, headers: JSON_HEADERS }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          count: created.length,
          item: created[0],
          items: created,
        }),
        { status: 200, headers: JSON_HEADERS }
      );
    }

    if (action === "create_wish" || action === "import_wish") {
      const rawItems =
        action === "import_wish"
          ? Array.isArray(body.items)
            ? body.items
            : []
          : data && typeof data === "object"
            ? [data]
            : [];

      if (rawItems.length === 0 || rawItems.length > 500) {
        return new Response(
          JSON.stringify({
            error: "Jumlah data ucapan harus antara 1 sampai 500.",
          }),
          { status: 400, headers: JSON_HEADERS }
        );
      }

      const insertStmt = db.prepare(`
        INSERT INTO wishes (wedding_id, name, message, created_at)
        VALUES (?, ?, ?, ?)
      `);
      const nowIso = new Date().toISOString();
      const created: Array<{
        id: number;
        name: string;
        message: string;
        created_at: string;
      }> = [];

      const runInsert = db.transaction(() => {
        for (const raw of rawItems) {
          if (!raw || typeof raw !== "object") continue;
          const rec = raw as Record<string, unknown>;
          const name =
            typeof rec.name === "string" ? rec.name.trim().slice(0, 100) : "";
          const message =
            typeof rec.message === "string"
              ? rec.message.trim().slice(0, 1000)
              : "";
          if (!name || !message) continue;

          const res = insertStmt.run(weddingId, name, message, nowIso);
          created.push({
            id: Number(res.lastInsertRowid),
            name,
            message,
            created_at: nowIso,
          });
        }
      });

      runInsert();

      if (created.length === 0) {
        return new Response(
          JSON.stringify({
            error: "Minimal satu data ucapan dengan nama dan pesan valid wajib diisi.",
          }),
          { status: 400, headers: JSON_HEADERS }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          count: created.length,
          item: created[0],
          items: created,
        }),
        { status: 200, headers: JSON_HEADERS }
      );
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: JSON_HEADERS,
    });
  } catch (error) {
    console.error("Admin API Error:", error);
    return new Response(JSON.stringify({ error: "Terjadi kesalahan server." }), {
      status: 500,
      headers: JSON_HEADERS,
    });
  }
};
