import type { WeddingConfig } from "./types";
const parseJson = <T,>(jsonString: string | undefined, defaultValue: T): T => {
  if (!jsonString) return defaultValue;
  try {
    return JSON.parse(jsonString) as T;
  } catch (e) {
    console.warn("Failed to parse JSON env:", e);
    return defaultValue;
  }
};
export const MAX_GUESTS = parseInt(
  import.meta.env.PUBLIC_RSVP_MAX_GUESTS ?? "5",
  10,
);

export const MUSIC_URL =
  import.meta.env.PUBLIC_MUSIC_URL ??
  "https://www.bensound.com/bensound-music/bensound-love.mp3";

export const WEDDING_CONFIG: WeddingConfig = {
  couple: {
    bride: {
      name: import.meta.env.PUBLIC_BRIDE_NICKNAME ?? "Fey",
      fullName: import.meta.env.PUBLIC_BRIDE_FULLNAME ?? "Fera Oktapia",
      parents:
        import.meta.env.PUBLIC_BRIDE_PARENTS ??
        "Putri ke ... dari Bapak ... & Ibu ...",
      instagram: import.meta.env.PUBLIC_BRIDE_INSTAGRAM ?? "feraoktapia___",
      image:
        import.meta.env.PUBLIC_BRIDE_IMAGE ??
        "https://placehold.co/600x800?text=Fey+Portrait",
    },
    groom: {
      name: import.meta.env.PUBLIC_GROOM_NICKNAME ?? "Yaya",
      fullName: import.meta.env.PUBLIC_GROOM_FULLNAME ?? "Yahya Zulfikri",
      parents:
        import.meta.env.PUBLIC_GROOM_PARENTS ??
        "Putra ke ... dari Bapak ... & Ibu ...",
      instagram: import.meta.env.PUBLIC_GROOM_INSTAGRAM ?? "zulfikriyahya_",
      image:
        import.meta.env.PUBLIC_GROOM_IMAGE ??
        "https://placehold.co/600x800?text=Yaya+Portrait",
    },
  },
  venue: {
    name: import.meta.env.PUBLIC_VENUE_NAME ?? "The Royal Azure Ballroom",
    address: import.meta.env.PUBLIC_VENUE_ADDRESS ?? "Jl. Elok No. 77",
    latitude: parseFloat(import.meta.env.PUBLIC_VENUE_LAT ?? "-6.2088"),
    longitude: parseFloat(import.meta.env.PUBLIC_VENUE_LNG ?? "106.8456"),
  },
  events: {
    akad: {
      title: import.meta.env.PUBLIC_AKAD_TITLE ?? "Janji Suci",
      day: import.meta.env.PUBLIC_AKAD_DAY ?? "Minggu",
      date: import.meta.env.PUBLIC_AKAD_DATE ?? "11 Oktober 2025",
      startTime: import.meta.env.PUBLIC_AKAD_START ?? "08:00",
      endTime: import.meta.env.PUBLIC_AKAD_END ?? "10:00",
      startDateTime: new Date(
        import.meta.env.PUBLIC_AKAD_ISO_START ?? "2025-10-11T08:00:00+07:00",
      ),
      endDateTime: new Date(
        import.meta.env.PUBLIC_AKAD_ISO_END ?? "2025-10-11T10:00:00+07:00",
      ),
    },
    resepsi: {
      title: import.meta.env.PUBLIC_RESEPSI_TITLE ?? "Perayaan Cinta",
      day: import.meta.env.PUBLIC_RESEPSI_DAY ?? "Minggu",
      date: import.meta.env.PUBLIC_RESEPSI_DATE ?? "11 Oktober 2025",
      startTime: import.meta.env.PUBLIC_RESEPSI_START ?? "11:00",
      endTime: import.meta.env.PUBLIC_RESEPSI_END ?? "14:00",
      startDateTime: new Date(
        import.meta.env.PUBLIC_RESEPSI_ISO_START ?? "2025-10-11T11:00:00+07:00",
      ),
      endDateTime: new Date(
        import.meta.env.PUBLIC_RESEPSI_ISO_END ?? "2025-10-11T14:00:00+07:00",
      ),
    },
  },
  hero: {
    image:
      import.meta.env.PUBLIC_HERO_IMAGE ??
      "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?q=80&w=2069&auto=format&fit=crop",
    city: import.meta.env.PUBLIC_HERO_CITY ?? "Pandeglang, Banten",
  },
};

export const LOVE_STORY = parseJson(import.meta.env.PUBLIC_LOVE_STORY, [
  {
    date: "Musim Gugur, 2020",
    title: "Pertemuan Pertama",
    desc: "Berawal dari sebuah diskusi kecil...",
  },
]);

export const BANK_ACCOUNTS = parseJson(import.meta.env.PUBLIC_BANK_ACCOUNTS, [
  { bank: "Bank BCA", number: "1234567890", name: "Fera Oktapia" },
]);

export const GALLERY_IMAGES = parseJson(import.meta.env.PUBLIC_GALLERY_IMAGES, [
  "https://placehold.co/800x1200",
  "https://placehold.co/1200x800",
]);
