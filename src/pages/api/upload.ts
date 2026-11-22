import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import type { APIRoute } from "astro";
import { isAdminAuthenticated } from "../../lib/auth";

const JSON_HEADERS = {
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
};

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // 5 MB
const UPLOAD_DIR = path.resolve(process.cwd(), "database", "uploads");

const detectImageExt = (buf: Buffer): "jpg" | "png" | "webp" | null => {
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

    if (!(file instanceof File)) {
      return new Response(
        JSON.stringify({ error: "File gambar tidak ditemukan." }),
        { status: 400, headers: JSON_HEADERS }
      );
    }

    if (file.size === 0 || file.size > MAX_UPLOAD_BYTES) {
      return new Response(
        JSON.stringify({
          error: "Ukuran gambar harus antara 1 byte sampai 5 MB.",
        }),
        { status: 400, headers: JSON_HEADERS }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = detectImageExt(buffer);
    if (!ext) {
      return new Response(
        JSON.stringify({
          error: "Format file tidak didukung. Gunakan JPG, PNG, atau WebP.",
        }),
        { status: 400, headers: JSON_HEADERS }
      );
    }

    if (!fs.existsSync(UPLOAD_DIR)) {
      fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    }

    const filename = `img-${Date.now()}-${crypto.randomBytes(6).toString("hex")}.${ext}`;
    const targetPath = path.join(UPLOAD_DIR, filename);
    fs.writeFileSync(targetPath, buffer);

    return new Response(
      JSON.stringify({
        success: true,
        filename,
        url: `/api/media/${filename}`,
      }),
      { status: 200, headers: JSON_HEADERS }
    );
  } catch (err) {
    console.error("Image upload error:", err);
    return new Response(
      JSON.stringify({ error: "Gagal mengunggah file gambar." }),
      { status: 500, headers: JSON_HEADERS }
    );
  }
};
