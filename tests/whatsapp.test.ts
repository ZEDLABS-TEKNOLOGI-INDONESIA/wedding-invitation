import assert from "node:assert/strict";
import { test } from "node:test";
import {
  WEDDING_WA_TEMPLATES,
  isEligibleForH1Reminder,
  isWithinH1ReminderWindow,
  normalizeWaPhone,
  parseAdminWaNumbers,
  sanitizeWaVariable,
  signRequestV2,
} from "../src/lib/whatsapp.ts";

test("signRequestV2 cocok dengan vektor uji whatsapp-service", () => {
  const expected =
    "e5e42663e51d1e4974df313e4bde16c845ba908e86b8cead57c9763be1e2ad1e";
  const actual = signRequestV2(
    "rahasia-uji",
    "POST",
    "/api/v1/messages?x=1",
    "1751875200",
    "abcdef123456",
    '{"a":1}'
  );
  assert.equal(actual, expected);
});

test("normalizeWaPhone dan parseAdminWaNumbers menormalisasi format nomor Indonesia", () => {
  assert.equal(normalizeWaPhone("0812-3456-7890"), "6281234567890");
  assert.equal(normalizeWaPhone("+62 812 3456 7890"), "6281234567890");
  assert.equal(normalizeWaPhone("12345"), "");
  assert.deepEqual(
    parseAdminWaNumbers("081234567890, +6281234567890; 089876543210"),
    ["6281234567890", "6289876543210"]
  );
});

test("sanitizeWaVariable menjaga teks lolos aturan anti-spam gateway", () => {
  assert.equal(sanitizeWaVariable(""), "-");
  assert.equal(sanitizeWaVariable("Selamat ya!!!"), "Selamat ya!");
  assert.equal(
    sanitizeWaVariable("SELAMAT MENEMPUH HIDUP BARU"),
    "Selamat menempuh hidup baru"
  );
  assert.equal(
    sanitizeWaVariable("Cek https://spam.example.com sekarang"),
    "Cek [tautan] sekarang"
  );
});

test("seluruh 5 template (15 varian) memenuhi aturan ValidasiFormatTerlarang gateway", () => {
  const sampleVars: Record<string, string> = {
    nama_tamu: "Bapak Ahmad",
    mempelai: "Fey & Yaya",
    tanggal_acara: "Minggu, 11 Oktober 2025",
    waktu_acara: "08:00 - 10:00 WIB",
    tempat_acara: "The Royal Azure Ballroom, Pandeglang",
    link_undangan: "https://wedding.zedlabs.id/?to=Bapak%20Ahmad",
    link_maps: "https://www.google.com/maps/search/?api=1&query=-6.3,106.1",
    aksi: "baru",
    status_kehadiran: "Hadir",
    jumlah_tamu: "2 orang",
    kontak: "081234567890",
    pesan: "Semoga sakinah mawaddah warahmah",
    nama_pengirim: "Bapak Ahmad",
    ucapan: "Selamat menempuh hidup baru",
  };

  for (const [code, tpl] of Object.entries(WEDDING_WA_TEMPLATES)) {
    assert.ok(
      tpl.varian.length >= 2 && tpl.varian.length <= 10,
      `${code} harus memiliki 2-10 varian`
    );
    for (const [idx, v] of tpl.varian.entries()) {
      const rendered = v.replace(/\{\{(\w+)\}\}/g, (_, k: string) => {
        assert.ok(
          tpl.variabel_wajib.includes(k),
          `${code} varian ${idx + 1}: placeholder {{${k}}} tidak ada di variabel_wajib`
        );
        return sampleVars[k];
      });
      assert.ok(
        !/!{2,}/.test(rendered),
        `${code} varian ${idx + 1} mengandung tanda seru berurutan`
      );
      assert.ok(
        (rendered.match(/https?:\/\/\S+/g) || []).length <= 1,
        `${code} varian ${idx + 1} mengandung lebih dari 1 link`
      );
      for (const sentence of rendered.split(/[.!?]+\s*/)) {
        const letters = (sentence.match(/[A-Za-z]/g) || []).length;
        const upper = (sentence.match(/[A-Z]/g) || []).length;
        assert.ok(
          letters === 0 || upper / letters <= 0.7,
          `${code} varian ${idx + 1} melebihi 70% kapital: "${sentence}"`
        );
      }
    }
  }
});

test("isEligibleForH1Reminder menyertakan hadir & ragu, mengecualikan tidak_hadir dan yang sudah terkirim", () => {
  assert.equal(
    isEligibleForH1Reminder({
      attendance: "hadir",
      phone: "081234567890",
      reminder_sent_at: "",
    }),
    true
  );
  assert.equal(
    isEligibleForH1Reminder({
      attendance: "ragu",
      phone: "+62 812-3456-7890",
      reminder_sent_at: null,
    }),
    true
  );
  assert.equal(
    isEligibleForH1Reminder({
      attendance: "tidak_hadir",
      phone: "081234567890",
      reminder_sent_at: "",
    }),
    false
  );
  assert.equal(
    isEligibleForH1Reminder({
      attendance: "hadir",
      phone: "081234567890",
      reminder_sent_at: "2025-10-10T08:00:00.000Z",
    }),
    false
  );
  assert.equal(
    isEligibleForH1Reminder({
      attendance: "hadir",
      phone: "",
      reminder_sent_at: "",
    }),
    false
  );
});

test("isWithinH1ReminderWindow aktif hanya antara 36 jam sampai 2 jam sebelum acara", () => {
  const eventIso = "2026-12-20T08:00:00+07:00";
  // 24 jam sebelum acara (H-1) -> aktif
  assert.equal(
    isWithinH1ReminderWindow(eventIso, new Date("2026-12-19T08:00:00+07:00")),
    true
  );
  // 5 hari sebelum acara -> belum aktif
  assert.equal(
    isWithinH1ReminderWindow(eventIso, new Date("2026-12-15T08:00:00+07:00")),
    false
  );
  // 1 jam sebelum acara -> terlalu dekat / sudah lewat jendela
  assert.equal(
    isWithinH1ReminderWindow(eventIso, new Date("2026-12-20T07:00:00+07:00")),
    false
  );
  // Setelah acara -> tidak aktif
  assert.equal(
    isWithinH1ReminderWindow(eventIso, new Date("2026-12-21T08:00:00+07:00")),
    false
  );
});
