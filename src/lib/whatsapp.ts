import { createHash, createHmac, randomBytes } from "node:crypto";

export interface WaMedia {
  jenis: "dokumen" | "gambar" | "video" | "link" | "kontak";
  url?: string;
  caption?: string;
  nama_kontak?: string;
  nomor_kontak?: string;
}

export interface WaTemplateDef {
  kategori: string;
  prioritas: "High" | "Medium" | "Low";
  varian: string[];
  variabel_wajib: string[];
}

export interface WaGatewayCredentials {
  baseUrl: string;
  keyId: string;
  secret: string;
}

export interface WaSyncResult {
  template_ditambah: number;
  template_diperbarui: number;
  tidak_berubah: number;
  dikaitkan: number;
  dihapus: number;
  terkait_key_lain: string[];
  kode_ditambah: string[];
  kode_diperbarui: string[];
  kode_dihapus: string[];
  kode_dikaitkan: string[];
  dipertahankan: string[];
  pratinjau: boolean;
}

export interface WaPingResult {
  status: string;
  instansi_id: string;
  jumlah_sesi_ready: number;
}

export interface WaMessageStatusResult {
  job_id: string;
  status: "queued" | "processing" | "sent" | "delivered" | "read" | "failed";
  waktu_antre: string;
  waktu_kirim: string;
  keterangan_gagal: string;
}

export interface WaSessionItem {
  id: string;
  nomor?: string;
  nama?: string;
  status: string;
  metode_auth?: string;
  label_warmup?: string;
}

export interface WaSessionQrResult {
  kode?: string;
  status: string;
  sesi_status: string;
  proses_berjalan: boolean;
  alasan_gagal?: string;
}

export interface WaPersonalAccountResult {
  akun_id: string;
  instansi_id: string;
  nama_akun: string;
  key_id: string;
  secret: string;
}

export class WaGatewayError extends Error {
  status: number;
  pesan: string;
  item: Array<{ kode: string; pesan: string }>;

  constructor(
    status: number,
    pesan: string,
    item: Array<{ kode: string; pesan: string }> = []
  ) {
    super(`WhatsApp Gateway (${status}): ${pesan}`);
    this.name = "WaGatewayError";
    this.status = status;
    this.pesan = pesan;
    this.item = item;
  }
}

export type WaErrorContext =
  | "register"
  | "session"
  | "ping"
  | "sync"
  | "send"
  | "general";

function extractGatewayHost(baseUrl?: string): string {
  if (!baseUrl) return "WhatsApp Gateway";
  try {
    return new URL(baseUrl).host || baseUrl;
  } catch {
    return baseUrl;
  }
}

function cleanRawHttpText(text: string, status: number): string {
  const trimmed = text.trim();
  if (!trimmed) return `HTTP ${status}`;
  if (/<html[\s>]|<!doctype/i.test(trimmed)) {
    return `Server mengembalikan respons HTML (HTTP ${status})`;
  }
  return trimmed.slice(0, 240);
}

/**
 * Mengubah galat jaringan (Node undici "fetch failed"), timeout, SSL, CORS,
 * pembatasan domain, atau galat HTTP dari WhatsApp Gateway menjadi pesan
 * peringatan bahasa Indonesia yang jelas & actionable.
 */
