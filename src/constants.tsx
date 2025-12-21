import type { WeddingConfig } from "./types";

const getEnv = (key: string, defaultValue: string): string => {
  return import.meta.env[key] ?? defaultValue;
};

const getJsonEnv = <T,>(key: string, defaultValue: T): T => {
  const val = import.meta.env[key];
  if (!val) return defaultValue;
  try {
    return JSON.parse(val) as T;
  } catch (e) {
    console.warn(`Failed to parse JSON env for ${key}`, e);
    return defaultValue;
  }
};

export const MUSIC_URL = getEnv(
  "PUBLIC_MUSIC_URL",
  "https://www.bensound.com/bensound-music/bensound-love.mp3"
);

export const MAX_GUESTS = parseInt(getEnv("PUBLIC_RSVP_MAX_GUESTS", "20"), 10);

export const WEDDING_CONFIG: WeddingConfig = {
  couple: {
    bride: {
      name: getEnv("PUBLIC_BRIDE_NICKNAME", "Fey"),
      fullName: getEnv("PUBLIC_BRIDE_FULLNAME", "Fera Oktapia"),
      parents: getEnv("PUBLIC_BRIDE_PARENTS", "Putri ke ..."),
      instagram: getEnv("PUBLIC_BRIDE_INSTAGRAM", "feraoktapia___"),
      image: getEnv("PUBLIC_BRIDE_IMAGE", "https://placehold.co/600x800"),
    },
    groom: {
      name: getEnv("PUBLIC_GROOM_NICKNAME", "Yaya"),
      fullName: getEnv("PUBLIC_GROOM_FULLNAME", "Yahya Zulfikri"),
      parents: getEnv("PUBLIC_GROOM_PARENTS", "Putra ke ..."),
      instagram: getEnv("PUBLIC_GROOM_INSTAGRAM", "zulfikriyahya_"),
      image: getEnv("PUBLIC_GROOM_IMAGE", "https://placehold.co/600x800"),
    },
  },
  venue: {
    name: getEnv("PUBLIC_VENUE_NAME", "The Royal Azure Ballroom"),
    address: getEnv("PUBLIC_VENUE_ADDRESS", "Jl. Elok No. 77"),
    latitude: parseFloat(getEnv("PUBLIC_VENUE_LAT", "-6.2088")),
    longitude: parseFloat(getEnv("PUBLIC_VENUE_LNG", "106.8456")),
  },
  events: {
    akad: {
      title: getEnv("PUBLIC_AKAD_TITLE", "Janji Suci"),
      day: getEnv("PUBLIC_AKAD_DAY", "Minggu"),
      date: getEnv("PUBLIC_AKAD_DATE", "11 Oktober 2025"),
      startTime: getEnv("PUBLIC_AKAD_START", "08:00"),
      endTime: getEnv("PUBLIC_AKAD_END", "10:00"),
      startDateTime: new Date(
        getEnv("PUBLIC_AKAD_ISO_START", "2025-10-11T08:00:00+07:00")
      ),
      endDateTime: new Date(
        getEnv("PUBLIC_AKAD_ISO_END", "2025-10-11T10:00:00+07:00")
      ),
    },
    resepsi: {
      title: getEnv("PUBLIC_RESEPSI_TITLE", "Perayaan Cinta"),
      day: getEnv("PUBLIC_RESEPSI_DAY", "Minggu"),
      date: getEnv("PUBLIC_RESEPSI_DATE", "11 Oktober 2025"),
      startTime: getEnv("PUBLIC_RESEPSI_START", "11:00"),
      endTime: getEnv("PUBLIC_RESEPSI_END", "14:00"),
      startDateTime: new Date(
        getEnv("PUBLIC_RESEPSI_ISO_START", "2025-10-11T11:00:00+07:00")
      ),
      endDateTime: new Date(
        getEnv("PUBLIC_RESEPSI_ISO_END", "2025-10-11T14:00:00+07:00")
      ),
    },
  },
};

export const LOVE_STORY = getJsonEnv("PUBLIC_LOVE_STORY", [
  {
    date: "Musim Gugur, 2020",
    title: "Pertemuan Pertama",
    desc: "Berawal dari sebuah diskusi kecil...",
  },
]);

export const BANK_ACCOUNTS = getJsonEnv("PUBLIC_BANK_ACCOUNTS", [
  { bank: "Bank BCA", number: "1234567890", name: "Fera Oktapia" },
]);

export const GALLERY_IMAGES = getJsonEnv("PUBLIC_GALLERY_IMAGES", [
  "https://placehold.co/800x1200",
  "https://placehold.co/1200x800",
]);
