import type { APIRoute } from "astro";
import { getAuthSession } from "../../lib/auth";
import {
  FREE_GUEST_QUOTA,
  MIN_PAYMENT_AMOUNT,
  PRICE_PER_GUEST,
  calculateGuestQuotaPrice,
  generateInvoiceCode,
} from "../../lib/billing";
import db, { getPlatformConfig, getWeddingById } from "../../lib/db";
import {
  normalizeOrderStatus,
  notifyInvoiceEvent,
  parsePlatformBankAccounts,
  type BillingOrderRecord,
} from "../../lib/invoicing";
import { resolveOriginDomain } from "../../lib/whatsapp";

const JSON_HEADERS = {
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
};

const INVOICE_DUE_DAYS = 7;

function serializeOrder(row: BillingOrderRecord) {
  return {
    ...row,
    status: normalizeOrderStatus(row.status, row.proof_url),
  };
}

export const GET: APIRoute = async ({ cookies }) => {
  const session = getAuthSession(cookies);
  if (!session) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: JSON_HEADERS,
    });
  }

  const wedding = getWeddingById(session.weddingId);
  const quotaLimit = Math.max(
    FREE_GUEST_QUOTA,
    Number(wedding?.guest_quota_limit || FREE_GUEST_QUOTA)
  );
  const usedGuests = (
    db
      .prepare("SELECT COUNT(*) as c FROM guests WHERE wedding_id = ?")
      .get(session.weddingId) as { c: number }
  ).c;

  const rawOrders = db
    .prepare(
      "SELECT * FROM billing_orders WHERE wedding_id = ? ORDER BY id DESC LIMIT 50"
    )
    .all(session.weddingId) as BillingOrderRecord[];

  const orders = rawOrders.map(serializeOrder);

  const platformCfg = getPlatformConfig();
  const bankAccounts = parsePlatformBankAccounts(platformCfg);

  return new Response(
    JSON.stringify({
      quotaLimit,
      usedGuests,
      remaining: Math.max(0, quotaLimit - usedGuests),
      pricing: {
        freeQuota: FREE_GUEST_QUOTA,
        pricePerGuest: PRICE_PER_GUEST,
        minPayment: MIN_PAYMENT_AMOUNT,
      },
      paymentInfo: {
        bankName:
          bankAccounts[0]?.bank || platformCfg.PAYMENT_BANK_NAME || "Bank BCA",
        bankAccount:
          bankAccounts[0]?.number || platformCfg.PAYMENT_BANK_ACCOUNT || "",
        bankHolder:
          bankAccounts[0]?.holder ||
          platformCfg.PAYMENT_BANK_HOLDER ||
          "ZEDLABS Teknologi Indonesia",
        bankAccounts,
        whatsappConfirm: platformCfg.PAYMENT_WHATSAPP_CONFIRM || "",
      },
      orders,
    }),
    { status: 200, headers: JSON_HEADERS }
  );
};

