import type { APIRoute } from "astro";
import db from "../../lib/db";
import { cekKesehatanGo, pakaiGoApi } from "../../lib/goApi";

export const GET: APIRoute = async () => {
  try {
    if (pakaiGoApi()) {
      const goOk = await cekKesehatanGo();
      if (!goOk) {
        return new Response(
          JSON.stringify({
            status: "error",
            backend: "go-postgres",
            error: "Backend Go API tidak merespons",
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
      return new Response(
        JSON.stringify({
          status: "ok",
          backend: "go-postgres",
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
    }
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