export function formatWaGatewayError(
  err: unknown,
  options?: { baseUrl?: string; context?: WaErrorContext }
): { status: number; message: string } {
  const host = extractGatewayHost(options?.baseUrl);
  const ctx = options?.context ?? "general";

  if (err instanceof WaGatewayError) {
    const rawMsg = (err.pesan || "").trim();
    const lower = rawMsg.toLowerCase();
    const detail =
      err.item.length > 0
        ? ` (${err.item.map((i) => `${i.kode}: ${i.pesan}`).join("; ")})`
        : "";

    if (err.status === 401) {
      return {
        status: 401,
        message:
          "Autentikasi API Key / HMAC Secret ditolak oleh WhatsApp Gateway (HTTP 401). Pastikan API Key & Secret cocok atau daftarkan akun otomatis kembali.",
      };
    }

    if (err.status === 403) {
      if (
        lower.includes("domain") ||
        lower.includes("asal") ||
        lower.includes("belum dibuka") ||
        lower.includes("tidak diizinkan") ||
        lower.includes("dinonaktifkan") ||
        lower.includes("cors") ||
        lower.includes("origin")
      ) {
        return {
          status: 403,
          message: `Pembatasan domain/CORS dari WhatsApp Gateway (HTTP 403): ${rawMsg}. Tambahkan domain atau IP aplikasi ini di menu Superadmin → Domain Integrasi (atau CORS_ORIGINS) pada ${host}.`,
        };
      }
      if (ctx === "send") {
        return {
          status: 403,
          message:
            "Template belum tersinkron dengan API Key ini (HTTP 403). Klik 'Sinkron 5 Template ke Gateway' terlebih dahulu.",
        };
      }
      return {
        status: 403,
        message: `Akses ditolak oleh WhatsApp Gateway (HTTP 403): ${rawMsg || "Periksa izin domain/CORS dan status akun instansi."}`,
      };
    }

    if (err.status === 404) {
      if (ctx === "register") {
        return {
          status: 404,
          message: `Endpoint pendaftaran akun mandiri tidak ditemukan di ${host} (HTTP 404). Pastikan server WhatsApp Gateway sudah diperbarui (make up) ke versi terbaru.`,
        };
      }
      return {
        status: 404,
        message: `Data atau endpoint tidak ditemukan di WhatsApp Gateway (HTTP 404): ${rawMsg || "Periksa URL Gateway."}`,
      };
    }

    if (err.status === 409) {
      return {
        status: 409,
        message: `Konflik data di WhatsApp Gateway (HTTP 409): ${rawMsg}.`,
      };
    }

    if (err.status === 429) {
      return {
        status: 429,
        message:
          "Terlalu banyak permintaan ke WhatsApp Gateway (HTTP 429 / rate limit). Tunggu beberapa saat lalu coba lagi.",
      };
    }

    if (err.status === 502 || err.status === 503 || err.status === 504) {
      return {
        status: err.status,
        message: `Server WhatsApp Gateway (${host}) sedang tidak tersedia atau sedang restart/deploy (HTTP ${err.status}). Tunggu beberapa detik lalu coba lagi.`,
      };
    }

    if (err.status >= 500) {
      if (ctx === "register") {
        return {
          status: err.status,
          message: `Gagal membuat akun/instansi otomatis di WhatsApp Gateway (HTTP ${err.status}): ${rawMsg || "Terjadi galat internal server."}`,
        };
      }
      return {
        status: err.status,
        message: `Terjadi galat internal di WhatsApp Gateway (HTTP ${err.status}): ${rawMsg}${detail}`,
      };
    }

    return {
      status: err.status || 400,
      message: `${rawMsg || `Permintaan ditolak (HTTP ${err.status})`}${detail}`,
    };
  }

  // Tangani galat jaringan Node.js / undici ("fetch failed") & timeout
  const e = err as {
    name?: string;
    message?: string;
    code?: string;
    cause?: { code?: string; message?: string; errno?: number };
  } | null;

  const code = String(e?.cause?.code || e?.code || "").toUpperCase();
  const msgLower = String(e?.message || "").toLowerCase();
  const causeLower = String(e?.cause?.message || "").toLowerCase();

  if (
    e?.name === "AbortError" ||
    e?.name === "TimeoutError" ||
    code === "ETIMEDOUT" ||
    code === "UND_ERR_CONNECT_TIMEOUT" ||
    code === "UND_ERR_HEADERS_TIMEOUT" ||
    msgLower.includes("timed out") ||
    msgLower.includes("aborted")
  ) {
    return {
      status: 504,
      message: `Waktu koneksi ke WhatsApp Gateway (${host}) habis (timeout). Pastikan server gateway aktif dan dapat dijangkau dari jaringan ini.`,
    };
  }

  if (code === "ENOTFOUND" || code === "EAI_AGAIN") {
    return {
      status: 502,
      message: `Domain WhatsApp Gateway (${host}) tidak ditemukan (DNS ${code}). Periksa kembali URL Gateway dan koneksi internet server.`,
    };
  }

  if (code === "ECONNREFUSED") {
    return {
      status: 502,
      message: `Koneksi ke WhatsApp Gateway (${host}) ditolak (ECONNREFUSED). Server gateway kemungkinan sedang mati, restart, atau port belum terbuka.`,
    };
  }

  if (
    code.startsWith("CERT_") ||
    code.startsWith("ERR_TLS_") ||
    code === "DEPTH_ZERO_SELF_SIGNED_CERT" ||
    code === "UNABLE_TO_VERIFY_LEAF_SIGNATURE" ||
    causeLower.includes("certificate") ||
    causeLower.includes("tls")
  ) {
    return {
      status: 502,
      message: `Sertifikat SSL/HTTPS WhatsApp Gateway (${host}) tidak valid atau bermasalah (${code || "TLS error"}). Periksa konfigurasi HTTPS/sertifikat di server gateway.`,
    };
  }

  if (
    code === "ECONNRESET" ||
    code === "EPIPE" ||
    code === "UND_ERR_SOCKET" ||
    code === "EHOSTUNREACH" ||
    code === "ENETUNREACH"
  ) {
    return {
      status: 502,
      message: `Koneksi ke WhatsApp Gateway (${host}) terputus (${code}). Server gateway mungkin sedang restart/deploy atau terblokir firewall.`,
    };
  }

  if (
    msgLower.includes("fetch failed") ||
    msgLower.includes("failed to fetch")
  ) {
    const extra = code ? ` (${code})` : "";
    return {
      status: 502,
      message: `Tidak dapat terhubung ke WhatsApp Gateway (${host})${extra}. Pastikan server aktif, URL benar, sertifikat HTTPS valid, dan tidak terblokir firewall/CORS.`,
    };
  }

  if (err instanceof Error && err.message.trim()) {
    return { status: 502, message: err.message.trim() };
  }

  return {
    status: 502,
    message: `Gagal menghubungi WhatsApp Gateway (${host}).`,
  };
}

export const WA_TEMPLATE_CODES = {
  INVITATION: "wedding_undangan_tamu",
  ADMIN_RSVP: "wedding_rsvp_admin",
  ADMIN_WISH: "wedding_ucapan_admin",
  GUEST_RSVP_CONFIRM: "wedding_rsvp_konfirmasi",
  GUEST_REMINDER_H1: "wedding_pengingat_h1",
} as const;

export const PLATFORM_OTP_TEMPLATE_CODE = "wedding_auth_otp";

export const PLATFORM_BILLING_TEMPLATE_CODES = {
  INVOICE_CREATED: "wedding_invoice_created",
  INVOICE_SUBMITTED: "wedding_invoice_submitted",
  INVOICE_PAID: "wedding_invoice_paid",
  INVOICE_REJECTED: "wedding_invoice_rejected",
} as const;

