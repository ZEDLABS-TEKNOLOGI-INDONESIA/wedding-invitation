import { formatIdr } from "./billing";
import db, { getPlatformConfig, getWeddingById } from "./db";
import {
  PLATFORM_BILLING_TEMPLATE_CODES,
  PLATFORM_WA_TEMPLATES,
  WaGatewayClient,
  WaGatewayError,
  getWaCredentials,
  normalizeWaPhone,
  parseAdminWaNumbers,
  sanitizeWaVariable,
} from "./whatsapp";

export type BillingOrderStatus =
  | "unpaid"
  | "review"
  | "paid"
  | "rejected"
  | "cancelled";

export interface BillingOrderRecord {
  id: number;
  wedding_id: number;
  invoice_code: string;
  current_quota: number;
  requested_total_quota: number;
  added_guests: number;
  amount: number;
  status: string;
  payment_method: string;
  payment_note: string;
  proof_url: string;
  sender_name: string;
  sender_bank: string;
  due_at: string;
  submitted_at: string;
  invoice_sent_at: string;
  admin_note: string;
  created_at: string;
  verified_at: string;
}

export interface BankAccountInfo {
  bank: string;
  number: string;
  holder: string;
}

export function normalizeOrderStatus(
  status: string,
  proofUrl?: string
): BillingOrderStatus {
  const s = String(status || "")
    .trim()
    .toLowerCase();
  if (s === "paid" || s === "lunas") return "paid";
  if (s === "rejected" || s === "ditolak") return "rejected";
  if (s === "cancelled" || s === "dibatalkan") return "cancelled";
  if (s === "review" || s === "diperiksa") return "review";
  if (s === "unpaid" || s === "menunggu") return "unpaid";
  // Legacy 'pending' status compatibility: if proof_url exists, needs review; otherwise unpaid
  if (s === "pending") {
    return proofUrl && proofUrl.trim() ? "review" : "unpaid";
  }
  return "unpaid";
}

export function parsePlatformBankAccounts(
  platformCfg: Record<string, string>
): BankAccountInfo[] {
  let bankAccounts: BankAccountInfo[] = [];
  if (platformCfg.PAYMENT_BANK_ACCOUNTS) {
    try {
      const parsed = JSON.parse(platformCfg.PAYMENT_BANK_ACCOUNTS);
      if (Array.isArray(parsed)) {
        bankAccounts = parsed
          .filter(
            (a) =>
              a &&
              typeof a.bank === "string" &&
              typeof a.number === "string" &&
              a.bank.trim() &&
              a.number.trim()
          )
          .map((a) => ({
            bank: String(a.bank).trim(),
            number: String(a.number).trim(),
            holder: String(a.holder || "").trim(),
          }));
      }
    } catch {
      bankAccounts = [];
    }
  }
  if (bankAccounts.length === 0 && platformCfg.PAYMENT_BANK_ACCOUNT?.trim()) {
    bankAccounts.push({
      bank: platformCfg.PAYMENT_BANK_NAME || "Bank BCA",
      number: platformCfg.PAYMENT_BANK_ACCOUNT.trim(),
      holder: platformCfg.PAYMENT_BANK_HOLDER || "ZEDLABS Teknologi Indonesia",
    });
  }
  return bankAccounts;
}

export function formatIndonesianDate(iso?: string): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function getCouplePhones(weddingId: number): string[] {
  const rows = db
    .prepare(
      "SELECT phone FROM users WHERE wedding_id = ? AND status = 'active' AND phone != ''"
    )
    .all(weddingId) as Array<{ phone: string }>;
  return Array.from(
    new Set(rows.map((r) => normalizeWaPhone(r.phone)).filter(Boolean))
  );
}

function getSuperadminPhones(platformCfg: Record<string, string>): string[] {
  const fromCfg = parseAdminWaNumbers(platformCfg.PAYMENT_WHATSAPP_CONFIRM);
  const fromUsers = (
    db
      .prepare(
        "SELECT phone FROM users WHERE role = 'superadmin' AND status = 'active' AND phone != ''"
      )
      .all() as Array<{ phone: string }>
  )
    .map((r) => normalizeWaPhone(r.phone))
    .filter(Boolean);
  return Array.from(new Set([...fromCfg, ...fromUsers]));
}

