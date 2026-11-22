import type { APIRoute } from "astro";
import { isAdminAuthenticated } from "../../../lib/auth";
import { getConfig } from "../../../lib/db";
import {
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
            "URL Gateway, API Key, dan Secret WhatsApp wajib diisi dengan benar.",
        }),
        { status: 400, headers: JSON_HEADERS }
      );
    }

    const client = new WaGatewayClient(creds, { timeoutMs: 12_000, maxRetries: 0 });
    const result = await client.ping();

    return new Response(JSON.stringify({ success: true, ...result }), {
      status: 200,
      headers: JSON_HEADERS,
    });
  } catch (err) {
    const msg =
      err instanceof WaGatewayError
        ? `${err.pesan} (HTTP ${err.status})`
        : err instanceof Error
          ? err.message
          : "Gagal terhubung ke WhatsApp Gateway.";
    return new Response(JSON.stringify({ error: msg }), {
      status: 400,
      headers: JSON_HEADERS,
    });
  }
};