export const PLATFORM_WA_TEMPLATES: Record<string, WaTemplateDef> = {
  [PLATFORM_OTP_TEMPLATE_CODE]: {
    kategori: "Keamanan",
    prioritas: "High",
    variabel_wajib: ["kode_otp", "keperluan", "berlaku_menit"],
    varian: [
      "Kode verifikasi ({{keperluan}}) Anda adalah {{kode_otp}}. Kode ini berlaku selama {{berlaku_menit}} menit. Mohon jaga kerahasiaan kode ini dan jangan bagikan kepada siapa pun.",
      "Halo, berikut kode verifikasi akun untuk {{keperluan}}: {{kode_otp}}. Masa berlaku kode adalah {{berlaku_menit}} menit. Abaikan pesan ini jika Anda tidak merasa memintanya.",
      "Gunakan kode {{kode_otp}} untuk menyelesaikan proses {{keperluan}}. Kode berlaku {{berlaku_menit}} menit dan bersifat rahasia.",
    ],
  },
  [PLATFORM_BILLING_TEMPLATE_CODES.INVOICE_CREATED]: {
    kategori: "Tagihan",
    prioritas: "High",
    variabel_wajib: [
      "nomor_invoice",
      "nama_undangan",
      "nominal",
      "tambahan_kuota",
      "jatuh_tempo",
      "rekening_tujuan",
    ],
    varian: [
      "Tagihan penambahan kuota tamu {{nama_undangan}} telah terbit.\n\nNomor invoice: {{nomor_invoice}}\nTambahan kuota: {{tambahan_kuota}}\nTotal tagihan: {{nominal}}\nJatuh tempo: {{jatuh_tempo}}\nRekening tujuan: {{rekening_tujuan}}\n\nSilakan lakukan transfer lalu unggah bukti bayar pada menu Kuota dan Tagihan di panel admin.",
      "Halo, invoice {{nomor_invoice}} untuk undangan {{nama_undangan}} sudah dibuat.\n\nRincian tagihan:\nKuota tambahan: {{tambahan_kuota}}\nJumlah bayar: {{nominal}}\nBatas waktu: {{jatuh_tempo}}\nTujuan transfer: {{rekening_tujuan}}\n\nSetelah transfer, mohon unggah bukti pembayaran agar dapat diverifikasi admin.",
    ],
  },
  [PLATFORM_BILLING_TEMPLATE_CODES.INVOICE_SUBMITTED]: {
    kategori: "Tagihan",
    prioritas: "High",
    variabel_wajib: [
      "nomor_invoice",
      "nama_undangan",
      "nominal",
      "nama_pengirim",
      "bank_pengirim",
      "keterangan",
    ],
    varian: [
      "Konfirmasi pembayaran diterima untuk invoice {{nomor_invoice}} ({{nama_undangan}}).\n\nNominal: {{nominal}}\nPengirim: {{nama_pengirim}} ({{bank_pengirim}})\nStatus: {{keterangan}}",
      "Bukti transfer untuk tagihan {{nomor_invoice}} milik {{nama_undangan}} telah diunggah.\n\nJumlah: {{nominal}}\nRekening pengirim: {{nama_pengirim}} - {{bank_pengirim}}\nKeterangan: {{keterangan}}",
    ],
  },
  [PLATFORM_BILLING_TEMPLATE_CODES.INVOICE_PAID]: {
    kategori: "Tagihan",
    prioritas: "High",
    variabel_wajib: [
      "nomor_invoice",
      "nama_undangan",
      "nominal",
      "kuota_baru",
      "tanggal_lunas",
    ],
    varian: [
      "Pembayaran invoice {{nomor_invoice}} untuk {{nama_undangan}} telah diverifikasi dan dinyatakan lunas.\n\nNominal: {{nominal}}\nKuota tamu aktif sekarang: {{kuota_baru}}\nTanggal lunas: {{tanggal_lunas}}\n\nTerima kasih telah menggunakan layanan kami.",
      "Halo, tagihan {{nomor_invoice}} ({{nama_undangan}}) sebesar {{nominal}} sudah lunas pada {{tanggal_lunas}}.\n\nKuota tamu undangan Anda kini aktif hingga {{kuota_baru}}. Invoice resmi dapat diunduh pada menu Kuota dan Tagihan.",
    ],
  },
  [PLATFORM_BILLING_TEMPLATE_CODES.INVOICE_REJECTED]: {
    kategori: "Tagihan",
    prioritas: "High",
    variabel_wajib: ["nomor_invoice", "nama_undangan", "nominal", "alasan"],
    varian: [
      "Bukti pembayaran untuk invoice {{nomor_invoice}} ({{nama_undangan}}) sebesar {{nominal}} belum dapat disetujui.\n\nAlasan penolakan: {{alasan}}\n\nSilakan periksa kembali lalu unggah ulang bukti transfer yang benar pada menu Kuota dan Tagihan.",
      "Mohon maaf, verifikasi bukti bayar tagihan {{nomor_invoice}} milik {{nama_undangan}} ({{nominal}}) ditolak.\n\nCatatan admin: {{alasan}}\n\nAnda dapat mengunggah ulang bukti pembayaran melalui halaman Kuota dan Tagihan.",
    ],
  },
};

