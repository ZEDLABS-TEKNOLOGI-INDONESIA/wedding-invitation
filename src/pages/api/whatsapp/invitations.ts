import crypto from "node:crypto";
import type { APIRoute } from "astro";
import { getAuthSession } from "../../../lib/auth";
import db, { getConfig } from "../../../lib/db";
import {
  WA_TEMPLATE_CODES,
  WaGatewayClient,
  WaGatewayError,
  buildEventSummary,
  getWaCredentials,
  normalizeWaPhone,
  resolveOriginDomain,
  sanitizeWaVariable,
  type WaMedia,
} from "../../../lib/whatsapp";

const JSON_HEADERS = {
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
};

const MAX_ATTACHMENT_BASE64_LENGTH = 15 * 1024 * 1024;

interface GuestInviteInput {
  name: string;
  phone: string;
  address?: string;
  pdfBase64?: string;
  qrBase64?: string;
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
  if (!payload || payload.length > MAX_ATTACHMENT_BASE64_LENGTH) return "";
  return payload;
}

/**
 * Pastikan tamu yang dikirim undangan WhatsApp tercatat di:
 * 1) Tabel `guests` (Daftar Tamu Permanen) agar QR & pencarian manual Hari H langsung menemukan tamu.
 * 2) Tabel `rsvps` dengan status `ragu` (belum konfirmasi) bila belum pernah mengisi RSVP.
 */
