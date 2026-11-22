import type { AppConfig } from "../types";
import {
  normalizePublicDefaultMode,
  normalizePublicTheme,
} from "./publicThemes.ts";

const parseArrayJson = <T>(
  str: string | undefined,
  validator: (item: unknown) => item is T,
  fallback: T[]
): T[] => {
  if (!str) return fallback;
  try {
    const parsed = JSON.parse(str);
    if (!Array.isArray(parsed)) return fallback;
    return parsed.filter(validator);
  } catch {
    return fallback;
  }
};

const parseSafeNumber = (str: string | undefined, fallback: number): number => {
  if (!str) return fallback;
  const num = Number(str);
  return Number.isFinite(num) ? num : fallback;
};

const parseSafeInt = (
  str: string | undefined,
  fallback: number,
  min = 1,
  max = 100
): number => {
  if (!str) return fallback;
  const num = parseInt(str, 10);
  if (!Number.isInteger(num) || num < min || num > max) return fallback;
  return num;
};

const parseSafeDate = (str: string | undefined, fallbackIso: string): Date => {
  const candidate = new Date(str || fallbackIso);
  if (!Number.isNaN(candidate.getTime())) return candidate;
  return new Date(fallbackIso);
};

export function parseConfig(raw: Record<string, string>): AppConfig {
  return {
    couple: {
      bride: {
        name: raw.BRIDE_NICKNAME ?? "Bride",
        fullName: raw.BRIDE_FULLNAME ?? "Bride",
        parents: raw.BRIDE_PARENTS ?? "",
        instagram: raw.BRIDE_INSTAGRAM ?? "",
        image: raw.BRIDE_IMAGE || "https://placehold.co/600x800",
      },
      groom: {
        name: raw.GROOM_NICKNAME ?? "Groom",
        fullName: raw.GROOM_FULLNAME ?? "Groom",
        parents: raw.GROOM_PARENTS ?? "",
        instagram: raw.GROOM_INSTAGRAM ?? "",
        image: raw.GROOM_IMAGE || "https://placehold.co/600x800",
      },
    },
    venue: {
      name: raw.VENUE_NAME ?? "",
      address: raw.VENUE_ADDRESS ?? "",
      latitude: parseSafeNumber(raw.VENUE_LAT, 0),
      longitude: parseSafeNumber(raw.VENUE_LNG, 0),
    },
    events: {
      timezone: raw.EVENT_TIMEZONE || "WIB",
      akad: {
        title: raw.AKAD_TITLE ?? "Akad Nikah",
        day: raw.AKAD_DAY ?? "",
        date: raw.AKAD_DATE ?? "",
        startTime: raw.AKAD_START ?? "",
        endTime: raw.AKAD_END ?? "",
        startDateTime: parseSafeDate(
          raw.AKAD_ISO_START,
          "2025-01-01T08:00:00+07:00"
        ),
        endDateTime: parseSafeDate(
          raw.AKAD_ISO_END,
          "2025-01-01T10:00:00+07:00"
        ),
      },
      resepsi: {
        title: raw.RESEPSI_TITLE ?? "Resepsi",
        day: raw.RESEPSI_DAY ?? "",
        date: raw.RESEPSI_DATE ?? "",
        startTime: raw.RESEPSI_START ?? "",
        endTime: raw.RESEPSI_END ?? "",
        startDateTime: parseSafeDate(
          raw.RESEPSI_ISO_START,
          "2025-01-01T11:00:00+07:00"
        ),
        endDateTime: parseSafeDate(
          raw.RESEPSI_ISO_END,
          "2025-01-01T14:00:00+07:00"
        ),
      },
    },
    hero: {
      image: raw.HERO_IMAGE ?? "",
      envelopeImage: raw.ENVELOPE_IMAGE ?? "",
      city: raw.HERO_CITY ?? "",
    },
    gift: {
      address: raw.GIFT_ADDRESS ?? "",
    },
    music: {
      url: raw.MUSIC_URL ?? "",
    },
    rsvp: {
      maxGuests: parseSafeInt(raw.RSVP_MAX_GUESTS, 10, 1, 100),
    },
    appearance: {
      theme: normalizePublicTheme(raw.PUBLIC_THEME),
      defaultMode: normalizePublicDefaultMode(raw.PUBLIC_DEFAULT_MODE),
      allowGuestThemeSwitch: raw.PUBLIC_ALLOW_THEME_SWITCH !== "false",
    },
    bankAccounts: parseArrayJson(
      raw.BANK_ACCOUNTS,
      (item): item is { bank: string; number: string; name: string } =>
        Boolean(
          item &&
            typeof item === "object" &&
            typeof (item as Record<string, unknown>).bank === "string" &&
            typeof (item as Record<string, unknown>).number === "string" &&
            typeof (item as Record<string, unknown>).name === "string"
        ),
      []
    ),
    loveStory: parseArrayJson(
      raw.LOVE_STORY,
      (item): item is { date: string; title: string; desc: string } =>
        Boolean(
          item &&
            typeof item === "object" &&
            typeof (item as Record<string, unknown>).date === "string" &&
            typeof (item as Record<string, unknown>).title === "string" &&
            typeof (item as Record<string, unknown>).desc === "string"
        ),
      []
    ),
    galleryImages: parseArrayJson(
      raw.GALLERY_IMAGES,
      (item): item is string => typeof item === "string" && item.trim() !== "",
      []
    ),
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
  };
}
