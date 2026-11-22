import type { APIRoute } from "astro";
import { getAuthSession } from "../../../lib/auth";
import db, { getConfig } from "../../../lib/db";
import {
  WaGatewayClient,
  getWaCredentials,
  resolveOriginDomain,
} from "../../../lib/whatsapp";

const JSON_HEADERS = {
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
};

export const POST: APIRoute = async ({ request, cookies, url }) => {
  const session = getAuthSession(cookies);
  if (!session) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: JSON_HEADERS,
    });
  }

  try {
    const config = getConfig(session.weddingId);
    const creds = getWaCredentials(config);
    if (!creds) {
      return new Response(
        JSON.stringify({ error: "Konfigurasi WhatsApp Gateway belum lengkap." }),
        { status: 400, headers: JSON_HEADERS }
      );
    }

    const pending = db
      .prepare(
        `SELECT id, job_id FROM wa_invitations
         WHERE wedding_id = ? AND job_id != '' AND status IN ('queued', 'processing', 'sent', 'delivered')
         ORDER BY id DESC LIMIT 50`
      )
      .all(session.weddingId) as Array<{ id: number; job_id: string }>;

    const client = new WaGatewayClient(creds, {
      timeoutMs: 10_000,
      maxRetries: 0,
      originDomain: resolveOriginDomain(request, url),
    });
    const updateStmt = db.prepare(
      "UPDATE wa_invitations SET status = ?, error_message = ?, updated_at = ? WHERE id = ? AND wedding_id = ?"
    );

    let updated = 0;
    await Promise.allSettled(
      pending.map(async (row) => {
        const res = await client.getMessageStatus(row.job_id);
        updateStmt.run(
          res.status,
          res.keterangan_gagal || "",
          new Date().toISOString(),
          row.id,
          session.weddingId
        );
        updated++;
      })
    );

    const rows = db
      .prepare(
        "SELECT * FROM wa_invitations WHERE wedding_id = ? ORDER BY created_at DESC, id DESC LIMIT 300"
      )
      .all(session.weddingId);

    return new Response(
      JSON.stringify({ success: true, updated, invitations: rows }),
      { status: 200, headers: JSON_HEADERS }
    );
  } catch (err) {
    console.error("Refresh WA status error:", err);
    return new Response(
      JSON.stringify({ error: "Gagal memperbarui status pengiriman." }),
      { status: 500, headers: JSON_HEADERS }
    );
  }
};
