import type { APIRoute } from "astro";
import QRCode from "qrcode";
import { isAdminAuthenticated } from "../../../lib/auth";
import { getConfig, setConfig } from "../../../lib/db";
import {
  WEDDING_WA_TEMPLATES,
  WaGatewayClient,
  WaGatewayError,
  getWaCredentials,
  normalizeWaPhone,
} from "../../../lib/whatsapp";

const JSON_HEADERS = {
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
};

function resolveBaseUrl(
  config: Record<string, string>,
  overrideBaseUrl?: string
): string {
  const raw = (overrideBaseUrl ?? config.WA_BASE_URL ?? "").trim();
  if (!raw) return "";
  try {
    const parsed = new URL(raw);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return "";
    return raw.replace(/\/+$/, "");
  } catch {
    return "";
  }
}

function resolveDomainAsal(request: Request, url: URL): string {
  const forwardedHost = (request.headers.get("x-forwarded-host") || "")
    .split(",")[0]
    .trim();
  const host = (forwardedHost || request.headers.get("host") || url.hostname || "")
    .trim()
    .toLowerCase();
  if (!host) return "";
  // Buang port jika ada (contoh: 127.0.0.1:4321 -> 127.0.0.1)
  if (host.startsWith("[")) {
    const end = host.indexOf("]");
    return end > 0 ? host.slice(1, end) : host;
  }
  const idx = host.indexOf(":");
  return idx >= 0 ? host.slice(0, idx) : host;
}

async function ensureCredentialsOrAutoRegister(
  config: Record<string, string>,
  overrides?: {
    baseUrl?: string;
    keyId?: string;
    secret?: string;
    domainAsal?: string;
  }
): Promise<{
  creds: { baseUrl: string; keyId: string; secret: string };
  autoRegistered: boolean;
}> {
  const existing = getWaCredentials(config, overrides);
  if (existing) {
    return { creds: existing, autoRegistered: false };
  }

  const baseUrl = resolveBaseUrl(config, overrides?.baseUrl);
  if (!baseUrl) {
    throw new WaGatewayError(
      400,
      "URL WhatsApp Gateway wajib diisi terlebih dahulu (contoh: https://whatsapp.zedlabs.id)."
    );
  }

  const bride = config.BRIDE_NICKNAME || "Mempelai Wanita";
  const groom = config.GROOM_NICKNAME || "Mempelai Pria";
  const namaAkun = `Undangan ${bride} & ${groom}`.slice(0, 80);

  const created = await WaGatewayClient.registerPersonalAccount(baseUrl, {
    namaAplikasi: "Wedding Invitation",
    namaAkun,
    namaApiKey: "Wedding Invitation",
    domainAsal: overrides?.domainAsal,
  });

  setConfig("WA_BASE_URL", baseUrl);
  setConfig("WA_API_KEY", created.key_id);
  setConfig("WA_API_SECRET", created.secret);

  const creds = {
    baseUrl,
    keyId: created.key_id,
    secret: created.secret,
  };

  // Langsung sinkronkan 5 template undangan pernikahan agar akun siap pakai
  try {
    const client = new WaGatewayClient(creds, { timeoutMs: 15_000, maxRetries: 1 });
    await client.syncTemplates(WEDDING_WA_TEMPLATES);
  } catch {
    // Non-fatal: admin tetap bisa klik Sinkron Template nanti
  }

  return { creds, autoRegistered: true };
}

export const GET: APIRoute = async ({ cookies, url }) => {
  if (!isAdminAuthenticated(cookies)) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: JSON_HEADERS,
    });
  }

  try {
    const config = getConfig();
    const creds = getWaCredentials(config);
    if (!creds) {
      return new Response(
        JSON.stringify({
          configured: false,
          hasBaseUrl: Boolean(resolveBaseUrl(config)),
          sessions: [],
        }),
        { status: 200, headers: JSON_HEADERS }
      );
    }

    const client = new WaGatewayClient(creds, { timeoutMs: 15_000, maxRetries: 0 });
    const sesiId = (url.searchParams.get("sesi_id") || "").trim();

    if (sesiId) {
      const qr = await client.getSessionQr(sesiId);
      let qrDataUrl = "";
      if (qr.kode) {
        qrDataUrl = await QRCode.toDataURL(qr.kode, {
          width: 280,
          margin: 2,
          errorCorrectionLevel: "M",
        });
      }
      return new Response(
        JSON.stringify({
          ...qr,
          qrDataUrl,
        }),
        { status: 200, headers: JSON_HEADERS }
      );
    }

    const sessions = await client.listSessions();
    return new Response(
      JSON.stringify({
        configured: true,
        hasBaseUrl: true,
        sessions: Array.isArray(sessions) ? sessions : [],
      }),
      { status: 200, headers: JSON_HEADERS }
    );
  } catch (err) {
    const msg =
      err instanceof WaGatewayError
        ? err.pesan
        : err instanceof Error
          ? err.message
          : "Gagal memuat daftar nomor WhatsApp dari Gateway.";
    return new Response(JSON.stringify({ error: msg }), {
      status: err instanceof WaGatewayError ? err.status : 502,
      headers: JSON_HEADERS,
    });
  }
};

