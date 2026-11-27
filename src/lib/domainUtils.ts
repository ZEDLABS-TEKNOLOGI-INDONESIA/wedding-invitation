export const DOMAIN_UTAMA = (
  process.env.DOMAIN_UTAMA ||
  process.env.PUBLIC_MAIN_DOMAIN ||
  "wedding.zedlabs.id"
)
  .trim()
  .toLowerCase();

const DOMAIN_RE =
  /^(?=.{4,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/;
const IPV4_RE = /^\d{1,3}(?:\.\d{1,3}){3}$/;

export function normalkanDomain(raw: string): string {
  let host = String(raw || "")
    .trim()
    .toLowerCase();
  if (!host) return "";

  host = host.split(",")[0]?.trim() || "";
  host = host.replace(/^https?:\/\//, "");
  host = host.split("/")[0] || "";
  host = host.split("?")[0] || "";
  host = host.split("#")[0] || "";
  if (host.startsWith("[")) {
    const end = host.indexOf("]");
    host = end > 0 ? host.slice(1, end) : host;
  } else {
    host = host.split(":")[0] || "";
  }
  host = host.replace(/\.+$/, "");
  return host;
}

export function apakahHostUtamaAtauLokal(host: string): boolean {
  const clean = normalkanDomain(host);
  if (!clean) return true;
  if (
    clean === DOMAIN_UTAMA ||
    clean === `www.${DOMAIN_UTAMA}` ||
    clean === "localhost" ||
    clean === "127.0.0.1" ||
    clean === "::1" ||
    clean.endsWith(".local")
  ) {
    return true;
  }
  if (IPV4_RE.test(clean)) return true;
  return false;
}

export function validasiDomainKustom(raw: string): {
  domain: string | null;
  error?: string;
} {
  const trimmed = String(raw || "").trim();
  if (!trimmed) {
    return { domain: null };
  }

  const host = normalkanDomain(trimmed);
  if (!host || !DOMAIN_RE.test(host) || IPV4_RE.test(host)) {
    return {
      domain: null,
      error:
        "Format domain tidak valid. Gunakan nama domain penuh, contoh: undangan.pasangan.id",
    };
  }

  if (
    host === DOMAIN_UTAMA ||
    host === `www.${DOMAIN_UTAMA}` ||
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local")
  ) {
    return {
      domain: null,
      error: `Domain utama (${DOMAIN_UTAMA}) atau host lokal tidak boleh dipakai sebagai domain kustom.`,
    };
  }

  return { domain: host };
}

export function ambilHostPermintaan(request: Request, url?: URL): string {
  const forwarded = request.headers.get("x-forwarded-host");
  if (forwarded) {
    const clean = normalkanDomain(forwarded);
    if (clean) return clean;
  }
  const hostHeader = request.headers.get("host");
  if (hostHeader) {
    const clean = normalkanDomain(hostHeader);
    if (clean) return clean;
  }
  if (url?.host) {
    return normalkanDomain(url.host);
  }
  return DOMAIN_UTAMA;
}
