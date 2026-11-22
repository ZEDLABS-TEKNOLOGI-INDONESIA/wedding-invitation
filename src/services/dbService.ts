import type { RSVP, Wish } from "../types";

let rsvpCache: { data: RSVP[]; timestamp: number } | null = null;
let wishesCache: { data: Wish[]; timestamp: number } | null = null;

const CACHE_DURATION = 30 * 1000;

const extractErrorMessage = async (
  response: Response,
  fallback: string
): Promise<string> => {
  try {
    const body = await response.json();
    if (body && typeof body.error === "string" && body.error.trim()) {
      return body.error;
    }
  } catch {
    // ignore JSON parse failure
  }
  return fallback;
};

export const dbService = {
  async getRSVPs(): Promise<RSVP[]> {
    const now = Date.now();

    if (rsvpCache && now - rsvpCache.timestamp < CACHE_DURATION) {
      return rsvpCache.data;
    }

    try {
      const response = await fetch("/api/rsvp");
      if (!response.ok) throw new Error("Failed to fetch RSVPs");
      const data = await response.json();

      rsvpCache = { data, timestamp: now };
      return data;
    } catch (error) {
      console.error(error);
      return [];
    }
  },

  async saveRSVP(data: Omit<RSVP, "id" | "created_at">): Promise<RSVP> {
    rsvpCache = null;

    const response = await fetch("/api/rsvp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const message = await extractErrorMessage(
        response,
        "Gagal menyimpan RSVP. Silakan coba lagi."
      );
      throw new Error(message);
    }
    const result = (await response.json()) as { id?: number };
    return {
      ...data,
      id: typeof result.id === "number" ? result.id : Date.now(),
      created_at: new Date().toISOString(),
    };
  },

  async getWishes(): Promise<Wish[]> {
    const now = Date.now();
    if (wishesCache && now - wishesCache.timestamp < CACHE_DURATION) {
      return wishesCache.data;
    }

    try {
      const response = await fetch("/api/wishes");
      if (!response.ok) throw new Error("Failed to fetch wishes");
      const data = await response.json();
      wishesCache = { data, timestamp: now };
      return data;
    } catch (error) {
      console.error(error);
      return [];
    }
  },

  async saveWish(data: { name: string; message: string }): Promise<Wish> {
    wishesCache = null;
    const response = await fetch("/api/wishes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const message = await extractErrorMessage(
        response,
        "Gagal mengirim ucapan. Silakan coba lagi."
      );
      throw new Error(message);
    }
    const result = (await response.json()) as { id?: number };
    return {
      ...data,
      id: typeof result.id === "number" ? result.id : Date.now(),
      created_at: new Date().toISOString(),
    };
  },
};