export type InvoiceEventType = "created" | "submitted" | "paid" | "rejected";

export interface InvoiceNotifyResult {
  userSent: number;
  adminSent: number;
  skippedReason?: string;
}

async function sendTemplateWithAutoSync(
  client: WaGatewayClient,
  payload: {
    templateCode: string;
    recipient: string;
    variables: Record<string, string>;
    referenceId: string;
  }
): Promise<boolean> {
  try {
    await client.sendMessage(payload);
    return true;
  } catch (err) {
    // Jika template belum tersinkron (403/404), coba sinkronkan sekali lalu kirim ulang
    if (
      err instanceof WaGatewayError &&
      (err.status === 403 || err.status === 404)
    ) {
      try {
        await client.syncTemplates(PLATFORM_WA_TEMPLATES, {
          pratinjau: false,
          hapusYangTidakAda: false,
        });
        await client.sendMessage(payload);
        return true;
      } catch (retryErr) {
        console.error(
          `[Invoicing WA] Gagal kirim ulang ke ${payload.recipient}:`,
          retryErr
        );
        return false;
      }
    }
    console.error(`[Invoicing WA] Gagal kirim ke ${payload.recipient}:`, err);
    return false;
  }
}

/**
 * Mengirim notifikasi WhatsApp otomatis ke Pengguna (pasangan) dan Admin (Superadmin)
 * pada setiap kejadian siklus pembayaran / invoicing.
 */
