import type { APIRoute } from "astro";
import { destroyAdminSession } from "../../../lib/auth";

export const POST: APIRoute = async ({ cookies }) => {
  destroyAdminSession(cookies);
  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
};
