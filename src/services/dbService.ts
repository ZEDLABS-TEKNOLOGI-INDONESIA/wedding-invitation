import type { RSVP, Wish } from "../types";
export const dbService = {
  async initializeDemo() {},
  async getRSVPs(): Promise<RSVP[]> {
    try {
      const response = await fetch("/api/rsvp");
      if (!response.ok) throw new Error("Failed to fetch RSVPs");
      const data = await response.json();
      return data;
    } catch (error) {
      console.error(error);
      return [];
    }
  },
  async saveRSVP(data: Omit<RSVP, "id" | "created_at">): Promise<RSVP> {
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
    try {
      const response = await fetch("/api/wishes");
      if (!response.ok) throw new Error("Failed to fetch wishes");
      const data = await response.json();
      return data;
    } catch (error) {
      console.error(error);
      return [];
    }
  },
  async saveWish(data: { name: string; message: string }): Promise<Wish> {
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
