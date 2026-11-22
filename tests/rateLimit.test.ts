import assert from "node:assert/strict";
import { test } from "node:test";
import { checkRateLimit, getClientIp } from "../src/lib/rateLimit.ts";

test("checkRateLimit membatasi permintaan per namespace dan mengizinkan namespace lain", () => {
  const keyA = `test-a-${Date.now()}`;
  const keyB = `test-b-${Date.now()}`;

  assert.equal(checkRateLimit(keyA, 2, 60_000), true);
  assert.equal(checkRateLimit(keyA, 2, 60_000), true);
  assert.equal(checkRateLimit(keyA, 2, 60_000), false);
  assert.equal(checkRateLimit(keyB, 2, 60_000), true);
});

test("getClientIp membaca header proxy hanya jika koneksi berasal dari loopback", () => {
  const req = new Request("http://localhost/api/rsvp", {
    headers: {
      "x-real-ip": "203.0.113.10",
      "x-forwarded-for": "198.51.100.5, 127.0.0.1",
    },
  });

  assert.equal(getClientIp(req, "127.0.0.1"), "203.0.113.10");
  assert.equal(getClientIp(req, "::1"), "203.0.113.10");
  // Jika bukan dari loopback, abaikan header proxy spoofed
  assert.equal(getClientIp(req, "192.0.2.99"), "192.0.2.99");
});