export const POST: APIRoute = async ({ request, cookies, url }) => {
  const session = getAuthSession(cookies);
  if (!session) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: JSON_HEADERS,
    });
  }

  let body: {
    action?: string;
    orderId?: number;
    targetTotalGuests?: number;
    paymentMethod?: string;
    paymentNote?: string;
    senderName?: string;
    senderBank?: string;
    proofUrl?: string;
  } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return new Response(JSON.stringify({ error: "Permintaan tidak valid." }), {
      status: 400,
      headers: JSON_HEADERS,
    });
  }

  const action = String(body.action || "create_order").trim();
  const originDomain = resolveOriginDomain(request, url);

  // 1. Unggah / Kirim Bukti Transfer (WAJIB upload bukti/nota bayar)
  if (action === "submit_proof") {
    const orderId = Number(body.orderId || 0);
    const senderName = String(body.senderName || "").trim().slice(0, 100);
    const senderBank = String(body.senderBank || "").trim().slice(0, 60);
    const proofUrl = String(body.proofUrl || "").trim().slice(0, 500);
    const paymentNote = String(body.paymentNote || "").trim().slice(0, 400);

    if (!senderName) {
      return new Response(
        JSON.stringify({ error: "Nama pemilik rekening pengirim wajib diisi." }),
        { status: 400, headers: JSON_HEADERS }
      );
    }
    if (!senderBank) {
      return new Response(
        JSON.stringify({ error: "Nama bank / e-wallet pengirim wajib diisi." }),
        { status: 400, headers: JSON_HEADERS }
      );
    }
    if (!proofUrl || !proofUrl.startsWith("/uploads/")) {
      return new Response(
        JSON.stringify({
          error:
            "Bukti transfer / nota pembayaran wajib diunggah (format JPG, PNG, atau WebP).",
        }),
        { status: 400, headers: JSON_HEADERS }
      );
    }

    const order = db
      .prepare(
        "SELECT * FROM billing_orders WHERE id = ? AND wedding_id = ? LIMIT 1"
      )
      .get(orderId, session.weddingId) as BillingOrderRecord | undefined;

    if (!order) {
      return new Response(
        JSON.stringify({ error: "Tagihan tidak ditemukan." }),
        { status: 404, headers: JSON_HEADERS }
      );
    }

    const normStatus = normalizeOrderStatus(order.status, order.proof_url);
    if (normStatus !== "unpaid" && normStatus !== "rejected") {
      return new Response(
        JSON.stringify({
          error:
            normStatus === "review"
              ? "Bukti pembayaran sudah dikirim dan sedang diperiksa oleh Superadmin."
              : "Tagihan ini sudah tidak dapat dikonfirmasi lagi.",
        }),
        { status: 400, headers: JSON_HEADERS }
      );
    }

    const nowIso = new Date().toISOString();
    const combinedNote =
      paymentNote || `${senderName} (${senderBank})`;

    db.prepare(
      `UPDATE billing_orders
       SET status = 'review',
           sender_name = ?,
           sender_bank = ?,
           proof_url = ?,
           payment_note = ?,
           submitted_at = ?,
           admin_note = ''
       WHERE id = ?`
    ).run(senderName, senderBank, proofUrl, combinedNote, nowIso, order.id);

    const updated = db
      .prepare("SELECT * FROM billing_orders WHERE id = ?")
      .get(order.id) as BillingOrderRecord;

    // Kirim notifikasi WA ke Pengguna & Superadmin
    const notifyResult = await notifyInvoiceEvent("submitted", updated, {
      originDomain,
    });

    return new Response(
      JSON.stringify({
        success: true,
        order: serializeOrder(updated),
        waNotify: notifyResult,
      }),
      { status: 200, headers: JSON_HEADERS }
    );
  }

  // 2. Batalkan tagihan yang belum dibayar / ditolak
  if (action === "cancel_order") {
    const orderId = Number(body.orderId || 0);
    const order = db
      .prepare(
        "SELECT * FROM billing_orders WHERE id = ? AND wedding_id = ? LIMIT 1"
      )
      .get(orderId, session.weddingId) as BillingOrderRecord | undefined;

    if (!order) {
      return new Response(
        JSON.stringify({ error: "Tagihan tidak ditemukan." }),
        { status: 404, headers: JSON_HEADERS }
      );
    }
    const normStatus = normalizeOrderStatus(order.status, order.proof_url);
    if (normStatus !== "unpaid" && normStatus !== "rejected") {
      return new Response(
        JSON.stringify({
          error:
            "Hanya tagihan yang belum dibayar atau ditolak yang dapat dibatalkan.",
        }),
        { status: 400, headers: JSON_HEADERS }
      );
    }

    db.prepare("UPDATE billing_orders SET status = 'cancelled' WHERE id = ?").run(
      order.id
    );
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: JSON_HEADERS,
    });
  }

  // 3. Buat tagihan baru (create_order) — mengikuti alur invoicing whatsapp-service
  const openOrders = db
    .prepare(
      "SELECT * FROM billing_orders WHERE wedding_id = ? AND status IN ('unpaid', 'review', 'pending', 'rejected') ORDER BY id DESC LIMIT 1"
    )
    .all(session.weddingId) as BillingOrderRecord[];

  if (openOrders.length > 0) {
    const open = openOrders[0];
    return new Response(
      JSON.stringify({
        error: `Masih ada tagihan aktif (${open.invoice_code}). Selesaikan unggah bukti bayar atau batalkan tagihan tersebut terlebih dahulu.`,
      }),
      { status: 409, headers: JSON_HEADERS }
    );
  }

  const wedding = getWeddingById(session.weddingId);
  const currentQuota = Math.max(
    FREE_GUEST_QUOTA,
    Number(wedding?.guest_quota_limit || FREE_GUEST_QUOTA)
  );
  const requestedTotal = Math.floor(Number(body.targetTotalGuests || 0));

  if (!Number.isFinite(requestedTotal) || requestedTotal <= currentQuota) {
    return new Response(
      JSON.stringify({
        error: `Target total kuota tamu harus lebih besar dari kuota aktif Anda saat ini (${currentQuota} tamu).`,
      }),
      { status: 400, headers: JSON_HEADERS }
    );
  }
  if (requestedTotal > 50_000) {
    return new Response(
      JSON.stringify({
        error: "Maksimal kuota per transaksi adalah 50.000 tamu.",
      }),
      { status: 400, headers: JSON_HEADERS }
    );
  }

  const quote = calculateGuestQuotaPrice(requestedTotal, currentQuota);
  const invoiceCode = generateInvoiceCode();
  const paymentMethod = String(body.paymentMethod || "Transfer Bank")
    .trim()
    .slice(0, 60);
  const nowIso = new Date().toISOString();
  const dueIso = new Date(
    Date.now() + INVOICE_DUE_DAYS * 86400 * 1000
  ).toISOString();

  const res = db
    .prepare(
      `INSERT INTO billing_orders
        (wedding_id, invoice_code, current_quota, requested_total_quota, added_guests, amount, status, payment_method, payment_note, proof_url, sender_name, sender_bank, due_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 'unpaid', ?, '', '', '', '', ?, ?)`
    )
    .run(
      session.weddingId,
      invoiceCode,
      currentQuota,
      quote.resultingQuota,
      quote.grantedAddedGuests,
      quote.amount,
      paymentMethod,
      dueIso,
      nowIso
    );

  const created = db
    .prepare("SELECT * FROM billing_orders WHERE id = ?")
    .get(Number(res.lastInsertRowid)) as BillingOrderRecord;

  // Kirim notifikasi WA invoice baru ke Pengguna & Superadmin
  const notifyResult = await notifyInvoiceEvent("created", created, {
    originDomain,
  });

  return new Response(
    JSON.stringify({
      success: true,
      order: serializeOrder(created),
      quote,
      waNotify: notifyResult,
    }),
    { status: 201, headers: JSON_HEADERS }
  );
};
