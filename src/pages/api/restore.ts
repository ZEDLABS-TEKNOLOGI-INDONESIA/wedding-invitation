import type { APIRoute } from "astro";
import fs from "node:fs";
import path from "node:path";
import db, { getBackupPath } from "../../lib/db";
import Database from "better-sqlite3";

export const POST: APIRoute = async ({ request, cookies }) => {
  const auth = cookies.get("wedding_admin_auth")?.value;
  if (auth !== "true") {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
    });
  }

  try {
    const body = await request.json();
    const { filename } = body; // Kita restore berdasarkan nama file di server

    if (!filename) {
      return new Response(JSON.stringify({ error: "Filename required" }), {
        status: 400,
      });
    }

    const backupFilePath = path.join(getBackupPath(), filename);

    if (!fs.existsSync(backupFilePath)) {
      return new Response(
        JSON.stringify({ error: "File backup tidak ditemukan di server" }),
        { status: 404 },
      );
    }

    // 1. Buka Koneksi ke File Backup
    const backupDb = new Database(backupFilePath, { readonly: true });

    // 2. Transaksi Restore (Wipe & Replace)
    // Cara paling aman tanpa restart server/menimpa file yang sedang dilock
    const transaction = db.transaction(() => {
      // Hapus data eksisting
      db.prepare("DELETE FROM rsvps").run();
      db.prepare("DELETE FROM wishes").run();

      // Salin RSVP
      const rsvps = backupDb.prepare("SELECT * FROM rsvps").all();
      const insertRsvp = db.prepare(`
        INSERT INTO rsvps (id, guest_name, phone, attendance, guest_count, message, created_at)
        VALUES (@id, @guest_name, @phone, @attendance, @guest_count, @message, @created_at)
      `);
      for (const row of rsvps) insertRsvp.run(row);

      // Salin Wishes
      const wishes = backupDb.prepare("SELECT * FROM wishes").all();
      const insertWish = db.prepare(`
        INSERT INTO wishes (id, name, message, created_at)
        VALUES (@id, @name, @message, @created_at)
      `);
      for (const row of wishes) insertWish.run(row);

      // Catat Log Restore
      db.prepare(
        "INSERT INTO backup_history (action_type, filename, status, details) VALUES (?, ?, ?, ?)",
      ).run("RESTORE", filename, "SUCCESS", "Restored from Server History");
    });

    transaction();
    backupDb.close();

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (error: any) {
    console.error("Restore Error:", error);
    try {
      db.prepare(
        "INSERT INTO backup_history (action_type, filename, status, details) VALUES (?, ?, ?, ?)",
      ).run("RESTORE", "unknown", "FAILED", error.message);
    } catch (e) {}

    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
    });
  }
};
