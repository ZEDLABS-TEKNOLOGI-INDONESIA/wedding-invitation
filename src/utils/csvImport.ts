import Papa from "papaparse";
import { escapeCsvCell } from "./csv.ts";

export interface CsvParseResult<T> {
  rows: T[];
  skipped: number;
  warnings: string[];
}

export interface ParsedGuestRow {
  name: string;
  phone: string;
  address: string;
  group_name: string;
  quota: number;
}

export interface ParsedRsvpRow {
  guest_name: string;
  phone: string;
  attendance: "hadir" | "tidak_hadir" | "ragu";
  guest_count: number;
  message: string;
}

export interface ParsedWishRow {
  name: string;
  message: string;
}

export interface ParsedBankRow {
  bank: string;
  number: string;
  name: string;
}

export interface ParsedLoveStoryRow {
  date: string;
  title: string;
  desc: string;
}

export interface ParsedConfigRow {
  key: string;
  value: string;
}

const normalizeHeader = (cell: string): string =>
  cell
    .replace(/^\uFEFF/, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const parseRawMatrix = (text: string): string[][] => {
  const cleaned = text.replace(/^\uFEFF/, "").trim();
  if (!cleaned) return [];
  const parsed = Papa.parse<string[]>(cleaned, {
    header: false,
    skipEmptyLines: "greedy",
    delimitersToGuess: [",", ";", "\t", "|"],
  });
  return (parsed.data || [])
    .filter((row) => Array.isArray(row))
    .map((row) => row.map((cell) => (cell == null ? "" : String(cell).trim())))
    .filter((row) => row.some((cell) => cell !== ""));
};

const matchHeaderIndex = (
  headers: string[],
  aliases: string[]
): number => {
  for (let i = 0; i < headers.length; i++) {
    const h = headers[i];
    if (!h) continue;
    if (aliases.some((alias) => h === alias || h.includes(alias))) {
      return i;
    }
  }
  return -1;
};

export const parseGuestsText = (
  text: string
): CsvParseResult<ParsedGuestRow> => {
  const matrix = parseRawMatrix(text);
  if (matrix.length === 0) return { rows: [], skipped: 0, warnings: [] };

  const firstNormalized = matrix[0].map(normalizeHeader);
  const nameHeaderIdx = matchHeaderIndex(firstNormalized, [
    "nama tamu",
    "guest name",
    "nama",
    "name",
  ]);
  const phoneHeaderIdx = matchHeaderIndex(firstNormalized, [
    "no whatsapp",
    "whatsapp",
    "no wa",
    "wa",
    "phone",
    "telepon",
    "kontak",
    "no hp",
    "hp",
  ]);
  const addressHeaderIdx = matchHeaderIndex(firstNormalized, [
    "alamat",
    "kota",
    "address",
    "lokasi",
  ]);
  const groupHeaderIdx = matchHeaderIndex(firstNormalized, [
    "grup",
    "group",
    "kategori",
    "relasi",
  ]);
  const quotaHeaderIdx = matchHeaderIndex(firstNormalized, [
    "kuota",
    "quota",
    "pax",
    "jumlah",
  ]);

  const hasHeader =
    nameHeaderIdx !== -1 ||
    phoneHeaderIdx !== -1 ||
    addressHeaderIdx !== -1 ||
    groupHeaderIdx !== -1 ||
    quotaHeaderIdx !== -1;

  const startIdx = hasHeader ? 1 : 0;
  const colName = hasHeader ? (nameHeaderIdx !== -1 ? nameHeaderIdx : 0) : 0;
  const colPhone = hasHeader ? phoneHeaderIdx : 1;
  const colAddress = hasHeader ? addressHeaderIdx : 2;
  const colGroup = hasHeader ? groupHeaderIdx : 3;
  const colQuota = hasHeader ? quotaHeaderIdx : 4;

  const rows: ParsedGuestRow[] = [];
  let skipped = 0;

  for (let i = startIdx; i < matrix.length; i++) {
    const row = matrix[i];
    const name = (row[colName] || "").trim().slice(0, 100);
    if (!name) {
      skipped++;
      continue;
    }

    const rawPhone = colPhone >= 0 ? (row[colPhone] || "").trim() : "";
    const rawAddress = colAddress >= 0 ? (row[colAddress] || "").trim() : "";
    const rawGroup = colGroup >= 0 ? (row[colGroup] || "").trim() : "";
    const rawQuota = colQuota >= 0 ? Number(row[colQuota]) : 2;
    const quota =
      Number.isInteger(rawQuota) && rawQuota >= 1 && rawQuota <= 50
        ? rawQuota
        : 2;

    rows.push({
      name,
      phone: rawPhone.slice(0, 30),
      address: rawAddress ? rawAddress.slice(0, 120) : "Di Tempat",
      group_name: rawGroup.slice(0, 60),
      quota,
    });
  }

  return { rows, skipped, warnings: [] };
};

const normalizeAttendance = (
  raw: string
): "hadir" | "tidak_hadir" | "ragu" => {
  const v = raw.toLowerCase().replace(/[_-]+/g, " ").trim();
  if (!v) return "hadir";
  if (
    v.includes("tidak") ||
    v.includes("absen") ||
    v.includes("berhalangan") ||
    v === "no" ||
    v === "n"
  ) {
    return "tidak_hadir";
  }
  if (
    v.includes("ragu") ||
    v.includes("maybe") ||
    v.includes("belum pasti") ||
    v.includes("tentatif")
  ) {
    return "ragu";
  }
  return "hadir";
};

export const parseRsvpsText = (text: string): CsvParseResult<ParsedRsvpRow> => {
  const matrix = parseRawMatrix(text);
  if (matrix.length === 0) return { rows: [], skipped: 0, warnings: [] };

  const firstNormalized = matrix[0].map(normalizeHeader);
  const nameIdx = matchHeaderIndex(firstNormalized, [
    "nama tamu",
    "guest name",
    "nama",
    "name",
  ]);
  const phoneIdx = matchHeaderIndex(firstNormalized, [
    "kontak",
    "whatsapp",
    "no wa",
    "wa",
    "phone",
    "no hp",
    "hp",
    "telepon",
  ]);
  const statusIdx = matchHeaderIndex(firstNormalized, [
    "status",
    "kehadiran",
    "attendance",
    "konfirmasi",
  ]);
  const paxIdx = matchHeaderIndex(firstNormalized, [
    "pax",
    "jumlah tamu",
    "jumlah",
    "guest count",
    "orang",
  ]);
  const msgIdx = matchHeaderIndex(firstNormalized, [
    "pesan",
    "message",
    "catatan",
    "ucapan",
  ]);

  const hasHeader =
    nameIdx !== -1 || statusIdx !== -1 || paxIdx !== -1 || msgIdx !== -1;

  const startIdx = hasHeader ? 1 : 0;
  const colName = hasHeader ? (nameIdx !== -1 ? nameIdx : 0) : 0;
  const colPhone = hasHeader ? phoneIdx : 1;
  const colStatus = hasHeader ? statusIdx : 2;
  const colPax = hasHeader ? paxIdx : 3;
  const colMsg = hasHeader ? msgIdx : 4;

  const rows: ParsedRsvpRow[] = [];
  let skipped = 0;

  for (let i = startIdx; i < matrix.length; i++) {
    const row = matrix[i];
    const guest_name = (row[colName] || "").trim().slice(0, 100);
    if (!guest_name) {
      skipped++;
      continue;
    }

    const phone = colPhone >= 0 ? (row[colPhone] || "").trim().slice(0, 30) : "";
    const attendance = normalizeAttendance(
      colStatus >= 0 ? row[colStatus] || "" : ""
    );
    const parsedPax = colPax >= 0 ? Number(row[colPax]) : 1;
    const guest_count =
      attendance === "hadir"
        ? Number.isInteger(parsedPax) && parsedPax >= 1 && parsedPax <= 100
          ? parsedPax
          : 1
        : 0;
    const message =
      colMsg >= 0 ? (row[colMsg] || "").trim().slice(0, 500) : "";

    rows.push({ guest_name, phone, attendance, guest_count, message });
  }

  return { rows, skipped, warnings: [] };
};

export const parseWishesText = (
  text: string
): CsvParseResult<ParsedWishRow> => {
  const matrix = parseRawMatrix(text);
  if (matrix.length === 0) return { rows: [], skipped: 0, warnings: [] };

  const firstNormalized = matrix[0].map(normalizeHeader);
  const nameIdx = matchHeaderIndex(firstNormalized, [
    "nama pengirim",
    "pengirim",
    "nama",
    "name",
  ]);
  const msgIdx = matchHeaderIndex(firstNormalized, [
    "ucapan",
    "doa",
    "pesan",
    "message",
  ]);

  const hasHeader = nameIdx !== -1 || msgIdx !== -1;
  const startIdx = hasHeader ? 1 : 0;
  const colName = hasHeader ? (nameIdx !== -1 ? nameIdx : 0) : 0;
  const colMsg = hasHeader ? (msgIdx !== -1 ? msgIdx : 1) : 1;

  const rows: ParsedWishRow[] = [];
  let skipped = 0;

  for (let i = startIdx; i < matrix.length; i++) {
    const row = matrix[i];
    const name = (row[colName] || "").trim().slice(0, 100);
    const message = (row[colMsg] || "").trim().slice(0, 1000);
    if (!name || !message) {
      skipped++;
      continue;
    }
    rows.push({ name, message });
  }

  return { rows, skipped, warnings: [] };
};

export const parseBankAccountsText = (
  text: string
): CsvParseResult<ParsedBankRow> => {
  const matrix = parseRawMatrix(text);
  if (matrix.length === 0) return { rows: [], skipped: 0, warnings: [] };

  const firstNormalized = matrix[0].map(normalizeHeader);
  const bankIdx = matchHeaderIndex(firstNormalized, [
    "nama bank",
    "bank",
    "e wallet",
    "ewallet",
  ]);
  const numIdx = matchHeaderIndex(firstNormalized, [
    "nomor rekening",
    "no rekening",
    "rekening",
    "number",
    "nomor",
  ]);
  const nameIdx = matchHeaderIndex(firstNormalized, [
    "atas nama",
    "pemilik",
    "nama",
    "name",
  ]);

  const hasHeader = bankIdx !== -1 || numIdx !== -1;
  const startIdx = hasHeader ? 1 : 0;
  const colBank = hasHeader ? (bankIdx !== -1 ? bankIdx : 0) : 0;
  const colNum = hasHeader ? (numIdx !== -1 ? numIdx : 1) : 1;
  const colName = hasHeader ? (nameIdx !== -1 ? nameIdx : 2) : 2;

  const rows: ParsedBankRow[] = [];
  let skipped = 0;

  for (let i = startIdx; i < matrix.length; i++) {
    const row = matrix[i];
    const bank = (row[colBank] || "").trim();
    const number = (row[colNum] || "").trim();
    const name = (row[colName] || "").trim();
    if (!bank && !number) {
      skipped++;
      continue;
    }
    rows.push({ bank, number, name });
  }

  return { rows, skipped, warnings: [] };
};

export const parseLoveStoryText = (
  text: string
): CsvParseResult<ParsedLoveStoryRow> => {
  const matrix = parseRawMatrix(text);
  if (matrix.length === 0) return { rows: [], skipped: 0, warnings: [] };

  const firstNormalized = matrix[0].map(normalizeHeader);
  const dateIdx = matchHeaderIndex(firstNormalized, [
    "tahun",
    "waktu",
    "tanggal",
    "date",
  ]);
  const titleIdx = matchHeaderIndex(firstNormalized, [
    "judul",
    "momen",
    "title",
  ]);
  const descIdx = matchHeaderIndex(firstNormalized, [
    "cerita",
    "deskripsi",
    "desc",
    "keterangan",
  ]);

  const hasHeader = dateIdx !== -1 || titleIdx !== -1 || descIdx !== -1;
  const startIdx = hasHeader ? 1 : 0;
  const colDate = hasHeader ? (dateIdx !== -1 ? dateIdx : 0) : 0;
  const colTitle = hasHeader ? (titleIdx !== -1 ? titleIdx : 1) : 1;
  const colDesc = hasHeader ? (descIdx !== -1 ? descIdx : 2) : 2;

  const rows: ParsedLoveStoryRow[] = [];
  let skipped = 0;

  for (let i = startIdx; i < matrix.length; i++) {
    const row = matrix[i];
    const date = (row[colDate] || "").trim();
    const title = (row[colTitle] || "").trim();
    const desc = (row[colDesc] || "").trim();
    if (!title && !desc) {
      skipped++;
      continue;
    }
    rows.push({ date, title, desc });
  }

  return { rows, skipped, warnings: [] };
};

export const parseConfigCsvText = (
  text: string,
  allowedKeys?: Set<string>
): CsvParseResult<ParsedConfigRow> => {
  const matrix = parseRawMatrix(text);
  if (matrix.length === 0) return { rows: [], skipped: 0, warnings: [] };

  const firstNormalized = matrix[0].map(normalizeHeader);
  const keyIdx = matchHeaderIndex(firstNormalized, [
    "key",
    "kunci",
    "kode",
    "field",
    "pengaturan",
  ]);
  const valIdx = matchHeaderIndex(firstNormalized, [
    "value",
    "nilai",
    "isi",
    "data",
  ]);

  const hasHeader = keyIdx !== -1 || valIdx !== -1;
  const startIdx = hasHeader ? 1 : 0;
  const colKey = hasHeader ? (keyIdx !== -1 ? keyIdx : 0) : 0;
  const colVal = hasHeader ? (valIdx !== -1 ? valIdx : 1) : 1;

  const rows: ParsedConfigRow[] = [];
  let skipped = 0;
  const warnings: string[] = [];

  for (let i = startIdx; i < matrix.length; i++) {
    const row = matrix[i];
    const key = (row[colKey] || "").trim().toUpperCase();
    const value = row[colVal] ?? "";
    if (!key) {
      skipped++;
      continue;
    }
    if (allowedKeys && !allowedKeys.has(key)) {
      skipped++;
      warnings.push(`Kunci "${key}" tidak dikenali dan dilewati.`);
      continue;
    }
    rows.push({ key, value });
  }

  return { rows, skipped, warnings };
};

export const buildCsvBlob = (headers: string[], rows: unknown[][]): Blob => {
  const lines = [
    headers.map(escapeCsvCell).join(","),
    ...rows.map((r) => r.map(escapeCsvCell).join(",")),
  ];
  return new Blob(["\uFEFF" + lines.join("\r\n")], {
    type: "text/csv;charset=utf-8;",
  });
};
