import type { APIRoute } from "astro";
import db from "../../lib/db";

export const GET: APIRoute = async () => {
  try {
    const logs = db
      .prepare("SELECT * FROM backup_history ORDER BY created_at DESC LIMIT 50")
      .all();

    return new Response(JSON.stringify(logs), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify([]), { status: 200 }); // Return empty if table not exists yet
  }
};
