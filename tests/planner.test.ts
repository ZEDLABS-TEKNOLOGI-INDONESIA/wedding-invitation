import assert from "node:assert/strict";
import test from "node:test";
import {
  BUDGET_STARTER_TEMPLATE,
  ESSENTIALS_STARTER_TEMPLATE,
  FIQH_GUIDES,
  JOURNAL_PROMPTS,
  TODO_STARTER_TEMPLATE,
  computeBudgetSummary,
  computeSavingsSummary,
  computeTodoSummary,
  formatRupiah,
} from "../src/utils/plannerData.ts";

test("formatRupiah memformat nominal positif, nol, dan negatif dengan titik ribuan", () => {
  assert.equal(formatRupiah(0), "Rp0");
  assert.equal(formatRupiah(600000), "Rp600.000");
  assert.equal(formatRupiah(25000000), "Rp25.000.000");
  assert.equal(formatRupiah(-150000), "-Rp150.000");
});

test("computeBudgetSummary menghitung total estimasi, deal aktual, sudah dibayar, dan sisa tagihan", () => {
  const res = computeBudgetSummary([
    { estimated_cost: 10_000_000, actual_cost: 9_000_000, paid_amount: 3_000_000 },
    { estimated_cost: 5_000_000, actual_cost: 0, paid_amount: 5_000_000 },
  ]);
  assert.equal(res.totalEstimated, 15_000_000);
  // Item 2 actual_cost = 0, sehingga fallback ke estimated_cost (5jt) => 9jt + 5jt = 14jt
  assert.equal(res.totalActual, 14_000_000);
  assert.equal(res.totalPaid, 8_000_000);
  assert.equal(res.remaining, 6_000_000);
  assert.equal(res.paidPercent, 57);
});

test("computeSavingsSummary menghitung saldo, progres, kontributor, dan estimasi setoran bulanan", () => {
  const nowMs = Date.parse("2026-01-01T00:00:00+07:00");
  const weddingIso = "2026-07-01T08:00:00+07:00"; // ~6 bulan
  const res = computeSavingsSummary(
    [
      { entry_type: "setor", amount: 15_000_000, contributor: "Calon Suami" },
      { entry_type: "setor", amount: 10_000_000, contributor: "Calon Istri" },
      { entry_type: "tarik", amount: 1_000_000, contributor: "Calon Suami" },
    ],
    60_000_000,
    weddingIso,
    nowMs
  );
  assert.equal(res.balance, 24_000_000);
  assert.equal(res.remaining, 36_000_000);
  assert.equal(res.percent, 40);
  assert.equal(res.byContributor["Calon Suami"], 14_000_000);
  assert.equal(res.byContributor["Calon Istri"], 10_000_000);
  assert.ok(res.monthsLeft >= 6);
  assert.ok(res.monthlyNeeded > 0);
});

test("computeTodoSummary menghitung persentase penyelesaian dengan akurat", () => {
  assert.deepEqual(computeTodoSummary([]), {
    total: 0,
    completed: 0,
    pending: 0,
    percent: 0,
  });
  assert.deepEqual(
    computeTodoSummary([{ done: 1 }, { done: 1 }, { done: 0 }, { done: 0 }]),
    { total: 4, completed: 2, pending: 2, percent: 50 }
  );
});

test("seluruh templat bawaan & panduan Fikih Munakahat tersedia lengkap dan mutakhir", () => {
  assert.ok(TODO_STARTER_TEMPLATE.length >= 10);
  assert.ok(BUDGET_STARTER_TEMPLATE.length >= 8);
  assert.ok(
    ESSENTIALS_STARTER_TEMPLATE.some((e) => e.kind === "kua") &&
      ESSENTIALS_STARTER_TEMPLATE.some((e) => e.kind === "mahar") &&
      ESSENTIALS_STARTER_TEMPLATE.some((e) => e.kind === "seserahan")
  );
  assert.ok(
    ESSENTIALS_STARTER_TEMPLATE.some(
      (e) => e.kind === "kua" && e.title.includes("SIMKAH")
    )
  );
  assert.ok(
    ESSENTIALS_STARTER_TEMPLATE.some(
      (e) => e.kind === "kua" && e.title.includes("Elsimil")
    )
  );
  assert.ok(JOURNAL_PROMPTS.length >= 5);
  assert.ok(FIQH_GUIDES.length >= 7);
  const kuaGuide = FIQH_GUIDES.find((g) => g.id === "alur-kua");
  assert.ok(kuaGuide);
  assert.match(kuaGuide.reference, /PMA No\. 30 Tahun 2024/);
  assert.equal(kuaGuide.referenceUrl, "https://simkah4.kemenag.go.id");
});
