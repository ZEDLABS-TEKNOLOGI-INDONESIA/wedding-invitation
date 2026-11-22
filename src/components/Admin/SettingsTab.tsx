import FileSaver from "file-saver";
import {
  ArrowDown,
  ArrowUp,
  BookOpen,
  Calendar,
  Check,
  Clock,
  Copy,
  Download,
  ExternalLink,
  Eye,
  EyeOff,
  Heart,
  Image as ImageIcon,
  Loader2,
  MapPin,
  MessageSquare,
  Minus,
  Music,
  Palette,
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
import {
  PUBLIC_ANIMATIONS,
  PUBLIC_ORNAMENTS,
  PUBLIC_THEMES,
  normalizePublicAnimation,
  normalizePublicDefaultMode,
  normalizePublicOrnament,
  normalizePublicTheme,
} from "../../utils/publicThemes";
import { AnimationPreviewMini } from "../FloatingPetals";
import {
  HeartFrameWatermark,
  OrnamentArtwork,
  OrnamentPreviewMini,
} from "../WeddingOrnaments";
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
  "PUBLIC_THEME",
  "PUBLIC_DEFAULT_MODE",
  "PUBLIC_ALLOW_THEME_SWITCH",
  "PUBLIC_ANIMATION",
  "PUBLIC_ORNAMENT",
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
  "WA_AUTO_REMINDER_H1",
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

export type SettingsSubMenuId =
  | "tema"
  | "mempelai"
  | "acara"
  | "media"
  | "konten"
  | "whatsapp";

export const SETTINGS_SUBMENUS: {
  id: SettingsSubMenuId;
  label: string;
  desc: string;
  keywords: string;
}[] = [
  {
    id: "tema",
    label: "Tema & Tampilan",
    desc: "Pilih nuansa warna publik, mode bawaan, ornamen samping, dan animasi latar.",
    keywords: "tema warna publik ornamen animasi merpati bunga gelap terang",
  },
  {
    id: "mempelai",
    label: "Data Mempelai",
    desc: "Atur nama panggilan, nama lengkap, nama orang tua, Instagram, dan foto mempelai.",
    keywords: "mempelai pria wanita orang tua instagram foto",
  },
  {
    id: "acara",
    label: "Lokasi & Jadwal",
    desc: "Tentukan alamat venue, titik peta Google Maps, serta jadwal Akad & Resepsi.",
    keywords: "lokasi venue alamat peta maps jadwal akad resepsi tanggal waktu",
  },
  {
    id: "media",
    label: "Hero, Musik & Galeri",
    desc: "Unggah foto sampul, musik latar (backsound), batas tamu RSVP, dan galeri foto.",
    keywords: "hero amplop musik audio backsound mp3 galeri foto rsvp",
  },
  {
    id: "konten",
    label: "Teks, Kisah & Kado",
    desc: "Ubah salam pembuka, kutipan ayat, kisah cinta, rekening bank, dan alamat tanda kasih.",
    keywords: "teks salam kutipan kisah cinta story rekening bank kado hadiah",
  },
  {
    id: "whatsapp",
    label: "WhatsApp Gateway",
    desc: "Hubungkan layanan WhatsApp Gateway, sinkronisasi template, dan notifikasi otomatis.",
    keywords: "whatsapp wa gateway api secret notifikasi otomatis",
  },
];

const SettingsTab: React.FC<{
  onNotify: (toast: ToastState) => void;
  activeSection?: SettingsSubMenuId;
  onSectionChange?: (section: SettingsSubMenuId) => void;
}> = ({ onNotify, activeSection, onSectionChange }) => {
  const [internalSection, setInternalSection] =
    useState<SettingsSubMenuId>("tema");
  const currentSection = activeSection ?? internalSection;
  const selectSection = (next: SettingsSubMenuId) => {
    if (onSectionChange) {
      onSectionChange(next);
    } else {
      setInternalSection(next);
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
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
    "ping" | "sync" | "test" | "h1" | null
  >(null);
  const [h1Summary, setH1Summary] = useState<{
    eligibleTotal: number;
    pendingCount: number;
    sentCount: number;
    hadirPendingCount: number;
    raguPendingCount: number;
    excludedTidakHadirCount: number;
    inH1Window: boolean;
  } | null>(null);
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

  const uploadMediaFile = async (
    file: File,
    uploadId: string,
    onSuccess: (url: string) => void,
    kind: "image" | "audio" = "image",
    silentToast = false
  ) => {
    setUploadingKey(uploadId);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("kind", kind);
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
              kind === "audio"
                ? "Audio backsound berhasil diunggah. Klik 'Simpan Semua' untuk menerapkan."
                : "Gambar berhasil diunggah. Klik 'Simpan Semua' untuk menerapkan.",
          });
        }
        return true;
      } else {
        onNotify({
          type: "error",
          message:
            payload?.error ||
            (kind === "audio"
              ? "Gagal mengunggah audio."
              : "Gagal mengunggah gambar."),
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
      const ok = await uploadMediaFile(
        f,
        "gallery-new",
        (url) => setGalleryImages((prev) => [...prev, url]),
        "image",
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

  const loadH1Summary = async () => {
    try {
      const res = await fetch("/api/whatsapp/reminders", {
        credentials: "include",
      });
      if (res.ok) {
        setH1Summary(await res.json());
      }
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    if (currentSection === "whatsapp") {
      void loadH1Summary();
    }
  }, [currentSection]);

  const handleSendH1Reminders = async () => {
    setWaActionLoading("h1");
    setWaFeedback(null);
    try {
      const res = await fetch("/api/whatsapp/reminders", {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) {
        setWaFeedback({
          type: "error",
          message: data.error || "Gagal mengirim pengingat H-1.",
        });
      } else {
        if (data.summary) setH1Summary(data.summary);
        if (data.skippedReason) {
          setWaFeedback({ type: "success", message: data.skippedReason });
        } else {
          setWaFeedback({
            type: data.failed > 0 && data.sent === 0 ? "error" : "success",
            message: `Pengingat H-1 selesai diproses: ${data.sent} terkirim, ${data.failed} gagal.${
              data.errors?.length ? ` (${data.errors[0]})` : ""
            }`,
          });
        }
      }
    } catch {
      setWaFeedback({
        type: "error",
        message: "Gagal menghubungi server untuk pengiriman pengingat H-1.",
      });
    } finally {
      setWaActionLoading(null);
    }
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
        <Loader2 className="h-6 w-6 animate-spin text-(--adm-text-muted)" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div role="alert" className="adm-alert adm-alert-danger">
        {loadError}
      </div>
    );
  }

  const renderPhotoField = (key: string, label: string, placeholder = "") => (
    <div>
      <label htmlFor={`cfg-${key}`} className="adm-label">
        {label}
      </label>
      <div className="flex items-center gap-2">
        {rawConfig[key]?.trim() && (
          <img
            src={rawConfig[key]}
            alt={label}
            className="h-9 w-9 shrink-0 rounded-md border border-(--adm-border) object-cover"
          />
        )}
        <input
          id={`cfg-${key}`}
          type="url"
          value={rawConfig[key] ?? ""}
          onChange={(e) => handleChange(key, e.target.value)}
          placeholder={placeholder || "https://... atau klik Upload"}
          className="adm-input"
        />
        <label className="adm-btn adm-btn-secondary shrink-0 cursor-pointer">
          {uploadingKey === key ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Upload className="h-3.5 w-3.5" />
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
                void uploadMediaFile(f, key, (url) => handleChange(key, url));
              }
            }}
          />
        </label>
      </div>
    </div>
  );

  const renderCoupleCard = (prefix: "BRIDE" | "GROOM", title: string) => (
    <div className="adm-card">
      <div className="adm-card-header">
        <h3 className="adm-card-title">{title}</h3>
      </div>
      <div className="adm-card-body grid gap-3.5 md:grid-cols-2">
        <div>
          <label htmlFor={`cfg-${prefix}_NICKNAME`} className="adm-label">
            Nama Panggilan
          </label>
          <input
            id={`cfg-${prefix}_NICKNAME`}
            type="text"
            value={rawConfig[`${prefix}_NICKNAME`] ?? ""}
            onChange={(e) => handleChange(`${prefix}_NICKNAME`, e.target.value)}
            className="adm-input"
          />
        </div>
        <div>
          <label htmlFor={`cfg-${prefix}_FULLNAME`} className="adm-label">
            Nama Lengkap
          </label>
          <input
            id={`cfg-${prefix}_FULLNAME`}
            type="text"
            value={rawConfig[`${prefix}_FULLNAME`] ?? ""}
            onChange={(e) => handleChange(`${prefix}_FULLNAME`, e.target.value)}
            className="adm-input"
          />
        </div>
        <div className="md:col-span-2">
          <label htmlFor={`cfg-${prefix}_PARENTS`} className="adm-label">
            Nama Orang Tua
          </label>
          <input
            id={`cfg-${prefix}_PARENTS`}
            type="text"
            value={rawConfig[`${prefix}_PARENTS`] ?? ""}
            onChange={(e) => handleChange(`${prefix}_PARENTS`, e.target.value)}
            placeholder="Putri/Putra dari Bpk. ... & Ibu ..."
            className="adm-input"
          />
        </div>
        <div>
          <label htmlFor={`cfg-${prefix}_INSTAGRAM`} className="adm-label">
            Instagram (Tempel URL atau Username)
          </label>
          <div className="flex items-center overflow-hidden rounded-md border border-(--adm-border) bg-(--adm-bg-primary) focus-within:border-(--adm-accent) focus-within:ring-[3px] focus-within:ring-(--adm-accent-soft)">
            <span className="border-r border-(--adm-border) bg-(--adm-bg-tertiary) px-2.5 py-2 text-xs font-semibold text-(--adm-text-secondary)">
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
              className="w-full bg-transparent px-2.5 py-1.5 text-[13px] text-(--adm-text-primary) outline-none"
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
    <div className="space-y-3 rounded-lg border border-(--adm-border) bg-(--adm-bg-primary) p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="flex items-center gap-1.5 text-[13px] font-semibold text-(--adm-text-primary)">
          <Calendar className="h-3.5 w-3.5 text-(--adm-accent)" />
          {title}
        </h4>
        {prefix === "RESEPSI" && akadSchedule.dateYmd && (
          <button
            type="button"
            onClick={() =>
              updateSchedule("RESEPSI", { dateYmd: akadSchedule.dateYmd })
            }
            className="adm-btn adm-btn-outline-primary adm-btn-sm"
          >
            <Copy className="h-3 w-3" /> Samakan Tanggal dengan Akad
          </button>
        )}
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <div className="md:col-span-4">
          <label htmlFor={`cfg-${prefix}_TITLE`} className="adm-label">
            Judul Acara
          </label>
          <input
            id={`cfg-${prefix}_TITLE`}
            type="text"
            value={rawConfig[`${prefix}_TITLE`] ?? ""}
            onChange={(e) => handleChange(`${prefix}_TITLE`, e.target.value)}
            className="adm-input bg-(--adm-bg-secondary)"
          />
        </div>

        <div className="md:col-span-2">
          <label htmlFor={`picker-${prefix}-date`} className="adm-label">
            Pilih Tanggal
          </label>
          <input
            id={`picker-${prefix}-date`}
            type="date"
            value={schedule.dateYmd}
            onChange={(e) =>
              updateSchedule(prefix, { dateYmd: e.target.value })
            }
            className="adm-input bg-(--adm-bg-secondary)"
          />
        </div>
        <div>
          <label htmlFor={`picker-${prefix}-start`} className="adm-label">
            Jam Mulai
          </label>
          <input
            id={`picker-${prefix}-start`}
            type="time"
            value={schedule.startTime}
            onChange={(e) =>
              updateSchedule(prefix, { startTime: e.target.value })
            }
            className="adm-input bg-(--adm-bg-secondary)"
          />
        </div>
        <div>
          <label htmlFor={`picker-${prefix}-end`} className="adm-label">
            Jam Selesai
          </label>
          <input
            id={`picker-${prefix}-end`}
            type="time"
            value={schedule.endTime}
            onChange={(e) =>
              updateSchedule(prefix, { endTime: e.target.value })
            }
            className="adm-input bg-(--adm-bg-secondary)"
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-md border border-(--adm-border) bg-(--adm-bg-secondary) px-3 py-2 text-xs">
        <Clock className="h-3.5 w-3.5 text-(--adm-text-muted)" />
        <span className="text-(--adm-text-secondary)">
          Tampilan di undangan:
        </span>
        <strong className="font-semibold text-(--adm-text-primary)">
          {rawConfig[`${prefix}_DAY`] || "-"},{" "}
          {rawConfig[`${prefix}_DATE`] || "-"} ·{" "}
          {rawConfig[`${prefix}_START`] || "--:--"} -{" "}
          {rawConfig[`${prefix}_END`] || "--:--"}{" "}
          {rawConfig.EVENT_TIMEZONE || "WIB"}
        </strong>
      </div>

      <details className="text-xs text-(--adm-text-secondary)">
        <summary className="cursor-pointer font-medium hover:text-(--adm-text-primary)">
          Opsi lanjutan (teks khusus seperti &quot;Selesai&quot; / ISO)
        </summary>
        <div className="mt-2.5 grid gap-3 md:grid-cols-2">
          <div>
            <label className="adm-label">
              Teks Jam Selesai (Opsional, mis. &quot;Selesai&quot;)
            </label>
            <input
              type="text"
              value={rawConfig[`${prefix}_END`] ?? ""}
              onChange={(e) => handleChange(`${prefix}_END`, e.target.value)}
              className="adm-input adm-input-sm bg-(--adm-bg-secondary)"
            />
          </div>
          <div>
            <label className="adm-label">ISO Start (Otomatis)</label>
            <input
              type="text"
              value={rawConfig[`${prefix}_ISO_START`] ?? ""}
              onChange={(e) =>
                handleChange(`${prefix}_ISO_START`, e.target.value)
              }
              className="adm-input adm-input-sm bg-(--adm-bg-secondary) font-mono"
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
        pastePlaceholder={
          "BRIDE_NICKNAME,Fey\nGROOM_NICKNAME,Yaya\nVENUE_NAME,The Royal Ballroom"
        }
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
        pastePlaceholder={
          "Bank BCA,1234567890,Fera Oktapia\nGoPay,081234567890,Yahya Zulfikri"
        }
        parseText={parseBankAccountsText}
        columns={[
          {
            header: "Bank / E-Wallet",
            render: (r) => <strong>{r.bank}</strong>,
          },
          {
            header: "No. Rekening",
            render: (r) => <span className="font-mono">{r.number}</span>,
          },
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
        pastePlaceholder={
          "2020,Awal Pertemuan,Pertama kali bertemu di kampus.\n2024,Lamaran,Resmi mengikat janji."
        }
        parseText={parseLoveStoryText}
        columns={[
          { header: "Tahun", render: (r) => <strong>{r.date}</strong> },
          { header: "Judul", render: (r) => r.title },
          {
            header: "Cerita",
            render: (r) => <span className="line-clamp-2">{r.desc}</span>,
          },
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
        <div role="alert" className="adm-alert adm-alert-danger">
          {saveError}
        </div>
      )}

      {/* Sticky Action & Quick-Jump Bar */}
      <div
        data-tour="settings-sticky-bar"
        className="sticky top-[62px] z-20 space-y-2 rounded-lg border border-(--adm-border) bg-(--adm-bg-secondary)/95 p-2.5 shadow-xs backdrop-blur-md sm:space-y-2.5 sm:p-3"
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <span
              className={`h-2 w-2 shrink-0 rounded-full ${
                hasUnsaved
                  ? "animate-pulse bg-(--adm-yellow)"
                  : "bg-(--adm-green)"
              }`}
            />
            <span className="truncate text-xs font-medium text-(--adm-text-secondary)">
              <span className="sm:hidden">
                {hasUnsaved ? "Belum disimpan" : "Tersimpan"}
              </span>
              <span className="hidden sm:inline">
                {hasUnsaved
                  ? "Ada perubahan belum disimpan"
                  : "Semua perubahan tersimpan"}
              </span>
            </span>
          </div>

          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={() => setCsvModalType("config")}
              title="Impor CSV Pengaturan"
              aria-label="Impor CSV Pengaturan"
              className="adm-btn adm-btn-outline-primary adm-btn-sm px-2 sm:px-3"
            >
              <Upload className="h-3.5 w-3.5 shrink-0" />
              <span className="hidden sm:inline">Impor CSV</span>
            </button>
            <button
              type="button"
              onClick={handleExportConfigCsv}
              title="Ekspor CSV Pengaturan"
              aria-label="Ekspor CSV Pengaturan"
              className="adm-btn adm-btn-secondary adm-btn-sm px-2 sm:px-3"
            >
              <Download className="h-3.5 w-3.5 shrink-0" />
              <span className="hidden sm:inline">Ekspor CSV</span>
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              title={saved ? "Tersimpan" : "Simpan Semua Perubahan"}
              className={`adm-btn adm-btn-sm px-2.5 sm:px-3 ${
                saved ? "adm-btn-edit" : "adm-btn-primary"
              }`}
            >
              {saving ? (
                <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />
              ) : (
                <Save className="h-3.5 w-3.5 shrink-0" />
              )}
              <span>
                {saved ? (
                  "Tersimpan!"
                ) : (
                  <>
                    Simpan<span className="hidden sm:inline"> Semua</span>
                  </>
                )}
              </span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-6 gap-1 sm:flex sm:flex-wrap sm:gap-1.5">
          {SETTINGS_SUBMENUS.map((item) => {
            const active = currentSection === item.id;
            const SectionIcon =
              item.id === "tema"
                ? Palette
                : item.id === "mempelai"
                  ? Heart
                  : item.id === "acara"
                    ? Calendar
                    : item.id === "media"
                      ? ImageIcon
                      : item.id === "konten"
                        ? BookOpen
                        : MessageSquare;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => selectSection(item.id)}
                title={item.label}
                aria-label={item.label}
                className={`inline-flex h-8 items-center justify-center gap-1.5 rounded-md border px-2 text-[11px] font-medium whitespace-nowrap transition-colors sm:h-auto sm:px-2.5 sm:py-1 ${
                  active
                    ? "border-(--adm-accent) bg-(--adm-accent-soft) text-(--adm-accent)"
                    : "border-(--adm-border) bg-(--adm-bg-primary) text-(--adm-text-secondary) hover:border-(--adm-accent) hover:text-(--adm-accent)"
                }`}
              >
                <SectionIcon className="h-3.5 w-3.5 shrink-0" />
                <span className="hidden sm:inline">{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tema & Tampilan Undangan Publik */}
      {currentSection === "tema" && (
      <div id="sec-tema" className="adm-card scroll-mt-36">
        <div className="adm-card-header flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="adm-card-title flex items-center gap-1.5">
              <Palette className="h-4 w-4 text-(--adm-accent)" />
              Tema &amp; Tampilan Undangan Publik
            </h3>
            <p className="adm-card-desc">
              Pilih palet warna utama dan mode tampilan bawaan yang dilihat tamu
              saat membuka undangan.
            </p>
          </div>
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="adm-btn adm-btn-secondary adm-btn-sm"
          >
            <ExternalLink className="h-3.5 w-3.5" /> Lihat Undangan
          </a>
        </div>
        <div className="adm-card-body space-y-4">
          <div>
            <span className="adm-label">Nuansa Warna Undangan</span>
            <div className="mt-1.5 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
              {PUBLIC_THEMES.map((themeItem) => {
                const activeTheme =
                  normalizePublicTheme(rawConfig.PUBLIC_THEME) === themeItem.id;
                return (
                  <button
                    key={themeItem.id}
                    type="button"
                    onClick={() => handleChange("PUBLIC_THEME", themeItem.id)}
                    className={`flex items-start gap-3 rounded-lg border p-3 text-left transition-all ${
                      activeTheme
                        ? "border-(--adm-accent) bg-(--adm-accent-soft) ring-1 ring-(--adm-accent)"
                        : "border-(--adm-border) bg-(--adm-bg-primary) hover:border-(--adm-accent)/60"
                    }`}
                  >
                    <div className="flex shrink-0 flex-col gap-1 pt-0.5">
                      <span
                        className="flex h-7 w-7 items-center justify-center rounded-full border border-black/10 shadow-xs"
                        style={{
                          background: `linear-gradient(135deg, ${themeItem.colors.accentDark} 0%, ${themeItem.colors.accent} 100%)`,
                        }}
                      >
                        {activeTheme && (
                          <Check className="h-3.5 w-3.5 text-white" />
                        )}
                      </span>
                      <div className="flex justify-center gap-0.5">
                        <span
                          className="h-2 w-2 rounded-full border border-black/15"
                          style={{ backgroundColor: themeItem.colors.secondary }}
                        />
                        <span
                          className="h-2 w-2 rounded-full border border-black/15"
                          style={{ backgroundColor: themeItem.colors.darkBg }}
                        />
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[12.5px] font-semibold text-(--adm-text-primary)">
                        {themeItem.name}
                      </div>
                      <p className="adm-hint mt-0.5 leading-snug">
                        {themeItem.tagline}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid gap-3.5 border-t border-(--adm-border) pt-3.5 md:grid-cols-2">
            <div className="min-w-0">
              <span className="adm-label">Mode Terang / Gelap Bawaan</span>
              <div className="adm-seg mt-1 grid w-full grid-cols-3 sm:inline-flex sm:w-auto">
                {(
                  [
                    { id: "system", shortLabel: "Otomatis", label: "Ikuti Perangkat" },
                    { id: "light", shortLabel: "Terang", label: "Terang (Light)" },
                    { id: "dark", shortLabel: "Gelap", label: "Gelap (Dark)" },
                  ] as const
                ).map((mode) => {
                  const activeMode =
                    normalizePublicDefaultMode(
                      rawConfig.PUBLIC_DEFAULT_MODE
                    ) === mode.id;
                  return (
                    <button
                      key={mode.id}
                      type="button"
                      onClick={() =>
                        handleChange("PUBLIC_DEFAULT_MODE", mode.id)
                      }
                      className={`adm-seg-btn justify-center ${activeMode ? "is-active" : ""}`}
                    >
                      <span className="sm:hidden">{mode.shortLabel}</span>
                      <span className="hidden sm:inline">{mode.label}</span>
                    </button>
                  );
                })}
              </div>
              <p className="adm-hint mt-1">
                Dipakai untuk pengunjung baru yang belum memilih mode sendiri.
              </p>
            </div>

            <div className="flex items-start justify-between gap-3 rounded-md border border-(--adm-border) bg-(--adm-bg-primary) p-3">
              <div>
                <div className="text-[12.5px] font-semibold text-(--adm-text-primary)">
                  Izinkan Tamu Ganti Tema Warna
                </div>
                <p className="adm-hint mt-0.5">
                  Tampilkan tombol palet warna di navigasi bawah undangan publik
                  agar tamu bisa mencoba nuansa warna lain.
                </p>
              </div>
              <input
                type="checkbox"
                aria-label="Izinkan tamu ganti tema warna"
                checked={rawConfig.PUBLIC_ALLOW_THEME_SWITCH !== "false"}
                onChange={(e) =>
                  handleChange(
                    "PUBLIC_ALLOW_THEME_SWITCH",
                    e.target.checked ? "true" : "false"
                  )
                }
                className="mt-0.5 h-4 w-4 accent-(--adm-accent)"
              />
            </div>
          </div>

          {/* Pilihan Animasi Latar dengan Pratinjau Langsung */}
          <div className="border-t border-(--adm-border) pt-3.5">
            {(() => {
              const activeThemeObj =
                PUBLIC_THEMES.find(
                  (t) => t.id === normalizePublicTheme(rawConfig.PUBLIC_THEME)
                ) || PUBLIC_THEMES[0];
              const activeAnim = normalizePublicAnimation(
                rawConfig.PUBLIC_ANIMATION
              );
              const activeOrnament = normalizePublicOrnament(
                rawConfig.PUBLIC_ORNAMENT
              );
              const isDarkPreview =
                normalizePublicDefaultMode(rawConfig.PUBLIC_DEFAULT_MODE) ===
                "dark";
              const stageBg = isDarkPreview
                ? activeThemeObj.colors.darkBg
                : activeThemeObj.colors.secondary;
              const stageInk = isDarkPreview
                ? "#ffffff"
                : activeThemeObj.colors.primary;
              const stageAccent = isDarkPreview
                ? activeThemeObj.colors.accent
                : activeThemeObj.colors.accentDark;

              return (
                <div className="space-y-4">
                  {/* Live Combined Stage Preview: Tema + Ornamen + Bingkai Love + Animasi */}
                  <div>
                    <div className="mb-1.5 flex flex-col gap-0.5 sm:flex-row sm:items-center sm:justify-between">
                      <span className="adm-label mb-0">
                        Pratinjau Gabungan (Tema + Ornamen + Bingkai Love +
                        Animasi)
                      </span>
                      <span className="adm-hint">
                        {activeThemeObj.name} ·{" "}
                        {
                          PUBLIC_ORNAMENTS.find((o) => o.id === activeOrnament)
                            ?.name
                        }{" "}
                        ·{" "}
                        {PUBLIC_ANIMATIONS.find((a) => a.id === activeAnim)?.name}
                      </span>
                    </div>
                    <div
                      className="relative flex h-44 w-full flex-col items-center justify-center overflow-hidden rounded-lg border border-(--adm-border)"
                      style={{
                        background: `radial-gradient(ellipse 75% 65% at 50% 50%, ${activeThemeObj.colors.accent}22, ${stageBg})`,
                        color: stageAccent,
                      }}
                    >
                      {/* Mini Heart Frame */}
                      <HeartFrameWatermark className="!w-44 opacity-90" />

                      {/* Mini Side Ornaments */}
                      {activeOrnament !== "none" && (
                        <>
                          <svg
                            viewBox="0 0 220 260"
                            fill="none"
                            className="ornament-sway-left pointer-events-none absolute top-1/2 -left-4 h-36 w-28 opacity-20"
                          >
                            <OrnamentArtwork variant={activeOrnament} />
                          </svg>
                          <svg
                            viewBox="0 0 220 260"
                            fill="none"
                            className="ornament-sway-right pointer-events-none absolute top-1/2 -right-4 h-36 w-28 opacity-20"
                          >
                            <OrnamentArtwork variant={activeOrnament} />
                          </svg>
                        </>
                      )}

                      {/* Live Animation overlay inside stage */}
                      <div className="pointer-events-none absolute inset-0 opacity-85">
                        <AnimationPreviewMini
                          variant={activeAnim}
                          accent={activeThemeObj.colors.accent}
                          accentDark={stageAccent}
                          bg="transparent"
                          className="h-full"
                        />
                      </div>

                      {/* Sample Couple Title */}
                      <div className="relative z-10 text-center">
                        <span
                          className="block text-[9px] font-semibold tracking-[0.28em] uppercase opacity-75"
                          style={{ color: stageAccent }}
                        >
                          Kami Yang Berbahagia
                        </span>
                        <div
                          className="font-script mt-1 text-3xl leading-tight"
                          style={{ color: stageInk }}
                        >
                          {rawConfig.BRIDE_NICKNAME || "Bride"}{" "}
                          <span style={{ color: stageAccent }}>&amp;</span>{" "}
                          {rawConfig.GROOM_NICKNAME || "Groom"}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Pilihan Ornamen Samping */}
                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <span className="adm-label mb-0">
                        Variasi Tanda Air / Ornamen Samping
                      </span>
                      <span className="adm-hint">
                        Aktif:{" "}
                        <strong className="text-(--adm-text-primary)">
                          {
                            PUBLIC_ORNAMENTS.find(
                              (o) => o.id === activeOrnament
                            )?.name
                          }
                        </strong>
                      </span>
                    </div>
                    <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                      {PUBLIC_ORNAMENTS.map((orn) => {
                        const isSelected = activeOrnament === orn.id;
                        return (
                          <button
                            key={orn.id}
                            type="button"
                            onClick={() =>
                              handleChange("PUBLIC_ORNAMENT", orn.id)
                            }
                            className={`flex flex-col gap-2 rounded-lg border p-2.5 text-left transition-all ${
                              isSelected
                                ? "border-(--adm-accent) bg-(--adm-accent-soft) ring-1 ring-(--adm-accent)"
                                : "border-(--adm-border) bg-(--adm-bg-primary) hover:border-(--adm-accent)/60"
                            }`}
                          >
                            <OrnamentPreviewMini
                              variant={orn.id}
                              accent={activeThemeObj.colors.accent}
                              accentDark={activeThemeObj.colors.accentDark}
                              bg={activeThemeObj.colors.secondary}
                            />
                            <div className="flex items-start justify-between gap-2 px-0.5">
                              <div className="min-w-0">
                                <div className="text-[12.5px] font-semibold text-(--adm-text-primary)">
                                  {orn.name}
                                </div>
                                <p className="adm-hint mt-0.5 leading-snug">
                                  {orn.tagline}
                                </p>
                              </div>
                              {isSelected && (
                                <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-(--adm-accent) text-white">
                                  <Check className="h-3 w-3" />
                                </span>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Pilihan Animasi Latar */}
                  <div className="border-t border-(--adm-border) pt-3.5">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="adm-label mb-0">
                        Animasi Latar Undangan (Pratinjau Langsung)
                      </span>
                      <span className="adm-hint">
                        Aktif:{" "}
                        <strong className="text-(--adm-text-primary)">
                          {
                            PUBLIC_ANIMATIONS.find((a) => a.id === activeAnim)
                              ?.name
                          }
                        </strong>
                      </span>
                    </div>
                    <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                      {PUBLIC_ANIMATIONS.map((anim) => {
                        const isSelected = activeAnim === anim.id;
                        return (
                          <button
                            key={anim.id}
                            type="button"
                            onClick={() =>
                              handleChange("PUBLIC_ANIMATION", anim.id)
                            }
                            className={`flex flex-col gap-2 rounded-lg border p-2.5 text-left transition-all ${
                              isSelected
                                ? "border-(--adm-accent) bg-(--adm-accent-soft) ring-1 ring-(--adm-accent)"
                                : "border-(--adm-border) bg-(--adm-bg-primary) hover:border-(--adm-accent)/60"
                            }`}
                          >
                            <AnimationPreviewMini
                              variant={anim.id}
                              accent={activeThemeObj.colors.accent}
                              accentDark={activeThemeObj.colors.accentDark}
                              bg={activeThemeObj.colors.secondary}
                            />
                            <div className="flex items-start justify-between gap-2 px-0.5">
                              <div className="min-w-0">
                                <div className="text-[12.5px] font-semibold text-(--adm-text-primary)">
                                  {anim.name}
                                </div>
                                <p className="adm-hint mt-0.5 leading-snug">
                                  {anim.tagline}
                                </p>
                              </div>
                              {isSelected && (
                                <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-(--adm-accent) text-white">
                                  <Check className="h-3 w-3" />
                                </span>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      </div>
      )}

      {/* Mempelai */}
      {currentSection === "mempelai" && (
      <div id="sec-mempelai" className="scroll-mt-32 space-y-6">
        {renderCoupleCard("BRIDE", "Mempelai Wanita")}
        {renderCoupleCard("GROOM", "Mempelai Pria")}
      </div>
      )}

      {/* Lokasi / Venue */}
      {currentSection === "acara" && (
      <div className="space-y-6">
      <div id="sec-lokasi" className="adm-card scroll-mt-36">
        <div className="adm-card-header">
          <h3 className="adm-card-title">Lokasi / Venue Acara</h3>
          {rawConfig.VENUE_LAT && rawConfig.VENUE_LNG && (
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(rawConfig.VENUE_LAT)},${encodeURIComponent(rawConfig.VENUE_LNG)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="adm-btn adm-btn-outline-primary adm-btn-sm"
            >
              <ExternalLink className="h-3.5 w-3.5" /> Cek di Google Maps
            </a>
          )}
        </div>

        <div className="adm-card-body grid gap-3.5 md:grid-cols-2">
          <div className="md:col-span-2">
            <label htmlFor="cfg-VENUE_NAME" className="adm-label">
              Nama Gedung / Tempat
            </label>
            <input
              id="cfg-VENUE_NAME"
              type="text"
              value={rawConfig.VENUE_NAME ?? ""}
              onChange={(e) => handleChange("VENUE_NAME", e.target.value)}
              className="adm-input"
            />
          </div>
          <div className="md:col-span-2">
            <label htmlFor="cfg-VENUE_ADDRESS" className="adm-label">
              Alamat Lengkap
            </label>
            <textarea
              id="cfg-VENUE_ADDRESS"
              rows={2}
              value={rawConfig.VENUE_ADDRESS ?? ""}
              onChange={(e) => handleChange("VENUE_ADDRESS", e.target.value)}
              className="adm-input"
            />
          </div>

          <div className="adm-alert flex-col items-stretch md:col-span-2">
            <label
              htmlFor="maps-smart-input"
              className="flex items-center gap-1.5 text-xs font-semibold text-(--adm-accent)"
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
              className="adm-input bg-(--adm-bg-secondary)"
            />
            {mapsExtractMsg && (
              <p className="text-xs text-(--adm-accent)">{mapsExtractMsg}</p>
            )}
          </div>

          <div>
            <label htmlFor="cfg-VENUE_LAT" className="adm-label">
              Latitude (Otomatis dari Link di Atas)
            </label>
            <input
              id="cfg-VENUE_LAT"
              type="text"
              value={rawConfig.VENUE_LAT ?? ""}
              onChange={(e) => handleChange("VENUE_LAT", e.target.value)}
              placeholder="-6.3032707"
              className="adm-input font-mono"
            />
          </div>
          <div>
            <label htmlFor="cfg-VENUE_LNG" className="adm-label">
              Longitude (Otomatis dari Link di Atas)
            </label>
            <input
              id="cfg-VENUE_LNG"
              type="text"
              value={rawConfig.VENUE_LNG ?? ""}
              onChange={(e) => handleChange("VENUE_LNG", e.target.value)}
              placeholder="106.1011039"
              className="adm-input font-mono"
            />
          </div>
        </div>
      </div>

      {/* Jadwal Akad & Resepsi */}
      <div id="sec-jadwal" className="adm-card scroll-mt-36">
        <div className="adm-card-header">
          <div>
            <h3 className="adm-card-title">Jadwal Akad Nikah &amp; Resepsi</h3>
            <p className="adm-card-desc">
              Pilih tanggal &amp; jam — nama hari, tanggal Indonesia, dan ISO
              kalender otomatis sinkron.
            </p>
          </div>
          <div className="w-full sm:w-64">
            <select
              id="cfg-EVENT_TIMEZONE"
              aria-label="Zona Waktu Acara"
              value={rawConfig.EVENT_TIMEZONE || "WIB"}
              onChange={(e) => handleTimezoneChange(e.target.value)}
              className="adm-input adm-input-sm"
            >
              {TIMEZONE_OPTIONS.map((tz) => (
                <option key={tz.value} value={tz.value}>
                  {tz.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="adm-card-body space-y-4">
          {renderEventScheduleCard("AKAD", "Akad Nikah", akadSchedule)}
          {renderEventScheduleCard(
            "RESEPSI",
            "Resepsi Pernikahan",
            resepsiSchedule
          )}
        </div>
      </div>
      </div>
      )}

      {/* Hero & Media */}
      {currentSection === "media" && (
      <div id="sec-media" className="adm-card scroll-mt-36">
        <div className="adm-card-header">
          <h3 className="adm-card-title">
            Hero, Musik Backsound &amp; Batas RSVP
          </h3>
        </div>
        <div className="adm-card-body grid gap-3.5 md:grid-cols-2">
          {renderPhotoField("HERO_IMAGE", "Gambar Utama (Hero)")}
          {renderPhotoField(
            "ENVELOPE_IMAGE",
            "Gambar Amplop Pembuka (Opsional)",
            "Kosongkan untuk mengikuti gambar Hero"
          )}
          <div>
            <label htmlFor="cfg-HERO_CITY" className="adm-label">
              Kota / Wilayah
            </label>
            <input
              id="cfg-HERO_CITY"
              type="text"
              value={rawConfig.HERO_CITY ?? ""}
              onChange={(e) => handleChange("HERO_CITY", e.target.value)}
              placeholder="Kab. Pandeglang, Banten"
              className="adm-input"
            />
          </div>
          <div>
            <span className="adm-label">Maksimal Tamu per RSVP</span>
            <div className="inline-flex items-center gap-1 rounded-md border border-(--adm-border) bg-(--adm-bg-primary) p-0.5">
              <button
                type="button"
                aria-label="Kurangi batas tamu"
                onClick={() =>
                  handleChange(
                    "RSVP_MAX_GUESTS",
                    String(Math.max(1, maxGuestsVal - 1))
                  )
                }
                className="flex h-7 w-7 items-center justify-center rounded hover:bg-(--adm-bg-overlay)"
              >
                <Minus className="h-3.5 w-3.5" />
              </button>
              <span className="w-16 text-center text-xs font-semibold tabular-nums">
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
                className="flex h-7 w-7 items-center justify-center rounded hover:bg-(--adm-bg-overlay)"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <div className="md:col-span-2">
            <label
              htmlFor="cfg-MUSIC_URL"
              className="adm-label flex items-center gap-1.5"
            >
              <Music className="h-3.5 w-3.5 text-(--adm-accent)" /> Musik Latar
              / Backsound (MP3, M4A, OGG, WAV — Maks. 15 MB)
            </label>
            <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap">
              <input
                id="cfg-MUSIC_URL"
                type="url"
                value={rawConfig.MUSIC_URL ?? ""}
                onChange={(e) => handleChange("MUSIC_URL", e.target.value)}
                placeholder="https://.../lagu.mp3 atau klik Upload Audio"
                className="adm-input"
              />
              <label className="adm-btn adm-btn-secondary shrink-0 cursor-pointer">
                {uploadingKey === "MUSIC_URL" ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Upload className="h-3.5 w-3.5" />
                )}
                <span>
                  {uploadingKey === "MUSIC_URL"
                    ? "Mengunggah..."
                    : "Upload Audio"}
                </span>
                <input
                  type="file"
                  accept="audio/mpeg,audio/mp4,audio/ogg,audio/wav,.mp3,.m4a,.ogg,.wav"
                  className="hidden"
                  disabled={uploadingKey !== null}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    e.target.value = "";
                    if (f) {
                      void uploadMediaFile(
                        f,
                        "MUSIC_URL",
                        (url) => handleChange("MUSIC_URL", url),
                        "audio"
                      );
                    }
                  }}
                />
              </label>
              {rawConfig.MUSIC_URL?.trim() && (
                <button
                  type="button"
                  title="Hapus musik latar"
                  aria-label="Hapus musik latar"
                  onClick={() => handleChange("MUSIC_URL", "")}
                  className="adm-btn-aksi aksi-hapus h-[34px] w-[34px] shrink-0"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
            {rawConfig.MUSIC_URL?.trim() && (
              <div className="mt-2.5 flex flex-col gap-2 rounded-md border border-(--adm-border) bg-(--adm-bg-primary) px-3 py-2 sm:flex-row sm:items-center sm:gap-3">
                <span className="shrink-0 text-[11px] font-medium text-(--adm-text-secondary)">
                  Pratinjau Backsound:
                </span>
                <audio
                  key={rawConfig.MUSIC_URL}
                  controls
                  preload="metadata"
                  src={rawConfig.MUSIC_URL}
                  className="h-8 w-full min-w-0 sm:flex-1"
                />
              </div>
            )}
          </div>
        </div>
      </div>
      )}

      {/* Teks & Konten */}
      {currentSection === "konten" && (
      <div id="sec-teks" className="adm-card scroll-mt-36">
        <div className="adm-card-header">
          <h3 className="adm-card-title">Teks &amp; Konten Undangan</h3>
        </div>
        <div className="adm-card-body grid gap-3.5 md:grid-cols-2">
          {TEXT_CONTENT_FIELDS.map((field) => {
            const fieldId = `cfg-${field.key}`;
            return (
              <div
                key={field.key}
                className={field.type === "textarea" ? "md:col-span-2" : ""}
              >
                <label htmlFor={fieldId} className="adm-label">
                  {field.label}
                </label>
                {field.type === "textarea" ? (
                  <textarea
                    id={fieldId}
                    rows={3}
                    value={rawConfig[field.key] ?? ""}
                    onChange={(e) => handleChange(field.key, e.target.value)}
                    placeholder={field.placeholder}
                    className="adm-input"
                  />
                ) : (
                  <input
                    id={fieldId}
                    type="text"
                    value={rawConfig[field.key] ?? ""}
                    onChange={(e) => handleChange(field.key, e.target.value)}
                    placeholder={field.placeholder}
                    className="adm-input"
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
      )}

      {/* WhatsApp Gateway */}
      {currentSection === "whatsapp" && (
      <div id="sec-wa" className="adm-card scroll-mt-36">
        <div className="adm-card-header">
          <div>
            <h3 className="adm-card-title">
              Integrasi WhatsApp Gateway (whatsapp.zedlabs.id)
            </h3>
            <p className="adm-card-desc">
              Notifikasi admin/mempelai, kirim undangan otomatis, dan konfirmasi
              tamu setelah RSVP.
            </p>
          </div>
          <span className="adm-badge adm-badge-success">HMAC-SHA256 v2</span>
        </div>

        <div className="adm-card-body space-y-4">
          <div className="grid gap-3.5 md:grid-cols-2">
            <div>
              <label htmlFor="cfg-WA_BASE_URL" className="adm-label">
                URL Gateway
              </label>
              <input
                id="cfg-WA_BASE_URL"
                type="url"
                value={rawConfig.WA_BASE_URL ?? "https://whatsapp.zedlabs.id"}
                onChange={(e) => handleChange("WA_BASE_URL", e.target.value)}
                placeholder="https://whatsapp.zedlabs.id"
                className="adm-input"
              />
            </div>
            <div>
              <label htmlFor="cfg-WA_API_KEY" className="adm-label">
                API Key (key_id)
              </label>
              <input
                id="cfg-WA_API_KEY"
                type="text"
                value={rawConfig.WA_API_KEY ?? ""}
                onChange={(e) => handleChange("WA_API_KEY", e.target.value)}
                placeholder="key_xxxxxxxxxxxx"
                className="adm-input font-mono"
              />
            </div>
            <div>
              <label htmlFor="cfg-WA_API_SECRET" className="adm-label">
                HMAC Secret
              </label>
              <div className="relative">
                <input
                  id="cfg-WA_API_SECRET"
                  type={showWaSecret ? "text" : "password"}
                  value={rawConfig.WA_API_SECRET ?? ""}
                  onChange={(e) =>
                    handleChange("WA_API_SECRET", e.target.value)
                  }
                  placeholder="Secret HMAC API Key"
                  className="adm-input pr-10 font-mono"
                />
                <button
                  type="button"
                  aria-label={
                    showWaSecret ? "Sembunyikan secret" : "Tampilkan secret"
                  }
                  onClick={() => setShowWaSecret((prev) => !prev)}
                  className="absolute top-1/2 right-2.5 -translate-y-1/2 text-(--adm-text-muted) hover:text-(--adm-text-primary)"
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
              <div className="mb-1 flex items-center justify-between">
                <label
                  htmlFor="cfg-WA_ADMIN_NUMBERS"
                  className="text-xs font-semibold text-(--adm-text-secondary)"
                >
                  Nomor WA Admin / Mempelai (pisah koma)
                </label>
                {adminWaCount > 0 && (
                  <span className="adm-badge adm-badge-success text-[10px]">
                    {adminWaCount} nomor aktif
                  </span>
                )}
              </div>
              <input
                id="cfg-WA_ADMIN_NUMBERS"
                type="text"
                value={rawConfig.WA_ADMIN_NUMBERS ?? ""}
                onChange={(e) =>
                  handleChange("WA_ADMIN_NUMBERS", e.target.value)
                }
                placeholder="081234567890, 089876543210"
                className="adm-input"
              />
            </div>
          </div>

          <div className="grid gap-3 border-t border-(--adm-border) pt-4 md:grid-cols-3">
            <label className="flex cursor-pointer items-start gap-2.5 rounded-md border border-(--adm-border) bg-(--adm-bg-primary) p-3 text-xs">
              <input
                type="checkbox"
                checked={(rawConfig.WA_NOTIFY_ADMIN_RSVP ?? "true") === "true"}
                onChange={(e) =>
                  handleChange(
                    "WA_NOTIFY_ADMIN_RSVP",
                    e.target.checked ? "true" : "false"
                  )
                }
                className="mt-0.5 h-4 w-4 accent-(--adm-accent)"
              />
              <span>
                <strong className="block font-semibold text-(--adm-text-primary)">
                  Notif RSVP ke Admin
                </strong>
                <span className="text-(--adm-text-secondary)">
                  Kirim WA ke admin saat tamu mengisi atau mengubah RSVP.
                </span>
              </span>
            </label>
            <label className="flex cursor-pointer items-start gap-2.5 rounded-md border border-(--adm-border) bg-(--adm-bg-primary) p-3 text-xs">
              <input
                type="checkbox"
                checked={(rawConfig.WA_NOTIFY_ADMIN_WISH ?? "true") === "true"}
                onChange={(e) =>
                  handleChange(
                    "WA_NOTIFY_ADMIN_WISH",
                    e.target.checked ? "true" : "false"
                  )
                }
                className="mt-0.5 h-4 w-4 accent-(--adm-accent)"
              />
              <span>
                <strong className="block font-semibold text-(--adm-text-primary)">
                  Notif Ucapan ke Admin
                </strong>
                <span className="text-(--adm-text-secondary)">
                  Kirim WA ke admin saat ada ucapan &amp; doa baru masuk.
                </span>
              </span>
            </label>
            <label className="flex cursor-pointer items-start gap-2.5 rounded-md border border-(--adm-border) bg-(--adm-bg-primary) p-3 text-xs">
              <input
                type="checkbox"
                checked={(rawConfig.WA_AUTO_CONFIRM_GUEST ?? "true") === "true"}
                onChange={(e) =>
                  handleChange(
                    "WA_AUTO_CONFIRM_GUEST",
                    e.target.checked ? "true" : "false"
                  )
                }
                className="mt-0.5 h-4 w-4 accent-(--adm-accent)"
              />
              <span>
                <strong className="block font-semibold text-(--adm-text-primary)">
                  Konfirmasi Otomatis Tamu
                </strong>
                <span className="text-(--adm-text-secondary)">
                  Balas otomatis ke WA tamu berisi ringkasan RSVP &amp; info
                  acara.
                </span>
              </span>
            </label>
            <label className="flex cursor-pointer items-start gap-2.5 rounded-md border border-(--adm-border) bg-(--adm-bg-primary) p-3 text-xs md:col-span-3">
              <input
                type="checkbox"
                checked={(rawConfig.WA_AUTO_REMINDER_H1 ?? "true") === "true"}
                onChange={(e) =>
                  handleChange(
                    "WA_AUTO_REMINDER_H1",
                    e.target.checked ? "true" : "false"
                  )
                }
                className="mt-0.5 h-4 w-4 accent-(--adm-accent)"
              />
              <span>
                <strong className="block font-semibold text-(--adm-text-primary)">
                  Pengingat Otomatis H-1 (Tamu Hadir &amp; Masih Ragu)
                </strong>
                <span className="text-(--adm-text-secondary)">
                  Kirim pengingat otomatis via WhatsApp saat memasuki H-1 acara
                  kepada tamu yang memilih <strong>Hadir</strong> maupun{" "}
                  <strong>Masih Ragu</strong>. Tamu yang sudah memastikan{" "}
                  <strong>Tidak Hadir</strong> otomatis dikecualikan.
                </span>
              </span>
            </label>
          </div>

          {h1Summary && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-(--adm-border) bg-(--adm-bg-primary) p-3 text-xs">
              <div className="space-y-0.5">
                <div className="font-semibold text-(--adm-text-primary)">
                  Status Pengingat H-1:{" "}
                  <span className="text-(--adm-accent)">
                    {h1Summary.pendingCount} menunggu
                  </span>{" "}
                  ({h1Summary.hadirPendingCount} Hadir,{" "}
                  {h1Summary.raguPendingCount} Ragu) ·{" "}
                  <span className="text-(--adm-green)">
                    {h1Summary.sentCount} sudah terkirim
                  </span>
                </div>
                <p className="adm-hint">
                  {h1Summary.excludedTidakHadirCount} tamu berstatus Tidak Hadir
                  otomatis dikecualikan.{" "}
                  {h1Summary.inH1Window
                    ? "Saat ini berada dalam rentang otomatis H-1."
                    : "Pengiriman otomatis aktif mulai H-1 (36 jam s/d 2 jam sebelum acara)."}
                </p>
              </div>
              <button
                type="button"
                onClick={handleSendH1Reminders}
                disabled={
                  waActionLoading !== null || h1Summary.pendingCount === 0
                }
                className="adm-btn adm-btn-sm adm-btn-primary"
              >
                {waActionLoading === "h1" ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Send className="h-3.5 w-3.5" />
                )}
                Kirim Pengingat H-1 Sekarang ({h1Summary.pendingCount})
              </button>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2 border-t border-(--adm-border) pt-4">
            <button
              type="button"
              onClick={() => handleWaAction("ping")}
              disabled={waActionLoading !== null}
              className="adm-btn adm-btn-secondary"
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
              className="adm-btn adm-btn-edit"
            >
              {waActionLoading === "sync" ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCcw className="h-3.5 w-3.5" />
              )}
              Sinkron 5 Template ke Gateway
            </button>
            <button
              type="button"
              onClick={() => handleWaAction("test")}
              disabled={waActionLoading !== null}
              className="adm-btn adm-btn-outline-edit"
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
            <div
              className={`adm-alert text-xs ${
                waFeedback.type === "success"
                  ? "adm-alert-success"
                  : "adm-alert-danger"
              }`}
            >
              {waFeedback.message}
            </div>
          )}
        </div>
      </div>
      )}

      {/* Rekening Bank Editor */}
      {currentSection === "konten" && (
      <div className="space-y-6">
      <div id="sec-rekening" className="adm-card scroll-mt-36">
        <datalist id="bank-presets-list">
          {BANK_PRESETS.map((bank) => (
            <option key={bank} value={bank} />
          ))}
        </datalist>

        <div className="adm-card-header">
          <h3 className="adm-card-title">Rekening Bank (Amplop Digital)</h3>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setCsvModalType("bank")}
              className="adm-btn adm-btn-outline-primary adm-btn-sm"
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
              className="adm-btn adm-btn-primary adm-btn-sm"
            >
              <Plus className="h-3.5 w-3.5" /> Tambah Rekening
            </button>
          </div>
        </div>
        <div className="adm-card-body space-y-3">
          {bankAccounts.length === 0 ? (
            <p className="text-xs text-(--adm-text-secondary)">
              Belum ada rekening bank. Klik &quot;Tambah Rekening&quot; atau
              &quot;Import CSV&quot;.
            </p>
          ) : (
            bankAccounts.map((acc, idx) => (
              <div
                key={idx}
                className="grid items-end gap-3 rounded-md border border-(--adm-border) bg-(--adm-bg-primary) p-3.5 md:grid-cols-10"
              >
                <div className="md:col-span-3">
                  <label className="adm-label">Nama Bank / E-Wallet</label>
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
                    className="adm-input bg-(--adm-bg-secondary)"
                  />
                </div>
                <div className="md:col-span-3">
                  <label className="adm-label">Nomor Rekening</label>
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
                    className="adm-input bg-(--adm-bg-secondary) font-mono"
                  />
                </div>
                <div className="md:col-span-3">
                  <label className="adm-label">Atas Nama</label>
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
                    className="adm-input bg-(--adm-bg-secondary)"
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
                    className="adm-btn-aksi aksi-hapus"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Kisah Cinta Editor */}
      <div id="sec-story" className="adm-card scroll-mt-36">
        <div className="adm-card-header">
          <h3 className="adm-card-title">Kisah Cinta</h3>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setCsvModalType("story")}
              className="adm-btn adm-btn-outline-primary adm-btn-sm"
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
              className="adm-btn adm-btn-primary adm-btn-sm"
            >
              <Plus className="h-3.5 w-3.5" /> Tambah Momen
            </button>
          </div>
        </div>
        <div className="adm-card-body space-y-3">
          {loveStory.length === 0 ? (
            <p className="text-xs text-(--adm-text-secondary)">
              Belum ada kisah cinta. Klik &quot;Tambah Momen&quot; atau
              &quot;Import CSV&quot;.
            </p>
          ) : (
            loveStory.map((story, idx) => (
              <div
                key={idx}
                className="space-y-3 rounded-md border border-(--adm-border) bg-(--adm-bg-primary) p-3.5"
              >
                <div className="grid items-end gap-3 md:grid-cols-12">
                  <div className="md:col-span-3">
                    <label className="adm-label">Tahun / Waktu</label>
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
                      className="adm-input bg-(--adm-bg-secondary)"
                    />
                  </div>
                  <div className="md:col-span-6">
                    <label className="adm-label">Judul Momen</label>
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
                      className="adm-input bg-(--adm-bg-secondary)"
                    />
                  </div>
                  <div className="flex justify-end gap-1 md:col-span-3">
                    <button
                      type="button"
                      aria-label={`Naikkan momen ${idx + 1}`}
                      disabled={idx === 0}
                      onClick={() => moveLoveStory(idx, -1)}
                      className="adm-btn-aksi aksi-netral"
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      aria-label={`Turunkan momen ${idx + 1}`}
                      disabled={idx === loveStory.length - 1}
                      onClick={() => moveLoveStory(idx, 1)}
                      className="adm-btn-aksi aksi-netral"
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
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
                      className="adm-btn-aksi aksi-hapus"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                <div>
                  <label className="adm-label">Cerita Singkat</label>
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
                    className="adm-input bg-(--adm-bg-secondary)"
                  />
                </div>
              </div>
            ))
          )}
        </div>
      </div>
      </div>
      )}

      {/* Galeri Foto Editor */}
      {currentSection === "media" && (
      <div id="sec-galeri" className="adm-card scroll-mt-36">
        <div className="adm-card-header">
          <div>
            <h3 className="adm-card-title">
              Galeri Foto ({galleryImages.length})
            </h3>
            <p className="adm-card-desc">
              Bisa memilih banyak foto sekaligus saat upload.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <label className="adm-btn adm-btn-secondary adm-btn-sm cursor-pointer">
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
              className="adm-btn adm-btn-primary adm-btn-sm"
            >
              <Plus className="h-3.5 w-3.5" /> Tambah URL
            </button>
          </div>
        </div>
        <div className="adm-card-body space-y-2.5">
          {galleryImages.length === 0 ? (
            <p className="text-xs text-(--adm-text-secondary)">
              Belum ada foto galeri. Klik &quot;Upload Banyak Foto&quot; atau
              &quot;Tambah URL&quot;.
            </p>
          ) : (
            galleryImages.map((url, idx) => (
              <div
                key={idx}
                className="flex items-center gap-2.5 rounded-md border border-(--adm-border) bg-(--adm-bg-primary) p-2.5"
              >
                {url.trim() ? (
                  <img
                    src={url}
                    alt={`Pratinjau foto ${idx + 1}`}
                    className="h-10 w-10 shrink-0 rounded border border-(--adm-border) object-cover"
                  />
                ) : (
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded border border-dashed border-(--adm-border) text-xs text-(--adm-text-muted)">
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
                  className="adm-input bg-(--adm-bg-secondary)"
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
                  className="adm-btn-aksi aksi-hapus shrink-0"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
      )}

      <div className="flex justify-end pb-4">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className={`adm-btn adm-btn-lg ${
            saved ? "adm-btn-edit" : "adm-btn-primary"
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
