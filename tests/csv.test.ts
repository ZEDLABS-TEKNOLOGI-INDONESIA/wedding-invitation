import assert from "node:assert/strict";
import { test } from "node:test";
import { escapeCsvCell } from "../src/utils/csv.ts";

test("escapeCsvCell membungkus nilai normal dan escape tanda kutip", () => {
  assert.equal(escapeCsvCell("Bpk. Ahmad"), '"Bpk. Ahmad"');
  assert.equal(escapeCsvCell('Doa "terbaik"'), '"Doa ""terbaik"""');
  assert.equal(escapeCsvCell("Baris 1\nBaris 2"), '"Baris 1 Baris 2"');
  assert.equal(escapeCsvCell(null), '""');
  assert.equal(escapeCsvCell(undefined), '""');
});

test("escapeCsvCell mencegah CSV Formula Injection", () => {
  assert.equal(escapeCsvCell("=SUM(A1:A10)"), '"\'=SUM(A1:A10)"');
  assert.equal(escapeCsvCell("+628123456789"), '"\'+628123456789"');
  assert.equal(escapeCsvCell("-cmd|' /C calc'!A0"), '"\'-cmd|\' /C calc\'!A0"');
  assert.equal(escapeCsvCell("@HYPERLINK(1)"), '"\'@HYPERLINK(1)"');
});
