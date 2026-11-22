import assert from "node:assert/strict";
import test from "node:test";
import {
  buildEventScheduleFields,
  cleanInstagramHandle,
  extractCoordsFromMapsUrl,
  formatIndonesianDate,
  parseIsoToSchedule,
} from "../src/utils/formHelpers.ts";

test("extractCoordsFromMapsUrl mengekstrak koordinat dari berbagai format Google Maps dan koordinat mentah", () => {
  assert.deepEqual(
    extractCoordsFromMapsUrl(
      "https://www.google.com/maps/place/Royal+Ballroom/@-6.3032707,106.1011039,17z"
    ),
    { lat: "-6.3032707", lng: "106.1011039" }
  );

  assert.deepEqual(
    extractCoordsFromMapsUrl(
      "https://www.google.com/maps/place/Test/data=!3m1!4b1!4m6!3m5!1s0x0!8m2!3d-6.2088!4d106.8456"
    ),
    { lat: "-6.2088", lng: "106.8456" }
  );

  assert.deepEqual(
    extractCoordsFromMapsUrl(
      "https://www.google.com/maps/search/?api=1&query=-7.7956,110.3695"
    ),
    { lat: "-7.7956", lng: "110.3695" }
  );

  assert.deepEqual(extractCoordsFromMapsUrl("-6.3032707, 106.1011039"), {
    lat: "-6.3032707",
    lng: "106.1011039",
  });

  assert.equal(extractCoordsFromMapsUrl("https://maps.app.goo.gl/abc"), null);
  assert.equal(extractCoordsFromMapsUrl("95.123, 200.456"), null);
});

test("cleanInstagramHandle membersihkan @ dan URL instagram", () => {
  assert.equal(cleanInstagramHandle("@zulfikriyahya_"), "zulfikriyahya_");
  assert.equal(
    cleanInstagramHandle("https://www.instagram.com/feraoktapia___/?hl=id"),
    "feraoktapia___"
  );
  assert.equal(
    cleanInstagramHandle("https://instagram.com/zedlabs.id/"),
    "zedlabs.id"
  );
});

test("buildEventScheduleFields dan parseIsoToSchedule sinkron dua arah", () => {
  assert.deepEqual(formatIndonesianDate("2025-10-12"), {
    day: "Minggu",
    date: "12 Oktober 2025",
  });

  const fields = buildEventScheduleFields(
    "AKAD",
    "2025-10-12",
    "08:00",
    "10:00",
    "WITA"
  );
  assert.deepEqual(fields, {
    AKAD_DAY: "Minggu",
    AKAD_DATE: "12 Oktober 2025",
    AKAD_START: "08:00",
    AKAD_END: "10:00",
    AKAD_ISO_START: "2025-10-12T08:00:00+08:00",
    AKAD_ISO_END: "2025-10-12T10:00:00+08:00",
  });

  assert.deepEqual(
    parseIsoToSchedule(
      fields.AKAD_ISO_START,
      fields.AKAD_ISO_END,
      fields.AKAD_START,
      fields.AKAD_END
    ),
    {
      dateYmd: "2025-10-12",
      startTime: "08:00",
      endTime: "10:00",
    }
  );
});