export const POST: APIRoute = async ({ request, cookies, url }) => {
  if (!isAdminAuthenticated(cookies)) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: JSON_HEADERS,
    });
  }

  try {
    const domainAsal = resolveDomainAsal(request, url);
    const body = (await request.json().catch(() => ({}))) as {
      action?: string;
      baseUrl?: string;
      keyId?: string;
      secret?: string;
      nama?: string;
      phone?: string;
      sesiId?: string;
    };

    const config = getConfig();
    const action = body.action || "";

    if (action === "auto_register") {
      const baseUrl = resolveBaseUrl(config, body.baseUrl);
      if (!baseUrl) {
        return new Response(
          JSON.stringify({
            error: "URL WhatsApp Gateway wajib diisi terlebih dahulu.",
          }),
          { status: 400, headers: JSON_HEADERS }
        );
      }

      const bride = config.BRIDE_NICKNAME || "Mempelai Wanita";
      const groom = config.GROOM_NICKNAME || "Mempelai Pria";
      const namaAkun =
        (body.nama || "").trim().slice(0, 80) ||
        `Undangan ${bride} & ${groom}`.slice(0, 80);

      const created = await WaGatewayClient.registerPersonalAccount(baseUrl, {
        namaAplikasi: "Wedding Invitation",
        namaAkun,
        namaApiKey: "Wedding Invitation",
        domainAsal,
      });

      setConfig("WA_BASE_URL", baseUrl);
      setConfig("WA_API_KEY", created.key_id);
      setConfig("WA_API_SECRET", created.secret);

      let synced = false;
      try {
        const client = new WaGatewayClient(
          { baseUrl, keyId: created.key_id, secret: created.secret },
          { timeoutMs: 15_000, maxRetries: 1 }
        );
        await client.syncTemplates(WEDDING_WA_TEMPLATES);
        synced = true;
      } catch {
        synced = false;
      }

      return new Response(
        JSON.stringify({
          success: true,
          akun_id: created.akun_id,
          nama_akun: created.nama_akun,
          key_id: created.key_id,
          secret: created.secret,
          templates_synced: synced,
        }),
        { status: 201, headers: JSON_HEADERS }
      );
    }

    if (action === "start_qr") {
      const { creds, autoRegistered } = await ensureCredentialsOrAutoRegister(
        config,
        {
          baseUrl: body.baseUrl,
          keyId: body.keyId,
          secret: body.secret,
          domainAsal,
        }
      );
      const client = new WaGatewayClient(creds, {
        timeoutMs: 20_000,
        maxRetries: 0,
      });
      const label =
        (body.nama || "").trim().slice(0, 60) || "Nomor Undangan Utama";
      const started = await client.startSessionQr(label);
      return new Response(
        JSON.stringify({
          success: true,
          sesi_id: started.sesi_id,
          autoRegistered,
          ...(autoRegistered
            ? { key_id: creds.keyId, secret: creds.secret }
            : {}),
        }),
        { status: 202, headers: JSON_HEADERS }
      );
    }

    if (action === "start_pairing") {
      const phone = normalizeWaPhone(body.phone || "");
      if (!phone) {
        return new Response(
          JSON.stringify({
            error: "Format nomor WhatsApp tidak valid (contoh: 081234567890).",
          }),
          { status: 400, headers: JSON_HEADERS }
        );
      }
      const { creds, autoRegistered } = await ensureCredentialsOrAutoRegister(
        config,
        {
          baseUrl: body.baseUrl,
          keyId: body.keyId,
          secret: body.secret,
          domainAsal,
        }
      );
      const client = new WaGatewayClient(creds, {
        timeoutMs: 20_000,
        maxRetries: 0,
      });
      const label =
        (body.nama || "").trim().slice(0, 60) || "Nomor Undangan Utama";
      const paired = await client.startSessionPairing(phone, label);
      return new Response(
        JSON.stringify({
          success: true,
          sesi_id: paired.sesi_id,
          kode_pairing: paired.kode_pairing,
          autoRegistered,
          ...(autoRegistered
            ? { key_id: creds.keyId, secret: creds.secret }
            : {}),
        }),
        { status: 202, headers: JSON_HEADERS }
      );
    }

    if (action === "logout" || action === "delete") {
      const sesiId = (body.sesiId || "").trim();
      if (!sesiId) {
        return new Response(
          JSON.stringify({ error: "ID sesi wajib diisi." }),
          { status: 400, headers: JSON_HEADERS }
        );
      }
      const creds = getWaCredentials(config, {
        baseUrl: body.baseUrl,
        keyId: body.keyId,
        secret: body.secret,
      });
      if (!creds) {
        return new Response(
          JSON.stringify({ error: "Kredensial WhatsApp Gateway belum diatur." }),
          { status: 400, headers: JSON_HEADERS }
        );
      }
      const client = new WaGatewayClient(creds, {
        timeoutMs: 15_000,
        maxRetries: 0,
      });
      if (action === "logout") {
        await client.logoutSession(sesiId);
      } else {
        await client.deleteSession(sesiId);
      }
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: JSON_HEADERS,
      });
    }

    return new Response(JSON.stringify({ error: "Aksi tidak dikenali." }), {
      status: 400,
      headers: JSON_HEADERS,
    });
  } catch (err) {
    const msg =
      err instanceof WaGatewayError
        ? err.pesan
        : err instanceof Error
          ? err.message
          : "Terjadi kesalahan saat menghubungi WhatsApp Gateway.";
    return new Response(JSON.stringify({ error: msg }), {
      status: err instanceof WaGatewayError ? err.status : 502,
      headers: JSON_HEADERS,
    });
  }
};
