import assert from "node:assert/strict";
import { test } from "node:test";
import {
  hashPassword,
  isValidUsername,
  isValidWeddingSlug,
  normalizeUsername,
  normalizeWeddingSlug,
  validatePasswordStrength,
  verifyPasswordHash,
} from "../src/lib/password.ts";
import { PLATFORM_WA_TEMPLATES } from "../src/lib/whatsapp.ts";

test("hashPassword dan verifyPasswordHash menggunakan scrypt + salt acak", () => {
  const h1 = hashPassword("rahasia123");
  const h2 = hashPassword("rahasia123");
  assert.notEqual(h1, h2, "Salt harus unik tiap hash");
  assert.equal(verifyPasswordHash("rahasia123", h1), true);
  assert.equal(verifyPasswordHash("rahasia123", h2), true);
  assert.equal(verifyPasswordHash("salah123", h1), false);
  assert.equal(verifyPasswordHash("", h1), false);
});

test("validasi username dan slug undangan menolak kata terlarang", () => {
  assert.equal(normalizeUsername("  Fera_01 "), "fera_01");
  assert.equal(isValidUsername("fera_01"), true);
  assert.equal(isValidUsername("ab"), false);
  assert.equal(isValidUsername("ada spasi"), false);

  assert.equal(normalizeWeddingSlug("Fera & Yahya!"), "fera-yahya");
  assert.equal(isValidWeddingSlug("fera-yahya"), true);
  assert.equal(isValidWeddingSlug("admin"), false);
  assert.equal(isValidWeddingSlug("superadmin"), false);
  assert.equal(isValidWeddingSlug("demo"), false);
  assert.equal(isValidWeddingSlug("api"), false);

  assert.equal(validatePasswordStrength("12345"), "Password minimal 6 karakter.");
  assert.equal(validatePasswordStrength("123456"), null);
});

test("template OTP platform memenuhi aturan anti-spam gateway (2-10 varian, tanpa !!)", () => {
  const tpl = PLATFORM_WA_TEMPLATES.wedding_auth_otp;
  assert.ok(tpl && tpl.varian.length >= 2);
  for (const v of tpl.varian) {
    const rendered = v
      .replace("{{kode_otp}}", "482910")
      .replace("{{keperluan}}", "pendaftaran akun undangan")
      .replace("{{berlaku_menit}}", "10");
    assert.ok(!/!{2,}/.test(rendered));
    assert.ok(!rendered.includes("{{"));
  }
});
