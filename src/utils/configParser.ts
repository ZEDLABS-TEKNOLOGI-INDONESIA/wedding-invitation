import type { AppConfig } from "../types";

export function parseConfig(raw: Record<string, string>): AppConfig {
  const parseJson = <T>(str: string, fallback: T): T => {
    try {
      return JSON.parse(str) as T;
    } catch {
      return fallback;
    }
  };

  return {
    couple: {
      bride: {
        name: raw.BRIDE_NICKNAME ?? "Bride",
        fullName: raw.BRIDE_FULLNAME ?? "Bride",
        parents: raw.BRIDE_PARENTS ?? "",
        instagram: raw.BRIDE_INSTAGRAM ?? "",
        image: raw.BRIDE_IMAGE ?? "https://placehold.co/600x800",
      },
      groom: {
        name: raw.GROOM_NICKNAME ?? "Groom",
        fullName: raw.GROOM_FULLNAME ?? "Groom",
        parents: raw.GROOM_PARENTS ?? "",
        instagram: raw.GROOM_INSTAGRAM ?? "",
        image: raw.GROOM_IMAGE ?? "https://placehold.co/600x800",
      },
    },
    venue: {
      name: raw.VENUE_NAME ?? "",
      address: raw.VENUE_ADDRESS ?? "",
      latitude: parseFloat(raw.VENUE_LAT ?? "0"),
      longitude: parseFloat(raw.VENUE_LNG ?? "0"),
    },
    events: {
      akad: {
        title: raw.AKAD_TITLE ?? "Akad Nikah",
        day: raw.AKAD_DAY ?? "",
        date: raw.AKAD_DATE ?? "",
        startTime: raw.AKAD_START ?? "",
        endTime: raw.AKAD_END ?? "",
        startDateTime: new Date(
          raw.AKAD_ISO_START ?? "2025-01-01T08:00:00+07:00"
        ),
        endDateTime: new Date(raw.AKAD_ISO_END ?? "2025-01-01T10:00:00+07:00"),
      },
      resepsi: {
        title: raw.RESEPSI_TITLE ?? "Resepsi",
        day: raw.RESEPSI_DAY ?? "",
        date: raw.RESEPSI_DATE ?? "",
        startTime: raw.RESEPSI_START ?? "",
        endTime: raw.RESEPSI_END ?? "",
        startDateTime: new Date(
          raw.RESEPSI_ISO_START ?? "2025-01-01T11:00:00+07:00"
        ),
        endDateTime: new Date(
          raw.RESEPSI_ISO_END ?? "2025-01-01T14:00:00+07:00"
        ),
      },
    },
    hero: {
      image: raw.HERO_IMAGE ?? "",
      city: raw.HERO_CITY ?? "",
    },
    music: {
      url: raw.MUSIC_URL ?? "",
    },
    rsvp: {
      maxGuests: parseInt(raw.RSVP_MAX_GUESTS ?? "10", 10),
    },
    bankAccounts: parseJson(raw.BANK_ACCOUNTS, []),
    loveStory: parseJson(raw.LOVE_STORY, []),
    galleryImages: parseJson(raw.GALLERY_IMAGES, []),
    text: {
      opening: {
        salam: raw.TEXT_SALAM_OPENING ?? "",
      },
      quote: {
        ar_rum: raw.TEXT_QUOTE_AR_RUM ?? "",
        source: raw.TEXT_QUOTE_SOURCE ?? "",
      },
      invitation: raw.TEXT_INVITATION ?? "",
      closing: {
        text: raw.TEXT_CLOSING ?? "",
        salam: raw.TEXT_SALAM_CLOSING ?? "",
        signature: raw.TEXT_SIGNATURE ?? "",
        family: raw.TEXT_FAMILY ?? "",
      },
      gift: {
        title: raw.TEXT_GIFT_TITLE ?? "",
        desc: raw.TEXT_GIFT_DESC ?? "",
      },
    },
    telegram: {
      botToken: raw.TELEGRAM_BOT_TOKEN ?? "",
      chatId: raw.TELEGRAM_CHAT_ID ?? "",
    },
  };
}
