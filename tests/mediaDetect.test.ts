import assert from "node:assert/strict";
import test from "node:test";
import { detectAudioExt, detectImageExt } from "../src/utils/mediaDetect.ts";

test("detectImageExt mengenali JPG, PNG, WebP dan menolak file tidak valid", () => {
  const jpg = Buffer.from([
    0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0,
  ]);
  assert.equal(detectImageExt(jpg), "jpg");

  const png = Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0,
  ]);
  assert.equal(detectImageExt(png), "png");

  const webp = Buffer.from("RIFF0000WEBP", "ascii");
  assert.equal(detectImageExt(webp), "webp");

  assert.equal(detectImageExt(Buffer.from("hello world!!")), null);
});

test("detectAudioExt mengenali MP3 (ID3 & sync), OGG, WAV, M4A dan menolak file lain", () => {
  const mp3Id3 = Buffer.from("ID3\x03\x00\x00\x00\x00\x00\x00\x00\x00", "binary");
  assert.equal(detectAudioExt(mp3Id3), "mp3");

  const mp3Sync = Buffer.from([
    0xff, 0xfb, 0x90, 0x64, 0, 0, 0, 0, 0, 0, 0, 0,
  ]);
  assert.equal(detectAudioExt(mp3Sync), "mp3");

  const ogg = Buffer.from("OggS00000000", "ascii");
  assert.equal(detectAudioExt(ogg), "ogg");

  const wav = Buffer.from("RIFF0000WAVE", "ascii");
  assert.equal(detectAudioExt(wav), "wav");

  const m4a = Buffer.from("\x00\x00\x00\x20ftypM4A ", "binary");
  assert.equal(detectAudioExt(m4a), "m4a");

  // Pastikan gambar PNG tidak dianggap audio
  const png = Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0,
  ]);
  assert.equal(detectAudioExt(png), null);
});
