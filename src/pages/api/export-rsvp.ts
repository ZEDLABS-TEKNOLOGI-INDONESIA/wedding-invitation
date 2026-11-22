import type { APIRoute } from "astro";
import { getAuthSession } from "../../lib/auth";
import db from "../../lib/db";
import { escapeCsvCell } from "../../utils/csv";

export const GET: APIRoute = async ({ cookies }) => {
  const session = getAuthSession(cookies);
  if (!session) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
    });
  }

  try {
    const stmt = db.prepare(`
      SELECT guest_name, phone, attendance, guest_count, message, created_at
      FROM rsvps
      WHERE wedding_id = ?
      ORDER BY created_at DESC
    `);
    const data = stmt.all(session.weddingId) as {
      guest_name: string;
      phone: string | null;
      attendance: string;
      guest_count: number;
      message: string | null;
      created_at: string;
    }[];

    const headers = [
      "Nama Tamu",
      "No HP",
      "Kehadiran",
      "Jumlah",
      "Pesan",
      "Waktu Input",
    ];
    const csvRows = [headers.map(escapeCsvCell).join(",")];

    for (const row of data) {
      const values = [
        escapeCsvCell(row.guest_name),
        escapeCsvCell(row.phone ? ` ${row.phone}` : "-"),
        escapeCsvCell(row.attendance),
        escapeCsvCell(row.guest_count),
        escapeCsvCell(row.message || ""),
        escapeCsvCell(row.created_at),
      ];
      csvRows.push(values.join(","));
    }

    const csvContent = "\uFEFF" + csvRows.join("\n");
    const filename = `wedding-rsvp-${new Date().toISOString().split("T")[0]}.csv`;

    return new Response(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Export RSVP Error:", error);
    return new Response("Failed to export data", { status: 500 });
  }
};
