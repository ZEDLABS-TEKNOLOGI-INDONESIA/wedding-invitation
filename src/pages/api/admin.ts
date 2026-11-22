import type { APIRoute } from "astro";
import { isAdminAuthenticated } from "../../lib/auth";
import db from "../../lib/db";

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
  if (!isAdminAuthenticated(cookies)) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: JSON_HEADERS,
    });
  }

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
      db.prepare(`DELETE FROM ${table} WHERE id IN (${placeholders})`).run(
        ...targetIds
      );
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
          "UPDATE rsvps SET guest_name=?, phone=?, attendance=?, guest_count=?, message=? WHERE id=?"
        ).run(guest_name, phone, attendance, guest_count, message, targetId);
      } else {
        db.prepare(
          "UPDATE rsvps SET guest_name=?, attendance=?, guest_count=?, message=? WHERE id=?"
        ).run(guest_name, attendance, guest_count, message, targetId);
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

      db.prepare("UPDATE wishes SET name=?, message=? WHERE id=?").run(
        name,
        message,
        targetId
      );
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: JSON_HEADERS,
      });
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
