import crypto from "node:crypto";
import type { APIRoute } from "astro";
import { getAuthSession } from "../../lib/auth";
import db from "../../lib/db";

const JSON_HEADERS = {
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
};

const generateGuestCode = (): string =>
  `G-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;

export interface GuestRow {
  id: number;
  code: string;
  name: string;
  phone: string;
  address: string;
  group_name: string;
  quota: number;
  checked_in: number;
  checked_in_at: string;
  checked_in_pax: number;
  created_at: string;
}

export const GET: APIRoute = async ({ cookies }) => {
  const session = getAuthSession(cookies);
  if (!session) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: JSON_HEADERS,
    });
  }

  try {
    const guests = db
      .prepare(
        "SELECT * FROM guests WHERE wedding_id = ? ORDER BY checked_in DESC, id DESC"
      )
      .all(session.weddingId) as GuestRow[];
    return new Response(JSON.stringify(guests), {
      status: 200,
      headers: JSON_HEADERS,
    });
  } catch (err) {
    console.error("Guests GET error:", err);
    return new Response(JSON.stringify({ error: "Gagal memuat daftar tamu." }), {
      status: 500,
      headers: JSON_HEADERS,
    });
  }
};

export const POST: APIRoute = async ({ request, cookies }) => {
  const session = getAuthSession(cookies);
  if (!session) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: JSON_HEADERS,
    });
  }

  try {
    const body = (await request.json()) as {
      guests?: Array<{
        name?: string;
        phone?: string;
        address?: string;
        group_name?: string;
        quota?: number | string;
      }>;
      name?: string;
      phone?: string;
      address?: string;
      group_name?: string;
      quota?: number | string;
    };

    const items = Array.isArray(body.guests) ? body.guests : [body];
    if (items.length === 0 || items.length > 500) {
      return new Response(
        JSON.stringify({ error: "Jumlah data tamu harus antara 1 sampai 500." }),
        { status: 400, headers: JSON_HEADERS }
      );
    }

    const insertStmt = db.prepare(`
      INSERT INTO guests (wedding_id, code, name, phone, address, group_name, quota, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const created: GuestRow[] = [];
    const nowIso = new Date().toISOString();

    const insertBatch = db.transaction(() => {
      for (const raw of items) {
        const name =
          typeof raw?.name === "string" ? raw.name.trim().slice(0, 100) : "";
        if (!name) continue;
        const phone =
          typeof raw?.phone === "string" ? raw.phone.trim().slice(0, 30) : "";
        const address =
          typeof raw?.address === "string" && raw.address.trim()
            ? raw.address.trim().slice(0, 120)
            : "Di Tempat";
        const group_name =
          typeof raw?.group_name === "string"
            ? raw.group_name.trim().slice(0, 60)
            : "";
        const parsedQuota = Number(raw?.quota);
        const quota =
          Number.isInteger(parsedQuota) && parsedQuota >= 1 && parsedQuota <= 50
            ? parsedQuota
            : 2;

        const code = generateGuestCode();
        const res = insertStmt.run(
          session.weddingId,
          code,
          name,
          phone,
          address,
          group_name,
          quota,
          nowIso
        );
        created.push({
          id: Number(res.lastInsertRowid),
          code,
          name,
          phone,
          address,
          group_name,
          quota,
          checked_in: 0,
          checked_in_at: "",
          checked_in_pax: 0,
          created_at: nowIso,
        });
      }
    });

    insertBatch();

    if (created.length === 0) {
      return new Response(
        JSON.stringify({ error: "Minimal satu nama tamu yang valid wajib diisi." }),
        { status: 400, headers: JSON_HEADERS }
      );
    }

    return new Response(
      JSON.stringify({ success: true, count: created.length, guests: created }),
      { status: 200, headers: JSON_HEADERS }
    );
  } catch (err) {
    console.error("Guests POST error:", err);
    return new Response(JSON.stringify({ error: "Gagal menyimpan data tamu." }), {
      status: 500,
      headers: JSON_HEADERS,
    });
  }
};

