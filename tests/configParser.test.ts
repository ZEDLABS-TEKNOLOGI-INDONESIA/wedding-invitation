import assert from "node:assert/strict";
import { test } from "node:test";
import { parseConfig } from "../src/utils/configParser.ts";

test("parseConfig memparsing data valid termasuk field baru", () => {
  const cfg = parseConfig({
    BRIDE_NICKNAME: "Fey",
    GROOM_NICKNAME: "Yaya",
    VENUE_LAT: "-6.3032707",
    VENUE_LNG: "106.1011039",
    EVENT_TIMEZONE: "WITA",
    GIFT_ADDRESS: "Jl. Mawar No. 10",
    ENVELOPE_IMAGE: "/api/media/cover.jpg",
    PUBLIC_THEME: "blush",
    PUBLIC_DEFAULT_MODE: "dark",
    PUBLIC_ALLOW_THEME_SWITCH: "false",
    RSVP_MAX_GUESTS: "15",
    BANK_ACCOUNTS: JSON.stringify([
      { bank: "BCA", number: "12345", name: "Fey" },
    ]),
    LOVE_STORY: JSON.stringify([
      { date: "2022", title: "Bertemu", desc: "Kisah awal" },
    ]),
    GALLERY_IMAGES: JSON.stringify(["/api/media/1.jpg"]),
  });

  assert.equal(cfg.couple.bride.name, "Fey");
  assert.equal(cfg.events.timezone, "WITA");
  assert.equal(cfg.gift.address, "Jl. Mawar No. 10");
  assert.equal(cfg.hero.envelopeImage, "/api/media/cover.jpg");
  assert.equal(cfg.appearance.theme, "blush");
  assert.equal(cfg.appearance.defaultMode, "dark");
  assert.equal(cfg.appearance.allowGuestThemeSwitch, false);
  assert.equal(cfg.rsvp.maxGuests, 15);
  assert.equal(cfg.bankAccounts.length, 1);
  assert.equal(cfg.loveStory.length, 1);
  assert.deepEqual(cfg.galleryImages, ["/api/media/1.jpg"]);
});

test("parseConfig tahan terhadap JSON bukan array, NaN, dan Invalid Date", () => {
  const cfg = parseConfig({
    VENUE_LAT: "bukan-angka",
    VENUE_LNG: "",
    RSVP_MAX_GUESTS: "-5",
    AKAD_ISO_START: "tanggal-rusak",
    BANK_ACCOUNTS: '{"not":"an-array"}',
    LOVE_STORY: "123",
    GALLERY_IMAGES: "{invalid",
  });

  assert.equal(cfg.venue.latitude, 0);
  assert.equal(cfg.venue.longitude, 0);
  assert.equal(cfg.rsvp.maxGuests, 10);
  assert.equal(Number.isNaN(cfg.events.akad.startDateTime.getTime()), false);
  assert.deepEqual(cfg.bankAccounts, []);
  assert.deepEqual(cfg.loveStory, []);
  assert.deepEqual(cfg.galleryImages, []);
});
