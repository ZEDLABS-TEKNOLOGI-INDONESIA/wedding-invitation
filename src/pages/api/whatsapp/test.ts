import type { APIRoute } from "astro";
import { isAdminAuthenticated } from "../../../lib/auth";
import { getConfig } from "../../../lib/db";
import {
  WA_TEMPLATE_CODES,
  WaGatewayClient,
  WaGatewayError,
  getWaCredentials,
  normalizeWaPhone,
  parseAdminWaNumbers,
} from "../../../lib/whatsapp";

const JSON_HEADERS = {
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
};

export const POST: APIRoute = async ({ request, cookies }) => {
  if (!isAdminAuthenticated(cookies)) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: JSON_HEADERS,
    });
  }

  try {
    const body = (await request.json().catch(() => ({}))) as {
      baseUrl?: string;
      keyId?: string;
      secret?: string;
      recipient?: string;
    };
    const stored = getConfig();
    const creds = getWaCredentials(stored, {
      baseUrl: body.baseUrl,
      keyId: body.keyId,
      secret: body.secret,
    });

    if (!creds) {
      return new Response(
        JSON.stringify({
          error:
            "URL Gateway, API Key, dan Secret WhatsApp wajib diisi terlebih dahulu.",
        }),
        { status: 400, headers: JSON_HEADERS }
      );
    }

    const fallbackAdmins = parseAdminWaNumbers(
      body.recipient || stored.WA_ADMIN_NUMBERS
    );
    const target = body.recipient
      ? normalizeWaPhone(body.recipient) || fallbackAdmins[0] || ""
      : fallbackAdmins[0] || "";

    if (!target) {
      return new Response(
        JSON.stringify({
          error: "Nomor WhatsApp tujuan (atau Nomor WA Admin) belum diisi.",
        }),
        { status: 400, headers: JSON_HEADERS }
      );
    }

    const client = new WaGatewayClient(creds, { timeoutMs: 15_000, maxRetries: 1 });
    const job = await client.sendMessage({
      templateCode: WA_TEMPLATE_CODES.ADMIN_RSVP,
      recipient: target,
      variables: {
        aksi: "uji coba",
        nama_tamu: "Tamu Uji Coba",
        status_kehadiran: "Hadir",
        jumlah_tamu: "2 orang",
        kontak: target,
        pesan: "Ini adalah pesan uji coba integrasi WhatsApp Gateway.",
      },
      referenceId: `WED-TEST-${Date.now()}`,
    });

    return new Response(
      JSON.stringify({ success: true, recipient: target, ...job }),
      { status: 200, headers: JSON_HEADERS }
    );
  } catch (err) {
    if (err instanceof WaGatewayError) {
      return new Response(
        JSON.stringify({
          error:
            err.status === 403
              ? "Template belum tersinkron dengan API key ini. Klik 'Sinkron Template' terlebih dahulu."
              : `${err.pesan} (HTTP ${err.status})`,
        }),
        { status: 400, headers: JSON_HEADERS }
      );
    }
    return new Response(
      JSON.stringify({ error: "Gagal mengirim pesan tes WhatsApp." }),
      { status: 500, headers: JSON_HEADERS }
    );
  }
};
