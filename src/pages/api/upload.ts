import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import type { APIRoute } from "astro";
import { isAdminAuthenticated } from "../../lib/auth";
import { detectAudioExt, detectImageExt } from "../../utils/mediaDetect";

const JSON_HEADERS = {
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
};

const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB
const MAX_AUDIO_BYTES = 15 * 1024 * 1024; // 15 MB
const UPLOAD_DIR = path.resolve(process.cwd(), "database", "uploads");

export const POST: APIRoute = async ({ request, cookies }) => {
  if (!isAdminAuthenticated(cookies)) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: JSON_HEADERS,
    });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const requestedKind =
      typeof formData.get("kind") === "string"
        ? String(formData.get("kind")).toLowerCase()
        : "image";

    if (!(file instanceof File)) {
      return new Response(
        JSON.stringify({ error: "File tidak ditemukan dalam permintaan." }),
        { status: 400, headers: JSON_HEADERS }
      );
    }

    const isAudioMode = requestedKind === "audio";
    const maxBytes = isAudioMode ? MAX_AUDIO_BYTES : MAX_IMAGE_BYTES;

    if (file.size === 0 || file.size > maxBytes) {
      return new Response(
        JSON.stringify({
          error: isAudioMode
            ? "Ukuran audio harus antara 1 byte sampai 15 MB."
            : "Ukuran gambar harus antara 1 byte sampai 5 MB.",
        }),
        { status: 400, headers: JSON_HEADERS }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = isAudioMode
      ? detectAudioExt(buffer)
      : detectImageExt(buffer);

    if (!ext) {
      return new Response(
        JSON.stringify({
          error: isAudioMode
            ? "Format audio tidak didukung. Gunakan MP3, M4A, OGG, atau WAV."
            : "Format gambar tidak didukung. Gunakan JPG, PNG, atau WebP.",
        }),
        { status: 400, headers: JSON_HEADERS }
      );
    }

    if (!fs.existsSync(UPLOAD_DIR)) {
      fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    }

    const prefix = isAudioMode ? "audio" : "img";
    const filename = `${prefix}-${Date.now()}-${crypto.randomBytes(6).toString("hex")}.${ext}`;
    const targetPath = path.join(UPLOAD_DIR, filename);
    fs.writeFileSync(targetPath, buffer);

    return new Response(
      JSON.stringify({
        success: true,
        kind: isAudioMode ? "audio" : "image",
        filename,
        size: file.size,
        url: `/api/media/${filename}`,
      }),
      { status: 200, headers: JSON_HEADERS }
    );
  } catch (err) {
    console.error("Media upload error:", err);
    return new Response(
      JSON.stringify({ error: "Gagal mengunggah file media." }),
      { status: 500, headers: JSON_HEADERS }
    );
  }
};
