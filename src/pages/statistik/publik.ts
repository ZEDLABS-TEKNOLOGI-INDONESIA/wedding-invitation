import type { APIRoute } from "astro";
import db from "../../lib/db";
import { pakaiGoApi, teruskanKeGo } from "../../lib/goApi";
import { verifikasiHMACv2 } from "../../lib/statistikHmac";

interface CountRow {
  n: number;
}

export const GET: APIRoute = async ({ request }) => {
  if (pakaiGoApi()) {
    return teruskanKeGo(request, "/statistik/publik");
  }
  const keyID = (process.env.STATISTIK_PUBLIK_KEY_ID ?? "").trim();
  const secret = (process.env.STATISTIK_PUBLIK_SECRET ?? "").trim();
  if (!keyID || !secret) {
    return new Response(JSON.stringify({ error: "endpoint statistik publik belum dikonfigurasi" }), {
      status: 503,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    });
  }

  const cek = verifikasiHMACv2(request, keyID, secret);
  if (!cek.sah) {
    return new Response(JSON.stringify({ error: cek.alasan ?? "autentikasi HMAC v2 tidak sah" }), {
      status: 401,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    });
  }

  const undanganAktif =
    (db.prepare("SELECT COUNT(*) AS n FROM weddings WHERE status = 'active' AND is_demo = 0").get() as CountRow)?.n ?? 0;
  const tamuTerdaftar =
    (db.prepare("SELECT COUNT(*) AS n FROM guests").get() as CountRow)?.n ?? 0;
  const konfirmasiHadir =
    (db.prepare("SELECT COUNT(*) AS n FROM rsvps").get() as CountRow)?.n ?? 0;
  const ucapanMasuk =
    (db.prepare("SELECT COUNT(*) AS n FROM wishes").get() as CountRow)?.n ?? 0;

  const perWaktu = new Date().toISOString();

  return new Response(
    JSON.stringify({
      produk: "wedding",
      metrik: [
        {
          kunci: "undangan_aktif",
          label: "Undangan aktif",
          nilai: Math.max(0, Number(undanganAktif)),
          satuan: "undangan",
          per_waktu: perWaktu,
        },
        {
          kunci: "tamu_terdaftar",
          label: "Tamu terdaftar",
          nilai: Math.max(0, Number(tamuTerdaftar)),
          satuan: "tamu",
          per_waktu: perWaktu,
        },
        {
          kunci: "konfirmasi_hadir",
          label: "Konfirmasi kehadiran",
          nilai: Math.max(0, Number(konfirmasiHadir)),
          satuan: "konfirmasi",
          per_waktu: perWaktu,
        },
        {
          kunci: "ucapan_masuk",
          label: "Ucapan masuk",
          nilai: Math.max(0, Number(ucapanMasuk)),
          satuan: "ucapan",
          per_waktu: perWaktu,
        },
      ],
    }),
    {
      status: 200,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    },
  );
};
