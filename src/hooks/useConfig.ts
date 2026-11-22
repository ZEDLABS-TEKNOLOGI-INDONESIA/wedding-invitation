import { useEffect, useState } from "react";
import type { AppConfig } from "../types";
import { parseConfig } from "../utils/configParser";

const DEFAULT_RAW: Record<string, string> = {
  BRIDE_NICKNAME: "Bride",
  GROOM_NICKNAME: "Groom",
  BRIDE_FULLNAME: "Bride",
  GROOM_FULLNAME: "Groom",
  BRIDE_PARENTS: "",
  GROOM_PARENTS: "",
  BRIDE_INSTAGRAM: "",
  GROOM_INSTAGRAM: "",
  BRIDE_IMAGE: "https://placehold.co/600x800",
  GROOM_IMAGE: "https://placehold.co/600x800",
  VENUE_NAME: "",
  VENUE_ADDRESS: "",
  VENUE_LAT: "0",
  VENUE_LNG: "0",
  AKAD_TITLE: "Akad Nikah",
  AKAD_DAY: "",
  AKAD_DATE: "",
  AKAD_START: "",
  AKAD_END: "",
  AKAD_ISO_START: "2025-01-01T08:00:00+07:00",
  AKAD_ISO_END: "2025-01-01T10:00:00+07:00",
  RESEPSI_TITLE: "Resepsi",
  RESEPSI_DAY: "",
  RESEPSI_DATE: "",
  RESEPSI_START: "",
  RESEPSI_END: "",
  RESEPSI_ISO_START: "2025-01-01T11:00:00+07:00",
  RESEPSI_ISO_END: "2025-01-01T14:00:00+07:00",
  HERO_IMAGE: "",
  ENVELOPE_IMAGE: "",
  HERO_CITY: "",
  EVENT_TIMEZONE: "WIB",
  GIFT_ADDRESS: "",
  MUSIC_URL: "",
  RSVP_MAX_GUESTS: "10",
  BANK_ACCOUNTS: "[]",
  LOVE_STORY: "[]",
  GALLERY_IMAGES: "[]",
  TEXT_SALAM_OPENING: "",
  TEXT_QUOTE_AR_RUM: "",
  TEXT_QUOTE_SOURCE: "",
  TEXT_INVITATION: "",
  TEXT_CLOSING: "",
  TEXT_SALAM_CLOSING: "",
  TEXT_SIGNATURE: "",
  TEXT_FAMILY: "",
  TEXT_GIFT_TITLE: "",
  TEXT_GIFT_DESC: "",
};

let cache: { slug: string; data: AppConfig; raw: Record<string, string> } | null = null;

export function useConfig(
  initialRaw?: Record<string, string>,
  weddingSlug = "demo"
) {
  const [config, setConfig] = useState<AppConfig | null>(() => {
    if (initialRaw) return parseConfig(initialRaw);
    if (cache && cache.slug === weddingSlug) return cache.data;
    return null;
  });
  const [raw, setRaw] = useState<Record<string, string>>(() => {
    if (initialRaw) return initialRaw;
    if (cache && cache.slug === weddingSlug) return cache.raw;
    return DEFAULT_RAW;
  });
  const [loading, setLoading] = useState(
    !initialRaw && !(cache && cache.slug === weddingSlug)
  );

  useEffect(() => {
    if (initialRaw) {
      const parsed = parseConfig(initialRaw);
      cache = { slug: weddingSlug, data: parsed, raw: initialRaw };
      return;
    }
    if (cache && cache.slug === weddingSlug) return;
    fetch(`/api/config?wedding=${encodeURIComponent(weddingSlug)}`)
      .then((r) => r.json())
      .then((data: Record<string, string>) => {
        const parsed = parseConfig(data);
        cache = { slug: weddingSlug, data: parsed, raw: data };
        setConfig(parsed);
        setRaw(data);
        setLoading(false);
      })
      .catch(() => {
        const fallback = parseConfig(DEFAULT_RAW);
        setConfig(fallback);
        setLoading(false);
      });
  }, [initialRaw, weddingSlug]);

  return { config, raw, loading };
}

export function invalidateConfigCache() {
  cache = null;
}