// Seluruh template memenuhi aturan validator whatsapp-service:
// - 2-10 varian per template
// - tidak ada tanda seru berurutan (!!)
// - maksimal 1 link per pesan
// - rasio huruf kapital per kalimat <= 70%
// - seluruh variabel_wajib selalu terisi non-kosong
export const WEDDING_WA_TEMPLATES: Record<string, WaTemplateDef> = {
  [WA_TEMPLATE_CODES.INVITATION]: {
    kategori: "Undangan",
    prioritas: "Low",
    variabel_wajib: [
      "nama_tamu",
      "mempelai",
      "tanggal_acara",
      "waktu_acara",
      "tempat_acara",
      "link_undangan",
    ],
    varian: [
      "Assalamu'alaikum {{nama_tamu}}.\n\nDengan memohon rahmat dan ridho Allah Subhanahu wa Ta'ala, kami mengundang Bapak/Ibu/Saudara/i untuk menghadiri acara pernikahan {{mempelai}} pada {{tanggal_acara}} pukul {{waktu_acara}} bertempat di {{tempat_acara}}.\n\nDetail acara dan konfirmasi kehadiran dapat dibuka melalui tautan berikut:\n{{link_undangan}}\n\nMerupakan kehormatan bagi kami apabila berkenan hadir dan memberikan doa restu.",
      "Halo {{nama_tamu}}, salam hangat dari kami.\n\nKami bermaksud mengundang Bapak/Ibu/Saudara/i untuk hadir dalam hari bahagia pernikahan {{mempelai}} pada {{tanggal_acara}} pukul {{waktu_acara}} di {{tempat_acara}}.\n\nSilakan buka undangan digital berikut untuk melihat lokasi acara dan konfirmasi kehadiran:\n{{link_undangan}}\n\nTerima kasih atas doa restu dan kehadirannya.",
      "Kepada yang terhormat {{nama_tamu}}.\n\nTanpa mengurangi rasa hormat, perkenankan kami mengundang Bapak/Ibu/Saudara/i untuk memberikan doa restu pada acara pernikahan {{mempelai}} yang diselenggarakan pada {{tanggal_acara}} pukul {{waktu_acara}} di {{tempat_acara}}.\n\nBuka undangan digital:\n{{link_undangan}}\n\nKami sangat menantikan kehadiran Bapak/Ibu/Saudara/i.",
    ],
  },
  [WA_TEMPLATE_CODES.ADMIN_RSVP]: {
    kategori: "Notifikasi",
    prioritas: "High",
    variabel_wajib: [
      "aksi",
      "nama_tamu",
      "status_kehadiran",
      "jumlah_tamu",
      "kontak",
      "pesan",
    ],
    varian: [
      "Notifikasi konfirmasi kehadiran ({{aksi}}).\n\nNama tamu: {{nama_tamu}}\nStatus: {{status_kehadiran}}\nJumlah tamu: {{jumlah_tamu}}\nKontak: {{kontak}}\nPesan: {{pesan}}",
      "Ada data konfirmasi kehadiran ({{aksi}}) dari undangan pernikahan.\n\nTamu: {{nama_tamu}}\nKehadiran: {{status_kehadiran}}\nJumlah: {{jumlah_tamu}}\nNomor kontak: {{kontak}}\nCatatan: {{pesan}}",
      "Pembaruan daftar tamu undangan ({{aksi}}).\n\nPengirim: {{nama_tamu}}\nStatus kehadiran: {{status_kehadiran}}\nRombongan: {{jumlah_tamu}}\nKontak: {{kontak}}\nPesan tamu: {{pesan}}",
    ],
  },
  [WA_TEMPLATE_CODES.ADMIN_WISH]: {
    kategori: "Notifikasi",
    prioritas: "Medium",
    variabel_wajib: ["aksi", "nama_pengirim", "ucapan"],
    varian: [
      "Notifikasi ucapan dan doa ({{aksi}}).\n\nDari: {{nama_pengirim}}\nUcapan: {{ucapan}}",
      "Ada kiriman ucapan dan doa ({{aksi}}) di buku tamu undangan.\n\nPengirim: {{nama_pengirim}}\nPesan doa: {{ucapan}}",
      "Kiriman doa terbaru di website undangan ({{aksi}}).\n\nNama: {{nama_pengirim}}\nIsi ucapan: {{ucapan}}",
    ],
  },
  [WA_TEMPLATE_CODES.GUEST_RSVP_CONFIRM]: {
    kategori: "Konfirmasi",
    prioritas: "Medium",
    variabel_wajib: [
      "nama_tamu",
      "mempelai",
      "status_kehadiran",
      "jumlah_tamu",
      "tanggal_acara",
      "tempat_acara",
    ],
    varian: [
      "Terima kasih {{nama_tamu}}, konfirmasi kehadiran Anda untuk pernikahan {{mempelai}} telah kami terima.\n\nStatus: {{status_kehadiran}}\nJumlah tamu: {{jumlah_tamu}}\nTanggal acara: {{tanggal_acara}}\nLokasi: {{tempat_acara}}\n\nSampai jumpa di hari bahagia kami.",
      "Halo {{nama_tamu}}, terima kasih telah mengisi konfirmasi kehadiran pernikahan {{mempelai}}.\n\nRincian konfirmasi Anda:\nStatus: {{status_kehadiran}}\nJumlah: {{jumlah_tamu}}\nJadwal: {{tanggal_acara}}\nTempat: {{tempat_acara}}\n\nTerima kasih atas doa restu Bapak/Ibu/Saudara/i.",
      "Konfirmasi kehadiran untuk {{nama_tamu}} pada pernikahan {{mempelai}} sudah tercatat.\n\nStatus kehadiran: {{status_kehadiran}}\nJumlah tamu: {{jumlah_tamu}}\nTanggal: {{tanggal_acara}}\nLokasi: {{tempat_acara}}\n\nKami sangat menghargai perhatian dan doa restu Anda.",
    ],
  },
  [WA_TEMPLATE_CODES.GUEST_REMINDER_H1]: {
    kategori: "Pengingat",
    prioritas: "Medium",
    variabel_wajib: [
      "nama_tamu",
      "mempelai",
      "tanggal_acara",
      "waktu_acara",
      "tempat_acara",
      "link_maps",
    ],
    varian: [
      "Assalamu'alaikum Bapak/Ibu/Saudara/i {{nama_tamu}}.\n\nDengan segala kerendahan hati, kami bermaksud mengingatkan bahwa esok hari merupakan hari bahagia pernikahan {{mempelai}} pada {{tanggal_acara}} pukul {{waktu_acara}} bertempat di {{tempat_acara}}.\n\nPetunjuk arah lokasi:\n{{link_maps}}\n\nMerupakan kehormatan bagi kami apabila Bapak/Ibu/Saudara/i berkenan hadir dan melimpahkan doa restu.",
      "Salam hormat kepada {{nama_tamu}}.\n\nMengingatkan kembali dengan penuh sukacita bahwa rangkaian acara pernikahan {{mempelai}} akan segera dilangsungkan pada {{tanggal_acara}} pukul {{waktu_acara}} di {{tempat_acara}}.\n\nTautan lokasi acara:\n{{link_maps}}\n\nSemoga perjalanan Bapak/Ibu/Saudara/i dilancarkan dan kami menantikan kehadiran serta doa restu yang tulus.",
      "Kepada yang terhormat {{nama_tamu}}.\n\nIzinkan kami mengingatkan kembali jadwal pernikahan {{mempelai}} yang insya Allah diselenggarakan pada {{tanggal_acara}} pukul {{waktu_acara}} di {{tempat_acara}}.\n\nAkses peta lokasi:\n{{link_maps}}\n\nTerima kasih atas perhatian dan doa restu Bapak/Ibu/Saudara/i.",
    ],
  },
};

