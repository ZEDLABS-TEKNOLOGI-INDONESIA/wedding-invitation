import type { APIRoute } from "astro";
import db from "../../lib/db";
import { checkRateLimit } from "../../lib/rateLimit";
import { sendTelegramNotification } from "../../utils/telegram";

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

  if (!checkRateLimit(ip, 5, 60000)) {
    return new Response(
      JSON.stringify({ error: "Too many requests. Please try again later." }),
      { status: 429 }
    );
  }

  try {
    const rawData = await request.json();
    const name = sanitize(rawData.name);
    const message = sanitize(rawData.message);

    const checkStmt = db.prepare("SELECT id FROM wishes WHERE name = ?");
    const existingWish = checkStmt.get(name) as { id: number } | undefined;

    let actionType = "";
    let resultId = 0;

    if (existingWish) {
      const updateStmt = db.prepare(`
        UPDATE wishes
        SET message = ?, created_at = ?
        WHERE id = ?
      `);
      updateStmt.run(message, new Date().toISOString(), existingWish.id);
      actionType = "updated";
      resultId = existingWish.id;
    } else {
      const insertStmt = db.prepare(
        "INSERT INTO wishes (name, message, created_at) VALUES (?, ?, ?)"
      );
      const result = insertStmt.run(name, message, new Date().toISOString());
      actionType = "created";
      resultId = Number(result.lastInsertRowid);
    }

    const title =
      actionType === "created"
        ? "✨ <b>UCAPAN & DOA BARU!</b>"
        : "📝 <b>UCAPAN DIPERBARUI!</b>";

    const notifMsg = `
${title}

👤 <b>Dari:</b> ${name}

<i>"${message}"</i>
    `.trim();

    sendTelegramNotification(notifMsg);

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
