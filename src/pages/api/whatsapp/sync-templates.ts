import type { APIRoute } from "astro";
import { isAdminAuthenticated } from "../../../lib/auth";
import { getConfig } from "../../../lib/db";
import {
  WEDDING_WA_TEMPLATES,
  WaGatewayClient,
  WaGatewayError,
  getWaCredentials,
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

    const client = new WaGatewayClient(creds, { timeoutMs: 15_000, maxRetries: 1 });
    const result = await client.syncTemplates(WEDDING_WA_TEMPLATES, {
      pratinjau: false,
      hapusYangTidakAda: false,
    });

    return new Response(JSON.stringify({ success: true, result }), {
      status: 200,
      headers: JSON_HEADERS,
    });
  } catch (err) {
    if (err instanceof WaGatewayError) {
      const detail =
        err.item.length > 0
          ? ` (${err.item.map((i) => `${i.kode}: ${i.pesan}`).join("; ")})`
          : "";
      return new Response(
        JSON.stringify({ error: `${err.pesan}${detail}` }),
        { status: 400, headers: JSON_HEADERS }
      );
    }
    return new Response(
      JSON.stringify({ error: "Gagal menyinkronkan template ke Gateway." }),
      { status: 500, headers: JSON_HEADERS }
    );
  }
};
