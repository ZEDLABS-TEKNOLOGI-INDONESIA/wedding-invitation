import type { APIRoute } from "astro";
import db from "../../lib/db";
export const GET: APIRoute = async () => {
  try {
    const stmt = db.prepare(`
      SELECT id, guest_name, attendance, guest_count, created_at 
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
export const POST: APIRoute = async ({ request }) => {
  try {
    const data = await request.json();
    const { guest_name, phone, attendance, guest_count, message } = data;
    const checkStmt = db.prepare("SELECT id FROM rsvps WHERE guest_name = ?");
    const existingGuest = checkStmt.get(guest_name) as
      | { id: number }
      | undefined;
    if (existingGuest) {
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
      return new Response(
        JSON.stringify({
          success: true,
          id: existingGuest.id,
          action: "updated",
        }),
        { status: 200 }
      );
    } else {
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
    console.error(error);
    return new Response(JSON.stringify({ error: "Database error" }), {
      status: 500,
    });
  }
};
