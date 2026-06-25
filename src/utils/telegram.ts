import { dns } from "node:dns";

const TOKEN = import.meta.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = import.meta.env.TELEGRAM_CHAT_ID;

if (typeof dns !== "undefined" && dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder("ipv4first");
}

export const sendTelegramNotification = async (text: string) => {
  if (!TOKEN || !CHAT_ID) {
    console.warn("⚠️ Telegram Token/Chat ID belum diset di .env");
    return;
  }

  const url = `https://api.telegram.org/bot${TOKEN}/sendMessage`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

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
    }
  } catch (error: any) {
    clearTimeout(timeoutId);

    if (error.name === "AbortError") {
      console.error("⚠️ Kirim Telegram Timeout (Koneksi lambat/diblokir ISP)");
    } else {
      console.error("⚠️ Gagal koneksi ke Telegram:", error.message);
    }
  }
};
