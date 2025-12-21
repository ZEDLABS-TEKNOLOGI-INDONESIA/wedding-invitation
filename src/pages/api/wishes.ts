import type { APIRoute } from "astro";
import db from "../../lib/db";
import { checkRateLimit } from "../../lib/rateLimit";
import { sendTelegramNotification } from "../../utils/telegram"; // <--- Import Telegram

// Helper Sanitasi
const sanitize = (str: string) => {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

export const GET: APIRoute = async () => {
  try {
    const stmt = db.prepare("SELECT * FROM wishes ORDER BY created_at DESC");
    const wishes = stmt.all();
    return new Response(JSON.stringify(wishes), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ error: "Failed to fetch" }), {
      status: 500,
    });
  }
};

export const POST: APIRoute = async ({ request, clientAddress }) => {
  const ip = clientAddress || "unknown";

  // Rate Limiting
  if (!checkRateLimit(ip, 5, 60000)) {
    return new Response(
      JSON.stringify({ error: "Too many requests. Please try again later." }),
      { status: 429 }
    );
  }

  try {
    const rawData = await request.json();

    // 1. Sanitasi Input
    const name = sanitize(rawData.name);
    const message = sanitize(rawData.message);

    // 2. Cek apakah nama sudah pernah kirim
    const checkStmt = db.prepare("SELECT id FROM wishes WHERE name = ?");
    const existingWish = checkStmt.get(name) as { id: number } | undefined;

    let actionType = "";
    let resultId = 0;

    if (existingWish) {
      // UPDATE PESAN LAMA
      const updateStmt = db.prepare(`
        UPDATE wishes 
        SET message = ?, created_at = ?
        WHERE id = ?
      `);
      updateStmt.run(message, new Date().toISOString(), existingWish.id);
      actionType = "updated";
      resultId = existingWish.id;
    } else {
      // INSERT PESAN BARU
      const insertStmt = db.prepare(
        "INSERT INTO wishes (name, message, created_at) VALUES (?, ?, ?)"
      );
      const result = insertStmt.run(name, message, new Date().toISOString());
      actionType = "created";
      resultId = Number(result.lastInsertRowid);
    }

    // 3. Kirim Notifikasi Telegram
    const notifMsg = `
<b>✨ UCAPAN & DOA BARU!</b>

👤 <b>Dari:</b> ${name}

📝 <b>Isi Pesan:</b>
<i>"${message}"</i>
    `.trim();

    sendTelegramNotification(notifMsg);

    // 4. Return Response Sukses
    return new Response(
      JSON.stringify({
        success: true,
        id: resultId,
        action: actionType,
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ error: "Database error" }), {
      status: 500,
    });
  }
};
