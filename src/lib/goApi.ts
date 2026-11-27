export function urlGoApi(): string {
  return (process.env.GO_API_URL || "").trim().replace(/\/+$/, "");
}

export function pakaiGoApi(): boolean {
  return urlGoApi().length > 0;
}

const HEADER_TERUSKAN = [
  "accept",
  "authorization",
  "content-type",
  "host",
  "x-forwarded-host",
  "x-forwarded-proto",
  "x-real-ip",
  "x-zedlabs-signature-version",
  "x-zedlabs-key-id",
  "x-zedlabs-timestamp",
  "x-zedlabs-nonce",
  "x-zedlabs-signature",
];

export async function teruskanKeGo(
  request: Request,
  targetPath: string
): Promise<Response> {
  const base = urlGoApi();
  if (!base) {
    return new Response(
      JSON.stringify({ error: "GO_API_URL belum dikonfigurasi." }),
      {
        status: 503,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
        },
      }
    );
  }

  const reqUrl = new URL(request.url);
  const pathClean = targetPath.startsWith("/") ? targetPath : `/${targetPath}`;
  const tujuan = `${base}${pathClean}${reqUrl.search}`;

  const headers = new Headers();
  for (const nama of HEADER_TERUSKAN) {
    const nilai = request.headers.get(nama);
    if (nilai) headers.set(nama, nilai);
  }
  if (!headers.has("x-forwarded-host")) {
    const h = request.headers.get("host") || reqUrl.host;
    if (h) headers.set("x-forwarded-host", h);
  }

  const init: RequestInit = {
    method: request.method,
    headers,
  };
  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = await request.arrayBuffer();
  }

  const resp = await fetch(tujuan, init);
  const body = await resp.arrayBuffer();
  return new Response(body, {
    status: resp.status,
    headers: {
      "Content-Type": resp.headers.get("content-type") || "application/json",
      "Cache-Control": "no-store",
    },
  });
}

export async function cekKesehatanGo(): Promise<boolean> {
  const base = urlGoApi();
  if (!base) return false;
  try {
    const resp = await fetch(`${base}/healthz`, {
      signal: AbortSignal.timeout(3000),
    });
    return resp.ok;
  } catch {
    return false;
  }
}
