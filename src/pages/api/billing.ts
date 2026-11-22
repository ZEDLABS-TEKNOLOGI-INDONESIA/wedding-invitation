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

const JSON_HEADERS = {
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
};

export interface BillingOrderRow {
  id: number;
  wedding_id: number;
  invoice_code: string;
  current_quota: number;
  requested_total_quota: number;
  added_guests: number;
  amount: number;
  status: "pending" | "paid" | "rejected";
  payment_method: string;
  payment_note: string;
  proof_url: string;
  admin_note: string;
  created_at: string;
  verified_at: string;
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

  const orders = db
    .prepare(
      "SELECT * FROM billing_orders WHERE wedding_id = ? ORDER BY id DESC LIMIT 50"
    )
    .all(session.weddingId) as BillingOrderRow[];

  const platformCfg = getPlatformConfig();
  let bankAccounts: Array<{ bank: string; number: string; holder: string }> = [];
  if (platformCfg.PAYMENT_BANK_ACCOUNTS) {
    try {
      const parsed = JSON.parse(platformCfg.PAYMENT_BANK_ACCOUNTS);
      if (Array.isArray(parsed)) {
        bankAccounts = parsed
          .filter((a) => a && typeof a.bank === "string" && typeof a.number === "string" && a.bank.trim() && a.number.trim())
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
        bankName: bankAccounts[0]?.bank || platformCfg.PAYMENT_BANK_NAME || "Bank BCA",
        bankAccount: bankAccounts[0]?.number || platformCfg.PAYMENT_BANK_ACCOUNT || "",
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

export const POST: APIRoute = async ({ request, cookies }) => {
  const session = getAuthSession(cookies);
  if (!session) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: JSON_HEADERS,
    });
  }

  let body: {
    targetTotalGuests?: number;
    paymentMethod?: string;
    paymentNote?: string;
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
  const paymentMethod = String(
    body.paymentMethod || "Transfer Bank / QRIS"
  )
    .trim()
    .slice(0, 60);
  const paymentNote = String(body.paymentNote || "").trim().slice(0, 400);
  const proofUrl = String(body.proofUrl || "").trim().slice(0, 500);

  const res = db
    .prepare(
      `INSERT INTO billing_orders
        (wedding_id, invoice_code, current_quota, requested_total_quota, added_guests, amount, status, payment_method, payment_note, proof_url, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?)`
    )
    .run(
      session.weddingId,
      invoiceCode,
      currentQuota,
      quote.resultingQuota,
      quote.grantedAddedGuests,
      quote.amount,
      paymentMethod,
      paymentNote,
      proofUrl,
      new Date().toISOString()
    );

  const created = db
    .prepare("SELECT * FROM billing_orders WHERE id = ?")
    .get(Number(res.lastInsertRowid)) as BillingOrderRow;

  return new Response(
    JSON.stringify({ success: true, order: created, quote }),
    { status: 201, headers: JSON_HEADERS }
  );
};
