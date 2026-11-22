import type { APIRoute } from "astro";
import db from "../../lib/db";

export const GET: APIRoute = async () => {
  try {
    db.prepare("SELECT 1").get();
    return new Response(
      JSON.stringify({
        status: "ok",
        app: "Wedding Management",
        timestamp: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({
        status: "error",
        error: err instanceof Error ? err.message : "Database unavailable",
      }),
      {
        status: 503,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
        },
      }
    );
  }
};
