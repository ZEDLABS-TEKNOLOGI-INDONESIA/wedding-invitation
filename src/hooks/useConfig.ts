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
  HERO_CITY: "",
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

let cache: { data: AppConfig; raw: Record<string, string> } | null = null;

export function useConfig() {
  const [config, setConfig] = useState<AppConfig | null>(
    cache ? cache.data : null
  );
  const [raw, setRaw] = useState<Record<string, string>>(
    cache ? cache.raw : DEFAULT_RAW
  );
  const [loading, setLoading] = useState(!cache);

  useEffect(() => {
    if (cache) return;
    fetch("/api/config")
      .then((r) => r.json())
      .then((data: Record<string, string>) => {
        const parsed = parseConfig(data);
        cache = { data: parsed, raw: data };
        setConfig(parsed);
        setRaw(data);
        setLoading(false);
      })
      .catch(() => {
        const fallback = parseConfig(DEFAULT_RAW);
        setConfig(fallback);
        setLoading(false);
      });
  }, []);

  return { config, raw, loading };
}

export function invalidateConfigCache() {
  cache = null;
}
