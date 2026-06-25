import type { APIRoute } from "astro";
import { getConfig, setConfig } from "../../lib/db";

export const GET: APIRoute = async () => {
  try {
    const config = getConfig();
    const safeConfig = { ...config };
    delete safeConfig.TELEGRAM_BOT_TOKEN;
    delete safeConfig.TELEGRAM_CHAT_ID;
    return new Response(JSON.stringify(safeConfig), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch {
    return new Response(JSON.stringify({ error: "Failed to fetch config" }), {
      status: 500,
    });
  }
};

export const POST: APIRoute = async ({ request, cookies }) => {
  const auth = cookies.get("wedding_admin_auth")?.value;
  if (auth !== "true") {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
    });
  }

  try {
    const body = await request.json();
    for (const [key, value] of Object.entries(body)) {
      if (typeof value === "string") {
        setConfig(key, value);
      } else {
        setConfig(key, JSON.stringify(value));
      }
    }
    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch {
    return new Response(JSON.stringify({ error: "Failed to save config" }), {
      status: 500,
    });
  }
};
