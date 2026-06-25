import type { APIRoute } from "astro";
import db, { getConfig } from "../../lib/db";
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
    const wishes = db
      .prepare("SELECT * FROM wishes ORDER BY created_at DESC")
      .all();
    return new Response(JSON.stringify(wishes), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch {
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

    const existing = db
      .prepare("SELECT id FROM wishes WHERE name = ?")
      .get(name) as { id: number } | undefined;

    let actionType = "";
    let resultId = 0;

    if (existing) {
      db.prepare("UPDATE wishes SET message=?, created_at=? WHERE id=?").run(
        message,
        new Date().toISOString(),
        existing.id
      );
      actionType = "updated";
      resultId = existing.id;
    } else {
      const result = db
        .prepare(
          "INSERT INTO wishes (name, message, created_at) VALUES (?, ?, ?)"
        )
        .run(name, message, new Date().toISOString());
      actionType = "created";
      resultId = Number(result.lastInsertRowid);
    }

    const config = getConfig();
    const title =
      actionType === "created"
        ? "<b>UCAPAN & DOA BARU!</b>"
        : "<b>UCAPAN DIPERBARUI!</b>";

    const notifMsg = `
${title}

<b>Dari:</b> ${name}

<i>"${message}"</i>
    `.trim();

    sendTelegramNotification(
      notifMsg,
      config.TELEGRAM_BOT_TOKEN,
      config.TELEGRAM_CHAT_ID
    );

    return new Response(
      JSON.stringify({ success: true, id: resultId, action: actionType }),
      { status: 200 }
    );
  } catch {
    return new Response(JSON.stringify({ error: "Database error" }), {
      status: 500,
    });
  }
};
