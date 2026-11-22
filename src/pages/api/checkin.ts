import crypto from "node:crypto";
import type { APIRoute } from "astro";
import { isAdminAuthenticated } from "../../lib/auth";
import db from "../../lib/db";
import type { GuestRow } from "./guests";

const JSON_HEADERS = {
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
};

const extractLookupFromInput = (
  raw: string
): { code: string; name: string } => {
  const trimmed = raw.trim();
  if (!trimmed) return { code: "", name: "" };

  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    try {
      const parsed = new URL(trimmed);
      const code = (parsed.searchParams.get("code") || "").trim().toUpperCase();
      const name = (parsed.searchParams.get("to") || "").trim();
      return { code, name };
    } catch {
      return { code: "", name: trimmed };
    }
  }

  if (/^G-[A-F0-9]{6,12}$/i.test(trimmed)) {
    return { code: trimmed.toUpperCase(), name: "" };
  }

  return { code: "", name: trimmed };
};

export const POST: APIRoute = async ({ request, cookies }) => {
  if (!isAdminAuthenticated(cookies)) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: JSON_HEADERS,
    });
  }

  try {
    const body = (await request.json()) as {
      query?: string;
      pax?: number;
      autoCreate?: boolean;
    };

    const rawQuery = typeof body.query === "string" ? body.query.trim() : "";
    if (!rawQuery) {
      return new Response(
        JSON.stringify({ error: "Kode QR atau nama tamu tidak boleh kosong." }),
        { status: 400, headers: JSON_HEADERS }
      );
    }

    const { code, name } = extractLookupFromInput(rawQuery);
    let guest: GuestRow | undefined;

    if (code) {
      guest = db
        .prepare("SELECT * FROM guests WHERE UPPER(code) = ? LIMIT 1")
        .get(code) as GuestRow | undefined;
    }

    if (!guest && name) {
      guest = db
        .prepare("SELECT * FROM guests WHERE LOWER(name) = LOWER(?) LIMIT 1")
        .get(name) as GuestRow | undefined;

      // Jika belum cocok persis, coba pencarian parsial bila hanya 1 kandidat unik
      if (!guest) {
        const partialMatches = db
          .prepare("SELECT * FROM guests WHERE LOWER(name) LIKE LOWER(?) LIMIT 2")
          .all(`%${name}%`) as GuestRow[];
        if (partialMatches.length === 1) {
          guest = partialMatches[0];
        }
      }

      // Jika belum ada di tabel guests, cek data RSVP lalu promosikan otomatis ke guests
      if (!guest) {
        const rsvpMatch = (db
          .prepare(
            "SELECT guest_name, phone, guest_count FROM rsvps WHERE LOWER(guest_name) = LOWER(?) LIMIT 1"
          )
          .get(name) ||
          (() => {
            const partial = db
              .prepare(
                "SELECT guest_name, phone, guest_count FROM rsvps WHERE LOWER(guest_name) LIKE LOWER(?) LIMIT 2"
              )
              .all(`%${name}%`) as Array<{
              guest_name: string;
              phone: string;
              guest_count: number;
            }>;
            return partial.length === 1 ? partial[0] : undefined;
          })()) as
          | { guest_name: string; phone: string; guest_count: number }
          | undefined;

        if (rsvpMatch) {
          const newCode = `G-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
          const nowIso = new Date().toISOString();
          const quota =
            Number.isInteger(rsvpMatch.guest_count) && rsvpMatch.guest_count > 0
              ? rsvpMatch.guest_count
              : 2;
          const inserted = db
            .prepare(
              `INSERT INTO guests (code, name, phone, address, group_name, quota, checked_in, checked_in_at, checked_in_pax, created_at)
               VALUES (?, ?, ?, 'Di Tempat', 'RSVP', ?, 0, '', 0, ?)`
            )
            .run(
              newCode,
              rsvpMatch.guest_name,
              rsvpMatch.phone || "",
              quota,
              nowIso
            );
          guest = db
            .prepare("SELECT * FROM guests WHERE id = ?")
            .get(Number(inserted.lastInsertRowid)) as GuestRow;
        }
      }
    }

    if (!guest) {
      if (body.autoCreate && (name || rawQuery)) {
        const displayName = (name || rawQuery).slice(0, 100);
        const newCode = `G-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
        const paxNum = Number(body.pax);
        const pax =
          Number.isInteger(paxNum) && paxNum >= 1 && paxNum <= 50 ? paxNum : 1;
        const nowIso = new Date().toISOString();

        const res = db
          .prepare(
            `INSERT INTO guests (code, name, phone, address, group_name, quota, checked_in, checked_in_at, checked_in_pax, created_at)
             VALUES (?, ?, '', 'Di Tempat', 'Walk-In', ?, 1, ?, ?, ?)`
          )
          .run(newCode, displayName, pax, nowIso, pax, nowIso);

        const created = db
          .prepare("SELECT * FROM guests WHERE id = ?")
          .get(Number(res.lastInsertRowid)) as GuestRow;

        return new Response(
          JSON.stringify({
            success: true,
            createdWalkIn: true,
            alreadyCheckedIn: false,
            guest: created,
          }),
          { status: 200, headers: JSON_HEADERS }
        );
      }

      return new Response(
        JSON.stringify({
          found: false,
          suggestedName: name || rawQuery,
          error: `Tamu "${name || code || rawQuery}" tidak ditemukan di daftar tamu.`,
        }),
        { status: 404, headers: JSON_HEADERS }
      );
    }

    if (guest.checked_in === 1) {
      return new Response(
        JSON.stringify({
          success: true,
          alreadyCheckedIn: true,
          guest,
        }),
        { status: 200, headers: JSON_HEADERS }
      );
    }

    const paxNum = Number(body.pax);
    const pax =
      Number.isInteger(paxNum) && paxNum >= 1 && paxNum <= 50
        ? paxNum
        : guest.quota || 1;
    const nowIso = new Date().toISOString();

    db.prepare(
      "UPDATE guests SET checked_in = 1, checked_in_at = ?, checked_in_pax = ? WHERE id = ?"
    ).run(nowIso, pax, guest.id);

    const updated = db
      .prepare("SELECT * FROM guests WHERE id = ?")
      .get(guest.id) as GuestRow;

    return new Response(
      JSON.stringify({
        success: true,
        alreadyCheckedIn: false,
        guest: updated,
      }),
      { status: 200, headers: JSON_HEADERS }
    );
  } catch (err) {
    console.error("Check-in API error:", err);
    return new Response(
      JSON.stringify({ error: "Terjadi kesalahan saat memproses check-in." }),
      { status: 500, headers: JSON_HEADERS }
    );
  }
};
