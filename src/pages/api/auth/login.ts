import type { APIRoute } from "astro";
import { authenticateUser, createUserSession } from "../../../lib/auth";
import { DEFAULT_WEDDING_ID } from "../../../lib/db";
import { checkRateLimit, getClientIp } from "../../../lib/rateLimit";

const JSON_HEADERS = {
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
};

export const POST: APIRoute = async ({ request, cookies, clientAddress }) => {
  const ip = getClientIp(request, clientAddress);
  if (!checkRateLimit(`auth-login:${ip}`, 10, 15 * 60 * 1000)) {
    return new Response(
      JSON.stringify({
        error: "Terlalu banyak percobaan masuk. Coba lagi dalam 15 menit.",
      }),
      { status: 429, headers: JSON_HEADERS }
    );
  }

  let body: { username?: string; password?: string } = {};
  try {
    body = (await request.json()) as { username?: string; password?: string };
  } catch {
    return new Response(JSON.stringify({ error: "Permintaan tidak valid." }), {
      status: 400,
      headers: JSON_HEADERS,
    });
  }

  const username = String(body.username || "").trim();
  const password = String(body.password || "");
  if (!username || !password) {
    return new Response(
      JSON.stringify({ error: "Username dan password wajib diisi." }),
      { status: 400, headers: JSON_HEADERS }
    );
  }

  const user = authenticateUser(username, password);
  if (!user) {
    return new Response(
      JSON.stringify({
        error: "Username atau password tidak valid, atau akun sedang nonaktif.",
      }),
      { status: 401, headers: JSON_HEADERS }
    );
  }

  const isSuper = user.role === "superadmin";
  createUserSession(
    cookies,
    request,
    user.id,
    isSuper ? DEFAULT_WEDDING_ID : null
  );

  return new Response(
    JSON.stringify({
      success: true,
      role: user.role,
      redirectTo: isSuper ? "/superadmin" : "/admin",
      user: {
        id: user.id,
        username: user.username,
        fullName: user.full_name,
        role: user.role,
      },
    }),
    { status: 200, headers: JSON_HEADERS }
  );
};
