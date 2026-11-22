export interface TimezoneOption {
  value: "WIB" | "WITA" | "WIT";
  label: string;
  offset: string;
}

export const TIMEZONE_OPTIONS: TimezoneOption[] = [
  { value: "WIB", label: "WIB — Waktu Indonesia Barat (UTC+7)", offset: "+07:00" },
  { value: "WITA", label: "WITA — Waktu Indonesia Tengah (UTC+8)", offset: "+08:00" },
  { value: "WIT", label: "WIT — Waktu Indonesia Timur (UTC+9)", offset: "+09:00" },
];

export const BANK_PRESETS = [
  "Bank BCA",
  "Bank BRI",
  "Bank BNI",
  "Bank Mandiri",
  "Bank BSI",
  "Bank CIMB Niaga",
  "Bank Permata",
  "Bank Danamon",
  "Bank Mega",
  "Bank Jago",
  "SeaBank",
  "GoPay",
  "OVO",
  "DANA",
  "ShopeePay",
  "LinkAja",
];

export const GUEST_GROUP_PRESETS = [
  "Keluarga Mempelai Wanita",
  "Keluarga Mempelai Pria",
  "Sahabat",
  "Teman Kuliah",
  "Rekan Kerja",
  "Tetangga",
  "VIP",
];

export const QUICK_WISH_TEMPLATES = [
  "Barakallahu lakuma wa baraka 'alaikuma wa jama'a bainakuma fi khair. Semoga senantiasa dikaruniai keluarga sakinah, mawaddah, warahmah.",
  "Selamat menempuh bahtera rumah tangga. Semoga kasih sayang, keberkahan, dan kedamaian selalu menyertai langkah kedua mempelai.",
  "Semoga ikatan suci ini menjadi awal kisah indah yang penuh berkah, kesetiaan, dan kebahagiaan hingga menua bersama.",
  "Turut bersukacita atas hari bahagia kedua mempelai. Semoga Allah SWT senantiasa melimpahkan rahmat dan kebahagiaan sepanjang masa.",
];

const ID_DAYS = [
  "Minggu",
  "Senin",
  "Selasa",
  "Rabu",
  "Kamis",
  "Jumat",
  "Sabtu",
];

const ID_MONTHS = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

export const getTimezoneOffset = (tz?: string): string => {
  const upper = (tz || "WIB").trim().toUpperCase();
  const match = TIMEZONE_OPTIONS.find((item) => item.value === upper);
  return match ? match.offset : "+07:00";
};

export const formatIndonesianDate = (
  ymd: string
): { day: string; date: string } | null => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd.trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const dayNum = Number(match[3]);
  if (month < 1 || month > 12 || dayNum < 1 || dayNum > 31) return null;

  const utcDate = new Date(Date.UTC(year, month - 1, dayNum));
  if (
    utcDate.getUTCFullYear() !== year ||
    utcDate.getUTCMonth() !== month - 1 ||
    utcDate.getUTCDate() !== dayNum
  ) {
    return null;
  }

  return {
    day: ID_DAYS[utcDate.getUTCDay()],
    date: `${dayNum} ${ID_MONTHS[month - 1]} ${year}`,
  };
};

export const parseIsoToSchedule = (
  isoStart?: string,
  isoEnd?: string,
  fallbackStart?: string,
  fallbackEnd?: string
): { dateYmd: string; startTime: string; endTime: string } => {
  const extractDate = (iso?: string): string => {
    const m = /^(\d{4}-\d{2}-\d{2})/.exec((iso || "").trim());
    return m ? m[1] : "";
  };
  const extractTime = (iso?: string, fallback?: string): string => {
    const m = /T(\d{2}:\d{2})/.exec((iso || "").trim());
    if (m) return m[1];
    const fb = /^(\d{1,2}):(\d{2})/.exec((fallback || "").trim());
    if (fb) return `${fb[1].padStart(2, "0")}:${fb[2]}`;
    return "";
  };

  return {
    dateYmd: extractDate(isoStart) || extractDate(isoEnd),
    startTime: extractTime(isoStart, fallbackStart),
    endTime: extractTime(isoEnd, fallbackEnd),
  };
};

export const buildEventScheduleFields = (
  prefix: "AKAD" | "RESEPSI",
  dateYmd: string,
  startTime: string,
  endTime: string,
  timezone = "WIB"
): Record<string, string> => {
  const result: Record<string, string> = {};
  const offset = getTimezoneOffset(timezone);
  const formatted = formatIndonesianDate(dateYmd);

  if (formatted) {
    result[`${prefix}_DAY`] = formatted.day;
    result[`${prefix}_DATE`] = formatted.date;
  }

  const cleanStart = /^\d{2}:\d{2}$/.test(startTime.trim())
    ? startTime.trim()
    : "";
  const cleanEnd = /^\d{2}:\d{2}$/.test(endTime.trim()) ? endTime.trim() : "";

  if (cleanStart) {
    result[`${prefix}_START`] = cleanStart;
  }
  if (cleanEnd) {
    result[`${prefix}_END`] = cleanEnd;
  }

  if (formatted && cleanStart) {
    result[`${prefix}_ISO_START`] = `${dateYmd.trim()}T${cleanStart}:00${offset}`;
  }
  if (formatted && cleanEnd) {
    result[`${prefix}_ISO_END`] = `${dateYmd.trim()}T${cleanEnd}:00${offset}`;
  }

  return result;
};

const isValidCoordPair = (lat: number, lng: number): boolean =>
  Number.isFinite(lat) &&
  Number.isFinite(lng) &&
  lat >= -90 &&
  lat <= 90 &&
  lng >= -180 &&
  lng <= 180;

export const extractCoordsFromMapsUrl = (
  input: string
): { lat: string; lng: string } | null => {
  const raw = input.trim();
  if (!raw) return null;

  const patterns: RegExp[] = [
    /!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/,
    /@(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/,
    /[?&](?:q|query|ll|center)=(-?\d+(?:\.\d+)?)(?:,|%2C)\s*(-?\d+(?:\.\d+)?)/i,
    /^\s*(-?\d+(?:\.\d+)?)\s*[,;\s]\s*(-?\d+(?:\.\d+)?)\s*$/,
  ];

  for (const regex of patterns) {
    const match = regex.exec(raw);
    if (!match) continue;
    const lat = Number(match[1]);
    const lng = Number(match[2]);
    if (isValidCoordPair(lat, lng)) {
      return {
        lat: match[1],
        lng: match[2],
      };
    }
  }

  return null;
};

export const cleanInstagramHandle = (input: string): string => {
  let val = input.trim();
  if (!val) return "";
  val = val.replace(/^https?:\/\/(?:www\.)?instagram\.com\//i, "");
  val = val.split(/[/?#]/)[0] || "";
  val = val.replace(/^@+/, "");
  return val.trim();
};
