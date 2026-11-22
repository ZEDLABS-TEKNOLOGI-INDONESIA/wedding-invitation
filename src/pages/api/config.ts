import type { APIRoute } from "astro";
import { getAuthSession } from "../../lib/auth";
import db, {
  ALLOWED_CONFIG_KEYS,
  DEFAULT_WEDDING_ID,
  getPublicConfig,
  getWeddingBySlug,
  setConfig,
} from "../../lib/db";

const JSON_HEADERS = { "Content-Type": "application/json" };
const URL_KEYS = new Set([
  "BRIDE_IMAGE",
  "GROOM_IMAGE",
  "HERO_IMAGE",
  "ENVELOPE_IMAGE",
  "MUSIC_URL",
  "WA_BASE_URL",
]);

const isSafeUrl = (value: string): boolean => {
  const trimmed = value.trim();
  if (!trimmed) return true;
  if (trimmed.startsWith("/") && !trimmed.startsWith("//")) return true;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
};

const validateConfigEntry = (key: string, value: string): string | null => {
  const maxLen =
    key === "BANK_ACCOUNTS" || key === "LOVE_STORY" || key === "GALLERY_IMAGES"
      ? 20000
      : 2000;
  if (value.length > maxLen) {
    return `Nilai ${key} melebihi batas panjang karakter.`;
  }

  if (URL_KEYS.has(key) && !isSafeUrl(value)) {
    return `${key} harus berupa URL http(s) atau path relatif yang valid.`;
  }

  if (key === "VENUE_LAT") {
    const num = Number(value);
    if (
      value.trim() !== "" &&
      (!Number.isFinite(num) || num < -90 || num > 90)
    ) {
      return "VENUE_LAT harus berupa angka antara -90 dan 90.";
    }
  }

  if (key === "VENUE_LNG") {
    const num = Number(value);
    if (
      value.trim() !== "" &&
      (!Number.isFinite(num) || num < -180 || num > 180)
    ) {
      return "VENUE_LNG harus berupa angka antara -180 dan 180.";
    }
  }

  if (key === "RSVP_MAX_GUESTS") {
    const num = Number(value);
    if (!Number.isInteger(num) || num < 1 || num > 100) {
      return "RSVP_MAX_GUESTS harus berupa bilangan bulat antara 1 dan 100.";
    }
  }

  if (
    key === "PUBLIC_THEME" &&
    !["ocean", "sage", "blush", "maroon", "gold", "lavender"].includes(
      value.trim().toLowerCase()
    )
  ) {
    return "PUBLIC_THEME tidak dikenali.";
  }

  if (
    key === "PUBLIC_DEFAULT_MODE" &&
    !["system", "light", "dark"].includes(value.trim().toLowerCase())
  ) {
    return "PUBLIC_DEFAULT_MODE harus berupa system, light, atau dark.";
  }

  if (
    key === "PUBLIC_ANIMATION" &&
    ![
      "doves",
      "petals",
      "butterflies",
      "lanterns",
      "sparkles",
      "none",
    ].includes(value.trim().toLowerCase())
  ) {
    return "PUBLIC_ANIMATION tidak dikenali.";
  }

  if (
    key === "PUBLIC_ORNAMENT" &&
    ![
      "botanical",
      "floral",
      "islamic",
      "baroque",
      "celestial",
      "none",
    ].includes(value.trim().toLowerCase())
  ) {
    return "PUBLIC_ORNAMENT tidak dikenali.";
  }

  if (key === "BANK_ACCOUNTS") {
    try {
      const parsed = JSON.parse(value);
      if (
        !Array.isArray(parsed) ||
        !parsed.every(
          (item) =>
            item &&
            typeof item === "object" &&
            typeof item.bank === "string" &&
            typeof item.number === "string" &&
            typeof item.name === "string"
        )
      ) {
        return 'BANK_ACCOUNTS harus berupa JSON array berisi objek { "bank", "number", "name" }.';
      }
    } catch {
      return "BANK_ACCOUNTS bukan JSON yang valid.";
    }
  }

  if (key === "LOVE_STORY") {
    try {
      const parsed = JSON.parse(value);
      if (
        !Array.isArray(parsed) ||
        !parsed.every(
          (item) =>
            item &&
            typeof item === "object" &&
            typeof item.date === "string" &&
            typeof item.title === "string" &&
            typeof item.desc === "string"
        )
      ) {
        return 'LOVE_STORY harus berupa JSON array berisi objek { "date", "title", "desc" }.';
      }
    } catch {
      return "LOVE_STORY bukan JSON yang valid.";
    }
  }

  if (key === "GALLERY_IMAGES") {
    try {
      const parsed = JSON.parse(value);
      if (
        !Array.isArray(parsed) ||
        !parsed.every((item) => typeof item === "string" && isSafeUrl(item))
      ) {
        return "GALLERY_IMAGES harus berupa JSON array berisi URL gambar http(s) yang valid.";
      }
    } catch {
      return "GALLERY_IMAGES bukan JSON yang valid.";
    }
  }

  return null;
};

