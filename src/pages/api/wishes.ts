import type { APIRoute } from "astro";
import { addOwnedGuestId, getOwnedGuestIds } from "../../lib/auth";
import db, {
  DEFAULT_WEDDING_ID,
  getConfig,
  getWeddingBySlug,
} from "../../lib/db";
import { checkRateLimit, getClientIp } from "../../lib/rateLimit";
import { notifyAdminWishWa } from "../../lib/whatsapp";

const WISH_OWNED_COOKIE = "wedding_wish_owned";
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
    const wishes = db
      .prepare(
        "SELECT id, name, message, created_at FROM wishes WHERE wedding_id = ? ORDER BY created_at DESC"
      )
      .all(weddingId);
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

export const POST: APIRoute = async ({ request, clientAddress, cookies, url }) => {
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
              `SELECT id FROM wishes WHERE wedding_id = ? AND name = ? AND id IN (${ownedIds.map(() => "?").join(",")}) LIMIT 1`
            )
            .get(weddingId, name, ...ownedIds) as { id: number } | undefined)
        : undefined;

    let actionType = "";
    let resultId = 0;

    if (existing) {
      db.prepare(
        "UPDATE wishes SET message=?, created_at=? WHERE id=? AND wedding_id=?"
      ).run(message, new Date().toISOString(), existing.id, weddingId);
      actionType = "updated";
      resultId = existing.id;
    } else {
      const result = db
        .prepare(
          "INSERT INTO wishes (wedding_id, name, message, created_at) VALUES (?, ?, ?, ?)"
        )
        .run(weddingId, name, message, new Date().toISOString());
      actionType = "created";
      resultId = Number(result.lastInsertRowid);
      addOwnedGuestId(cookies, request, WISH_OWNED_COOKIE, resultId);
    }

    const config = getConfig(weddingId);

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
