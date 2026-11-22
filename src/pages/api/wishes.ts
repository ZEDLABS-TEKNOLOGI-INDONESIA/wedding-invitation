import type { APIRoute } from "astro";
import { addOwnedGuestId, getOwnedGuestIds } from "../../lib/auth";
import db, { getConfig } from "../../lib/db";
import { checkRateLimit, getClientIp } from "../../lib/rateLimit";
import { notifyAdminWishWa } from "../../lib/whatsapp";

const WISH_OWNED_COOKIE = "wedding_wish_owned";
const JSON_HEADERS = { "Content-Type": "application/json" };

export const GET: APIRoute = async () => {
  try {
    const wishes = db
      .prepare("SELECT id, name, message, created_at FROM wishes ORDER BY created_at DESC")
      .all();
    return new Response(JSON.stringify(wishes), {
      status: 200,
      headers: JSON_HEADERS,
    });
  } catch {
    return new Response(JSON.stringify({ error: "Failed to fetch" }), {
      status: 500,
      headers: JSON_HEADERS,
    });
  }
};

export const POST: APIRoute = async ({ request, clientAddress, cookies }) => {
  const ip = getClientIp(request, clientAddress);

  if (!checkRateLimit(`wishes:${ip}`, 5, 60000)) {
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

    const name = typeof rawData.name === "string" ? rawData.name.trim() : "";
    const message =
      typeof rawData.message === "string" ? rawData.message.trim() : "";

    if (!name || name.length > 100) {
      return new Response(
        JSON.stringify({ error: "Nama wajib diisi (maks 100 karakter)." }),
        { status: 400, headers: JSON_HEADERS }
      );
    }
    if (!message || message.length > 1000) {
      return new Response(
        JSON.stringify({ error: "Ucapan wajib diisi (maks 1000 karakter)." }),
        { status: 400, headers: JSON_HEADERS }
      );
    }

    const ownedIds = getOwnedGuestIds(cookies, WISH_OWNED_COOKIE);
    const existing =
      ownedIds.length > 0
        ? (db
            .prepare(
              `SELECT id FROM wishes WHERE name = ? AND id IN (${ownedIds.map(() => "?").join(",")}) LIMIT 1`
            )
            .get(name, ...ownedIds) as { id: number } | undefined)
        : undefined;

    let actionType = "";
    let resultId = 0;

    if (existing) {
      db.prepare("UPDATE wishes SET message=?, created_at=? WHERE id=?").run(
        message,
        new Date().toISOString(),
        existing.id
      );
      actionType = "updated";
      resultId = existing.id;
    } else {
      const result = db
        .prepare(
          "INSERT INTO wishes (name, message, created_at) VALUES (?, ?, ?)"
        )
        .run(name, message, new Date().toISOString());
      actionType = "created";
      resultId = Number(result.lastInsertRowid);
      addOwnedGuestId(cookies, request, WISH_OWNED_COOKIE, resultId);
    }

    const config = getConfig();

    void notifyAdminWishWa(config, {
      id: resultId,
      actionType: actionType === "updated" ? "updated" : "created",
      name,
      message,
    });

    return new Response(
      JSON.stringify({ success: true, id: resultId, action: actionType }),
      { status: 200, headers: JSON_HEADERS }
    );
  } catch (error) {
    console.error("Wishes API Error:", error);
    return new Response(JSON.stringify({ error: "Database error" }), {
      status: 500,
      headers: JSON_HEADERS,
    });
  }
};
