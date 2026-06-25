export const sendTelegramNotification = async (
  text: string,
  token: string,
  chatId: string
) => {
  if (!token || !chatId) {
    console.warn("Telegram Token/Chat ID belum diset");
    return;
  }

  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
        parse_mode: "HTML",
      }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (!response.ok) {
      const errorData = await response.text();
      console.error(
        `Gagal kirim Telegram (HTTP ${response.status}):`,
        errorData
      );
    }
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === "AbortError") {
      console.error("Kirim Telegram Timeout");
    } else {
      console.error("Gagal koneksi ke Telegram:", error.message);
    }
  }
};
