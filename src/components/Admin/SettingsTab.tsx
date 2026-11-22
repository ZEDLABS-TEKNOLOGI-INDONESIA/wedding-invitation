import FileSaver from "file-saver";
import {
  ArrowDown,
  ArrowUp,
  Calendar,
  Clock,
  Copy,
  Download,
  ExternalLink,
  Eye,
  EyeOff,
  Loader2,
  MapPin,
  Minus,
  Plus,
  RefreshCcw,
  Save,
  Send,
  Trash2,
  Upload,
  Wifi,
} from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";
import { invalidateConfigCache } from "../../hooks/useConfig";
import {
  buildCsvBlob,
  parseBankAccountsText,
  parseConfigCsvText,
  parseLoveStoryText,
  type ParsedBankRow,
  type ParsedConfigRow,
  type ParsedLoveStoryRow,
} from "../../utils/csvImport";
import {
  BANK_PRESETS,
  TIMEZONE_OPTIONS,
  buildEventScheduleFields,
  cleanInstagramHandle,
  extractCoordsFromMapsUrl,
  parseIsoToSchedule,
} from "../../utils/formHelpers";
import type { ToastState } from "./AdminFeedback";
import CsvImportModal from "./CsvImportModal";

interface BankAccountItem {
  bank: string;
  number: string;
  name: string;
}

interface LoveStoryItem {
  date: string;
  title: string;
  desc: string;
}

