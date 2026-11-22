import assert from "node:assert/strict";
import { test } from "node:test";
import {
  FREE_GUEST_QUOTA,
  MIN_PAYMENT_AMOUNT,
  PRICE_PER_GUEST,
  calculateGuestQuotaPrice,
  formatIdr,
} from "../src/lib/billing.ts";

test("calculateGuestQuotaPrice gratis hingga 200 tamu", () => {
  const q1 = calculateGuestQuotaPrice(150, FREE_GUEST_QUOTA);
  assert.equal(q1.needsPayment, false);
  assert.equal(q1.amount, 0);
  assert.equal(q1.resultingQuota, 200);

  const q2 = calculateGuestQuotaPrice(200, FREE_GUEST_QUOTA);
  assert.equal(q2.needsPayment, false);
  assert.equal(q2.amount, 0);
});

test("calculateGuestQuotaPrice menerapkan tarif minimum Rp50.000 (+250 tamu) untuk tambahan kecil", () => {
  const q = calculateGuestQuotaPrice(220, FREE_GUEST_QUOTA);
  assert.equal(q.needsPayment, true);
  assert.equal(q.rawAddedGuests, 20);
  assert.equal(q.amount, MIN_PAYMENT_AMOUNT);
  assert.equal(q.grantedAddedGuests, 250);
  assert.equal(q.resultingQuota, 450);
});

test("calculateGuestQuotaPrice menghitung Rp200 per tamu di atas minimum", () => {
  const q = calculateGuestQuotaPrice(1000, FREE_GUEST_QUOTA);
  assert.equal(q.needsPayment, true);
  assert.equal(q.rawAddedGuests, 800);
  assert.equal(q.grantedAddedGuests, 800);
  assert.equal(q.amount, 800 * PRICE_PER_GUEST); // Rp160.000
  assert.equal(q.resultingQuota, 1000);
  assert.equal(formatIdr(q.amount), "Rp160.000");
});
