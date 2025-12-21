import type { APIRoute } from "astro";
import fs from "node:fs";
import path from "node:path";
import { getBackupPath } from "../../lib/db";

export const GET: APIRoute = async ({ url, cookies }) => {
  const auth = cookies.get("wedding_admin_auth")?.value;
  if (auth !== "true") return new Response("Unauthorized", { status: 401 });

  const filename = url.searchParams.get("file");
  if (!filename) return new Response("Filename missing", { status: 400 });

  const filePath = path.join(getBackupPath(), filename);

  if (!fs.existsSync(filePath)) {
    return new Response("File not found", { status: 404 });
  }

  const fileBuffer = fs.readFileSync(filePath);

  return new Response(fileBuffer, {
    status: 200,
    headers: {
      "Content-Type": "application/x-sqlite3",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
};