function syncBroadcastedGuestRecords(
  weddingId: number,
  guestName: string,
  phone: string,
  address: string,
  nowIso: string
): string {
  // 1. Sync ke tabel guests
  const existingGuest = db
    .prepare(
      `SELECT id, code, phone FROM guests
       WHERE wedding_id = ? AND (LOWER(name) = LOWER(?) OR (? != '' AND phone = ?))
       LIMIT 1`
    )
    .get(weddingId, guestName, phone, phone) as
    | { id: number; code: string; phone: string }
    | undefined;

  let guestCode = existingGuest?.code || "";
  if (!existingGuest) {
    guestCode = `G-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
    db.prepare(
      `INSERT INTO guests (wedding_id, code, name, phone, address, group_name, quota, checked_in, checked_in_at, checked_in_pax, created_at)
       VALUES (?, ?, ?, ?, ?, 'Undangan WA', 2, 0, '', 0, ?)`
    ).run(weddingId, guestCode, guestName, phone, address, nowIso);
  } else if (!existingGuest.phone && phone) {
    db.prepare("UPDATE guests SET phone = ? WHERE id = ? AND wedding_id = ?").run(
      phone,
      existingGuest.id,
      weddingId
    );
  }

  // 2. Sync ke tabel rsvps dengan status 'ragu' (hanya jika belum ada)
  const existingRsvp = db
    .prepare(
      `SELECT id, phone FROM rsvps
       WHERE wedding_id = ? AND (LOWER(guest_name) = LOWER(?) OR (? != '' AND phone = ?))
       LIMIT 1`
    )
    .get(weddingId, guestName, phone, phone) as { id: number; phone: string } | undefined;

  if (!existingRsvp) {
    db.prepare(
      `INSERT INTO rsvps (wedding_id, guest_name, phone, attendance, guest_count, message, created_at)
       VALUES (?, ?, ?, 'ragu', 1, 'Diundang via WhatsApp (belum konfirmasi)', ?)`
    ).run(weddingId, guestName, phone, nowIso);
  } else if (!existingRsvp.phone && phone) {
    db.prepare("UPDATE rsvps SET phone = ? WHERE id = ? AND wedding_id = ?").run(
      phone,
      existingRsvp.id,
      weddingId
    );
  }

  return guestCode;
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
    const rows = db
      .prepare(
        "SELECT * FROM wa_invitations WHERE wedding_id = ? ORDER BY created_at DESC, id DESC LIMIT 300"
      )
      .all(session.weddingId);
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

export const POST: APIRoute = async ({ request, cookies, site, url }) => {
  const session = getAuthSession(cookies);
  if (!session) {
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
      attachQr?: boolean;
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

    const config = getConfig(session.weddingId);
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
      url.origin ||
      "https://wedding.zedlabs.id"
    ).replace(/\/+$/, "");
    const tenantPath = session.isDemo ? "/demo" : `/u/${session.weddingSlug}`;
    const invitationBase = rawBaseUrl.endsWith(tenantPath)
      ? rawBaseUrl
      : `${rawBaseUrl}${tenantPath}`;

    const summary = buildEventSummary(config);
    const client = new WaGatewayClient(creds, {
      timeoutMs: 30_000,
      maxRetries: 1,
      originDomain: resolveOriginDomain(request, url),
    });
    const insertStmt = db.prepare(`
      INSERT INTO wa_invitations
        (wedding_id, guest_name, phone, address, invitation_url, job_id, reference_id, status, error_message, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
          session.weddingId,
          guestName || "(Tanpa Nama)",
          item?.phone || "-",
          address,
          invitationBase,
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

      const guestCode = syncBroadcastedGuestRecords(
        session.weddingId,
        guestName,
        phone,
        address,
        nowIso
      );
      const invitationUrl = `${invitationBase}?to=${encodeURIComponent(guestName)}${guestCode ? `&code=${encodeURIComponent(guestCode)}` : ""}`;
      const referenceId = `WED-INV-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`;
      const pdfBase64 = body.attachPdf
        ? cleanBase64Payload(item?.pdfBase64)
        : "";
      const qrBase64 = body.attachQr ? cleanBase64Payload(item?.qrBase64) : "";
      const templateVariables = {
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
      };

      try {
        // 1. Kirim pesan teks undangan (template wedding_undangan_tamu) terlebih dahulu
        //    agar isi undangan & tautan digital selalu diterima secara utuh.
        const res = await client.sendMessage({
          templateCode: WA_TEMPLATE_CODES.INVITATION,
          recipient: phone,
          variables: templateVariables,
          media: null,
          referenceId,
        });

        const attachmentWarnings: string[] = [];

        // 2. Lampiran 1: Dokumen PDF Surat Undangan (4 halaman)
        if (pdfBase64) {
          const pdfMedia: WaMedia = {
            jenis: "dokumen",
            url: pdfBase64,
            caption: `Surat Undangan Pernikahan untuk ${sanitizeWaVariable(guestName, "Bapak/Ibu")}`,
          };
          try {
            await client.sendMessage({
              templateCode: WA_TEMPLATE_CODES.INVITATION,
              recipient: phone,
              variables: templateVariables,
              media: pdfMedia,
              referenceId: `${referenceId}-pdf`,
            });
          } catch (pdfErr) {
            const pdfMsg =
              pdfErr instanceof WaGatewayError
                ? pdfErr.pesan
                : pdfErr instanceof Error
                  ? pdfErr.message
                  : "Gagal mengirim lampiran PDF";
            attachmentWarnings.push(`PDF gagal: ${pdfMsg}`);
          }
        }

        // 3. Lampiran 2: Gambar Kartu QR Tamu untuk Check-In Hari H
        if (qrBase64) {
          const qrMedia: WaMedia = {
            jenis: "gambar",
            url: qrBase64,
            caption: `Kartu QR Tamu untuk ${sanitizeWaVariable(guestName, "Bapak/Ibu")} — tunjukkan saat Check-In di meja penerima tamu.`,
          };
          try {
            await client.sendMessage({
              templateCode: WA_TEMPLATE_CODES.INVITATION,
              recipient: phone,
              variables: templateVariables,
              media: qrMedia,
              referenceId: `${referenceId}-qr`,
            });
          } catch (qrErr) {
            const qrMsg =
              qrErr instanceof WaGatewayError
                ? qrErr.pesan
                : qrErr instanceof Error
                  ? qrErr.message
                  : "Gagal mengirim lampiran QR";
            attachmentWarnings.push(`QR gagal: ${qrMsg}`);
          }
        }

        const warningText =
          attachmentWarnings.length > 0
            ? `Teks terkirim, namun ${attachmentWarnings.join("; ")}`
            : "";

        const inserted = insertStmt.run(
          session.weddingId,
          guestName,
          phone,
          address,
          invitationUrl,
          res.job_id || "",
          referenceId,
          res.status || "queued",
          warningText,
          nowIso,
          nowIso
        );
        results.push({
          id: Number(inserted.lastInsertRowid),
          guest_name: guestName,
          phone,
          status: res.status || "queued",
          job_id: res.job_id || "",
          error_message: warningText,
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
          session.weddingId,
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

    if (ids.length === 0 || ids.length > 200) {
      return new Response(JSON.stringify({ error: "Daftar ID tidak valid." }), {
        status: 400,
        headers: JSON_HEADERS,
      });
    }

    const placeholders = ids.map(() => "?").join(",");
    db.prepare(
      `DELETE FROM wa_invitations WHERE wedding_id = ? AND id IN (${placeholders})`
    ).run(session.weddingId, ...ids);
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