export async function notifyInvoiceEvent(
  event: InvoiceEventType,
  order: BillingOrderRecord,
  options?: { originDomain?: string; onlyUser?: boolean }
): Promise<InvoiceNotifyResult> {
  const platformCfg = getPlatformConfig();
  const creds = getWaCredentials(platformCfg);
  if (!creds) {
    return {
      userSent: 0,
      adminSent: 0,
      skippedReason: "WhatsApp Gateway Platform belum dikonfigurasi.",
    };
  }

  const wedding = getWeddingById(order.wedding_id);
  const weddingTitle = sanitizeWaVariable(
    wedding?.title || `Undangan #${order.wedding_id}`,
    "Undangan Pernikahan",
    { maxLength: 80 }
  );
  const bankAccounts = parsePlatformBankAccounts(platformCfg);
  const bankSummary =
    bankAccounts.length > 0
      ? bankAccounts
          .map(
            (b) => `${b.bank} ${b.number}${b.holder ? ` a.n. ${b.holder}` : ""}`
          )
          .join(" / ")
      : "Hubungi admin untuk nomor rekening tujuan";

  const userPhones = getCouplePhones(order.wedding_id);
  const adminPhones = options?.onlyUser ? [] : getSuperadminPhones(platformCfg);

  if (userPhones.length === 0 && adminPhones.length === 0) {
    return {
      userSent: 0,
      adminSent: 0,
      skippedReason: "Tidak ada nomor WhatsApp penerima yang terdaftar.",
    };
  }

  const client = new WaGatewayClient(creds, {
    timeoutMs: 12_000,
    maxRetries: 1,
    originDomain: options?.originDomain,
  });

  const ts = Date.now();
  const nominalStr = formatIdr(order.amount);
  const addedStr = `+${order.added_guests.toLocaleString("id-ID")} tamu (total ${order.requested_total_quota.toLocaleString("id-ID")} tamu)`;
  const dueStr = formatIndonesianDate(
    order.due_at || new Date(Date.now() + 7 * 86400 * 1000).toISOString()
  );

  let userSent = 0;
  let adminSent = 0;

  if (event === "created") {
    const vars = {
      nomor_invoice: sanitizeWaVariable(order.invoice_code, "INV", {
        maxLength: 40,
      }),
      nama_undangan: weddingTitle,
      nominal: nominalStr,
      tambahan_kuota: addedStr,
      jatuh_tempo: dueStr,
      rekening_tujuan: sanitizeWaVariable(bankSummary, "-", { maxLength: 240 }),
    };

    const userResults = await Promise.all(
      userPhones.map((phone, i) =>
        sendTemplateWithAutoSync(client, {
          templateCode: PLATFORM_BILLING_TEMPLATE_CODES.INVOICE_CREATED,
          recipient: phone,
          variables: vars,
          referenceId: `INV-NEW-USR-${order.id}-${i}-${ts}`,
        })
      )
    );
    userSent = userResults.filter(Boolean).length;

    const adminResults = await Promise.all(
      adminPhones.map((phone, i) =>
        sendTemplateWithAutoSync(client, {
          templateCode: PLATFORM_BILLING_TEMPLATE_CODES.INVOICE_CREATED,
          recipient: phone,
          variables: {
            ...vars,
            rekening_tujuan: "Menunggu bukti transfer dari pengguna",
          },
          referenceId: `INV-NEW-ADM-${order.id}-${i}-${ts}`,
        })
      )
    );
    adminSent = adminResults.filter(Boolean).length;
  } else if (event === "submitted") {
    const senderName = sanitizeWaVariable(
      order.sender_name || order.payment_note,
      "Pengguna",
      { maxLength: 80 }
    );
    const senderBank = sanitizeWaVariable(
      order.sender_bank || order.payment_method,
      "Transfer Bank",
      { maxLength: 60 }
    );

    const userResults = await Promise.all(
      userPhones.map((phone, i) =>
        sendTemplateWithAutoSync(client, {
          templateCode: PLATFORM_BILLING_TEMPLATE_CODES.INVOICE_SUBMITTED,
          recipient: phone,
          variables: {
            nomor_invoice: order.invoice_code,
            nama_undangan: weddingTitle,
            nominal: nominalStr,
            nama_pengirim: senderName,
            bank_pengirim: senderBank,
            keterangan:
              "Bukti bayar Anda telah diterima dan sedang menunggu pemeriksaan Superadmin.",
          },
          referenceId: `INV-SUB-USR-${order.id}-${i}-${ts}`,
        })
      )
    );
    userSent = userResults.filter(Boolean).length;

    const adminResults = await Promise.all(
      adminPhones.map((phone, i) =>
        sendTemplateWithAutoSync(client, {
          templateCode: PLATFORM_BILLING_TEMPLATE_CODES.INVOICE_SUBMITTED,
          recipient: phone,
          variables: {
            nomor_invoice: order.invoice_code,
            nama_undangan: weddingTitle,
            nominal: nominalStr,
            nama_pengirim: senderName,
            bank_pengirim: senderBank,
            keterangan:
              "Perlu diperiksa oleh Superadmin di menu Tagihan dan Pembayaran.",
          },
          referenceId: `INV-SUB-ADM-${order.id}-${i}-${ts}`,
        })
      )
    );
    adminSent = adminResults.filter(Boolean).length;
  } else if (event === "paid") {
    const paidDate = formatIndonesianDate(
      order.verified_at || new Date().toISOString()
    );
    const vars = {
      nomor_invoice: order.invoice_code,
      nama_undangan: weddingTitle,
      nominal: nominalStr,
      kuota_baru: `${order.requested_total_quota.toLocaleString("id-ID")} tamu`,
      tanggal_lunas: paidDate,
    };

    const userResults = await Promise.all(
      userPhones.map((phone, i) =>
        sendTemplateWithAutoSync(client, {
          templateCode: PLATFORM_BILLING_TEMPLATE_CODES.INVOICE_PAID,
          recipient: phone,
          variables: vars,
          referenceId: `INV-PAID-USR-${order.id}-${i}-${ts}`,
        })
      )
    );
    userSent = userResults.filter(Boolean).length;

    const adminResults = await Promise.all(
      adminPhones.map((phone, i) =>
        sendTemplateWithAutoSync(client, {
          templateCode: PLATFORM_BILLING_TEMPLATE_CODES.INVOICE_PAID,
          recipient: phone,
          variables: vars,
          referenceId: `INV-PAID-ADM-${order.id}-${i}-${ts}`,
        })
      )
    );
    adminSent = adminResults.filter(Boolean).length;
  } else if (event === "rejected") {
    const reason = sanitizeWaVariable(
      order.admin_note,
      "Bukti transfer belum sesuai, silakan unggah ulang bukti yang jelas.",
      { maxLength: 260 }
    );
    const vars = {
      nomor_invoice: order.invoice_code,
      nama_undangan: weddingTitle,
      nominal: nominalStr,
      alasan: reason,
    };

    const userResults = await Promise.all(
      userPhones.map((phone, i) =>
        sendTemplateWithAutoSync(client, {
          templateCode: PLATFORM_BILLING_TEMPLATE_CODES.INVOICE_REJECTED,
          recipient: phone,
          variables: vars,
          referenceId: `INV-REJ-USR-${order.id}-${i}-${ts}`,
        })
      )
    );
    userSent = userResults.filter(Boolean).length;

    const adminResults = await Promise.all(
      adminPhones.map((phone, i) =>
        sendTemplateWithAutoSync(client, {
          templateCode: PLATFORM_BILLING_TEMPLATE_CODES.INVOICE_REJECTED,
          recipient: phone,
          variables: vars,
          referenceId: `INV-REJ-ADM-${order.id}-${i}-${ts}`,
        })
      )
    );
    adminSent = adminResults.filter(Boolean).length;
  }

  if (userSent > 0 || adminSent > 0) {
    db.prepare(
      "UPDATE billing_orders SET invoice_sent_at = ? WHERE id = ?"
    ).run(new Date().toISOString(), order.id);
  }

  return { userSent, adminSent };
}

