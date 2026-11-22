import fs from "node:fs";
import path from "node:path";
import type { APIRoute } from "astro";
import { MEDIA_MIME_MAP } from "../../../utils/mediaDetect";

const UPLOAD_DIR = path.resolve(process.cwd(), "database", "uploads");
const SAFE_FILENAME = /^[a-zA-Z0-9._-]+$/;

export const GET: APIRoute = async ({ params, request }) => {
  const rawName = params.filename || "";
  const safeName = path.basename(rawName);

  if (!safeName || !SAFE_FILENAME.test(safeName)) {
    return new Response("Not Found", { status: 404 });
  }

  const ext = path.extname(safeName).toLowerCase();
  const contentType = MEDIA_MIME_MAP[ext];
  if (!contentType) {
    return new Response("Not Found", { status: 404 });
  }

  const fullPath = path.join(UPLOAD_DIR, safeName);
  if (!fullPath.startsWith(UPLOAD_DIR) || !fs.existsSync(fullPath)) {
    return new Response("Not Found", { status: 404 });
  }

  try {
    const stat = fs.statSync(fullPath);
    const totalSize = stat.size;
    const rangeHeader = request.headers.get("range");

    if (rangeHeader && rangeHeader.startsWith("bytes=")) {
      const [startStr, endStr] = rangeHeader.replace(/^bytes=/, "").split("-");
      const start = startStr ? parseInt(startStr, 10) : 0;
      const end = endStr ? parseInt(endStr, 10) : totalSize - 1;

      if (
        Number.isNaN(start) ||
        Number.isNaN(end) ||
        start < 0 ||
        end >= totalSize ||
        start > end
      ) {
        return new Response("Range Not Satisfiable", {
          status: 416,
          headers: { "Content-Range": `bytes */${totalSize}` },
        });
      }

      const chunkSize = end - start + 1;
      const fd = fs.openSync(fullPath, "r");
      const chunk = Buffer.alloc(chunkSize);
      try {
        fs.readSync(fd, chunk, 0, chunkSize, start);
      } finally {
        fs.closeSync(fd);
      }

      return new Response(chunk, {
        status: 206,
        headers: {
          "Content-Type": contentType,
          "Content-Range": `bytes ${start}-${end}/${totalSize}`,
          "Accept-Ranges": "bytes",
          "Content-Length": String(chunkSize),
          "Cache-Control": "public, max-age=31536000, immutable",
          "X-Content-Type-Options": "nosniff",
        },
      });
    }

    const fileBuffer = fs.readFileSync(fullPath);
    return new Response(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Accept-Ranges": "bytes",
        "Content-Length": String(totalSize),
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response("Internal Server Error", { status: 500 });
  }
};