export const PUT: APIRoute = async ({ request, cookies }) => {
  const session = getAuthSession(cookies);
  if (!session) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: JSON_HEADERS,
    });
  }

  try {
    const body = (await request.json()) as {
      id?: number;
      action?: "checkin" | "undo_checkin" | "update";
      checked_in_pax?: number;
      name?: string;
      phone?: string;
      address?: string;
      group_name?: string;
      quota?: number;
    };

    const id = Number(body.id);
    if (!Number.isInteger(id) || id <= 0) {
      return new Response(JSON.stringify({ error: "ID tamu tidak valid." }), {
        status: 400,
        headers: JSON_HEADERS,
      });
    }

    const existing = db
      .prepare("SELECT * FROM guests WHERE id = ? AND wedding_id = ?")
      .get(id, session.weddingId) as GuestRow | undefined;
    if (!existing) {
      return new Response(JSON.stringify({ error: "Tamu tidak ditemukan." }), {
        status: 404,
        headers: JSON_HEADERS,
      });
    }

    if (body.action === "checkin") {
      const paxNum = Number(body.checked_in_pax);
      const pax =
        Number.isInteger(paxNum) && paxNum >= 1 && paxNum <= 50
          ? paxNum
          : existing.quota || 1;
      const nowIso = new Date().toISOString();
      db.prepare(
        "UPDATE guests SET checked_in = 1, checked_in_at = ?, checked_in_pax = ? WHERE id = ?"
      ).run(nowIso, pax, id);
    } else if (body.action === "undo_checkin") {
      db.prepare(
        "UPDATE guests SET checked_in = 0, checked_in_at = '', checked_in_pax = 0 WHERE id = ?"
      ).run(id);
    } else {
      const name =
        typeof body.name === "string" && body.name.trim()
          ? body.name.trim().slice(0, 100)
          : existing.name;
      const phone =
        typeof body.phone === "string"
          ? body.phone.trim().slice(0, 30)
          : existing.phone;
      const address =
        typeof body.address === "string" && body.address.trim()
          ? body.address.trim().slice(0, 120)
          : existing.address;
      const group_name =
        typeof body.group_name === "string"
          ? body.group_name.trim().slice(0, 60)
          : existing.group_name;
      const parsedQuota = Number(body.quota);
      const quota =
        Number.isInteger(parsedQuota) && parsedQuota >= 1 && parsedQuota <= 50
          ? parsedQuota
          : existing.quota;

      db.prepare(
        "UPDATE guests SET name = ?, phone = ?, address = ?, group_name = ?, quota = ? WHERE id = ?"
      ).run(name, phone, address, group_name, quota, id);
    }

    const updated = db
      .prepare("SELECT * FROM guests WHERE id = ?")
      .get(id) as GuestRow;
    return new Response(JSON.stringify({ success: true, guest: updated }), {
      status: 200,
      headers: JSON_HEADERS,
    });
  } catch (err) {
    console.error("Guests PUT error:", err);
    return new Response(JSON.stringify({ error: "Gagal memperbarui data tamu." }), {
      status: 500,
      headers: JSON_HEADERS,
    });
  }
};

export const DELETE: APIRoute = async ({ request, cookies }) => {
  const session = getAuthSession(cookies);
  if (!session) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: JSON_HEADERS,
    });
  }

  try {
    const body = (await request.json().catch(() => ({}))) as {
      ids?: unknown[];
    };
    const ids = Array.isArray(body.ids)
      ? body.ids
          .map((v) => Number(v))
          .filter((n) => Number.isInteger(n) && n > 0)
      : [];

    if (ids.length === 0 || ids.length > 500) {
      return new Response(JSON.stringify({ error: "Daftar ID tidak valid." }), {
        status: 400,
        headers: JSON_HEADERS,
      });
    }

    const placeholders = ids.map(() => "?").join(",");
    db.prepare(
      `DELETE FROM guests WHERE wedding_id = ? AND id IN (${placeholders})`
    ).run(session.weddingId, ...ids);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: JSON_HEADERS,
    });
  } catch {
    return new Response(JSON.stringify({ error: "Gagal menghapus tamu." }), {
      status: 500,
      headers: JSON_HEADERS,
    });
  }
};