export const signRequestV2 = (
  secret: string,
  method: string,
  requestUri: string,
  timestamp: string,
  nonce: string,
  body: string
): string => {
  const bodyHash = createHash("sha256").update(body).digest("hex");
  const canonical = `${method}\n${requestUri}\n${timestamp}\n${nonce}\n${bodyHash}`;
  return createHmac("sha256", secret).update(canonical).digest("hex");
};

export function resolveOriginDomain(request?: Request, url?: URL): string {
  const fromHeaders = request
    ? (request.headers.get("x-forwarded-host") || "").split(",")[0].trim() ||
      (request.headers.get("host") || "").trim()
    : "";
  const raw = (
    fromHeaders ||
    url?.hostname ||
    process.env.SITE_URL ||
    process.env.PUBLIC_SITE_URL ||
    process.env.HOST ||
    ""
  )
    .trim()
    .toLowerCase();
  if (!raw) return "";
  try {
    if (raw.includes("://")) {
      return new URL(raw).hostname.toLowerCase();
    }
  } catch {
    // lanjutkan strip port manual
  }
  if (raw.startsWith("[")) {
    const end = raw.indexOf("]");
    return end > 0 ? raw.slice(1, end) : raw;
  }
  const idx = raw.indexOf(":");
  return idx >= 0 ? raw.slice(0, idx) : raw;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export class WaGatewayClient {
  private readonly baseUrl: string;
  private readonly keyId: string;
  private readonly secret: string;
  private readonly timeoutMs: number;
  private readonly maxRetries: number;
  private readonly originDomain: string;

  constructor(
    creds: WaGatewayCredentials,
    options?: { timeoutMs?: number; maxRetries?: number; originDomain?: string }
  ) {
    this.baseUrl = creds.baseUrl.replace(/\/+$/, "");
    this.keyId = creds.keyId.trim();
    this.secret = creds.secret.trim();
    this.timeoutMs = options?.timeoutMs ?? 20_000;
    this.maxRetries = options?.maxRetries ?? 2;
    this.originDomain = (options?.originDomain ?? resolveOriginDomain()).trim();
  }

  async request<T = unknown>(
    method: string,
    path: string,
    body?: unknown
  ): Promise<T> {
    const rawBody = body === undefined ? "" : JSON.stringify(body);
    const url = new URL(this.baseUrl + path);
    const requestUri = url.pathname + url.search;
    let lastError: unknown;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      if (attempt > 0) await sleep(500 * 2 ** (attempt - 1));
      const ts = String(Math.floor(Date.now() / 1000));
      const nonce = randomBytes(12).toString("hex");
      const signature = signRequestV2(
        this.secret,
        method,
        requestUri,
        ts,
        nonce,
        rawBody
      );

      let res: Response;
      try {
        res = await fetch(url, {
          method,
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            "User-Agent": "wedding-invitation/1.0.0",
            ...(this.originDomain
              ? { "X-Origin-Domain": this.originDomain }
              : {}),
            "X-API-Key": this.keyId,
            "X-Signature-Version": "2",
            "X-Timestamp": ts,
            "X-Nonce": nonce,
            "X-Signature": signature,
          },
          body: rawBody === "" ? undefined : rawBody,
          signal: AbortSignal.timeout(this.timeoutMs),
        });
      } catch (err) {
        lastError = err;
        continue;
      }

      const text = await res.text();
      let data: any = null;
      try {
        data = text ? JSON.parse(text) : null;
      } catch {
        data = null;
      }

      if (res.ok) return data as T;

      const gatewayErr = new WaGatewayError(
        res.status,
        data?.error || cleanRawHttpText(text, res.status),
        Array.isArray(data?.galat) ? data.galat : []
      );
      lastError = gatewayErr;

      if (res.status !== 429 && res.status < 500) {
        throw gatewayErr;
      }
    }

    throw lastError instanceof Error
      ? lastError
      : new Error("Gagal terhubung ke WhatsApp Gateway.");
  }

  ping(): Promise<WaPingResult> {
    return this.request<WaPingResult>("GET", "/api/v1/ping");
  }

  syncTemplates(
    templat: Record<string, WaTemplateDef>,
    options?: { pratinjau?: boolean; hapusYangTidakAda?: boolean }
  ): Promise<WaSyncResult> {
    return this.request<WaSyncResult>(
      "POST",
      "/api/v1/integrasi/template/sinkron",
      {
        templat,
        pratinjau: options?.pratinjau ?? false,
        hapus_yang_tidak_ada: options?.hapusYangTidakAda ?? false,
      }
    );
  }

  sendMessage(params: {
    templateCode: string;
    recipient: string;
    variables: Record<string, string>;
    media?: WaMedia | null;
    referenceId?: string;
  }): Promise<{ job_id: string; status: string }> {
    return this.request("POST", "/api/v1/messages", {
      template_code: params.templateCode,
      recipient: params.recipient,
      variables: params.variables,
      media: params.media ?? null,
      ...(params.referenceId ? { reference_id: params.referenceId } : {}),
    });
  }

  getMessageStatus(jobId: string): Promise<WaMessageStatusResult> {
    return this.request<WaMessageStatusResult>(
      "GET",
      `/api/v1/messages/${encodeURIComponent(jobId)}`
    );
  }

  listSessions(): Promise<WaSessionItem[]> {
    return this.request<WaSessionItem[]>("GET", "/api/v1/integrasi/sesi");
  }

  startSessionQr(nama: string): Promise<{ sesi_id: string }> {
    return this.request<{ sesi_id: string }>(
      "POST",
      "/api/v1/integrasi/sesi/qr",
      { nama }
    );
  }

  getSessionQr(sesiId: string): Promise<WaSessionQrResult> {
    return this.request<WaSessionQrResult>(
      "GET",
      `/api/v1/integrasi/sesi/${encodeURIComponent(sesiId)}/qr`
    );
  }

  startSessionPairing(
    nomorTujuan: string,
    nama: string
  ): Promise<{ sesi_id: string; kode_pairing: string }> {
    return this.request<{ sesi_id: string; kode_pairing: string }>(
      "POST",
      "/api/v1/integrasi/sesi/pairing",
      { nomor_tujuan: nomorTujuan, nama }
    );
  }

  logoutSession(sesiId: string): Promise<{ status: string }> {
    return this.request<{ status: string }>(
      "POST",
      `/api/v1/integrasi/sesi/${encodeURIComponent(sesiId)}/logout`,
      {}
    );
  }

  deleteSession(sesiId: string): Promise<{ status: string }> {
    return this.request<{ status: string }>(
      "DELETE",
      `/api/v1/integrasi/sesi/${encodeURIComponent(sesiId)}`
    );
  }

  static async registerPersonalAccount(
    baseUrl: string,
    params: {
      namaAplikasi?: string;
      namaAkun?: string;
      namaApiKey?: string;
      domainAsal?: string;
    }
  ): Promise<WaPersonalAccountResult> {
    const cleanBase = baseUrl.trim().replace(/\/+$/, "");
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15_000);
    try {
      const res = await fetch(`${cleanBase}/api/v1/integrasi/akun-mandiri`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(params.domainAsal
            ? {
                "X-Origin-Domain": params.domainAsal,
                "X-Forwarded-Host": params.domainAsal,
              }
            : {}),
        },
        body: JSON.stringify({
          nama_aplikasi: params.namaAplikasi || "Wedding Management",
          nama_akun: params.namaAkun || "Undangan Pernikahan",
          nama_api_key: params.namaApiKey || "Wedding Management",
          ...(params.domainAsal ? { domain_asal: params.domainAsal } : {}),
        }),
        signal: controller.signal,
      });
      const text = await res.text();
      let data: Record<string, unknown> = {};
      try {
        data = text ? (JSON.parse(text) as Record<string, unknown>) : {};
      } catch {
        data = {};
      }
      if (!res.ok) {
        const msg =
          typeof data?.error === "string" && data.error.trim()
            ? data.error.trim()
            : cleanRawHttpText(text, res.status);
        throw new WaGatewayError(res.status, msg);
      }
      return data as unknown as WaPersonalAccountResult;
    } finally {
      clearTimeout(timer);
    }
  }
}

