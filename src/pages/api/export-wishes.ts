import type { APIRoute } from "astro";
import { isAdminAuthenticated } from "../../lib/auth";
import db from "../../lib/db";
import { escapeCsvCell } from "../../utils/csv";

export const GET: APIRoute = async ({ cookies }) => {
  if (!isAdminAuthenticated(cookies)) {
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
      SELECT name, message, created_at
      FROM wishes
      ORDER BY created_at DESC
    `);
    const data = stmt.all() as {
      name: string;
      message: string;
      created_at: string;
    }[];

    const headers = ["Nama Pengirim", "Ucapan & Doa", "Waktu Input"];
    const csvRows = [headers.map(escapeCsvCell).join(",")];

    for (const row of data) {
      const values = [
        escapeCsvCell(row.name),
        escapeCsvCell(row.message),
        escapeCsvCell(row.created_at),
      ];
      csvRows.push(values.join(","));
    }

    const csvContent = "\uFEFF" + csvRows.join("\n");
    const filename = `wedding-wishes-${new Date().toISOString().split("T")[0]}.csv`;

    return new Response(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Export Wishes Error:", error);
    return new Response("Failed to export wishes data", { status: 500 });
  }
};