const safeParseList = <T,>(rawValue: string | undefined): T[] => {
  if (!rawValue) return [];
  try {
    const parsed = JSON.parse(rawValue);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const EXPORTABLE_CONFIG_KEYS = [
  "BRIDE_NICKNAME",
  "BRIDE_FULLNAME",
  "BRIDE_PARENTS",
  "BRIDE_INSTAGRAM",
  "BRIDE_IMAGE",
  "GROOM_NICKNAME",
  "GROOM_FULLNAME",
  "GROOM_PARENTS",
  "GROOM_INSTAGRAM",
  "GROOM_IMAGE",
  "VENUE_NAME",
  "VENUE_ADDRESS",
  "VENUE_LAT",
  "VENUE_LNG",
  "EVENT_TIMEZONE",
  "AKAD_TITLE",
  "AKAD_DAY",
  "AKAD_DATE",
  "AKAD_START",
  "AKAD_END",
  "AKAD_ISO_START",
  "AKAD_ISO_END",
  "RESEPSI_TITLE",
  "RESEPSI_DAY",
  "RESEPSI_DATE",
  "RESEPSI_START",
  "RESEPSI_END",
  "RESEPSI_ISO_START",
  "RESEPSI_ISO_END",
  "HERO_IMAGE",
  "ENVELOPE_IMAGE",
  "HERO_CITY",
  "MUSIC_URL",
  "RSVP_MAX_GUESTS",
  "TEXT_SALAM_OPENING",
  "TEXT_QUOTE_AR_RUM",
  "TEXT_QUOTE_SOURCE",
  "TEXT_INVITATION",
  "TEXT_CLOSING",
  "TEXT_SALAM_CLOSING",
  "TEXT_SIGNATURE",
  "TEXT_FAMILY",
  "TEXT_GIFT_TITLE",
  "TEXT_GIFT_DESC",
  "GIFT_ADDRESS",
  "WA_BASE_URL",
  "WA_ADMIN_NUMBERS",
  "WA_NOTIFY_ADMIN_RSVP",
  "WA_NOTIFY_ADMIN_WISH",
  "WA_AUTO_CONFIRM_GUEST",
];

const ALLOWED_CSV_CONFIG_SET = new Set(EXPORTABLE_CONFIG_KEYS);

const TEXT_CONTENT_FIELDS: {
  key: string;
  label: string;
  type: "text" | "textarea";
  placeholder?: string;
}[] = [
  { key: "TEXT_SALAM_OPENING", label: "Salam Pembuka", type: "text" },
  { key: "TEXT_QUOTE_AR_RUM", label: "Kutipan Ar-Rum", type: "textarea" },
  {
    key: "TEXT_QUOTE_SOURCE",
    label: "Sumber Kutipan",
    type: "text",
    placeholder: "QS. Ar-Rum: 21",
  },
  { key: "TEXT_INVITATION", label: "Kalimat Undangan", type: "textarea" },
  { key: "TEXT_CLOSING", label: "Teks Penutup", type: "textarea" },
  { key: "TEXT_SALAM_CLOSING", label: "Salam Penutup", type: "text" },
  {
    key: "TEXT_SIGNATURE",
    label: "Tanda Tangan",
    type: "text",
    placeholder: "Kami yang berbahagia,",
  },
  {
    key: "TEXT_FAMILY",
    label: "Nama Keluarga",
    type: "text",
    placeholder: "Kel. Bpk ... & Kel. Bpk ...",
  },
  {
    key: "TEXT_GIFT_TITLE",
    label: "Judul Hadiah",
    type: "text",
    placeholder: "Tanda Kasih",
  },
  { key: "TEXT_GIFT_DESC", label: "Deskripsi Hadiah", type: "textarea" },
  {
    key: "GIFT_ADDRESS",
    label: "Alamat Kirim Kado Fisik (Opsional)",
    type: "textarea",
    placeholder: "Kosongkan untuk mengikuti alamat venue",
  },
];

const QUICK_NAV_ITEMS = [
  { id: "sec-mempelai", label: "Mempelai" },
  { id: "sec-lokasi", label: "Lokasi" },
  { id: "sec-jadwal", label: "Jadwal" },
  { id: "sec-media", label: "Hero & Media" },
  { id: "sec-teks", label: "Teks" },
  { id: "sec-wa", label: "WhatsApp" },
  { id: "sec-rekening", label: "Rekening" },
  { id: "sec-story", label: "Kisah Cinta" },
  { id: "sec-galeri", label: "Galeri" },
];

const SettingsTab: React.FC<{ onNotify: (toast: ToastState) => void }> = ({
  onNotify,
}) => {
  const [rawConfig, setRawConfig] = useState<Record<string, string>>({});
  const [bankAccounts, setBankAccounts] = useState<BankAccountItem[]>([]);
  const [loveStory, setLoveStory] = useState<LoveStoryItem[]>([]);
  const [galleryImages, setGalleryImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [hasUnsaved, setHasUnsaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);
  const [mapsUrlInput, setMapsUrlInput] = useState("");
  const [mapsExtractMsg, setMapsExtractMsg] = useState<string | null>(null);
  const [showWaSecret, setShowWaSecret] = useState(false);
  const [waActionLoading, setWaActionLoading] = useState<
    "ping" | "sync" | "test" | null
  >(null);
  const [waFeedback, setWaFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // CSV Import Modals
  const [csvModalType, setCsvModalType] = useState<
    "config" | "bank" | "story" | null
  >(null);

  useEffect(() => {
    let active = true;
    fetch("/api/config/full", { credentials: "include" })
      .then(async (r) => {
        if (!r.ok) {
          throw new Error(
            r.status === 401
              ? "Sesi admin telah berakhir. Silakan muat ulang halaman dan login kembali."
              : "Gagal memuat konfigurasi dari server."
          );
        }
        return r.json();
      })
      .then((full: Record<string, string>) => {
        if (!active) return;
        setRawConfig(full);
        setBankAccounts(safeParseList<BankAccountItem>(full.BANK_ACCOUNTS));
        setLoveStory(safeParseList<LoveStoryItem>(full.LOVE_STORY));
        setGalleryImages(safeParseList<string>(full.GALLERY_IMAGES));
        setLoading(false);
      })
      .catch((err) => {
        if (!active) return;
        setLoadError(
          err instanceof Error ? err.message : "Gagal memuat konfigurasi."
        );
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const handleChange = (key: string, value: string) => {
    setRawConfig((prev) => ({ ...prev, [key]: value }));
    setHasUnsaved(true);
    setSaveError(null);
  };

  const handleBatchChange = (updates: Record<string, string>) => {
    setRawConfig((prev) => ({ ...prev, ...updates }));
    setHasUnsaved(true);
    setSaveError(null);
  };

  const akadSchedule = useMemo(
    () =>
      parseIsoToSchedule(
        rawConfig.AKAD_ISO_START,
        rawConfig.AKAD_ISO_END,
        rawConfig.AKAD_START,
        rawConfig.AKAD_END
      ),
    [
      rawConfig.AKAD_ISO_START,
      rawConfig.AKAD_ISO_END,
      rawConfig.AKAD_START,
      rawConfig.AKAD_END,
    ]
  );

  const resepsiSchedule = useMemo(
    () =>
      parseIsoToSchedule(
        rawConfig.RESEPSI_ISO_START,
        rawConfig.RESEPSI_ISO_END,
        rawConfig.RESEPSI_START,
        rawConfig.RESEPSI_END
      ),
    [
      rawConfig.RESEPSI_ISO_START,
      rawConfig.RESEPSI_ISO_END,
      rawConfig.RESEPSI_START,
      rawConfig.RESEPSI_END,
    ]
  );

  const updateSchedule = (
    prefix: "AKAD" | "RESEPSI",
    next: { dateYmd?: string; startTime?: string; endTime?: string },
    tzOverride?: string
  ) => {
    const current = prefix === "AKAD" ? akadSchedule : resepsiSchedule;
    const dateYmd = next.dateYmd ?? current.dateYmd;
    const startTime = next.startTime ?? current.startTime;
    const endTime = next.endTime ?? current.endTime;
    const tz = tzOverride ?? (rawConfig.EVENT_TIMEZONE || "WIB");
    const updates = buildEventScheduleFields(
      prefix,
      dateYmd,
      startTime,
      endTime,
      tz
    );
    handleBatchChange(updates);
  };

  const handleTimezoneChange = (tz: string) => {
    const akadUpdates = buildEventScheduleFields(
      "AKAD",
      akadSchedule.dateYmd,
      akadSchedule.startTime,
      akadSchedule.endTime,
      tz
    );
    const resepsiUpdates = buildEventScheduleFields(
      "RESEPSI",
      resepsiSchedule.dateYmd,
      resepsiSchedule.startTime,
      resepsiSchedule.endTime,
      tz
    );
    handleBatchChange({
      EVENT_TIMEZONE: tz,
      ...akadUpdates,
      ...resepsiUpdates,
    });
  };

  const handleMapsPaste = (val: string) => {
    setMapsUrlInput(val);
    if (!val.trim()) {
      setMapsExtractMsg(null);
      return;
    }
    const coords = extractCoordsFromMapsUrl(val);
    if (coords) {
      handleBatchChange({ VENUE_LAT: coords.lat, VENUE_LNG: coords.lng });
      setMapsExtractMsg(
        `Koordinat terdeteksi otomatis: ${coords.lat}, ${coords.lng}`
      );
    } else {
      setMapsExtractMsg(
        "Link belum memuat koordinat. Buka Google Maps di browser, klik titik lokasi, lalu salin URL lengkap (yang berisi @lat,lng) atau salin angka koordinatnya."
      );
    }
  };

  const uploadImageFile = async (
    file: File,
    uploadId: string,
    onSuccess: (url: string) => void,
    silentToast = false
  ) => {
    setUploadingKey(uploadId);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", {
        method: "POST",
        credentials: "include",
        body: fd,
      });
      const payload = await res.json().catch(() => ({}));
      if (res.ok && payload.url) {
        onSuccess(payload.url);
        setHasUnsaved(true);
        if (!silentToast) {
          onNotify({
            type: "success",
            message:
              "Gambar berhasil diunggah. Klik 'Simpan Semua' untuk menerapkan.",
          });
        }
        return true;
      } else {
        onNotify({
          type: "error",
          message: payload?.error || "Gagal mengunggah gambar.",
        });
        return false;
      }
    } catch {
      onNotify({ type: "error", message: "Gagal terhubung saat upload." });
      return false;
    } finally {
      setUploadingKey(null);
    }
  };

  const handleMultiGalleryUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const list = Array.from(files);
    let uploaded = 0;
    for (const f of list) {
      const ok = await uploadImageFile(
        f,
        "gallery-new",
        (url) => setGalleryImages((prev) => [...prev, url]),
        true
      );
      if (ok) uploaded++;
    }
    if (uploaded > 0) {
      onNotify({
        type: "success",
        message: `${uploaded} foto berhasil ditambahkan ke galeri. Klik 'Simpan Semua' untuk menerapkan.`,
      });
    }
  };

  const handleExportConfigCsv = () => {
    const rows = EXPORTABLE_CONFIG_KEYS.map((key) => [
      key,
      rawConfig[key] ?? "",
    ]);
    const blob = buildCsvBlob(["Key", "Value"], rows);
    const saveAsFunc = (FileSaver as any).saveAs || FileSaver;
    saveAsFunc(
      blob,
      `pengaturan_undangan_${new Date().toISOString().slice(0, 10)}.csv`
    );
    onNotify({
      type: "info",
      message:
        "File CSV pengaturan diunduh (tanpa API Secret). Anda bisa edit di Excel lalu Import balik.",
    });
  };

  const handleWaAction = async (mode: "ping" | "sync" | "test") => {
    setWaActionLoading(mode);
    setWaFeedback(null);

    const endpoint =
      mode === "ping"
        ? "/api/whatsapp/ping"
        : mode === "sync"
          ? "/api/whatsapp/sync-templates"
          : "/api/whatsapp/test";

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          baseUrl: rawConfig.WA_BASE_URL || "",
          keyId: rawConfig.WA_API_KEY || "",
          secret: rawConfig.WA_API_SECRET || "",
          recipient: rawConfig.WA_ADMIN_NUMBERS || "",
        }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        setWaFeedback({
          type: "error",
          message: payload?.error || "Permintaan ke WhatsApp Gateway gagal.",
        });
        return;
      }

      if (mode === "ping") {
        setWaFeedback({
          type: "success",
          message: `Terhubung! Instansi: ${payload.instansi_id || "-"} · Sesi siap kirim: ${payload.jumlah_sesi_ready ?? 0}.`,
        });
      } else if (mode === "sync") {
        const r = payload.result || {};
        setWaFeedback({
          type: "success",
          message: `Sinkronisasi 4 template selesai: +${r.template_ditambah ?? 0} baru, ${r.template_diperbarui ?? 0} diperbarui, ${r.tidak_berubah ?? 0} tetap.`,
        });
      } else {
        setWaFeedback({
          type: "success",
          message: `Pesan tes berhasil masuk antrean ke ${payload.recipient} (Job ID: ${payload.job_id || "-"}).`,
        });
      }
    } catch {
      setWaFeedback({
        type: "error",
        message: "Gagal terhubung ke server.",
      });
    } finally {
      setWaActionLoading(null);
    }
  };

  const handleSave = async () => {
    const payloadToSave: Record<string, string> = {
      ...rawConfig,
      BANK_ACCOUNTS: JSON.stringify(
        bankAccounts.filter(
          (item) => item.bank.trim() || item.number.trim() || item.name.trim()
        )
      ),
      LOVE_STORY: JSON.stringify(
        loveStory.filter(
          (item) => item.date.trim() || item.title.trim() || item.desc.trim()
        )
      ),
      GALLERY_IMAGES: JSON.stringify(
        galleryImages.map((u) => u.trim()).filter(Boolean)
      ),
    };

    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch("/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payloadToSave),
      });
      if (res.ok) {
        invalidateConfigCache();
        setRawConfig(payloadToSave);
        setHasUnsaved(false);
        setSaved(true);
        onNotify({
          type: "success",
          message: "Semua pengaturan berhasil disimpan dan langsung aktif!",
        });
        setTimeout(() => setSaved(false), 3000);
      } else {
        let msg = "Gagal menyimpan konfigurasi.";
        try {
          const payload = await res.json();
          if (payload?.error) msg = payload.error;
        } catch {
          // ignore
        }
        setSaveError(msg);
      }
    } catch {
      setSaveError("Gagal terhubung ke server saat menyimpan konfigurasi.");
    } finally {
      setSaving(false);
    }
  };

  const moveLoveStory = (idx: number, dir: -1 | 1) => {
    const target = idx + dir;
    if (target < 0 || target >= loveStory.length) return;
    setLoveStory((prev) => {
      const copy = [...prev];
      const [item] = copy.splice(idx, 1);
      copy.splice(target, 0, item);
      return copy;
    });
    setHasUnsaved(true);
  };

  const adminWaCount = useMemo(
    () =>
      (rawConfig.WA_ADMIN_NUMBERS || "")
        .split(/[\n,;]+/)
        .map((s) => s.trim())
        .filter((s) => s.replace(/\D/g, "").length >= 9).length,
    [rawConfig.WA_ADMIN_NUMBERS]
  );

  const maxGuestsVal = Math.max(
    1,
    Math.min(100, Number(rawConfig.RSVP_MAX_GUESTS) || 10)
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div
        role="alert"
        className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm font-medium text-red-600 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-400"
      >
        {loadError}
      </div>
    );
  }

  const renderPhotoField = (key: string, label: string, placeholder = "") => (
    <div>
      <label
        htmlFor={`cfg-${key}`}
        className="mb-1.5 block text-xs font-bold tracking-wider text-slate-500 uppercase dark:text-slate-400"
      >
        {label}
      </label>
      <div className="flex items-center gap-2">
        {rawConfig[key]?.trim() && (
          <img
            src={rawConfig[key]}
            alt={label}
            className="h-11 w-11 shrink-0 rounded-lg border border-slate-200 object-cover dark:border-slate-700"
          />
        )}
        <input
          id={`cfg-${key}`}
          type="url"
          value={rawConfig[key] ?? ""}
          onChange={(e) => handleChange(key, e.target.value)}
          placeholder={placeholder || "https://... atau klik Upload"}
          className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm transition-all outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
        />
        <label className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-3 text-xs font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700">
          {uploadingKey === key ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Upload className="h-4 w-4" />
          )}
          <span className="hidden sm:inline">Upload</span>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            disabled={uploadingKey !== null}
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (f) {
                void uploadImageFile(f, key, (url) => handleChange(key, url));
              }
            }}
          />
        </label>
      </div>
    </div>
  );

  const renderCoupleCard = (
    prefix: "BRIDE" | "GROOM",
    title: string
  ) => (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800">
      <h3 className="mb-5 font-serif text-lg font-bold text-slate-800 italic dark:text-white">
        {title}
      </h3>
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label
            htmlFor={`cfg-${prefix}_NICKNAME`}
            className="mb-1.5 block text-xs font-bold tracking-wider text-slate-500 uppercase dark:text-slate-400"
          >
            Nama Panggilan
          </label>
          <input
            id={`cfg-${prefix}_NICKNAME`}
            type="text"
            value={rawConfig[`${prefix}_NICKNAME`] ?? ""}
            onChange={(e) =>
              handleChange(`${prefix}_NICKNAME`, e.target.value)
            }
            className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          />
        </div>
        <div>
          <label
            htmlFor={`cfg-${prefix}_FULLNAME`}
            className="mb-1.5 block text-xs font-bold tracking-wider text-slate-500 uppercase dark:text-slate-400"
          >
            Nama Lengkap
          </label>
          <input
            id={`cfg-${prefix}_FULLNAME`}
            type="text"
            value={rawConfig[`${prefix}_FULLNAME`] ?? ""}
            onChange={(e) =>
              handleChange(`${prefix}_FULLNAME`, e.target.value)
            }
            className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          />
        </div>
        <div className="md:col-span-2">
          <label
            htmlFor={`cfg-${prefix}_PARENTS`}
            className="mb-1.5 block text-xs font-bold tracking-wider text-slate-500 uppercase dark:text-slate-400"
          >
            Nama Orang Tua
          </label>
          <input
            id={`cfg-${prefix}_PARENTS`}
            type="text"
            value={rawConfig[`${prefix}_PARENTS`] ?? ""}
            onChange={(e) => handleChange(`${prefix}_PARENTS`, e.target.value)}
            placeholder="Putri/Putra dari Bpk. ... & Ibu ..."
            className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          />
        </div>
        <div>
          <label
            htmlFor={`cfg-${prefix}_INSTAGRAM`}
            className="mb-1.5 block text-xs font-bold tracking-wider text-slate-500 uppercase dark:text-slate-400"
          >
            Instagram (Tempel URL atau Username)
          </label>
          <div className="flex items-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50 focus-within:ring-2 focus-within:ring-blue-500 dark:border-slate-700 dark:bg-slate-900">
            <span className="border-r border-slate-200 bg-slate-100 px-3 py-3 text-sm font-bold text-slate-500 dark:border-slate-700 dark:bg-slate-800">
              @
            </span>
            <input
              id={`cfg-${prefix}_INSTAGRAM`}
              type="text"
              value={rawConfig[`${prefix}_INSTAGRAM`] ?? ""}
              onChange={(e) =>
                handleChange(
                  `${prefix}_INSTAGRAM`,
                  cleanInstagramHandle(e.target.value)
                )
              }
              placeholder="username_ig"
              className="w-full bg-transparent px-3 py-3 text-sm outline-none dark:text-white"
            />
          </div>
        </div>
        {renderPhotoField(`${prefix}_IMAGE`, "Foto Mempelai")}
      </div>
    </div>
  );

  const renderEventScheduleCard = (
    prefix: "AKAD" | "RESEPSI",
    title: string,
    schedule: { dateYmd: string; startTime: string; endTime: string }
  ) => (
    <div className="space-y-4 rounded-xl border border-slate-100 bg-slate-50/70 p-5 dark:border-slate-700 dark:bg-slate-900/40">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-white">
          <Calendar className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          {title}
        </h4>
        {prefix === "RESEPSI" && akadSchedule.dateYmd && (
          <button
            type="button"
            onClick={() =>
              updateSchedule("RESEPSI", { dateYmd: akadSchedule.dateYmd })
            }
            className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-[11px] font-bold text-blue-700 hover:bg-blue-100 dark:border-blue-900/40 dark:bg-blue-900/20 dark:text-blue-300"
          >
            <Copy className="h-3 w-3" /> Samakan Tanggal dengan Akad
          </button>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <div className="md:col-span-4">
          <label
            htmlFor={`cfg-${prefix}_TITLE`}
            className="mb-1 block text-xs font-bold text-slate-500 uppercase"
          >
            Judul Acara
          </label>
          <input
            id={`cfg-${prefix}_TITLE`}
            type="text"
            value={rawConfig[`${prefix}_TITLE`] ?? ""}
            onChange={(e) => handleChange(`${prefix}_TITLE`, e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          />
        </div>

        <div className="md:col-span-2">
          <label
            htmlFor={`picker-${prefix}-date`}
            className="mb-1 block text-xs font-bold text-slate-500 uppercase"
          >
            Pilih Tanggal
          </label>
          <input
            id={`picker-${prefix}-date`}
            type="date"
            value={schedule.dateYmd}
            onChange={(e) =>
              updateSchedule(prefix, { dateYmd: e.target.value })
            }
            className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          />
        </div>
        <div>
          <label
            htmlFor={`picker-${prefix}-start`}
            className="mb-1 block text-xs font-bold text-slate-500 uppercase"
          >
            Jam Mulai
          </label>
          <input
            id={`picker-${prefix}-start`}
            type="time"
            value={schedule.startTime}
            onChange={(e) =>
              updateSchedule(prefix, { startTime: e.target.value })
            }
            className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          />
        </div>
        <div>
          <label
            htmlFor={`picker-${prefix}-end`}
            className="mb-1 block text-xs font-bold text-slate-500 uppercase"
          >
            Jam Selesai
          </label>
          <input
            id={`picker-${prefix}-end`}
            type="time"
            value={schedule.endTime}
            onChange={(e) =>
              updateSchedule(prefix, { endTime: e.target.value })
            }
            className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          />
        </div>
      </div>

      {/* Live Preview */}
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-xs dark:border-slate-700 dark:bg-slate-800">
        <Clock className="h-3.5 w-3.5 text-slate-400" />
        <span className="text-slate-500">Tampilan di undangan:</span>
        <strong className="text-slate-800 dark:text-white">
          {rawConfig[`${prefix}_DAY`] || "-"},{" "}
          {rawConfig[`${prefix}_DATE`] || "-"} ·{" "}
          {rawConfig[`${prefix}_START`] || "--:--"} -{" "}
          {rawConfig[`${prefix}_END`] || "--:--"}{" "}
          {rawConfig.EVENT_TIMEZONE || "WIB"}
        </strong>
      </div>

      <details className="text-xs text-slate-500">
        <summary className="cursor-pointer font-medium hover:text-slate-700 dark:hover:text-slate-300">
          Opsi lanjutan (teks khusus seperti &quot;Selesai&quot; / ISO)
        </summary>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-[11px] font-bold uppercase">
              Teks Jam Selesai (Opsional, mis. &quot;Selesai&quot;)
            </label>
            <input
              type="text"
              value={rawConfig[`${prefix}_END`] ?? ""}
              onChange={(e) => handleChange(`${prefix}_END`, e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-bold uppercase">
              ISO Start (Otomatis)
            </label>
            <input
              type="text"
              value={rawConfig[`${prefix}_ISO_START`] ?? ""}
              onChange={(e) =>
                handleChange(`${prefix}_ISO_START`, e.target.value)
              }
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>
        </div>
      </details>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* CSV Import Modals */}
      <CsvImportModal<ParsedConfigRow>
        isOpen={csvModalType === "config"}
        title="Import Pengaturan Undangan dari CSV"
        description="Gunakan file CSV hasil 'Export CSV Pengaturan' atau tempel pasangan Key, Value dari Excel."
        templateFilename="template_pengaturan_undangan.csv"
        templateHeaders={["Key", "Value"]}
        templateRows={[
          ["BRIDE_NICKNAME", "Fey"],
          ["BRIDE_FULLNAME", "Fera Oktapia"],
          ["GROOM_NICKNAME", "Yaya"],
          ["GROOM_FULLNAME", "Yahya Zulfikri"],
          ["VENUE_NAME", "The Royal Ballroom"],
          ["HERO_CITY", "Jakarta Selatan"],
        ]}
        pastePlaceholder={"BRIDE_NICKNAME,Fey\nGROOM_NICKNAME,Yaya\nVENUE_NAME,The Royal Ballroom"}
        parseText={(txt) => parseConfigCsvText(txt, ALLOWED_CSV_CONFIG_SET)}
        columns={[
          {
            header: "Kunci Pengaturan",
            render: (r) => <span className="font-mono font-bold">{r.key}</span>,
          },
          {
            header: "Nilai Baru",
            render: (r) => (
              <span className="block max-w-md truncate">{r.value}</span>
            ),
          },
        ]}
        onConfirm={(rows) => {
          const updates: Record<string, string> = {};
          for (const r of rows) {
            updates[r.key] = r.value;
          }
          handleBatchChange(updates);
          onNotify({
            type: "success",
            message: `${rows.length} pengaturan dimuat dari CSV. Klik 'Simpan Semua' untuk menerapkan ke server.`,
          });
        }}
        onClose={() => setCsvModalType(null)}
        confirmLabel="Terapkan ke Form"
      />

      <CsvImportModal<ParsedBankRow>
        isOpen={csvModalType === "bank"}
        title="Import Rekening Bank / E-Wallet (CSV)"
        description="Upload CSV atau tempel daftar rekening dari Excel (Nama Bank, Nomor Rekening, Atas Nama)."
        templateFilename="template_rekening_bank.csv"
        templateHeaders={["Nama Bank", "Nomor Rekening", "Atas Nama"]}
        templateRows={[
          ["Bank BCA", "1234567890", "Fera Oktapia"],
          ["Bank Mandiri", "0987654321", "Yahya Zulfikri"],
        ]}
        pastePlaceholder={"Bank BCA,1234567890,Fera Oktapia\nGoPay,081234567890,Yahya Zulfikri"}
        parseText={parseBankAccountsText}
        columns={[
          { header: "Bank / E-Wallet", render: (r) => <strong>{r.bank}</strong> },
          { header: "No. Rekening", render: (r) => <span className="font-mono">{r.number}</span> },
          { header: "Atas Nama", render: (r) => r.name },
        ]}
        onConfirm={(rows) => {
          setBankAccounts((prev) => [...prev, ...rows]);
          setHasUnsaved(true);
          onNotify({
            type: "success",
            message: `${rows.length} rekening ditambahkan. Klik 'Simpan Semua' untuk menyimpan.`,
          });
        }}
        onClose={() => setCsvModalType(null)}
        confirmLabel="Tambahkan Rekening"
      />

      <CsvImportModal<ParsedLoveStoryRow>
        isOpen={csvModalType === "story"}
        title="Import Kisah Cinta (CSV)"
        description="Upload CSV atau tempel daftar momen kisah cinta (Tahun/Waktu, Judul Momen, Cerita Singkat)."
        templateFilename="template_kisah_cinta.csv"
        templateHeaders={["Tahun", "Judul Momen", "Cerita Singkat"]}
        templateRows={[
          ["2020", "Awal Pertemuan", "Pertama kali bertemu di kampus."],
          ["2024", "Lamaran", "Resmi mengikat janji di hadapan keluarga."],
        ]}
        pastePlaceholder={"2020,Awal Pertemuan,Pertama kali bertemu di kampus.\n2024,Lamaran,Resmi mengikat janji."}
        parseText={parseLoveStoryText}
        columns={[
          { header: "Tahun", render: (r) => <strong>{r.date}</strong> },
          { header: "Judul", render: (r) => r.title },
          { header: "Cerita", render: (r) => <span className="line-clamp-2">{r.desc}</span> },
        ]}
        onConfirm={(rows) => {
          setLoveStory((prev) => [...prev, ...rows]);
          setHasUnsaved(true);
          onNotify({
            type: "success",
            message: `${rows.length} momen kisah cinta ditambahkan. Klik 'Simpan Semua' untuk menyimpan.`,
          });
        }}
        onClose={() => setCsvModalType(null)}
        confirmLabel="Tambahkan Momen"
      />

      {saveError && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-600 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-400"
        >
          {saveError}
        </div>
      )}

      {/* Sticky Action & Quick-Jump Bar */}
      <div className="sticky top-3 z-20 space-y-3 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-md backdrop-blur-md dark:border-slate-700 dark:bg-slate-800/95">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                hasUnsaved ? "animate-pulse bg-amber-500" : "bg-green-500"
              }`}
            />
            <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
              {hasUnsaved
                ? "Ada perubahan belum disimpan"
                : "Semua perubahan tersimpan"}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setCsvModalType("config")}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              <Upload className="h-3.5 w-3.5" /> Import CSV
            </button>
            <button
              type="button"
              onClick={handleExportConfigCsv}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              <Download className="h-3.5 w-3.5" /> Export CSV
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className={`inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-bold text-white shadow-sm transition-all disabled:opacity-50 ${
                saved
                  ? "bg-green-600"
                  : hasUnsaved
                    ? "bg-blue-600 hover:bg-blue-700"
                    : "bg-slate-900 hover:bg-slate-800 dark:bg-blue-600 dark:hover:bg-blue-700"
              }`}
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {saved ? "Tersimpan!" : "Simpan Semua"}
            </button>
          </div>
        </div>

        <div className="flex gap-1.5 overflow-x-auto pb-0.5">
          {QUICK_NAV_ITEMS.map((item) => (
            <a
              key={item.id}
              href={`#${item.id}`}
              className="rounded-lg bg-slate-100 px-3 py-1 text-[11px] font-bold whitespace-nowrap text-slate-600 hover:bg-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              {item.label}
            </a>
          ))}
        </div>
      </div>

      {/* Mempelai */}
      <div id="sec-mempelai" className="scroll-mt-32 space-y-6">
        {renderCoupleCard("BRIDE", "Mempelai Wanita")}
        {renderCoupleCard("GROOM", "Mempelai Pria")}
      </div>

      {/* Lokasi / Venue */}
      <div
        id="sec-lokasi"
        className="scroll-mt-32 rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800"
      >
        <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-serif text-lg font-bold text-slate-800 italic dark:text-white">
            Lokasi / Venue Acara
          </h3>
          {rawConfig.VENUE_LAT && rawConfig.VENUE_LNG && (
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(rawConfig.VENUE_LAT)},${encodeURIComponent(rawConfig.VENUE_LNG)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-100 dark:border-blue-900/40 dark:bg-blue-900/20 dark:text-blue-300"
            >
              <ExternalLink className="h-3.5 w-3.5" /> Cek Titik di Google Maps
            </a>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <label
              htmlFor="cfg-VENUE_NAME"
              className="mb-1.5 block text-xs font-bold tracking-wider text-slate-500 uppercase dark:text-slate-400"
            >
              Nama Gedung / Tempat
            </label>
            <input
              id="cfg-VENUE_NAME"
              type="text"
              value={rawConfig.VENUE_NAME ?? ""}
              onChange={(e) => handleChange("VENUE_NAME", e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            />
          </div>
          <div className="md:col-span-2">
            <label
              htmlFor="cfg-VENUE_ADDRESS"
              className="mb-1.5 block text-xs font-bold tracking-wider text-slate-500 uppercase dark:text-slate-400"
            >
              Alamat Lengkap
            </label>
            <textarea
              id="cfg-VENUE_ADDRESS"
              rows={2}
              value={rawConfig.VENUE_ADDRESS ?? ""}
              onChange={(e) => handleChange("VENUE_ADDRESS", e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            />
          </div>

          {/* Smart Google Maps Link Extractor */}
          <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-4 md:col-span-2 dark:border-blue-900/30 dark:bg-blue-900/15">
            <label
              htmlFor="maps-smart-input"
              className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-blue-700 uppercase dark:text-blue-300"
            >
              <MapPin className="h-3.5 w-3.5" /> Isi Cepat Koordinat dari Link
              Google Maps
            </label>
            <input
              id="maps-smart-input"
              type="text"
              value={mapsUrlInput}
              onChange={(e) => handleMapsPaste(e.target.value)}
              placeholder="Tempel link Google Maps (contoh: https://www.google.com/maps/place/.../@-6.303,106.101,17z) atau -6.303, 106.101"
              className="w-full rounded-lg border border-blue-200 bg-white px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            />
            {mapsExtractMsg && (
              <p className="mt-1.5 text-xs font-medium text-blue-700 dark:text-blue-300">
                {mapsExtractMsg}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="cfg-VENUE_LAT"
              className="mb-1.5 block text-xs font-bold tracking-wider text-slate-500 uppercase dark:text-slate-400"
            >
              Latitude (Otomatis dari Link di Atas)
            </label>
            <input
              id="cfg-VENUE_LAT"
              type="text"
              value={rawConfig.VENUE_LAT ?? ""}
              onChange={(e) => handleChange("VENUE_LAT", e.target.value)}
              placeholder="-6.3032707"
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 font-mono text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            />
          </div>
          <div>
            <label
              htmlFor="cfg-VENUE_LNG"
              className="mb-1.5 block text-xs font-bold tracking-wider text-slate-500 uppercase dark:text-slate-400"
            >
              Longitude (Otomatis dari Link di Atas)
            </label>
            <input
              id="cfg-VENUE_LNG"
              type="text"
              value={rawConfig.VENUE_LNG ?? ""}
              onChange={(e) => handleChange("VENUE_LNG", e.target.value)}
              placeholder="106.1011039"
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 font-mono text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            />
          </div>
        </div>
      </div>

      {/* Jadwal Akad & Resepsi */}
      <div
        id="sec-jadwal"
        className="scroll-mt-32 space-y-5 rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800"
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="font-serif text-lg font-bold text-slate-800 italic dark:text-white">
              Jadwal Akad Nikah & Resepsi
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Cukup pilih tanggal & jam — nama hari, format tanggal Indonesia,
              dan jadwal kalender (ISO) otomatis disesuaikan.
            </p>
          </div>
          <div className="w-full sm:w-64">
            <label
              htmlFor="cfg-EVENT_TIMEZONE"
              className="mb-1 block text-[11px] font-bold text-slate-500 uppercase"
            >
              Zona Waktu Acara
            </label>
            <select
              id="cfg-EVENT_TIMEZONE"
              value={rawConfig.EVENT_TIMEZONE || "WIB"}
              onChange={(e) => handleTimezoneChange(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            >
              {TIMEZONE_OPTIONS.map((tz) => (
                <option key={tz.value} value={tz.value}>
                  {tz.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {renderEventScheduleCard("AKAD", "Akad Nikah", akadSchedule)}
        {renderEventScheduleCard("RESEPSI", "Resepsi Pernikahan", resepsiSchedule)}
      </div>

      {/* Hero & Media */}
      <div
        id="sec-media"
        className="scroll-mt-32 rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800"
      >
        <h3 className="mb-5 font-serif text-lg font-bold text-slate-800 italic dark:text-white">
          Hero, Musik & Batas RSVP
        </h3>
        <div className="grid gap-4 md:grid-cols-2">
          {renderPhotoField("HERO_IMAGE", "Gambar Utama (Hero)")}
          {renderPhotoField(
            "ENVELOPE_IMAGE",
            "Gambar Amplop Pembuka (Opsional)",
            "Kosongkan untuk mengikuti gambar Hero"
          )}
          <div>
            <label
              htmlFor="cfg-HERO_CITY"
              className="mb-1.5 block text-xs font-bold tracking-wider text-slate-500 uppercase dark:text-slate-400"
            >
              Kota / Wilayah
            </label>
            <input
              id="cfg-HERO_CITY"
              type="text"
              value={rawConfig.HERO_CITY ?? ""}
              onChange={(e) => handleChange("HERO_CITY", e.target.value)}
              placeholder="Kab. Pandeglang, Banten"
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            />
          </div>
          <div>
            <label
              htmlFor="cfg-MUSIC_URL"
              className="mb-1.5 block text-xs font-bold tracking-wider text-slate-500 uppercase dark:text-slate-400"
            >
              URL Musik Latar (MP3)
            </label>
            <input
              id="cfg-MUSIC_URL"
              type="url"
              value={rawConfig.MUSIC_URL ?? ""}
              onChange={(e) => handleChange("MUSIC_URL", e.target.value)}
              placeholder="https://.../lagu.mp3"
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            />
          </div>
          <div>
            <span className="mb-1.5 block text-xs font-bold tracking-wider text-slate-500 uppercase dark:text-slate-400">
              Maksimal Tamu per RSVP
            </span>
            <div className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-1.5 dark:border-slate-700 dark:bg-slate-900">
              <button
                type="button"
                aria-label="Kurangi batas tamu"
                onClick={() =>
                  handleChange(
                    "RSVP_MAX_GUESTS",
                    String(Math.max(1, maxGuestsVal - 1))
                  )
                }
                className="flex h-9 w-9 items-center justify-center rounded-lg bg-white shadow-sm hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700"
              >
                <Minus className="h-4 w-4" />
              </button>
              <span className="w-20 text-center text-sm font-bold">
                {maxGuestsVal} Orang
              </span>
              <button
                type="button"
                aria-label="Tambah batas tamu"
                onClick={() =>
                  handleChange(
                    "RSVP_MAX_GUESTS",
                    String(Math.min(100, maxGuestsVal + 1))
                  )
                }
                className="flex h-9 w-9 items-center justify-center rounded-lg bg-white shadow-sm hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Teks & Konten */}
      <div
        id="sec-teks"
        className="scroll-mt-32 rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800"
      >
        <h3 className="mb-5 font-serif text-lg font-bold text-slate-800 italic dark:text-white">
          Teks & Konten Undangan
        </h3>
        <div className="grid gap-4 md:grid-cols-2">
          {TEXT_CONTENT_FIELDS.map((field) => {
            const fieldId = `cfg-${field.key}`;
            return (
              <div
                key={field.key}
                className={field.type === "textarea" ? "md:col-span-2" : ""}
              >
                <label
                  htmlFor={fieldId}
                  className="mb-1.5 block text-xs font-bold tracking-wider text-slate-500 uppercase dark:text-slate-400"
                >
                  {field.label}
                </label>
                {field.type === "textarea" ? (
                  <textarea
                    id={fieldId}
                    rows={3}
                    value={rawConfig[field.key] ?? ""}
                    onChange={(e) => handleChange(field.key, e.target.value)}
                    placeholder={field.placeholder}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  />
                ) : (
                  <input
                    id={fieldId}
                    type="text"
                    value={rawConfig[field.key] ?? ""}
                    onChange={(e) => handleChange(field.key, e.target.value)}
                    placeholder={field.placeholder}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* WhatsApp Gateway */}
      <div
        id="sec-wa"
        className="scroll-mt-32 rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800"
      >
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-serif text-lg font-bold text-slate-800 italic dark:text-white">
            Integrasi WhatsApp Gateway (whatsapp.zedlabs.id)
          </h3>
          <span className="rounded-full bg-green-100 px-3 py-1 text-[11px] font-bold text-green-700 dark:bg-green-900/30 dark:text-green-300">
            HMAC-SHA256 v2
          </span>
        </div>
        <p className="mb-6 text-xs text-slate-500 dark:text-slate-400">
          Digunakan untuk notifikasi admin/mempelai, kirim undangan otomatis,
          dan konfirmasi otomatis ke tamu setelah RSVP.
        </p>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label
              htmlFor="cfg-WA_BASE_URL"
              className="mb-1.5 block text-xs font-bold tracking-wider text-slate-500 uppercase dark:text-slate-400"
            >
              URL Gateway
            </label>
            <input
              id="cfg-WA_BASE_URL"
              type="url"
              value={rawConfig.WA_BASE_URL ?? "https://whatsapp.zedlabs.id"}
              onChange={(e) => handleChange("WA_BASE_URL", e.target.value)}
              placeholder="https://whatsapp.zedlabs.id"
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-green-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            />
          </div>
          <div>
            <label
              htmlFor="cfg-WA_API_KEY"
              className="mb-1.5 block text-xs font-bold tracking-wider text-slate-500 uppercase dark:text-slate-400"
            >
              API Key (key_id)
            </label>
            <input
              id="cfg-WA_API_KEY"
              type="text"
              value={rawConfig.WA_API_KEY ?? ""}
              onChange={(e) => handleChange("WA_API_KEY", e.target.value)}
              placeholder="key_xxxxxxxxxxxx"
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 font-mono text-sm outline-none focus:ring-2 focus:ring-green-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            />
          </div>
          <div>
            <label
              htmlFor="cfg-WA_API_SECRET"
              className="mb-1.5 block text-xs font-bold tracking-wider text-slate-500 uppercase dark:text-slate-400"
            >
              HMAC Secret
            </label>
            <div className="relative">
              <input
                id="cfg-WA_API_SECRET"
                type={showWaSecret ? "text" : "password"}
                value={rawConfig.WA_API_SECRET ?? ""}
                onChange={(e) => handleChange("WA_API_SECRET", e.target.value)}
                placeholder="Secret HMAC API Key"
                className="w-full rounded-lg border border-slate-200 bg-slate-50 py-3 pr-11 pl-4 font-mono text-sm outline-none focus:ring-2 focus:ring-green-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              />
              <button
                type="button"
                aria-label={
                  showWaSecret ? "Sembunyikan secret" : "Tampilkan secret"
                }
                onClick={() => setShowWaSecret((prev) => !prev)}
                className="absolute top-1/2 right-3 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                {showWaSecret ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label
                htmlFor="cfg-WA_ADMIN_NUMBERS"
                className="block text-xs font-bold tracking-wider text-slate-500 uppercase dark:text-slate-400"
              >
                Nomor WA Admin / Mempelai (pisah koma)
              </label>
              {adminWaCount > 0 && (
                <span className="rounded bg-green-100 px-2 py-0.5 text-[10px] font-bold text-green-700 dark:bg-green-900/30 dark:text-green-300">
                  {adminWaCount} nomor aktif
                </span>
              )}
            </div>
            <input
              id="cfg-WA_ADMIN_NUMBERS"
              type="text"
              value={rawConfig.WA_ADMIN_NUMBERS ?? ""}
              onChange={(e) => handleChange("WA_ADMIN_NUMBERS", e.target.value)}
              placeholder="081234567890, 089876543210"
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-green-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            />
          </div>
        </div>

        <div className="mt-5 grid gap-3 border-t border-slate-100 pt-5 md:grid-cols-3 dark:border-slate-700">
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-100 bg-slate-50/70 p-3 text-xs dark:border-slate-700 dark:bg-slate-900/40">
            <input
              type="checkbox"
              checked={(rawConfig.WA_NOTIFY_ADMIN_RSVP ?? "true") === "true"}
              onChange={(e) =>
                handleChange(
                  "WA_NOTIFY_ADMIN_RSVP",
                  e.target.checked ? "true" : "false"
                )
              }
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-green-600 focus:ring-green-500"
            />
            <span>
              <strong className="block text-slate-800 dark:text-slate-200">
                Notif RSVP ke Admin
              </strong>
              Kirim WA ke admin/mempelai saat tamu mengisi atau mengubah RSVP.
            </span>
          </label>
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-100 bg-slate-50/70 p-3 text-xs dark:border-slate-700 dark:bg-slate-900/40">
            <input
              type="checkbox"
              checked={(rawConfig.WA_NOTIFY_ADMIN_WISH ?? "true") === "true"}
              onChange={(e) =>
                handleChange(
                  "WA_NOTIFY_ADMIN_WISH",
                  e.target.checked ? "true" : "false"
                )
              }
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-green-600 focus:ring-green-500"
            />
            <span>
              <strong className="block text-slate-800 dark:text-slate-200">
                Notif Ucapan ke Admin
              </strong>
              Kirim WA ke admin/mempelai saat ada ucapan & doa baru masuk.
            </span>
          </label>
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-100 bg-slate-50/70 p-3 text-xs dark:border-slate-700 dark:bg-slate-900/40">
            <input
              type="checkbox"
              checked={(rawConfig.WA_AUTO_CONFIRM_GUEST ?? "true") === "true"}
              onChange={(e) =>
                handleChange(
                  "WA_AUTO_CONFIRM_GUEST",
                  e.target.checked ? "true" : "false"
                )
              }
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-green-600 focus:ring-green-500"
            />
            <span>
              <strong className="block text-slate-800 dark:text-slate-200">
                Konfirmasi Otomatis Tamu
              </strong>
              Balas otomatis ke WA tamu berisi ringkasan RSVP & info acara.
            </span>
          </label>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-slate-100 pt-4 dark:border-slate-700">
          <button
            type="button"
            onClick={() => handleWaAction("ping")}
            disabled={waActionLoading !== null}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            {waActionLoading === "ping" ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Wifi className="h-3.5 w-3.5" />
            )}
            Uji Koneksi (Ping)
          </button>
          <button
            type="button"
            onClick={() => handleWaAction("sync")}
            disabled={waActionLoading !== null}
            className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-xs font-bold text-white hover:bg-green-700 disabled:opacity-50"
          >
            {waActionLoading === "sync" ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCcw className="h-3.5 w-3.5" />
            )}
            Sinkron 4 Template ke Gateway
          </button>
          <button
            type="button"
            onClick={() => handleWaAction("test")}
            disabled={waActionLoading !== null}
            className="inline-flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-2 text-xs font-bold text-green-700 hover:bg-green-100 disabled:opacity-50 dark:border-green-900/40 dark:bg-green-900/20 dark:text-green-300"
          >
            {waActionLoading === "test" ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Send className="h-3.5 w-3.5" />
            )}
            Kirim Pesan Tes
          </button>
        </div>

        {waFeedback && (
          <p
            className={`mt-3 text-xs font-medium ${
              waFeedback.type === "success"
                ? "text-green-600 dark:text-green-400"
                : "text-red-600 dark:text-red-400"
            }`}
          >
            {waFeedback.message}
          </p>
        )}
      </div>

      {/* Rekening Bank Editor */}
      <div
        id="sec-rekening"
        className="scroll-mt-32 rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800"
      >
        <datalist id="bank-presets-list">
          {BANK_PRESETS.map((bank) => (
            <option key={bank} value={bank} />
          ))}
        </datalist>

        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-serif text-lg font-bold text-slate-800 italic dark:text-white">
            Rekening Bank (Amplop Digital)
          </h3>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setCsvModalType("bank")}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200"
            >
              <Upload className="h-3.5 w-3.5" /> Import CSV
            </button>
            <button
              type="button"
              onClick={() => {
                setBankAccounts((prev) => [
                  ...prev,
                  { bank: "", number: "", name: "" },
                ]);
                setHasUnsaved(true);
              }}
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white hover:bg-slate-800 dark:bg-blue-600 dark:hover:bg-blue-700"
            >
              <Plus className="h-3.5 w-3.5" /> Tambah Rekening
            </button>
          </div>
        </div>
        <div className="space-y-4">
          {bankAccounts.length === 0 ? (
            <p className="text-sm text-slate-400 italic">
              Belum ada rekening bank. Klik &quot;Tambah Rekening&quot; atau
              &quot;Import CSV&quot;.
            </p>
          ) : (
            bankAccounts.map((acc, idx) => (
              <div
                key={idx}
                className="grid items-end gap-3 rounded-xl border border-slate-100 bg-slate-50/70 p-4 md:grid-cols-10 dark:border-slate-700 dark:bg-slate-900/50"
              >
                <div className="md:col-span-3">
                  <label className="mb-1 block text-xs font-bold text-slate-500 uppercase">
                    Nama Bank / E-Wallet
                  </label>
                  <input
                    type="text"
                    list="bank-presets-list"
                    value={acc.bank}
                    placeholder="Pilih atau ketik bank..."
                    onChange={(e) => {
                      setBankAccounts((prev) =>
                        prev.map((item, i) =>
                          i === idx ? { ...item, bank: e.target.value } : item
                        )
                      );
                      setHasUnsaved(true);
                    }}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
                <div className="md:col-span-3">
                  <label className="mb-1 block text-xs font-bold text-slate-500 uppercase">
                    Nomor Rekening
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={acc.number}
                    placeholder="1234567890"
                    onChange={(e) => {
                      setBankAccounts((prev) =>
                        prev.map((item, i) =>
                          i === idx ? { ...item, number: e.target.value } : item
                        )
                      );
                      setHasUnsaved(true);
                    }}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
                <div className="md:col-span-3">
                  <label className="mb-1 block text-xs font-bold text-slate-500 uppercase">
                    Atas Nama
                  </label>
                  <input
                    type="text"
                    value={acc.name}
                    placeholder="Nama Pemilik Rekening"
                    onChange={(e) => {
                      setBankAccounts((prev) =>
                        prev.map((item, i) =>
                          i === idx ? { ...item, name: e.target.value } : item
                        )
                      );
                      setHasUnsaved(true);
                    }}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
                <div className="flex justify-end md:col-span-1">
                  <button
                    type="button"
                    aria-label={`Hapus rekening ${idx + 1}`}
                    onClick={() => {
                      setBankAccounts((prev) =>
                        prev.filter((_, i) => i !== idx)
                      );
                      setHasUnsaved(true);
                    }}
                    className="rounded-lg p-2 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Kisah Cinta Editor */}
      <div
        id="sec-story"
        className="scroll-mt-32 rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800"
      >
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-serif text-lg font-bold text-slate-800 italic dark:text-white">
            Kisah Cinta
          </h3>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setCsvModalType("story")}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200"
            >
              <Upload className="h-3.5 w-3.5" /> Import CSV
            </button>
            <button
              type="button"
              onClick={() => {
                setLoveStory((prev) => [
                  ...prev,
                  { date: "", title: "", desc: "" },
                ]);
                setHasUnsaved(true);
              }}
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white hover:bg-slate-800 dark:bg-blue-600 dark:hover:bg-blue-700"
            >
              <Plus className="h-3.5 w-3.5" /> Tambah Momen
            </button>
          </div>
        </div>
        <div className="space-y-4">
          {loveStory.length === 0 ? (
            <p className="text-sm text-slate-400 italic">
              Belum ada kisah cinta. Klik &quot;Tambah Momen&quot; atau
              &quot;Import CSV&quot;.
            </p>
          ) : (
            loveStory.map((story, idx) => (
              <div
                key={idx}
                className="space-y-3 rounded-xl border border-slate-100 bg-slate-50/70 p-4 dark:border-slate-700 dark:bg-slate-900/50"
              >
                <div className="grid items-end gap-3 md:grid-cols-12">
                  <div className="md:col-span-3">
                    <label className="mb-1 block text-xs font-bold text-slate-500 uppercase">
                      Tahun / Waktu
                    </label>
                    <input
                      type="text"
                      value={story.date}
                      placeholder="2020"
                      onChange={(e) => {
                        setLoveStory((prev) =>
                          prev.map((item, i) =>
                            i === idx ? { ...item, date: e.target.value } : item
                          )
                        );
                        setHasUnsaved(true);
                      }}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                  </div>
                  <div className="md:col-span-6">
                    <label className="mb-1 block text-xs font-bold text-slate-500 uppercase">
                      Judul Momen
                    </label>
                    <input
                      type="text"
                      value={story.title}
                      placeholder="Awal Pertemuan"
                      onChange={(e) => {
                        setLoveStory((prev) =>
                          prev.map((item, i) =>
                            i === idx
                              ? { ...item, title: e.target.value }
                              : item
                          )
                        );
                        setHasUnsaved(true);
                      }}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                  </div>
                  <div className="flex justify-end gap-1 md:col-span-3">
                    <button
                      type="button"
                      aria-label={`Naikkan momen ${idx + 1}`}
                      disabled={idx === 0}
                      onClick={() => moveLoveStory(idx, -1)}
                      className="rounded-lg p-2 text-slate-500 hover:bg-slate-200/70 disabled:opacity-30 dark:hover:bg-slate-700"
                    >
                      <ArrowUp className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      aria-label={`Turunkan momen ${idx + 1}`}
                      disabled={idx === loveStory.length - 1}
                      onClick={() => moveLoveStory(idx, 1)}
                      className="rounded-lg p-2 text-slate-500 hover:bg-slate-200/70 disabled:opacity-30 dark:hover:bg-slate-700"
                    >
                      <ArrowDown className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      aria-label={`Hapus momen ${idx + 1}`}
                      onClick={() => {
                        setLoveStory((prev) =>
                          prev.filter((_, i) => i !== idx)
                        );
                        setHasUnsaved(true);
                      }}
                      className="rounded-lg p-2 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-500 uppercase">
                    Cerita Singkat
                  </label>
                  <textarea
                    rows={2}
                    value={story.desc}
                    placeholder="Ceritakan momen spesial ini..."
                    onChange={(e) => {
                      setLoveStory((prev) =>
                        prev.map((item, i) =>
                          i === idx ? { ...item, desc: e.target.value } : item
                        )
                      );
                      setHasUnsaved(true);
                    }}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Galeri Foto Editor */}
      <div
        id="sec-galeri"
        className="scroll-mt-32 rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800"
      >
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-serif text-lg font-bold text-slate-800 italic dark:text-white">
              Galeri Foto ({galleryImages.length})
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Bisa pilih banyak foto sekaligus saat upload!
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-700">
              {uploadingKey === "gallery-new" ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Upload className="h-3.5 w-3.5" />
              )}
              Upload Banyak Foto
              <input
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                disabled={uploadingKey !== null}
                onChange={(e) => {
                  const files = e.target.files;
                  void handleMultiGalleryUpload(files);
                  e.target.value = "";
                }}
              />
            </label>
            <button
              type="button"
              onClick={() => {
                setGalleryImages((prev) => [...prev, ""]);
                setHasUnsaved(true);
              }}
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white hover:bg-slate-800 dark:bg-blue-600 dark:hover:bg-blue-700"
            >
              <Plus className="h-3.5 w-3.5" /> Tambah URL
            </button>
          </div>
        </div>
        <div className="space-y-3">
          {galleryImages.length === 0 ? (
            <p className="text-sm text-slate-400 italic">
              Belum ada foto galeri. Klik &quot;Upload Banyak Foto&quot; atau
              &quot;Tambah URL&quot;.
            </p>
          ) : (
            galleryImages.map((url, idx) => (
              <div
                key={idx}
                className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/70 p-3 dark:border-slate-700 dark:bg-slate-900/50"
              >
                {url.trim() ? (
                  <img
                    src={url}
                    alt={`Pratinjau foto ${idx + 1}`}
                    className="h-12 w-12 shrink-0 rounded-lg border border-slate-200 object-cover dark:border-slate-700"
                  />
                ) : (
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-dashed border-slate-300 text-xs text-slate-400 dark:border-slate-600">
                    {idx + 1}
                  </div>
                )}
                <input
                  type="url"
                  aria-label={`URL foto galeri ${idx + 1}`}
                  value={url}
                  placeholder="https://example.com/foto.jpg"
                  onChange={(e) => {
                    setGalleryImages((prev) =>
                      prev.map((item, i) => (i === idx ? e.target.value : item))
                    );
                    setHasUnsaved(true);
                  }}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
                <button
                  type="button"
                  aria-label={`Hapus foto ${idx + 1}`}
                  onClick={() => {
                    setGalleryImages((prev) =>
                      prev.filter((_, i) => i !== idx)
                    );
                    setHasUnsaved(true);
                  }}
                  className="shrink-0 rounded-lg p-2 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="flex justify-end pb-8">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className={`flex items-center gap-2 rounded-xl px-8 py-4 text-sm font-bold text-white shadow-lg transition-all disabled:opacity-50 ${
            saved
              ? "bg-green-600"
              : "bg-slate-900 hover:bg-slate-800 dark:bg-blue-600 dark:hover:bg-blue-700"
          }`}
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {saved ? "Tersimpan!" : "Simpan Semua"}
        </button>
      </div>
    </div>
  );
};

export default SettingsTab;
