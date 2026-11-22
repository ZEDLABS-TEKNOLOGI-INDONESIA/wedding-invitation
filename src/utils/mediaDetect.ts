export type ImageExt = "jpg" | "png" | "webp";
export type AudioExt = "mp3" | "ogg" | "wav" | "m4a";
export type MediaExt = ImageExt | AudioExt;

export const MEDIA_MIME_MAP: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".mp3": "audio/mpeg",
  ".ogg": "audio/ogg",
  ".wav": "audio/wav",
  ".m4a": "audio/mp4",
};

export const detectImageExt = (buf: Buffer): ImageExt | null => {
  if (buf.length < 12) return null;
  // JPEG: FF D8 FF
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "jpg";
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47 &&
    buf[4] === 0x0d &&
    buf[5] === 0x0a &&
    buf[6] === 0x1a &&
    buf[7] === 0x0a
  ) {
    return "png";
  }
  // WebP: RIFF....WEBP
  if (
    buf.toString("ascii", 0, 4) === "RIFF" &&
    buf.toString("ascii", 8, 12) === "WEBP"
  ) {
    return "webp";
  }
  return null;
};

export const detectAudioExt = (buf: Buffer): AudioExt | null => {
  if (buf.length < 12) return null;

  // MP3 with ID3v2 tag: "ID3"
  if (buf[0] === 0x49 && buf[1] === 0x44 && buf[2] === 0x33) {
    return "mp3";
  }

  // MP3 raw MPEG audio frame sync: 11 set bits (0xFF followed by 0xE0..0xFF, excluding invalid layer 00)
  if (
    buf[0] === 0xff &&
    (buf[1] & 0xe0) === 0xe0 &&
    (buf[1] & 0x06) !== 0x00
  ) {
    return "mp3";
  }

  // OGG container: "OggS"
  if (buf.toString("ascii", 0, 4) === "OggS") {
    return "ogg";
  }

  // WAV: RIFF....WAVE
  if (
    buf.toString("ascii", 0, 4) === "RIFF" &&
    buf.toString("ascii", 8, 12) === "WAVE"
  ) {
    return "wav";
  }

  // M4A / MP4 audio: ISO Base Media File Format "ftyp" at offset 4
  if (buf.toString("ascii", 4, 8) === "ftyp") {
    const brand = buf.toString("ascii", 8, 12);
    if (
      brand === "M4A " ||
      brand === "M4B " ||
      brand === "mp42" ||
      brand === "isom" ||
      brand === "iso2"
    ) {
      return "m4a";
    }
  }

  return null;
};
