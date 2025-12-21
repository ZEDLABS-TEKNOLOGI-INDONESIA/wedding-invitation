import type { APIRoute } from "astro";
import db from "../../lib/db";

export const POST: APIRoute = async ({ request, cookies }) => {
  // 1. Cek Keamanan (Auth)
  const auth = cookies.get("wedding_admin_auth")?.value;
  if (auth !== "true") {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
    });
  }

  try {
    const body = await request.json();
    const { action, id, ids, data } = body;

    // --- RSVP ACTIONS ---
    if (action === "update_rsvp") {
      const { guest_name, attendance, guest_count, message } = data;
      const stmt = db.prepare(
        "UPDATE rsvps SET guest_name=?, attendance=?, guest_count=?, message=? WHERE id=?",
      );
      stmt.run(guest_name, attendance, guest_count, message, id);
      return new Response(JSON.stringify({ success: true }));
    }

    if (action === "delete_rsvp") {
      const targetIds = ids || [id];
      const placeholders = targetIds.map(() => "?").join(",");
      const stmt = db.prepare(
        `DELETE FROM rsvps WHERE id IN (${placeholders})`,
      );
      stmt.run(...targetIds);
      return new Response(JSON.stringify({ success: true }));
    }

    // --- WISHES ACTIONS ---
    if (action === "update_wish") {
      const { name, message } = data;
      const stmt = db.prepare("UPDATE wishes SET name=?, message=? WHERE id=?");
      stmt.run(name, message, id);
      return new Response(JSON.stringify({ success: true }));
    }

    if (action === "delete_wish") {
      const targetIds = ids || [id];
      const placeholders = targetIds.map(() => "?").join(",");
      const stmt = db.prepare(
        `DELETE FROM wishes WHERE id IN (${placeholders})`,
      );
      stmt.run(...targetIds);
      return new Response(JSON.stringify({ success: true }));
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
    });
  } catch (error) {
    console.error("Admin API Error:", error);
    return new Response(JSON.stringify({ error: "Server Error" }), {
      status: 500,
    });
  }
};
