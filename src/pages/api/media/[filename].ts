import fs from "node:fs";
import path from "node:path";
import type { APIRoute } from "astro";

const UPLOAD_DIR = path.resolve(process.cwd(), "database", "uploads");
const SAFE_FILENAME = /^[a-zA-Z0-9._-]+$/;

const MIME_MAP: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

export const GET: APIRoute = async ({ params }) => {
  const rawName = params.filename || "";
  const safeName = path.basename(rawName);

  if (!safeName || !SAFE_FILENAME.test(safeName)) {
    return new Response("Not Found", { status: 404 });
  }

  const ext = path.extname(safeName).toLowerCase();
  const contentType = MIME_MAP[ext];
  if (!contentType) {
    return new Response("Not Found", { status: 404 });
  }

  const fullPath = path.join(UPLOAD_DIR, safeName);
  if (!fullPath.startsWith(UPLOAD_DIR) || !fs.existsSync(fullPath)) {
    return new Response("Not Found", { status: 404 });
  }

  try {
    const fileBuffer = fs.readFileSync(fullPath);
    return new Response(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response("Internal Server Error", { status: 500 });
  }
};
