import type { APIRoute } from "astro";
import { getAuthSession } from "../../lib/auth";
import db from "../../lib/db";
import { escapeCsvCell } from "../../utils/csv";
import type { GuestRow } from "./guests";

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
    const rows = db
      .prepare(
        "SELECT * FROM guests WHERE wedding_id = ? ORDER BY checked_in DESC, id DESC"
      )
      .all(session.weddingId) as GuestRow[];

    const headers = [
      "Kode",
      "Nama Tamu",
      "No WhatsApp",
      "Alamat",
      "Grup",
      "Kuota",
      "Status Check-In",
      "Jumlah Hadir",
      "Waktu Check-In",
    ];
    const csvRows = [headers.map(escapeCsvCell).join(",")];

    for (const row of rows) {
      csvRows.push(
        [
          escapeCsvCell(row.code),
          escapeCsvCell(row.name),
          escapeCsvCell(row.phone ? ` ${row.phone}` : "-"),
          escapeCsvCell(row.address),
          escapeCsvCell(row.group_name || "-"),
          escapeCsvCell(row.quota),
          escapeCsvCell(row.checked_in ? "Hadir" : "Belum"),
          escapeCsvCell(row.checked_in ? row.checked_in_pax : 0),
          escapeCsvCell(row.checked_in_at || "-"),
        ].join(",")
      );
    }

    const csvContent = "\uFEFF" + csvRows.join("\n");
    const filename = `wedding-guests-${new Date().toISOString().split("T")[0]}.csv`;

    return new Response(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("Export guests error:", err);
    return new Response("Failed to export guests", { status: 500 });
  }
};
