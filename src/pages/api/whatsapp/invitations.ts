import type { APIRoute } from "astro";
import { isAdminAuthenticated } from "../../../lib/auth";
import db, { getConfig } from "../../../lib/db";
import {
  WA_TEMPLATE_CODES,
  WaGatewayClient,
  WaGatewayError,
  buildEventSummary,
  getWaCredentials,
  normalizeWaPhone,
  sanitizeWaVariable,
  type WaMedia,
} from "../../../lib/whatsapp";

const JSON_HEADERS = {
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
};

const MAX_PDF_BASE64_LENGTH = 15 * 1024 * 1024;

interface GuestInviteInput {
  name: string;
  phone: string;
  address?: string;
  pdfBase64?: string;
}

function cleanBase64Payload(raw: unknown): string {
  if (typeof raw !== "string") return "";
  const trimmed = raw.trim();
  if (!trimmed) return "";
  const commaIdx = trimmed.indexOf(",");
  const payload =
    trimmed.startsWith("data:") && commaIdx >= 0
      ? trimmed.slice(commaIdx + 1).trim()
      : trimmed;
  if (!payload || payload.length > MAX_PDF_BASE64_LENGTH) return "";
  return payload;
}

export const GET: APIRoute = async ({ cookies }) => {
  if (!isAdminAuthenticated(cookies)) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: JSON_HEADERS,
    });
  }

  try {
    const rows = db
      .prepare(
        "SELECT * FROM wa_invitations ORDER BY created_at DESC, id DESC LIMIT 300"
      )
      .all();
    return new Response(JSON.stringify(rows), {
      status: 200,
      headers: JSON_HEADERS,
    });
  } catch (err) {
    console.error("Failed to fetch WA invitations:", err);
    return new Response(
      JSON.stringify({ error: "Gagal memuat riwayat undangan WhatsApp." }),
      { status: 500, headers: JSON_HEADERS }
    );
  }
};

