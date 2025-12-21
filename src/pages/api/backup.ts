import type { APIRoute } from "astro";
import path from "node:path";
import db, { getBackupPath } from "../../lib/db";

export const POST: APIRoute = async ({ cookies }) => {
  const auth = cookies.get("wedding_admin_auth")?.value;
  if (auth !== "true") {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
    });
  }

  // Generate Filename
  const date = new Date();
  const timestamp =
    date.getFullYear() +
    "-" +
    String(date.getMonth() + 1).padStart(2, "0") +
    "-" +
    String(date.getDate()).padStart(2, "0") +
    "_" +
    String(date.getHours()).padStart(2, "0") +
    String(date.getMinutes()).padStart(2, "0") +
    String(date.getSeconds()).padStart(2, "0");

  const fileName = `snapshot_${timestamp}.db`;
  const backupFilePath = path.join(getBackupPath(), fileName);

  try {
    // 1. Lakukan Backup Native SQLite ke folder /database/backup/
    // Fungsi ini otomatis menggabungkan .wal + .db menjadi satu file bersih.
    await db.backup(backupFilePath);

    // 2. Catat di History
    db.prepare(
      "INSERT INTO backup_history (action_type, filename, status, details) VALUES (?, ?, ?, ?)",
    ).run("BACKUP", fileName, "SUCCESS", "Disimpan di Server");

    return new Response(JSON.stringify({ success: true, filename: fileName }), {
      status: 200,
    });
  } catch (error: any) {
    console.error("Backup Failed:", error);

    try {
      db.prepare(
        "INSERT INTO backup_history (action_type, filename, status, details) VALUES (?, ?, ?, ?)",
      ).run("BACKUP", fileName, "FAILED", error.message);
    } catch (e) {}

    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
    });
  }
};
