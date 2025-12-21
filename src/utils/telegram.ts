import { dns } from "node:dns";

const TOKEN = import.meta.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = import.meta.env.TELEGRAM_CHAT_ID;

// Opsional: Paksa menggunakan IPv4 jika server Anda bermasalah dengan IPv6
// Hapus baris ini jika berjalan di lingkungan yang mendukung IPv6 penuh
if (typeof dns !== "undefined" && dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder("ipv4first");
}

export const sendTelegramNotification = async (text: string) => {
  // 1. Cek konfigurasi
  if (!TOKEN || !CHAT_ID) {
    console.warn("⚠️ Telegram Token/Chat ID belum diset di .env");
    return;
  }

  const url = `https://api.telegram.org/bot${TOKEN}/sendMessage`;

  // 2. Setup AbortController untuk Timeout (misal: 5 detik)
  // Agar jika Telegram down/diblokir, user tidak menunggu loading lama
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 detik timeout

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        text: text,
        parse_mode: "HTML",
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.text();
      console.error(
        `❌ Gagal kirim Telegram (HTTP ${response.status}):`,
        errorData
      );
    } else {
      // console.log("✅ Notifikasi Telegram terkirim");
    }
  } catch (error: any) {
    clearTimeout(timeoutId);

    // Jangan throw error, cukup log saja agar flow user (RSVP) tidak error
    if (error.name === "AbortError") {
      console.error("⚠️ Kirim Telegram Timeout (Koneksi lambat/diblokir ISP)");
    } else {
      console.error("⚠️ Gagal koneksi ke Telegram:", error.message);
    }
  }
};
