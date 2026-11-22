import type { APIRoute } from "astro";
import { addOwnedGuestId, getOwnedGuestIds } from "../../lib/auth";
import db, {
  DEFAULT_WEDDING_ID,
  getConfig,
  getWeddingBySlug,
} from "../../lib/db";
import { checkRateLimit, getClientIp } from "../../lib/rateLimit";
import {
  notifyAdminRsvpWa,
  sendGuestRsvpConfirmationWa,
} from "../../lib/whatsapp";

const RSVP_OWNED_COOKIE = "wedding_rsvp_owned";
const VALID_ATTENDANCE = new Set(["hadir", "tidak_hadir", "ragu"]);
const JSON_HEADERS = { "Content-Type": "application/json" };

function resolvePublicWeddingId(slug?: string | null): number | null {
  const clean = String(slug || "").trim().toLowerCase();
  if (!clean) return DEFAULT_WEDDING_ID;
  const w = getWeddingBySlug(clean);
  if (!w || w.status !== "active") return null;
  return w.id;
}

export const GET: APIRoute = async ({ url }) => {
  try {
    const weddingId = resolvePublicWeddingId(url.searchParams.get("wedding"));
    if (weddingId === null) {
      return new Response(JSON.stringify({ error: "Undangan tidak ditemukan." }), {
        status: 404,
        headers: JSON_HEADERS,
      });
    }
    const rsvps = db
      .prepare(
        "SELECT id, guest_name, attendance, guest_count, created_at FROM rsvps WHERE wedding_id = ? ORDER BY created_at DESC"
      )
      .all(weddingId);
    return new Response(JSON.stringify(rsvps), {
      status: 200,
      headers: JSON_HEADERS,
    });
  } catch {
    return new Response(JSON.stringify({ error: "Failed to fetch RSVPs" }), {
      status: 500,
      headers: JSON_HEADERS,
    });
  }
};

export const POST: APIRoute = async ({ request, clientAddress, cookies, url }) => {
  const ip = getClientIp(request, clientAddress);

  if (!checkRateLimit(`rsvp:${ip}`, 5, 60000)) {
    return new Response(
      JSON.stringify({
        error: "Terlalu banyak permintaan. Silakan coba lagi sebentar.",
      }),
      { status: 429, headers: JSON_HEADERS }
    );
  }

  try {
    const rawData = await request.json();
    if (!rawData || typeof rawData !== "object") {
      return new Response(JSON.stringify({ error: "Data tidak valid." }), {
        status: 400,
        headers: JSON_HEADERS,
      });
    }

    const weddingId = resolvePublicWeddingId(
      typeof rawData.wedding_slug === "string"
        ? rawData.wedding_slug
        : url.searchParams.get("wedding")
    );
    if (weddingId === null) {
      return new Response(JSON.stringify({ error: "Undangan tidak ditemukan." }), {
        status: 404,
        headers: JSON_HEADERS,
      });
    }

    const config = getConfig(weddingId);
    const parsedMax = parseInt(config.RSVP_MAX_GUESTS || "20", 10);
    const maxGuests = Number.isInteger(parsedMax) && parsedMax > 0 ? parsedMax : 20;

    const guest_name =
      typeof rawData.guest_name === "string" ? rawData.guest_name.trim() : "";
    const phone =
      typeof rawData.phone === "string" ? rawData.phone.trim() : "";
    const message =
      typeof rawData.message === "string" ? rawData.message.trim() : "";
    const attendance =
      typeof rawData.attendance === "string" ? rawData.attendance.trim() : "";
    const rawCount = Number(rawData.guest_count);

    if (!guest_name || guest_name.length > 100) {
      return new Response(
        JSON.stringify({ error: "Nama tamu wajib diisi (maks 100 karakter)." }),
        { status: 400, headers: JSON_HEADERS }
      );
    }
    if (phone.length > 30) {
      return new Response(
        JSON.stringify({ error: "Nomor kontak maksimal 30 karakter." }),
        { status: 400, headers: JSON_HEADERS }
      );
    }
    if (message.length > 500) {
      return new Response(
        JSON.stringify({ error: "Pesan maksimal 500 karakter." }),
        { status: 400, headers: JSON_HEADERS }
      );
    }
    if (!VALID_ATTENDANCE.has(attendance)) {
      return new Response(
        JSON.stringify({ error: "Status kehadiran tidak valid." }),
        { status: 400, headers: JSON_HEADERS }
      );
    }

    const guest_count =
      attendance === "hadir"
        ? Number.isInteger(rawCount) && rawCount >= 1 && rawCount <= maxGuests
          ? rawCount
          : null
        : 0;

    if (guest_count === null) {
      return new Response(
        JSON.stringify({
          error: `Jumlah tamu harus antara 1 sampai ${maxGuests}.`,
        }),
        { status: 400, headers: JSON_HEADERS }
      );
    }

    const ownedIds = getOwnedGuestIds(cookies, RSVP_OWNED_COOKIE);
    const existing =
      ownedIds.length > 0
        ? (db
            .prepare(
              `SELECT id FROM rsvps WHERE wedding_id = ? AND guest_name = ? AND id IN (${ownedIds.map(() => "?").join(",")}) LIMIT 1`
            )
            .get(weddingId, guest_name, ...ownedIds) as { id: number } | undefined)
        : undefined;

    let actionType = "";
    let resultId = 0;

    if (existing) {
      db.prepare(
        "UPDATE rsvps SET phone=?, attendance=?, guest_count=?, message=?, created_at=? WHERE id=? AND wedding_id=?"
      ).run(
        phone,
        attendance,
        guest_count,
        message,
        new Date().toISOString(),
        existing.id,
        weddingId
      );
      actionType = "updated";
      resultId = existing.id;
    } else {
      const result = db
        .prepare(
          "INSERT INTO rsvps (wedding_id, guest_name, phone, attendance, guest_count, message, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
        )
        .run(
          weddingId,
          guest_name,
          phone,
          attendance,
          guest_count,
          message,
          new Date().toISOString()
        );
      actionType = "created";
      resultId = Number(result.lastInsertRowid);
      addOwnedGuestId(cookies, request, RSVP_OWNED_COOKIE, resultId);
    }

    const typedAction: "created" | "updated" =
      actionType === "updated" ? "updated" : "created";

    void notifyAdminRsvpWa(config, {
      id: resultId,
      actionType: typedAction,
      guest_name,
      attendance,
      guest_count,
      phone,
      message,
    });

    void sendGuestRsvpConfirmationWa(config, {
      id: resultId,
      guest_name,
      attendance,
      guest_count,
      phone,
    });

    return new Response(
      JSON.stringify({ success: true, id: resultId, action: actionType }),
      { status: 200, headers: JSON_HEADERS }
    );
  } catch (error) {
    console.error("RSVP API Error:", error);
    return new Response(JSON.stringify({ error: "Database error" }), {
      status: 500,
      headers: JSON_HEADERS,
    });
  }
};
