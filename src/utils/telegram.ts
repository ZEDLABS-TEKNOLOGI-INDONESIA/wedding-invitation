const TOKEN = import.meta.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = import.meta.env.TELEGRAM_CHAT_ID;

export const sendTelegramNotification = async (text: string) => {
  if (!TOKEN || !CHAT_ID) return; // Skip jika tidak dikonfigurasi

  try {
    const url = `https://api.telegram.org/bot${TOKEN}/sendMessage`;
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        text: text,
        parse_mode: "HTML", // Agar bisa pakai Bold/Italic
      }),
    });
  } catch (error) {
    console.error("Gagal kirim Telegram:", error);
    // Jangan throw error agar tidak mengganggu flow user
  }
};
