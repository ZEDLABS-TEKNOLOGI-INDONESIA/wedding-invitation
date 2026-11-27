import type { APIRoute } from "astro";
import { getPublicConfig } from "../../../lib/db";
import { DOMAIN_UTAMA, resolusiHostUndangan } from "../../../lib/domain";

export const GET: APIRoute = async ({ request, url }) => {
  const info = resolusiHostUndangan(request, url);
  if (info.mode === "utama") {
    return new Response(
      JSON.stringify({
        mode: "utama",
        domain_utama: DOMAIN_UTAMA,
        host: info.host,
        undangan: null,
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
  if (info.mode === "kustom" && info.wedding) {
    const cfg = getPublicConfig(info.wedding.id);
    return new Response(
      JSON.stringify({
        mode: "kustom",
        domain_utama: DOMAIN_UTAMA,
        host: info.host,
        undangan: {
          id: info.wedding.id,
          slug: info.wedding.slug,
          title: info.wedding.title,
          custom_domain: info.wedding.custom_domain || info.host,
          mempelai_wanita: cfg.BRIDE_NICKNAME || "",
          mempelai_pria: cfg.GROOM_NICKNAME || "",
        },
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
  return new Response(
    JSON.stringify({
      error: "Domain belum terdaftar pada layanan undangan.",
      host: info.host,
    }),
    {
      status: 404,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
    }
  );
};
