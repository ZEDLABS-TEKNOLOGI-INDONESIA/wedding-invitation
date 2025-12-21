import type { APIRoute } from "astro";
import db from "../../lib/db";
export const GET: APIRoute = async () => {
  try {
    const stmt = db.prepare("SELECT * FROM wishes ORDER BY created_at DESC");
    const wishes = stmt.all();
    return new Response(JSON.stringify(wishes), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: "Failed to fetch" }), {
      status: 500,
    });
  }
};
export const POST: APIRoute = async ({ request }) => {
  try {
    const data = await request.json();
    const { name, message } = data;
    const checkStmt = db.prepare("SELECT id FROM wishes WHERE name = ?");
    const existingWish = checkStmt.get(name) as { id: number } | undefined;
    if (existingWish) {
      const updateStmt = db.prepare(`
        UPDATE wishes 
        SET message = ?, created_at = ?
        WHERE id = ?
      `);
      updateStmt.run(message, new Date().toISOString(), existingWish.id);
      return new Response(
        JSON.stringify({
          success: true,
          id: existingWish.id,
          action: "updated",
        }),
        { status: 200 }
      );
    } else {
      const insertStmt = db.prepare(
        "INSERT INTO wishes (name, message, created_at) VALUES (?, ?, ?)"
      );
      const result = insertStmt.run(name, message, new Date().toISOString());
      return new Response(
        JSON.stringify({
          success: true,
          id: result.lastInsertRowid,
          action: "created",
        }),
        { status: 200 }
      );
    }
  } catch (error) {
    return new Response(JSON.stringify({ error: "Database error" }), {
      status: 500,
    });
  }
};
