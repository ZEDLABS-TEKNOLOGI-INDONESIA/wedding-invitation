import type { APIRoute } from "astro";
import { getAuthSession } from "../../../lib/auth";
import db, { getPlatformConfig, getWeddingById } from "../../../lib/db";
import {
  renderInvoiceHtml,
  type BillingOrderRecord,
} from "../../../lib/invoicing";

export const GET: APIRoute = async ({ cookies, url }) => {
  const session = getAuthSession(cookies);
  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  const orderId = Number(url.searchParams.get("id") || 0);
  if (!Number.isFinite(orderId) || orderId <= 0) {
    return new Response("ID tagihan tidak valid.", { status: 400 });
  }

  const order = db
    .prepare("SELECT * FROM billing_orders WHERE id = ? LIMIT 1")
    .get(orderId) as BillingOrderRecord | undefined;

  if (!order) {
    return new Response("Tagihan tidak ditemukan.", { status: 404 });
  }

  if (session.role !== "superadmin" && order.wedding_id !== session.weddingId) {
    return new Response("Forbidden", { status: 403 });
  }

  const wedding = getWeddingById(order.wedding_id);
  const platformCfg = getPlatformConfig();
  const html = renderInvoiceHtml(
    order,
    {
      title: wedding?.title || `Undangan #${order.wedding_id}`,
      slug: wedding?.slug || String(order.wedding_id),
    },
    platformCfg
  );

  return new Response(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
};
