import type { RSVP, Wish } from "../types";

let rsvpCache: { slug: string; data: RSVP[]; timestamp: number } | null = null;
let wishesCache: { slug: string; data: Wish[]; timestamp: number } | null = null;

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
  async getRSVPs(weddingSlug = "demo"): Promise<RSVP[]> {
    const now = Date.now();

    if (
      rsvpCache &&
      rsvpCache.slug === weddingSlug &&
      now - rsvpCache.timestamp < CACHE_DURATION
    ) {
      return rsvpCache.data;
    }

    try {
      const response = await fetch(
        `/api/rsvp?wedding=${encodeURIComponent(weddingSlug)}`
      );
      if (!response.ok) throw new Error("Failed to fetch RSVPs");
      const data = await response.json();

      rsvpCache = { slug: weddingSlug, data, timestamp: now };
      return data;
    } catch (error) {
      console.error(error);
      return [];
    }
  },

  async saveRSVP(
    data: Omit<RSVP, "id" | "created_at">,
    weddingSlug = "demo"
  ): Promise<RSVP> {
    rsvpCache = null;

    const response = await fetch("/api/rsvp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, wedding_slug: weddingSlug }),
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

  async getWishes(weddingSlug = "demo"): Promise<Wish[]> {
    const now = Date.now();
    if (
      wishesCache &&
      wishesCache.slug === weddingSlug &&
      now - wishesCache.timestamp < CACHE_DURATION
    ) {
      return wishesCache.data;
    }

    try {
      const response = await fetch(
        `/api/wishes?wedding=${encodeURIComponent(weddingSlug)}`
      );
      if (!response.ok) throw new Error("Failed to fetch wishes");
      const data = await response.json();
      wishesCache = { slug: weddingSlug, data, timestamp: now };
      return data;
    } catch (error) {
      console.error(error);
      return [];
    }
  },

  async saveWish(
    data: { name: string; message: string },
    weddingSlug = "demo"
  ): Promise<Wish> {
    wishesCache = null;
    const response = await fetch("/api/wishes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, wedding_slug: weddingSlug }),
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
