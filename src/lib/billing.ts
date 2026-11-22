export const FREE_GUEST_QUOTA = 200;
export const PRICE_PER_GUEST = 200;
export const MIN_PAYMENT_AMOUNT = 50_000;
export const MIN_PAID_GUEST_ADDON = Math.ceil(
  MIN_PAYMENT_AMOUNT / PRICE_PER_GUEST
); // 250 tamu tambahan

export interface GuestQuotaQuote {
  needsPayment: boolean;
  currentQuota: number;
  requestedTotal: number;
  rawAddedGuests: number;
  grantedAddedGuests: number;
  resultingQuota: number;
  unitPrice: number;
  minPayment: number;
  amount: number;
}

/**
 * Menghitung biaya penambahan kuota tamu/kontak:
 * - Gratis sampai kuota aktif (bawaan 200 tamu).
 * - Tarif: Rp 200 per tamu tambahan.
 * - Minimum pembayaran: Rp 50.000 (otomatis mendapat minimal +250 kuota tamu).
 */
export function calculateGuestQuotaPrice(
  requestedTotalGuests: number,
  currentQuota: number = FREE_GUEST_QUOTA
): GuestQuotaQuote {
  const safeCurrent = Math.max(
    FREE_GUEST_QUOTA,
    Math.floor(Number.isFinite(currentQuota) ? currentQuota : FREE_GUEST_QUOTA)
  );
  const safeTarget = Math.max(
    0,
    Math.floor(Number.isFinite(requestedTotalGuests) ? requestedTotalGuests : 0)
  );

  if (safeTarget <= safeCurrent) {
    return {
      needsPayment: false,
      currentQuota: safeCurrent,
      requestedTotal: safeTarget,
      rawAddedGuests: 0,
      grantedAddedGuests: 0,
      resultingQuota: safeCurrent,
      unitPrice: PRICE_PER_GUEST,
      minPayment: MIN_PAYMENT_AMOUNT,
      amount: 0,
    };
  }

  const rawAddedGuests = safeTarget - safeCurrent;
  const rawCost = rawAddedGuests * PRICE_PER_GUEST;
  const amount = Math.max(MIN_PAYMENT_AMOUNT, rawCost);
  const grantedAddedGuests = Math.max(MIN_PAID_GUEST_ADDON, rawAddedGuests);

  return {
    needsPayment: true,
    currentQuota: safeCurrent,
    requestedTotal: safeTarget,
    rawAddedGuests,
    grantedAddedGuests,
    resultingQuota: safeCurrent + grantedAddedGuests,
    unitPrice: PRICE_PER_GUEST,
    minPayment: MIN_PAYMENT_AMOUNT,
    amount,
  };
}

export function formatIdr(amount: number): string {
  const safe = Math.round(Number.isFinite(amount) ? amount : 0);
  return `Rp${safe.toLocaleString("id-ID")}`;
}

export function generateInvoiceCode(): string {
  const now = new Date();
  const ymd = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
  const rand = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `INV-${ymd}-${rand}`;
}