export const getWaCredentials = (
  config: Record<string, string>,
  overrides?: Partial<WaGatewayCredentials>
): WaGatewayCredentials | null => {
  const baseUrl = (overrides?.baseUrl ?? config.WA_BASE_URL ?? "").trim();
  const keyId = (overrides?.keyId ?? config.WA_API_KEY ?? "").trim();
  const secret = (overrides?.secret ?? config.WA_API_SECRET ?? "").trim();

  if (!baseUrl || !keyId || !secret) return null;
  try {
    const parsed = new URL(baseUrl);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:")
      return null;
  } catch {
    return null;
  }

  return { baseUrl, keyId, secret };
};

export const normalizeWaPhone = (raw: string): string => {
  const cleaned = raw.replace(/[^\d+]/g, "").trim();
  if (!cleaned) return "";
  const digits = cleaned.replace(/\D/g, "");
  if (digits.length < 9 || digits.length > 16) return "";
  if (digits.startsWith("0")) return `62${digits.slice(1)}`;
  return digits;
};

export const parseAdminWaNumbers = (raw: string | undefined): string[] => {
  if (!raw) return [];
  return Array.from(
    new Set(
      raw
        .split(/[,;\n]+/)
        .map((part) => normalizeWaPhone(part))
        .filter(Boolean)
    )
  );
};

