import type { APIRoute } from "astro";
import db from "../../lib/db";
import { checkRateLimit } from "../../lib/rateLimit";
import { sendTelegramNotification } from "../../utils/telegram";

// Helper Sanitasi (Mencegah XSS)
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
    const stmt = db.prepare(`
      SELECT id, guest_name, attendance, guest_count, message, created_at 
      FROM rsvps 
      ORDER BY created_at DESC
    `);
    const rsvps = stmt.all();
    return new Response(JSON.stringify(rsvps), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ error: "Failed to fetch RSVPs" }), {
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
    const guest_name = sanitize(rawData.guest_name);
    const phone = sanitize(rawData.phone);
    const message = sanitize(rawData.message);
    const attendance = rawData.attendance;
    const guest_count = rawData.guest_count;

    // 2. Cek apakah tamu sudah pernah isi (berdasarkan nama)
    const checkStmt = db.prepare("SELECT id FROM rsvps WHERE guest_name = ?");
    const existingGuest = checkStmt.get(guest_name) as
      | { id: number }
      | undefined;

    let actionType = "";
    let resultId = 0;

    if (existingGuest) {
      // UPDATE DATA LAMA
      const updateStmt = db.prepare(`
        UPDATE rsvps 
        SET phone = ?, attendance = ?, guest_count = ?, message = ?, created_at = ?
        WHERE id = ?
      `);
      updateStmt.run(
        phone,
        attendance,
        guest_count,
        message || "",
        new Date().toISOString(),
        existingGuest.id
      );
      actionType = "updated";
      resultId = existingGuest.id;
    } else {
      // INSERT DATA BARU
      const insertStmt = db.prepare(`
        INSERT INTO rsvps (guest_name, phone, attendance, guest_count, message, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      const result = insertStmt.run(
        guest_name,
        phone,
        attendance,
        guest_count,
        message || "",
        new Date().toISOString()
      );
      actionType = "created";
      resultId = Number(result.lastInsertRowid);
    }

    // 3. Kirim Notifikasi Telegram (Fire-and-forget, tidak perlu await agar UI cepat)
    const statusEmoji =
      attendance === "hadir" ? "✅" : attendance === "ragu" ? "🤔" : "❌";

    const notifMsg = `
<b>💌 RSVP MASUK! (${actionType.toUpperCase()})</b>

👤 <b>Nama:</b> ${guest_name}
${statusEmoji} <b>Status:</b> ${attendance.toUpperCase()}
👥 <b>Jml:</b> ${attendance === "hadir" ? guest_count + " Orang" : "-"}
📞 <b>HP:</b> ${phone || "-"}

💬 <b>Pesan:</b>
<i>"${message || "-"}"</i>
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
