import crypto from "node:crypto";

const TOLERANSI_DETIK = 300;
const RETENSI_MS = (TOLERANSI_DETIK * 2 + 60) * 1000;
const tandaTerpakai = new Map<string, number>();

function bersihkanKedaluwarsa(sekarangMs: number): void {
  for (const [kunci, batas] of tandaTerpakai.entries()) {
    if (batas <= sekarangMs) {
      tandaTerpakai.delete(kunci);
    }
  }
}

export function resetReplayUntukTes(): void {
  tandaTerpakai.clear();
}

export interface HasilVerifikasiHMAC {
  sah: boolean;
  alasan?: string;
}

export function verifikasiHMACv2(
  request: Request,
  keyID: string,
  secret: string,
  body = "",
  sekarangMs = Date.now(),
): HasilVerifikasiHMAC {
  const hdrKey = request.headers.get("x-api-key") ?? "";
  const hdrSig = request.headers.get("x-signature") ?? "";
  const hdrTs = request.headers.get("x-timestamp") ?? "";
  const hdrNonce = request.headers.get("x-nonce") ?? "";
  const hdrVer = request.headers.get("x-signature-version") ?? "";

  if (hdrVer !== "2" || !hdrKey || !hdrSig || hdrNonce.length < 8 || hdrNonce.length > 64) {
    return { sah: false, alasan: "header autentikasi tidak lengkap" };
  }
  const keyBuf = Buffer.from(keyID, "utf8");
  const hdrKeyBuf = Buffer.from(hdrKey, "utf8");
  if (keyBuf.length !== hdrKeyBuf.length || !crypto.timingSafeEqual(keyBuf, hdrKeyBuf)) {
    return { sah: false, alasan: "API key tidak valid" };
  }
  if (!/^\d+$/.test(hdrTs)) {
    return { sah: false, alasan: "timestamp tidak valid" };
  }
  const ts = Number.parseInt(hdrTs, 10);
  const sekarangDetik = Math.floor(sekarangMs / 1000);
  if (Math.abs(sekarangDetik - ts) > TOLERANSI_DETIK) {
    return { sah: false, alasan: "timestamp kedaluwarsa" };
  }

  const parsed = new URL(request.url);
  const requestURI = parsed.pathname + parsed.search;
  const bodyHash = crypto.createHash("sha256").update(body, "utf8").digest("hex");
  const kanonik = `${request.method.toUpperCase()}\n${requestURI}\n${hdrTs}\n${hdrNonce}\n${bodyHash}`;
  const expected = crypto.createHmac("sha256", secret).update(kanonik, "utf8").digest("hex");

  const expBuf = Buffer.from(expected, "utf8");
  const sigBuf = Buffer.from(hdrSig, "utf8");
  if (expBuf.length !== sigBuf.length || !crypto.timingSafeEqual(expBuf, sigBuf)) {
    return { sah: false, alasan: "signature tidak valid" };
  }

  bersihkanKedaluwarsa(sekarangMs);
  const kunciReplay = crypto.createHash("sha256").update(hdrSig, "utf8").digest("hex");
  if (tandaTerpakai.has(kunciReplay)) {
    return { sah: false, alasan: "signature sudah pernah dipakai" };
  }
  tandaTerpakai.set(kunciReplay, sekarangMs + RETENSI_MS);

  return { sah: true };
}
