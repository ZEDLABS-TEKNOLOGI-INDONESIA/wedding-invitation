import assert from "node:assert/strict";
import test from "node:test";
import {
  parseBankAccountsText,
  parseConfigCsvText,
  parseGuestsText,
  parseLoveStoryText,
  parseRsvpsText,
  parseWishesText,
} from "../src/utils/csvImport.ts";

test("parseGuestsText mendukung koma, titik koma Excel ID, dan paste Tab dari Excel", () => {
  const excelSemicolon =
    "Nama Tamu;No WhatsApp;Alamat;Grup;Kuota\nBpk. Ahmad;08123456789;Jakarta;Keluarga;3\nRina;;Bandung;Sahabat;2";
  const res1 = parseGuestsText(excelSemicolon);
  assert.equal(res1.rows.length, 2);
  assert.deepEqual(res1.rows[0], {
    name: "Bpk. Ahmad",
    phone: "08123456789",
    address: "Jakarta",
    group_name: "Keluarga",
    quota: 3,
  });
  assert.equal(res1.rows[1].address, "Bandung");

  const pastedTab = "Budi Santoso\t0856111222\tSurabaya\nSiti Aminah";
  const res2 = parseGuestsText(pastedTab);
  assert.equal(res2.rows.length, 2);
  assert.equal(res2.rows[0].phone, "0856111222");
  assert.equal(res2.rows[1].address, "Di Tempat");
  assert.equal(res2.rows[1].quota, 2);
});

test("parseRsvpsText menormalisasi status kehadiran Indonesia/Inggris", () => {
  const csv = [
    "Nama Tamu,WhatsApp,Status,Pax,Pesan",
    "Andi,08123456789,Hadir,2,Selamat ya!",
    "Budi,08999999999,Tidak Hadir,3,Maaf berhalangan",
    "Citra,,Masih Ragu,1,InsyaAllah usahakan",
  ].join("\n");

  const res = parseRsvpsText(csv);
  assert.equal(res.rows.length, 3);
  assert.deepEqual(res.rows[0], {
    guest_name: "Andi",
    phone: "08123456789",
    attendance: "hadir",
    guest_count: 2,
    message: "Selamat ya!",
  });
  assert.equal(res.rows[1].attendance, "tidak_hadir");
  assert.equal(res.rows[1].guest_count, 0);
  assert.equal(res.rows[2].attendance, "ragu");
  assert.equal(res.rows[2].guest_count, 0);
});

test("parseWishesText, parseBankAccountsText, parseLoveStoryText, dan parseConfigCsvText memparsing dengan akurat", () => {
  const wishes = parseWishesText(
    "Nama Pengirim,Ucapan\nDewi,Semoga samawa!\nKosong,"
  );
  assert.equal(wishes.rows.length, 1);
  assert.equal(wishes.skipped, 1);

  const banks = parseBankAccountsText(
    "Bank;No Rekening;Atas Nama\nBank BCA;1234567890;Fera Oktapia"
  );
  assert.deepEqual(banks.rows, [
    { bank: "Bank BCA", number: "1234567890", name: "Fera Oktapia" },
  ]);

  const story = parseLoveStoryText(
    "Tahun,Judul,Cerita\n2020,Awal Pertemuan,Bertemu di kampus"
  );
  assert.deepEqual(story.rows, [
    { date: "2020", title: "Awal Pertemuan", desc: "Bertemu di kampus" },
  ]);

  const cfg = parseConfigCsvText(
    "Key,Value\nBRIDE_NICKNAME,Fey\nUNKNOWN_KEY,abc",
    new Set(["BRIDE_NICKNAME"])
  );
  assert.deepEqual(cfg.rows, [{ key: "BRIDE_NICKNAME", value: "Fey" }]);
  assert.equal(cfg.skipped, 1);
  assert.equal(cfg.warnings.length, 1);
});
