import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  DOMAIN_UTAMA,
  ambilHostPermintaan,
  apakahHostUtamaAtauLokal,
  normalkanDomain,
  validasiDomainKustom,
} from "../src/lib/domainUtils.ts";

describe("Resolusi Domain Kustom (DomainInstansi)", () => {
  it("menormalkan hostname dengan protokol, port, spasi, dan titik akhir", () => {
    assert.equal(
      normalkanDomain("  HTTPS://Undangan.Pasangan.ID:443/path?x=1 "),
      "undangan.pasangan.id"
    );
    assert.equal(
      normalkanDomain("undangan.klien.id., proxy.local"),
      "undangan.klien.id"
    );
  });

  it("mengenali host utama dan host lokal dengan benar", () => {
    assert.equal(apakahHostUtamaAtauLokal(DOMAIN_UTAMA), true);
    assert.equal(apakahHostUtamaAtauLokal("localhost"), true);
    assert.equal(apakahHostUtamaAtauLokal("127.0.0.1"), true);
    assert.equal(apakahHostUtamaAtauLokal("undangan.klien.id"), false);
  });

  it("memvalidasi format domain kustom dan menolak domain utama/IP", () => {
    assert.deepEqual(validasiDomainKustom(""), { domain: null });
    assert.deepEqual(validasiDomainKustom("Undangan.Klien.ID"), {
      domain: "undangan.klien.id",
    });
    assert.ok(validasiDomainKustom(DOMAIN_UTAMA).error);
    assert.ok(validasiDomainKustom("192.168.1.10").error);
    assert.ok(validasiDomainKustom("bukan_domain").error);
  });

  it("memprioritaskan X-Forwarded-Host lalu Host header", () => {
    const req = new Request("http://127.0.0.1:4321/", {
      headers: {
        "x-forwarded-host": "Undangan.Contoh.ID:443",
        host: "127.0.0.1:4321",
      },
    });
    assert.equal(ambilHostPermintaan(req), "undangan.contoh.id");
  });
});