const lowerExcessiveCaps = (sentence: string): string => {
  let letters = 0;
  let upper = 0;
  for (const ch of sentence) {
    if (ch >= "A" && ch <= "Z") {
      letters++;
      upper++;
    } else if (ch >= "a" && ch <= "z") {
      letters++;
    }
  }
  if (letters > 0 && upper / letters > 0.65) {
    const lower = sentence.toLowerCase();
    return lower.charAt(0).toUpperCase() + lower.slice(1);
  }
  return sentence;
};

// Menjaga teks variabel agar tidak ditolak validator anti-spam gateway
// (tanpa tanda seru berurutan, tanpa link tambahan, dan rasio kapital <= 70%).
export const sanitizeWaVariable = (
  value: string | undefined | null,
  fallback = "-",
  options?: { allowUrl?: boolean; maxLength?: number }
): string => {
  const raw = (value ?? "").replace(/[\r\n\t]+/g, " ").trim();
  if (!raw) return fallback;
  if (options?.allowUrl) {
    return raw.slice(0, options.maxLength ?? 500);
  }

  let cleaned = raw
    .replace(/!{2,}/g, "!")
    .replace(/https?:\/\/\S+/gi, "[tautan]")
    .replace(/\s{2,}/g, " ")
    .trim();

  cleaned = cleaned
    .split(/([.!?]+\s*)/)
    .map((segment, idx) =>
      idx % 2 === 0 ? lowerExcessiveCaps(segment) : segment
    )
    .join("");

  const maxLen = options?.maxLength ?? 400;
  if (cleaned.length > maxLen) {
    cleaned = cleaned.slice(0, maxLen - 3).trimEnd() + "...";
  }
  return cleaned || fallback;
};

const formatAttendanceLabel = (status: string): string => {
  switch (status) {
    case "hadir":
      return "Hadir";
    case "tidak_hadir":
      return "Tidak Hadir";
    case "ragu":
      return "Masih Ragu";
    default:
      return "Tercatat";
  }
};

export const buildEventSummary = (config: Record<string, string>) => {
  const bride = config.BRIDE_NICKNAME || "Mempelai Wanita";
  const groom = config.GROOM_NICKNAME || "Mempelai Pria";
  const mempelai = `${bride} & ${groom}`;
  const tanggal =
    [config.AKAD_DAY, config.AKAD_DATE].filter(Boolean).join(", ") ||
    config.RESEPSI_DATE ||
    "Hari Bahagia";
  const tz = config.EVENT_TIMEZONE || "WIB";
  const waktu =
    config.AKAD_START && config.AKAD_END
      ? `${config.AKAD_START} - ${config.AKAD_END} ${tz}`
      : config.RESEPSI_START && config.RESEPSI_END
        ? `${config.RESEPSI_START} - ${config.RESEPSI_END} ${tz}`
        : `Sesuai jadwal (${tz})`;
  const tempat =
    [config.VENUE_NAME, config.VENUE_ADDRESS].filter(Boolean).join(", ") ||
    "Lokasi Acara";
  return { mempelai, tanggal, waktu, tempat };
};

export const notifyAdminRsvpWa = async (
  config: Record<string, string>,
  payload: {
    id: number;
    actionType: "created" | "updated";
    guest_name: string;
    attendance: string;
    guest_count: number;
    phone: string;
    message: string;
  }
): Promise<void> => {
  if (config.WA_NOTIFY_ADMIN_RSVP !== "true") return;
  const creds = getWaCredentials(config);
  const recipients = parseAdminWaNumbers(config.WA_ADMIN_NUMBERS);
  if (!creds || recipients.length === 0) return;

  const client = new WaGatewayClient(creds, {
    timeoutMs: 10_000,
    maxRetries: 1,
  });
  const variables = {
    aksi: payload.actionType === "created" ? "baru" : "diperbarui",
    nama_tamu: sanitizeWaVariable(payload.guest_name, "Tamu", {
      maxLength: 100,
    }),
    status_kehadiran: formatAttendanceLabel(payload.attendance),
    jumlah_tamu:
      payload.attendance === "hadir" ? `${payload.guest_count} orang` : "-",
    kontak: sanitizeWaVariable(payload.phone, "-", { maxLength: 30 }),
    pesan: sanitizeWaVariable(payload.message, "-", { maxLength: 350 }),
  };

  const ts = Date.now();
  await Promise.allSettled(
    recipients.map((recipient, idx) =>
      client
        .sendMessage({
          templateCode: WA_TEMPLATE_CODES.ADMIN_RSVP,
          recipient,
          variables,
          referenceId: `WED-RSVP-ADM-${payload.id}-${idx}-${ts}`,
        })
        .catch((err) => {
          console.error(`Gagal kirim WA notif RSVP ke ${recipient}:`, err);
        })
    )
  );
};