export const GET: APIRoute = async ({ url }) => {
  try {
    const slug = (url.searchParams.get("wedding") || "").trim().toLowerCase();
    let weddingId = DEFAULT_WEDDING_ID;
    if (slug) {
      const w = getWeddingBySlug(slug);
      if (!w || w.status !== "active") {
        return new Response(
          JSON.stringify({ error: "Undangan tidak ditemukan." }),
          {
            status: 404,
            headers: JSON_HEADERS,
          }
        );
      }
      weddingId = w.id;
    }
    const safeConfig = getPublicConfig(weddingId);
    return new Response(JSON.stringify(safeConfig), {
      status: 200,
      headers: JSON_HEADERS,
    });
  } catch {
    return new Response(JSON.stringify({ error: "Failed to fetch config" }), {
      status: 500,
      headers: JSON_HEADERS,
    });
  }
};

export const POST: APIRoute = async ({ request, cookies }) => {
  const session = getAuthSession(cookies);
  if (!session) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...JSON_HEADERS, "Cache-Control": "no-store" },
    });
  }

  try {
    const body = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return new Response(JSON.stringify({ error: "Payload tidak valid." }), {
        status: 400,
        headers: { ...JSON_HEADERS, "Cache-Control": "no-store" },
      });
    }

    const entriesToSave: [string, string][] = [];

    for (const [key, value] of Object.entries(body)) {
      if (!ALLOWED_CONFIG_KEYS.has(key)) continue;
      const stringValue =
        typeof value === "string" ? value : JSON.stringify(value);
      const validationError = validateConfigEntry(key, stringValue);
      if (validationError) {
        return new Response(JSON.stringify({ error: validationError }), {
          status: 400,
          headers: { ...JSON_HEADERS, "Cache-Control": "no-store" },
        });
      }
      entriesToSave.push([key, stringValue]);
    }

    const saveAll = db.transaction((items: [string, string][]) => {
      for (const [key, val] of items) {
        setConfig(key, val, session.weddingId);
      }
    });
    saveAll(entriesToSave);

    const nextCfg = getPublicConfig(session.weddingId);
    if (nextCfg.BRIDE_NICKNAME && nextCfg.GROOM_NICKNAME) {
      const prefix = session.isDemo ? "Demo | " : "Undangan ";
      db.prepare("UPDATE weddings SET title = ? WHERE id = ?").run(
        `${prefix}${nextCfg.BRIDE_NICKNAME} & ${nextCfg.GROOM_NICKNAME}`,
        session.weddingId
      );
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...JSON_HEADERS, "Cache-Control": "no-store" },
    });
  } catch {
    return new Response(JSON.stringify({ error: "Failed to save config" }), {
      status: 500,
      headers: { ...JSON_HEADERS, "Cache-Control": "no-store" },
    });
  }
};
