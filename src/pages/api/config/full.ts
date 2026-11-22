import type { APIRoute } from "astro";
import { isAdminAuthenticated } from "../../../lib/auth";
import { getConfig } from "../../../lib/db";

const JSON_HEADERS = {
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
};

export const GET: APIRoute = async ({ cookies }) => {
  if (!isAdminAuthenticated(cookies)) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: JSON_HEADERS,
    });
  }
  try {
    const config = getConfig();
    return new Response(JSON.stringify(config), {
      status: 200,
      headers: JSON_HEADERS,
    });
  } catch {
    return new Response(JSON.stringify({ error: "Failed" }), {
      status: 500,
      headers: JSON_HEADERS,
    });
  }
};
