import type { APIRoute } from "astro";
import { getAuthSession } from "../../../lib/auth";
import { getConfig } from "../../../lib/db";
import {
  WEDDING_WA_TEMPLATES,
  WaGatewayClient,
  formatWaGatewayError,
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

  let targetBaseUrl = "";
  try {
    const body = (await request.json().catch(() => ({}))) as {
      baseUrl?: string;
      keyId?: string;
      secret?: string;
    };
    const stored = getConfig(session.weddingId);
    targetBaseUrl = (body.baseUrl || stored.WA_BASE_URL || "").trim();
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

    const client = new WaGatewayClient(creds, {
      timeoutMs: 15_000,
      maxRetries: 1,
      originDomain: resolveOriginDomain(request, url),
    });
    const result = await client.syncTemplates(WEDDING_WA_TEMPLATES, {
      pratinjau: false,
      hapusYangTidakAda: false,
    });

    return new Response(JSON.stringify({ success: true, result }), {
      status: 200,
      headers: JSON_HEADERS,
    });
  } catch (err) {
    const formatted = formatWaGatewayError(err, {
      baseUrl: targetBaseUrl || getConfig().WA_BASE_URL,
      context: "sync",
    });
    return new Response(JSON.stringify({ error: formatted.message }), {
      status: formatted.status >= 500 ? formatted.status : 400,
      headers: JSON_HEADERS,
    });
  }
};