export const sendGuestRsvpConfirmationWa = async (
  config: Record<string, string>,
  payload: {
    id: number;
    guest_name: string;
    attendance: string;
    guest_count: number;
    phone: string;
  }
): Promise<void> => {
  if (config.WA_AUTO_CONFIRM_GUEST !== "true") return;
  const creds = getWaCredentials(config);
  const recipient = normalizeWaPhone(payload.phone);
  if (!creds || !recipient) return;

  const client = new WaGatewayClient(creds, {
    timeoutMs: 10_000,
    maxRetries: 1,
  });
  const summary = buildEventSummary(config);
  const variables = {
    nama_tamu: sanitizeWaVariable(payload.guest_name, "Bapak/Ibu", {
      maxLength: 100,
    }),
    mempelai: sanitizeWaVariable(summary.mempelai, "Mempelai", {
      maxLength: 80,
    }),
    status_kehadiran: formatAttendanceLabel(payload.attendance),
    jumlah_tamu:
      payload.attendance === "hadir" ? `${payload.guest_count} orang` : "-",
    tanggal_acara: sanitizeWaVariable(summary.tanggal, "Hari Bahagia", {
      maxLength: 80,
    }),
    tempat_acara: sanitizeWaVariable(summary.tempat, "Lokasi Acara", {
      maxLength: 160,
    }),
  };

  try {
    await client.sendMessage({
      templateCode: WA_TEMPLATE_CODES.GUEST_RSVP_CONFIRM,
      recipient,
      variables,
      referenceId: `WED-RSVP-CONF-${payload.id}-${Date.now()}`,
    });
  } catch (err) {
    console.error(`Gagal kirim WA konfirmasi ke tamu ${recipient}:`, err);
  }
};

export const notifyAdminWishWa = async (
  config: Record<string, string>,
  payload: {
    id: number;
    actionType: "created" | "updated";
    name: string;
    message: string;
  }
): Promise<void> => {
  if (config.WA_NOTIFY_ADMIN_WISH !== "true") return;
  const creds = getWaCredentials(config);
  const recipients = parseAdminWaNumbers(config.WA_ADMIN_NUMBERS);
  if (!creds || recipients.length === 0) return;

  const client = new WaGatewayClient(creds, {
    timeoutMs: 10_000,
    maxRetries: 1,
  });
  const variables = {
    aksi: payload.actionType === "created" ? "baru" : "diperbarui",
    nama_pengirim: sanitizeWaVariable(payload.name, "Tamu", { maxLength: 100 }),
    ucapan: sanitizeWaVariable(payload.message, "-", { maxLength: 500 }),
  };

  const ts = Date.now();
  await Promise.allSettled(
    recipients.map((recipient, idx) =>
      client
        .sendMessage({
          templateCode: WA_TEMPLATE_CODES.ADMIN_WISH,
          recipient,
          variables,
          referenceId: `WED-WISH-ADM-${payload.id}-${idx}-${ts}`,
        })
        .catch((err) => {
          console.error(`Gagal kirim WA notif ucapan ke ${recipient}:`, err);
        })
    )
  );
};

/**
 * Mengecek apakah waktu sekarang berada dalam jendela pengingat H-1
 * (antara 36 jam hingga 2 jam sebelum acara dimulai).
 */
export const isWithinH1ReminderWindow = (
  isoStart: string | undefined,
  now: Date = new Date()
): boolean => {
  if (!isoStart) return false;
  const eventTime = new Date(isoStart).getTime();
  if (Number.isNaN(eventTime)) return false;
  const diffMs = eventTime - now.getTime();
  const TWO_HOURS = 2 * 60 * 60 * 1000;
  const THIRTY_SIX_HOURS = 36 * 60 * 60 * 1000;
  return diffMs > TWO_HOURS && diffMs <= THIRTY_SIX_HOURS;
};

/**
 * Tamu yang berhak menerima pengingat H-1:
 * status "hadir" atau "ragu" (kecuali "tidak_hadir"), memiliki nomor WA valid,
 * dan belum pernah dikirimi pengingat sebelumnya.
 */
export const isEligibleForH1Reminder = (rsvp: {
  attendance?: string | null;
  phone?: string | null;
  reminder_sent_at?: string | null;
}): boolean => {
  const status = (rsvp.attendance || "").trim().toLowerCase();
  if (status !== "hadir" && status !== "ragu") return false;
  if ((rsvp.reminder_sent_at || "").trim() !== "") return false;
  return normalizeWaPhone(rsvp.phone || "") !== "";
};

export const sendGuestH1ReminderWa = async (
  config: Record<string, string>,
  payload: {
    id: number;
    guest_name: string;
    phone: string;
    attendance: string;
  }
): Promise<{ sent: boolean; error?: string }> => {
  const creds = getWaCredentials(config);
  const recipient = normalizeWaPhone(payload.phone);
  if (!creds) {
    return { sent: false, error: "Kredensial WhatsApp Gateway belum diatur." };
  }
  if (!recipient) {
    return { sent: false, error: "Nomor WhatsApp tamu tidak valid." };
  }

  const client = new WaGatewayClient(creds, {
    timeoutMs: 12_000,
    maxRetries: 1,
  });
  const summary = buildEventSummary(config);
  const lat = (config.VENUE_LAT || "").trim();
  const lng = (config.VENUE_LNG || "").trim();
  const hasValidCoords =
    lat !== "" &&
    lng !== "" &&
    Number.isFinite(Number(lat)) &&
    Number.isFinite(Number(lng));
  const linkMaps = hasValidCoords
    ? `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`
    : "https://maps.google.com";
  const eventTag = (config.AKAD_ISO_START || "acara").slice(0, 10);

  const variables = {
    nama_tamu: sanitizeWaVariable(payload.guest_name, "Bapak/Ibu", {
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
    link_maps: linkMaps,
  };

  try {
    await client.sendMessage({
      templateCode: WA_TEMPLATE_CODES.GUEST_REMINDER_H1,
      recipient,
      variables,
      referenceId: `WED-H1-${payload.id}-${eventTag}`,
    });
    return { sent: true };
  } catch (err) {
    const msg =
      err instanceof Error ? err.message : "Gagal mengirim pengingat.";
    console.error(`Gagal kirim pengingat H-1 ke ${recipient}:`, err);
    return { sent: false, error: msg };
  }
};