function escapeHtml(val: string): string {
  return String(val || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Menghasilkan dokumen HTML Invoice siap cetak / simpan PDF untuk Pengguna & Superadmin.
 */
export function renderInvoiceHtml(
  order: BillingOrderRecord,
  wedding: { title: string; slug: string },
  platformCfg: Record<string, string>
): string {
  const status = normalizeOrderStatus(order.status, order.proof_url);
  const statusMap: Record<
    BillingOrderStatus,
    { label: string; color: string; bg: string }
  > = {
    unpaid: { label: "BELUM DIBAYAR", color: "#b45309", bg: "#fef3c7" },
    review: { label: "MENUNGGU VERIFIKASI", color: "#1d4ed8", bg: "#dbeafe" },
    paid: { label: "LUNAS", color: "#047857", bg: "#d1fae5" },
    rejected: { label: "DITOLAK", color: "#b91c1c", bg: "#fee2e2" },
    cancelled: { label: "DIBATALKAN", color: "#475569", bg: "#f1f5f9" },
  };
  const badge = statusMap[status];
  const platformName = platformCfg.PLATFORM_NAME || "Wedding Management";
  const banks = parsePlatformBankAccounts(platformCfg);

  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Invoice ${escapeHtml(order.invoice_code)} | ${escapeHtml(platformName)}</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; margin: 0; padding: 24px; background: #f8fafc; color: #0f172a; }
    .sheet { max-width: 760px; margin: 0 auto; background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 36px; box-shadow: 0 4px 20px rgba(15,23,42,.05); }
    .row { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; flex-wrap: wrap; }
    .badge { display: inline-block; padding: 4px 12px; border-radius: 999px; font-size: 11px; font-weight: 700; letter-spacing: .04em; background: ${badge.bg}; color: ${badge.color}; }
    h1 { margin: 0; font-size: 22px; }
    .muted { color: #64748b; font-size: 13px; }
    .mono { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
    table { width: 100%; border-collapse: collapse; margin-top: 24px; font-size: 13px; }
    th, td { text-align: left; padding: 12px 10px; border-bottom: 1px solid #e2e8f0; }
    th { font-size: 11px; text-transform: uppercase; letter-spacing: .05em; color: #64748b; background: #f8fafc; }
    .right { text-align: right; }
    .total-row td { font-size: 16px; font-weight: 700; border-top: 2px solid #0f172a; border-bottom: none; padding-top: 14px; }
    .box { margin-top: 24px; padding: 16px; border-radius: 8px; background: #f8fafc; border: 1px solid #e2e8f0; font-size: 13px; }
    .actions { max-width: 760px; margin: 0 auto 16px; display: flex; justify-content: flex-end; gap: 8px; }
    .btn { border: 1px solid #cbd5e1; background: #fff; color: #0f172a; padding: 8px 14px; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; text-decoration: none; }
    .btn-primary { background: #2563eb; border-color: #2563eb; color: #fff; }
    @media print { body { background: #fff; padding: 0; } .sheet { border: none; box-shadow: none; padding: 0; } .actions { display: none; } }
  </style>
</head>
<body>
  <div class="actions">
    <button class="btn btn-primary" onclick="window.print()">Cetak / Simpan PDF</button>
    <button class="btn" onclick="window.close()">Tutup</button>
  </div>
  <div class="sheet">
    <div class="row">
      <div>
        <h1>INVOICE</h1>
        <div class="mono" style="margin-top:4px;font-weight:600;">${escapeHtml(order.invoice_code)}</div>
        <div class="muted" style="margin-top:4px;">${escapeHtml(platformName)} · ZEDLABS Teknologi Indonesia</div>
      </div>
      <div style="text-align:right;">
        <span class="badge">${badge.label}</span>
        <div class="muted" style="margin-top:8px;">Tanggal terbit: ${escapeHtml(formatIndonesianDate(order.created_at))}</div>
        ${order.due_at ? `<div class="muted">Jatuh tempo: ${escapeHtml(formatIndonesianDate(order.due_at))}</div>` : ""}
        ${status === "paid" && order.verified_at ? `<div class="muted">Tanggal lunas: ${escapeHtml(formatIndonesianDate(order.verified_at))}</div>` : ""}
      </div>
    </div>

    <div class="box">
      <div style="font-weight:600;margin-bottom:4px;">Ditagihkan kepada:</div>
      <div>${escapeHtml(wedding.title)}</div>
      <div class="muted">URL Undangan: /u/${escapeHtml(wedding.slug)}</div>
      ${order.sender_name ? `<div class="muted" style="margin-top:6px;">Pengirim Transfer: ${escapeHtml(order.sender_name)}${order.sender_bank ? ` (${escapeHtml(order.sender_bank)})` : ""}</div>` : ""}
    </div>

    <table>
      <thead>
        <tr>
          <th>Deskripsi Layanan</th>
          <th class="right">Kuota Tambahan</th>
          <th class="right">Total Kuota Baru</th>
          <th class="right">Jumlah</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>
            <div style="font-weight:600;">Penambahan Kuota Tamu &amp; Kontak Undangan</div>
            <div class="muted">Kuota sebelumnya: ${order.current_quota.toLocaleString("id-ID")} tamu · Tarif Rp200/tamu (min. Rp50.000)</div>
          </td>
          <td class="right mono">+${order.added_guests.toLocaleString("id-ID")} tamu</td>
          <td class="right mono">${order.requested_total_quota.toLocaleString("id-ID")} tamu</td>
          <td class="right mono">${escapeHtml(formatIdr(order.amount))}</td>
        </tr>
        <tr class="total-row">
          <td colspan="3" class="right">Total Tagihan</td>
          <td class="right mono">${escapeHtml(formatIdr(order.amount))}</td>
        </tr>
      </tbody>
    </table>

    ${
      banks.length > 0 && status !== "paid"
        ? `<div class="box">
            <div style="font-weight:600;margin-bottom:6px;">Rekening Tujuan Transfer:</div>
            ${banks
              .map(
                (b) =>
                  `<div style="margin-top:4px;"><strong>${escapeHtml(b.bank)}</strong> | <span class="mono">${escapeHtml(b.number)}</span>${b.holder ? ` a.n. ${escapeHtml(b.holder)}` : ""}</div>`
              )
              .join("")}
          </div>`
        : ""
    }

    ${
      order.admin_note
        ? `<div class="box"><strong>Catatan Verifikasi:</strong> ${escapeHtml(order.admin_note)}</div>`
        : ""
    }

    <div class="muted" style="margin-top:28px;text-align:center;font-size:12px;">
      Dokumen ini diterbitkan secara otomatis oleh ${escapeHtml(platformName)} dan sah tanpa tanda tangan basah.
    </div>
  </div>
</body>
</html>`;
}
