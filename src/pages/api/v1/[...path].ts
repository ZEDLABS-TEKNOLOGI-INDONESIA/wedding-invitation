import type { APIRoute } from "astro";
import { pakaiGoApi, teruskanKeGo } from "../../../lib/goApi";

export const ALL: APIRoute = async ({ params, request }) => {
  if (!pakaiGoApi()) {
    return new Response(
      JSON.stringify({ error: "Backend Go v2 belum diaktifkan (GO_API_URL)." }),
      {
        status: 503,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
        },
      }
    );
  }
  const jalur = String(params.path || "").replace(/^\/+/, "");
  if (!jalur || jalur.includes("..")) {
    return new Response(JSON.stringify({ error: "Jalur API tidak valid." }), {
      status: 400,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
    });
  }
  return teruskanKeGo(request, `/api/v1/${jalur}`);
};
