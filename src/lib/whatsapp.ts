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

export const WA_TEMPLATE_CODES = {
  INVITATION: "wedding_undangan_tamu",
  ADMIN_RSVP: "wedding_rsvp_admin",
  ADMIN_WISH: "wedding_ucapan_admin",
  GUEST_RSVP_CONFIRM: "wedding_rsvp_konfirmasi",
  GUEST_REMINDER_H1: "wedding_pengingat_h1",
} as const;

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

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export class WaGatewayClient {
  private readonly baseUrl: string;
  private readonly keyId: string;
  private readonly secret: string;
  private readonly timeoutMs: number;
  private readonly maxRetries: number;

  constructor(
    creds: WaGatewayCredentials,
    options?: { timeoutMs?: number; maxRetries?: number }
  ) {
    this.baseUrl = creds.baseUrl.replace(/\/+$/, "");
    this.keyId = creds.keyId.trim();
    this.secret = creds.secret.trim();
    this.timeoutMs = options?.timeoutMs ?? 20_000;
    this.maxRetries = options?.maxRetries ?? 2;
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
        data?.error || text.trim() || `HTTP ${res.status}`,
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
    params: { namaAplikasi?: string; namaAkun?: string; namaApiKey?: string }
  ): Promise<WaPersonalAccountResult> {
    const cleanBase = baseUrl.trim().replace(/\/+$/, "");
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15_000);
    try {
      const res = await fetch(`${cleanBase}/api/v1/integrasi/akun-mandiri`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nama_aplikasi: params.namaAplikasi || "Wedding Invitation",
          nama_akun: params.namaAkun || "Undangan Pernikahan",
          nama_api_key: params.namaApiKey || "Wedding Invitation",
        }),
        signal: controller.signal,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg =
          typeof data?.error === "string"
            ? data.error
            : `Gagal mendaftarkan akun mandiri (HTTP ${res.status})`;
        throw new WaGatewayError(res.status, msg);
      }
      return data as WaPersonalAccountResult;
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
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return null;
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
    .map((segment, idx) => (idx % 2 === 0 ? lowerExcessiveCaps(segment) : segment))
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

  const client = new WaGatewayClient(creds, { timeoutMs: 10_000, maxRetries: 1 });
  const variables = {
    aksi: payload.actionType === "created" ? "baru" : "diperbarui",
    nama_tamu: sanitizeWaVariable(payload.guest_name, "Tamu", { maxLength: 100 }),
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

  const client = new WaGatewayClient(creds, { timeoutMs: 10_000, maxRetries: 1 });
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

  const client = new WaGatewayClient(creds, { timeoutMs: 10_000, maxRetries: 1 });
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

  const client = new WaGatewayClient(creds, { timeoutMs: 12_000, maxRetries: 1 });
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
    const msg = err instanceof Error ? err.message : "Gagal mengirim pengingat.";
    console.error(`Gagal kirim pengingat H-1 ke ${recipient}:`, err);
    return { sent: false, error: msg };
  }
};