export const POST: APIRoute = async ({ request, cookies, site }) => {
  if (!isAdminAuthenticated(cookies)) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: JSON_HEADERS,
    });
  }

  try {
    const body = (await request.json()) as {
      guests?: GuestInviteInput[];
      siteUrl?: string;
      attachPdf?: boolean;
    };

    const guests = Array.isArray(body.guests) ? body.guests : [];
    if (guests.length === 0 || guests.length > 200) {
      return new Response(
        JSON.stringify({
          error: "Daftar tamu wajib diisi (1 sampai 200 tamu per kiriman).",
        }),
        { status: 400, headers: JSON_HEADERS }
      );
    }

    const config = getConfig();
    const creds = getWaCredentials(config);
    if (!creds) {
      return new Response(
        JSON.stringify({
          error:
            "Konfigurasi WhatsApp Gateway belum lengkap. Lengkapi di tab Pengaturan terlebih dahulu.",
        }),
        { status: 400, headers: JSON_HEADERS }
      );
    }

    const rawBaseUrl = (
      body.siteUrl ||
      site?.toString() ||
      "https://wedding.zedlabs.id"
    ).replace(/\/+$/, "");

    const summary = buildEventSummary(config);
    const client = new WaGatewayClient(creds, { timeoutMs: 30_000, maxRetries: 1 });
    const insertStmt = db.prepare(`
      INSERT INTO wa_invitations
        (guest_name, phone, address, invitation_url, job_id, reference_id, status, error_message, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const results: Array<{
      id: number;
      guest_name: string;
      phone: string;
      status: string;
      job_id: string;
      error_message: string;
    }> = [];

    for (let idx = 0; idx < guests.length; idx++) {
      const item = guests[idx];
      const guestName =
        typeof item?.name === "string" ? item.name.trim().slice(0, 100) : "";
      const phone =
        typeof item?.phone === "string" ? normalizeWaPhone(item.phone) : "";
      const address =
        typeof item?.address === "string" && item.address.trim()
          ? item.address.trim().slice(0, 120)
          : "Di Tempat";

      const nowIso = new Date().toISOString();

      if (!guestName || !phone) {
        const errText = !guestName
          ? "Nama tamu kosong"
          : "Format nomor WhatsApp tidak valid";
        const inserted = insertStmt.run(
          guestName || "(Tanpa Nama)",
          item?.phone || "-",
          address,
          rawBaseUrl,
          "",
          "",
          "failed",
          errText,
          nowIso,
          nowIso
        );
        results.push({
          id: Number(inserted.lastInsertRowid),
          guest_name: guestName || "(Tanpa Nama)",
          phone: item?.phone || "-",
          status: "failed",
          job_id: "",
          error_message: errText,
        });
        continue;
      }

      const invitationUrl = `${rawBaseUrl}/?to=${encodeURIComponent(guestName)}`;
      const referenceId = `WED-INV-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`;

      let media: WaMedia | null = null;
      if (body.attachPdf) {
        const pdfBase64 = cleanBase64Payload(item?.pdfBase64);
        if (pdfBase64) {
          media = {
            jenis: "dokumen",
            url: pdfBase64,
            caption: `Surat Undangan Pernikahan untuk ${sanitizeWaVariable(guestName, "Bapak/Ibu")}`,
          };
        }
      }

      try {
        const res = await client.sendMessage({
          templateCode: WA_TEMPLATE_CODES.INVITATION,
          recipient: phone,
          variables: {
            nama_tamu: sanitizeWaVariable(guestName, "Bapak/Ibu", {
              maxLength: 100,
            }),
            mempelai: sanitizeWaVariable(summary.mempelai, "Mempelai", {
              maxLength: 80,
            }),
            tanggal_acara: sanitizeWaVariable(summary.tanggal, "Hari Bahagia", {
              maxLength: 80,
            }),
            waktu_acara: sanitizeWaVariable(summary.waktu, "Sesuai jadwal", {
              maxLength: 60,
            }),
            tempat_acara: sanitizeWaVariable(summary.tempat, "Lokasi Acara", {
              maxLength: 160,
            }),
            link_undangan: invitationUrl,
          },
          media,
          referenceId,
        });

        const inserted = insertStmt.run(
          guestName,
          phone,
          address,
          invitationUrl,
          res.job_id || "",
          referenceId,
          res.status || "queued",
          "",
          nowIso,
          nowIso
        );
        results.push({
          id: Number(inserted.lastInsertRowid),
          guest_name: guestName,
          phone,
          status: res.status || "queued",
          job_id: res.job_id || "",
          error_message: "",
        });
      } catch (err) {
        const errMsg =
          err instanceof WaGatewayError
            ? err.status === 403
              ? "Template belum tersinkron dengan API key ini."
              : err.pesan
            : err instanceof Error
              ? err.message
              : "Gagal mengirim ke Gateway";

        const inserted = insertStmt.run(
          guestName,
          phone,
          address,
          invitationUrl,
          "",
          referenceId,
          "failed",
          errMsg,
          nowIso,
          nowIso
        );
        results.push({
          id: Number(inserted.lastInsertRowid),
          guest_name: guestName,
          phone,
          status: "failed",
          job_id: "",
          error_message: errMsg,
        });
      }
    }

    const queuedCount = results.filter((r) => r.status !== "failed").length;
    const failedCount = results.length - queuedCount;

    return new Response(
      JSON.stringify({
        success: true,
        queued: queuedCount,
        failed: failedCount,
        results,
      }),
      { status: 200, headers: JSON_HEADERS }
    );
  } catch (err) {
    console.error("WA Invitations API Error:", err);
    return new Response(
      JSON.stringify({ error: "Terjadi kesalahan saat mengirim undangan." }),
      { status: 500, headers: JSON_HEADERS }
    );
  }
};

export const DELETE: APIRoute = async ({ request, cookies }) => {
  if (!isAdminAuthenticated(cookies)) {
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

    if (ids.length === 0 || ids.length > 200) {
      return new Response(JSON.stringify({ error: "Daftar ID tidak valid." }), {
        status: 400,
        headers: JSON_HEADERS,
      });
    }

    const placeholders = ids.map(() => "?").join(",");
    db.prepare(`DELETE FROM wa_invitations WHERE id IN (${placeholders})`).run(
      ...ids
    );
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: JSON_HEADERS,
    });
  } catch {
    return new Response(JSON.stringify({ error: "Gagal menghapus riwayat." }), {
      status: 500,
      headers: JSON_HEADERS,
    });
  }
};
