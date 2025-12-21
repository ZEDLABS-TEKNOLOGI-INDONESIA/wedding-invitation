import type { RSVP, Wish } from "../types";

let rsvpCache: { data: RSVP[]; timestamp: number } | null = null;
let wishesCache: { data: Wish[]; timestamp: number } | null = null;

const CACHE_DURATION = 30 * 1000;

export const dbService = {
  async initializeDemo() {},

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
    if (!response.ok) throw new Error("Failed to save RSVP");
    return {
      ...data,
      id: Date.now(),
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
    if (!response.ok) throw new Error("Failed to save wish");
    return {
      ...data,
      id: Date.now(),
      created_at: new Date().toISOString(),
    };
  },
};
