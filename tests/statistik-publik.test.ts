import assert from "node:assert/strict";
import crypto from "node:crypto";
import test from "node:test";
import { resetReplayUntukTes, verifikasiHMACv2 } from "../src/lib/statistikHmac.ts";

function buatRequestBertanda(keyID: string, secret: string, ts?: number, nonce?: string): Request {
  const waktu = String(ts ?? Math.floor(Date.now() / 1000));
  const n = nonce ?? crypto.randomBytes(16).toString("hex");
  const bodyHash = crypto.createHash("sha256").update("", "utf8").digest("hex");
  const kanonik = `GET\n/statistik/publik\n${waktu}\n${n}\n${bodyHash}`;
  const sig = crypto.createHmac("sha256", secret).update(kanonik, "utf8").digest("hex");

  return new Request("https://wedding.zedlabs.id/statistik/publik", {
    method: "GET",
    headers: {
      "X-API-Key": keyID,
      "X-Timestamp": waktu,
      "X-Nonce": n,
      "X-Signature-Version": "2",
      "X-Signature": sig,
    },
  });
}

test("verifikasiHMACv2 menerima tanda tangan sah dan menolak replay", () => {
  resetReplayUntukTes();
  const key = "key_wedding_uji";
  const secret = "rahasia_wedding_minimal_32_karakter_1234";
  const req = buatRequestBertanda(key, secret);

  const pertama = verifikasiHMACv2(req, key, secret);
  assert.equal(pertama.sah, true);

  const replay = verifikasiHMACv2(req, key, secret);
  assert.equal(replay.sah, false);
});

test("verifikasiHMACv2 menolak rahasia salah dan timestamp kedaluwarsa", () => {
  resetReplayUntukTes();
  const key = "key_wedding_uji";
  const secret = "rahasia_wedding_minimal_32_karakter_1234";

  const salah = buatRequestBertanda(key, "rahasia_salah");
  assert.equal(verifikasiHMACv2(salah, key, secret).sah, false);

  const lama = buatRequestBertanda(key, secret, Math.floor(Date.now() / 1000) - 600);
  assert.equal(verifikasiHMACv2(lama, key, secret).sah, false);
});
