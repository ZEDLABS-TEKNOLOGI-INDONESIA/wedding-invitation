import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  Edit,
  Eye,
  EyeOff,
  HelpCircle,
  Loader2,
  MessageCircle,
  MessageSquare,
  Plus,
  Printer,
  QrCode,
  RefreshCcw,
  Save,
  Search,
  Send,
  Settings,
  Trash2,
  Users,
  Wifi,
  X,
  XCircle,
} from "lucide-react";
import React, { Suspense, lazy, useEffect, useMemo, useState } from "react";
import { invalidateConfigCache } from "../../hooks/useConfig";

const InvitationManager = lazy(() => import("../InvitationManager"));
const QRCodeManager = lazy(() => import("../QRCodeManager"));
const WhatsAppManager = lazy(() => import("../WhatsAppManager"));

interface RSVP {
  id: number;
  guest_name: string;
  phone?: string;
  attendance: "hadir" | "tidak_hadir" | "ragu";
  guest_count: number;
  message: string;
  created_at: string;
}

interface Wish {
  id: number;
  name: string;
  message: string;
  created_at: string;
}

const DataTable = <T extends { id: number }>({
  data,
  columns,
  onEdit,
  onDelete,
  onBulkDelete,
}: {
  data: T[];
  columns: {
    header: string;
    accessor: keyof T | ((item: T) => React.ReactNode);
    className?: string;
  }[];
  onEdit?: (item: T) => void;
  onDelete?: (id: number) => void;
  onBulkDelete?: (ids: number[]) => void;
}) => {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selected, setSelected] = useState<number[]>([]);

  const filteredData = useMemo(() => {
    return data.filter((item) =>
      Object.values(item).some((val) =>
        String(val).toLowerCase().includes(search.toLowerCase())
      )
    );
  }, [data, search]);

  useEffect(() => {
    setPage(1);
  }, [search]);
  useEffect(() => {
    setSelected([]);
  }, [data]);

  const totalPages = Math.ceil(filteredData.length / pageSize);
  const paginatedData = filteredData.slice(
    (page - 1) * pageSize,
    page * pageSize
  );

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelected(paginatedData.map((d) => d.id));
    } else {
      setSelected([]);
    }
  };

  const handleSelectOne = (id: number) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((pid) => pid !== id) : [...prev, id]
    );
  };

  const executeBulkDelete = () => {
    if (onBulkDelete && selected.length > 0) {
      if (confirm(`Yakin hapus ${selected.length} data terpilih?`)) {
        onBulkDelete(selected);
        setSelected([]);
      }
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div className="flex items-center gap-2">
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPage(1);
            }}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800"
          >
            {[5, 10, 25, 50].map((size) => (
              <option key={size} value={size}>
                {size} Data
              </option>
            ))}
          </select>
          {onBulkDelete && selected.length > 0 && (
            <button
              type="button"
              onClick={executeBulkDelete}
              className="flex items-center gap-2 rounded-lg bg-red-100 px-4 py-2 text-xs font-bold text-red-600 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400"
            >
              <Trash2 className="h-3.5 w-3.5" /> Hapus ({selected.length})
            </button>
          )}
        </div>
        <div className="relative w-full md:w-64">
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari data..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-slate-200 py-2 pr-4 pl-10 text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800"
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500 uppercase dark:bg-slate-900/50 dark:text-slate-400">
              <tr>
                {onBulkDelete && (
                  <th className="w-4 px-6 py-4">
                    <input
                      type="checkbox"
                      onChange={handleSelectAll}
                      checked={
                        paginatedData.length > 0 &&
                        paginatedData.every((d) => selected.includes(d.id))
                      }
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                  </th>
                )}
                {columns.map((col, idx) => (
                  <th
                    key={idx}
                    className={`px-6 py-4 font-bold ${col.className || ""}`}
                  >
                    {col.header}
                  </th>
                ))}
                {(onEdit || onDelete) && (
                  <th className="px-6 py-4 text-right">Aksi</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {paginatedData.length === 0 ? (
                <tr>
                  <td
                    colSpan={
                      columns.length + (onBulkDelete ? 2 : onEdit ? 1 : 0)
                    }
                    className="px-6 py-8 text-center text-slate-400"
                  >
                    Tidak ada data ditemukan.
                  </td>
                </tr>
              ) : (
                paginatedData.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-slate-50 dark:hover:bg-slate-700/50"
                  >
                    {onBulkDelete && (
                      <td className="px-6 py-4">
                        <input
                          type="checkbox"
                          checked={selected.includes(item.id)}
                          onChange={() => handleSelectOne(item.id)}
                          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                      </td>
                    )}
                    {columns.map((col, idx) => (
                      <td
                        key={idx}
                        className={`px-6 py-4 ${col.className || ""}`}
                      >
                        {typeof col.accessor === "function"
                          ? col.accessor(item)
                          : (item[col.accessor] as React.ReactNode)}
                      </td>
                    ))}
                    {(onEdit || onDelete) && (
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          {onEdit && (
                            <button
                              type="button"
                              aria-label="Edit data"
                              onClick={() => onEdit(item)}
                              className="rounded p-1.5 text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                          )}
                          {onDelete && (
                            <button
                              type="button"
                              aria-label="Hapus data"
                              onClick={() => {
                                if (confirm("Yakin hapus data ini?"))
                                  onDelete(item.id);
                              }}
                              className="rounded p-1.5 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="text-xs text-slate-500">
          Halaman {filteredData.length === 0 ? 0 : page} dari {totalPages}{" "}
          (Total {filteredData.length} Data)
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            aria-label="Halaman sebelumnya"
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1}
            className="rounded-lg border border-slate-200 px-3 py-1.5 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:hover:bg-slate-800"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label="Halaman berikutnya"
            onClick={() => setPage(Math.min(totalPages, page + 1))}
            disabled={page === totalPages || totalPages === 0}
            className="rounded-lg border border-slate-200 px-3 py-1.5 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:hover:bg-slate-800"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

interface ConfigField {
  key: string;
  label: string;
  type: "text" | "textarea" | "url" | "number" | "json";
  placeholder?: string;
}

const CONFIG_SECTIONS: { title: string; fields: ConfigField[] }[] = [
  {
    title: "Mempelai Wanita",
    fields: [
      { key: "BRIDE_NICKNAME", label: "Nama Panggilan", type: "text" },
      { key: "BRIDE_FULLNAME", label: "Nama Lengkap", type: "text" },
      { key: "BRIDE_PARENTS", label: "Nama Orang Tua", type: "text" },
      { key: "BRIDE_INSTAGRAM", label: "Instagram (tanpa @)", type: "text" },
      { key: "BRIDE_IMAGE", label: "URL Foto", type: "url" },
    ],
  },
  {
    title: "Mempelai Pria",
    fields: [
      { key: "GROOM_NICKNAME", label: "Nama Panggilan", type: "text" },
      { key: "GROOM_FULLNAME", label: "Nama Lengkap", type: "text" },
      { key: "GROOM_PARENTS", label: "Nama Orang Tua", type: "text" },
      { key: "GROOM_INSTAGRAM", label: "Instagram (tanpa @)", type: "text" },
      { key: "GROOM_IMAGE", label: "URL Foto", type: "url" },
    ],
  },
  {
    title: "Venue",
    fields: [
      { key: "VENUE_NAME", label: "Nama Gedung", type: "text" },
      { key: "VENUE_ADDRESS", label: "Alamat Lengkap", type: "textarea" },
      {
        key: "VENUE_LAT",
        label: "Latitude",
        type: "text",
        placeholder: "-6.3032707",
      },
      {
        key: "VENUE_LNG",
        label: "Longitude",
        type: "text",
        placeholder: "106.1011039",
      },
    ],
  },
  {
    title: "Akad Nikah",
    fields: [
      { key: "AKAD_TITLE", label: "Judul", type: "text" },
      { key: "AKAD_DAY", label: "Hari", type: "text", placeholder: "Minggu" },
      {
        key: "AKAD_DATE",
        label: "Tanggal",
        type: "text",
        placeholder: "11 Oktober 2025",
      },
      {
        key: "AKAD_START",
        label: "Jam Mulai",
        type: "text",
        placeholder: "08:00",
      },
      {
        key: "AKAD_END",
        label: "Jam Selesai",
        type: "text",
        placeholder: "10:00",
      },
      {
        key: "AKAD_ISO_START",
        label: "ISO Start",
        type: "text",
        placeholder: "2025-10-11T08:00:00+07:00",
      },
      {
        key: "AKAD_ISO_END",
        label: "ISO End",
        type: "text",
        placeholder: "2025-10-11T10:00:00+07:00",
      },
    ],
  },
  {
    title: "Resepsi",
    fields: [
      { key: "RESEPSI_TITLE", label: "Judul", type: "text" },
      {
        key: "RESEPSI_DAY",
        label: "Hari",
        type: "text",
        placeholder: "Minggu",
      },
      {
        key: "RESEPSI_DATE",
        label: "Tanggal",
        type: "text",
        placeholder: "11 Oktober 2025",
      },
      {
        key: "RESEPSI_START",
        label: "Jam Mulai",
        type: "text",
        placeholder: "11:00",
      },
      {
        key: "RESEPSI_END",
        label: "Jam Selesai",
        type: "text",
        placeholder: "14:00",
      },
      {
        key: "RESEPSI_ISO_START",
        label: "ISO Start",
        type: "text",
        placeholder: "2025-10-11T11:00:00+07:00",
      },
      {
        key: "RESEPSI_ISO_END",
        label: "ISO End",
        type: "text",
        placeholder: "2025-10-11T14:00:00+07:00",
      },
    ],
  },
  {
    title: "Hero & Media",
    fields: [
      { key: "HERO_IMAGE", label: "URL Gambar Hero", type: "url" },
      {
        key: "ENVELOPE_IMAGE",
        label: "URL Gambar Amplop (Opsional)",
        type: "url",
        placeholder: "Kosongkan untuk mengikuti gambar Hero",
      },
      {
        key: "HERO_CITY",
        label: "Kota",
        type: "text",
        placeholder: "Kab. Pandeglang, Banten",
      },
      {
        key: "EVENT_TIMEZONE",
        label: "Zona Waktu",
        type: "text",
        placeholder: "WIB / WITA / WIT",
      },
      { key: "MUSIC_URL", label: "URL Musik (MP3)", type: "url" },
      {
        key: "RSVP_MAX_GUESTS",
        label: "Maks Tamu per RSVP",
        type: "number",
        placeholder: "20",
      },
    ],
  },
  {
    title: "Teks & Konten",
    fields: [
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
    ],
  },
];

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

const SettingsTab: React.FC = () => {
  const [rawConfig, setRawConfig] = useState<Record<string, string>>({});
  const [bankAccounts, setBankAccounts] = useState<BankAccountItem[]>([]);
  const [loveStory, setLoveStory] = useState<LoveStoryItem[]>([]);
  const [galleryImages, setGalleryImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [showWaSecret, setShowWaSecret] = useState(false);
  const [waActionLoading, setWaActionLoading] = useState<
    "ping" | "sync" | "test" | null
  >(null);
  const [waFeedback, setWaFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

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
    setSaveError(null);
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
        setSaved(true);
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

  return (
    <div className="space-y-8">
      {saveError && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-600 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-400"
        >
          {saveError}
        </div>
      )}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Perubahan akan langsung diterapkan setelah disimpan.
        </p>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className={`flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-bold text-white shadow-lg transition-all disabled:opacity-50 ${
            saved
              ? "bg-green-500"
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

      {CONFIG_SECTIONS.map((section) => (
        <div
          key={section.title}
          className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800"
        >
          <h3 className="mb-6 font-serif text-lg font-bold text-slate-800 italic dark:text-white">
            {section.title}
          </h3>
          <div className="grid gap-4 md:grid-cols-2">
            {section.fields.map((field) => {
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
                      value={rawConfig[field.key] ?? ""}
                      onChange={(e) => handleChange(field.key, e.target.value)}
                      placeholder={field.placeholder}
                      rows={3}
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm transition-all outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                    />
                  ) : (
                    <input
                      id={fieldId}
                      type={
                        field.type === "number"
                          ? "number"
                          : field.type === "url"
                            ? "url"
                            : "text"
                      }
                      value={rawConfig[field.key] ?? ""}
                      onChange={(e) => handleChange(field.key, e.target.value)}
                      placeholder={field.placeholder}
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm transition-all outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* WhatsApp Gateway (whatsapp.zedlabs.id) */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800">
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
                aria-label={showWaSecret ? "Sembunyikan secret" : "Tampilkan secret"}
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
            <label
              htmlFor="cfg-WA_ADMIN_NUMBERS"
              className="mb-1.5 block text-xs font-bold tracking-wider text-slate-500 uppercase dark:text-slate-400"
            >
              Nomor WA Admin / Mempelai (pisah koma)
            </label>
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
      <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800">
        <div className="mb-6 flex items-center justify-between gap-4">
          <h3 className="font-serif text-lg font-bold text-slate-800 italic dark:text-white">
            Rekening Bank (Amplop Digital)
          </h3>
          <button
            type="button"
            onClick={() =>
              setBankAccounts((prev) => [
                ...prev,
                { bank: "", number: "", name: "" },
              ])
            }
            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white hover:bg-slate-800 dark:bg-blue-600 dark:hover:bg-blue-700"
          >
            <Plus className="h-3.5 w-3.5" /> Tambah Rekening
          </button>
        </div>
        <div className="space-y-4">
          {bankAccounts.length === 0 ? (
            <p className="text-sm text-slate-400 italic">
              Belum ada rekening bank. Klik &quot;Tambah Rekening&quot; untuk
              menambahkan.
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
                    value={acc.bank}
                    placeholder="Bank BCA"
                    onChange={(e) =>
                      setBankAccounts((prev) =>
                        prev.map((item, i) =>
                          i === idx ? { ...item, bank: e.target.value } : item
                        )
                      )
                    }
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
                <div className="md:col-span-3">
                  <label className="mb-1 block text-xs font-bold text-slate-500 uppercase">
                    Nomor Rekening
                  </label>
                  <input
                    type="text"
                    value={acc.number}
                    placeholder="1234567890"
                    onChange={(e) =>
                      setBankAccounts((prev) =>
                        prev.map((item, i) =>
                          i === idx ? { ...item, number: e.target.value } : item
                        )
                      )
                    }
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
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
                    onChange={(e) =>
                      setBankAccounts((prev) =>
                        prev.map((item, i) =>
                          i === idx ? { ...item, name: e.target.value } : item
                        )
                      )
                    }
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
                <div className="flex justify-end md:col-span-1">
                  <button
                    type="button"
                    aria-label={`Hapus rekening ${idx + 1}`}
                    onClick={() =>
                      setBankAccounts((prev) =>
                        prev.filter((_, i) => i !== idx)
                      )
                    }
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
      <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800">
        <div className="mb-6 flex items-center justify-between gap-4">
          <h3 className="font-serif text-lg font-bold text-slate-800 italic dark:text-white">
            Kisah Cinta
          </h3>
          <button
            type="button"
            onClick={() =>
              setLoveStory((prev) => [...prev, { date: "", title: "", desc: "" }])
            }
            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white hover:bg-slate-800 dark:bg-blue-600 dark:hover:bg-blue-700"
          >
            <Plus className="h-3.5 w-3.5" /> Tambah Momen
          </button>
        </div>
        <div className="space-y-4">
          {loveStory.length === 0 ? (
            <p className="text-sm text-slate-400 italic">
              Belum ada kisah cinta. Klik &quot;Tambah Momen&quot; untuk
              menambahkan.
            </p>
          ) : (
            loveStory.map((story, idx) => (
              <div
                key={idx}
                className="space-y-3 rounded-xl border border-slate-100 bg-slate-50/70 p-4 dark:border-slate-700 dark:bg-slate-900/50"
              >
                <div className="grid items-end gap-3 md:grid-cols-10">
                  <div className="md:col-span-3">
                    <label className="mb-1 block text-xs font-bold text-slate-500 uppercase">
                      Tahun / Waktu
                    </label>
                    <input
                      type="text"
                      value={story.date}
                      placeholder="2020"
                      onChange={(e) =>
                        setLoveStory((prev) =>
                          prev.map((item, i) =>
                            i === idx ? { ...item, date: e.target.value } : item
                          )
                        )
                      }
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
                      onChange={(e) =>
                        setLoveStory((prev) =>
                          prev.map((item, i) =>
                            i === idx
                              ? { ...item, title: e.target.value }
                              : item
                          )
                        )
                      }
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                  </div>
                  <div className="flex justify-end md:col-span-1">
                    <button
                      type="button"
                      aria-label={`Hapus momen ${idx + 1}`}
                      onClick={() =>
                        setLoveStory((prev) => prev.filter((_, i) => i !== idx))
                      }
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
                    onChange={(e) =>
                      setLoveStory((prev) =>
                        prev.map((item, i) =>
                          i === idx ? { ...item, desc: e.target.value } : item
                        )
                      )
                    }
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Galeri Foto Editor */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800">
        <div className="mb-6 flex items-center justify-between gap-4">
          <h3 className="font-serif text-lg font-bold text-slate-800 italic dark:text-white">
            Galeri Foto
          </h3>
          <button
            type="button"
            onClick={() => setGalleryImages((prev) => [...prev, ""])}
            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white hover:bg-slate-800 dark:bg-blue-600 dark:hover:bg-blue-700"
          >
            <Plus className="h-3.5 w-3.5" /> Tambah Foto
          </button>
        </div>
        <div className="space-y-3">
          {galleryImages.length === 0 ? (
            <p className="text-sm text-slate-400 italic">
              Belum ada foto galeri. Klik &quot;Tambah Foto&quot; untuk
              menambahkan URL gambar.
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
                  onChange={(e) =>
                    setGalleryImages((prev) =>
                      prev.map((item, i) => (i === idx ? e.target.value : item))
                    )
                  }
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
                <button
                  type="button"
                  aria-label={`Hapus foto ${idx + 1}`}
                  onClick={() =>
                    setGalleryImages((prev) => prev.filter((_, i) => i !== idx))
                  }
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
              ? "bg-green-500"
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

const AdminDashboard = ({
  initialRsvps,
  initialWishes,
  siteUrl,
}: {
  initialRsvps: RSVP[];
  initialWishes: Wish[];
  siteUrl: string;
}) => {
  const [activeTab, setActiveTab] = useState<
    "rsvp" | "wishes" | "wa" | "qr" | "pdf" | "settings"
  >("rsvp");
  const [rsvps, setRsvps] = useState(initialRsvps);
  const [wishes, setWishes] = useState(initialWishes);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const stats = useMemo(() => {
    const hadirItems = rsvps.filter((r) => r.attendance === "hadir");
    return {
      total: rsvps.length,
      hadir: hadirItems.length,
      ragu: rsvps.filter((r) => r.attendance === "ragu").length,
      tidak: rsvps.filter((r) => r.attendance === "tidak_hadir").length,
      guestCount: hadirItems.reduce(
        (sum, r) => sum + (Number(r.guest_count) || 1),
        0
      ),
    };
  }, [rsvps]);

  useEffect(() => {
    if (!isModalOpen) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsModalOpen(false);
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [isModalOpen]);

  const handleDelete = async (type: "rsvp" | "wish", ids: number[]) => {
    if (ids.length === 0) return;
    setIsDeleting(true);
    try {
      const actionKey = type === "rsvp" ? "delete_rsvp" : "delete_wish";
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: actionKey, ids }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        if (type === "rsvp")
          setRsvps((prev) => prev.filter((i) => !ids.includes(i.id)));
        if (type === "wish")
          setWishes((prev) => prev.filter((i) => !ids.includes(i.id)));
      } else {
        alert("Gagal menghapus: " + (json.error || "Unknown Error"));
      }
    } catch {
      alert("Error Network.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleUpdate = async (type: "rsvp" | "wish", id: number, data: any) => {
    setIsSaving(true);
    try {
      const payloadData =
        type === "rsvp"
          ? {
              ...data,
              guest_count:
                data.attendance === "hadir"
                  ? Math.max(1, Number(data.guest_count) || 1)
                  : 0,
            }
          : data;

      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: type === "rsvp" ? "update_rsvp" : "update_wish",
          id,
          data: payloadData,
        }),
      });
      if (res.ok) {
        if (type === "rsvp") {
          setRsvps((prev) =>
            prev.map((item) =>
              item.id === id ? { ...item, ...payloadData } : item
            )
          );
        } else {
          setWishes((prev) =>
            prev.map((item) =>
              item.id === id ? { ...item, ...payloadData } : item
            )
          );
        }
        setIsModalOpen(false);
      } else {
        let msg = "Gagal update data.";
        try {
          const errJson = await res.json();
          if (errJson?.error) msg = errJson.error;
        } catch {
          // ignore
        }
        alert(msg);
      }
    } catch {
      alert("Error Network.");
    } finally {
      setIsSaving(false);
    }
  };

  const tabs = [
    { id: "rsvp", label: "Data RSVP", icon: Users },
    { id: "wishes", label: "Ucapan & Doa", icon: MessageCircle },
    { id: "wa", label: "Kirim WhatsApp", icon: MessageSquare },
    { id: "qr", label: "QR Generator", icon: QrCode },
    { id: "pdf", label: "Design PDF", icon: Printer },
    { id: "settings", label: "Pengaturan", icon: Settings },
  ];

  return (
    <div>
      <div className="mb-10 grid grid-cols-2 gap-4 md:grid-cols-4 lg:gap-6">
        <div className="rounded-2xl bg-white p-6 shadow-sm dark:bg-slate-800">
          <div className="flex items-center gap-3 text-slate-400">
            <Users className="h-5 w-5" />
            <span className="text-xs font-bold uppercase">Total Respon</span>
          </div>
          <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">
            {stats.total}
          </p>
        </div>
        <div className="rounded-2xl bg-white p-6 shadow-sm dark:bg-slate-800">
          <div className="flex items-center gap-3 text-green-500">
            <CheckCircle2 className="h-5 w-5" />
            <span className="text-xs font-bold uppercase">Hadir</span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-900 dark:text-white">
              {stats.hadir}
            </span>
            <span className="text-lg font-medium text-slate-400">
              ({stats.guestCount} Pax)
            </span>
          </div>
        </div>
        <div className="rounded-2xl bg-white p-6 shadow-sm dark:bg-slate-800">
          <div className="flex items-center gap-3 text-yellow-500">
            <HelpCircle className="h-5 w-5" />
            <span className="text-xs font-bold uppercase">Ragu</span>
          </div>
          <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">
            {stats.ragu}
          </p>
        </div>
        <div className="rounded-2xl bg-white p-6 shadow-sm dark:bg-slate-800">
          <div className="flex items-center gap-3 text-red-500">
            <XCircle className="h-5 w-5" />
            <span className="text-xs font-bold uppercase">Tidak Hadir</span>
          </div>
          <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">
            {stats.tidak}
          </p>
        </div>
      </div>
      {isDeleting && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="flex items-center gap-4 rounded-xl bg-white p-6 shadow-2xl">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <span className="text-lg font-bold text-slate-700">
              Menghapus Data...
            </span>
          </div>
        </div>
      )}

      <div className="mb-8 flex gap-2 overflow-x-auto border-b border-slate-200 pb-1 dark:border-slate-700">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 border-b-2 px-6 py-3 text-sm font-bold whitespace-nowrap transition-colors ${
              activeTab === tab.id
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "rsvp" && (
        <div className="animate-reveal space-y-6">
          <div className="flex justify-end">
            <a
              href="/api/export-rsvp"
              target="_blank"
              className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-green-700"
            >
              <Download className="h-4 w-4" /> EXPORT CSV
            </a>
          </div>
          <DataTable
            data={rsvps}
            columns={[
              {
                header: "Nama Tamu",
                accessor: "guest_name",
                className: "font-medium",
              },
              {
                header: "Kontak",
                accessor: (item) => (
                  <span className="text-slate-500 dark:text-slate-400">
                    {item.phone || "-"}
                  </span>
                ),
              },
              {
                header: "Status",
                accessor: (item) => (
                  <span
                    className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase ${
                      item.attendance === "hadir"
                        ? "bg-green-100 text-green-700"
                        : item.attendance === "tidak_hadir"
                          ? "bg-red-100 text-red-700"
                          : "bg-slate-100 text-slate-700"
                    }`}
                  >
                    {item.attendance.replace("_", " ")}
                  </span>
                ),
              },
              { header: "Pax", accessor: "guest_count" },
              {
                header: "Pesan",
                accessor: (item) => (
                  <span className="block max-w-[200px] truncate text-slate-500">
                    {item.message}
                  </span>
                ),
              },
              {
                header: "Waktu",
                accessor: (item) =>
                  new Date(item.created_at).toLocaleDateString("id-ID"),
              },
            ]}
            onEdit={(item) => {
              setEditingItem(item);
              setIsModalOpen(true);
            }}
            onDelete={(id) => handleDelete("rsvp", [id])}
            onBulkDelete={(ids) => handleDelete("rsvp", ids)}
          />
        </div>
      )}

      {activeTab === "wishes" && (
        <div className="animate-reveal space-y-6">
          <div className="flex justify-end">
            <a
              href="/api/export-wishes"
              target="_blank"
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-blue-700"
            >
              <Download className="h-4 w-4" /> EXPORT CSV
            </a>
          </div>
          <DataTable
            data={wishes}
            columns={[
              {
                header: "Nama Pengirim",
                accessor: "name",
                className: "font-medium",
              },
              {
                header: "Ucapan",
                accessor: (item) => (
                  <span className="block max-w-[300px] text-wrap text-slate-500 italic">
                    "{item.message}"
                  </span>
                ),
              },
              {
                header: "Waktu",
                accessor: (item) =>
                  new Date(item.created_at).toLocaleDateString("id-ID"),
              },
            ]}
            onEdit={(item) => {
              setEditingItem(item);
              setIsModalOpen(true);
            }}
            onDelete={(id) => handleDelete("wish", [id])}
            onBulkDelete={(ids) => handleDelete("wish", ids)}
          />
        </div>
      )}

      {activeTab === "wa" && (
        <div className="animate-reveal rounded-3xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <Suspense
            fallback={
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
              </div>
            }
          >
            <WhatsAppManager siteUrl={siteUrl} />
          </Suspense>
        </div>
      )}

      {activeTab === "qr" && (
        <div className="animate-reveal rounded-3xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <Suspense
            fallback={
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
              </div>
            }
          >
            <QRCodeManager siteUrl={siteUrl} />
          </Suspense>
        </div>
      )}

      {activeTab === "pdf" && (
        <div className="animate-reveal rounded-3xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <Suspense
            fallback={
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
              </div>
            }
          >
            <InvitationManager siteUrl={siteUrl} />
          </Suspense>
        </div>
      )}

      {activeTab === "settings" && (
        <div className="animate-reveal">
          <SettingsTab />
        </div>
      )}

      {isModalOpen && editingItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsModalOpen(false);
          }}
        >
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-800">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold dark:text-white">Edit Data</h3>
              <button
                type="button"
                aria-label="Tutup modal"
                onClick={() => setIsModalOpen(false)}
              >
                <X className="h-5 w-5 text-slate-400" />
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const data = Object.fromEntries(formData.entries());
                handleUpdate(
                  activeTab === "rsvp" ? "rsvp" : "wish",
                  editingItem.id,
                  data
                );
              }}
              className="space-y-4"
            >
              {activeTab === "rsvp" ? (
                <>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">
                      Nama Tamu
                    </label>
                    <input
                      name="guest_name"
                      defaultValue={editingItem.guest_name}
                      className="w-full rounded-lg border p-2 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">
                      No. HP / WhatsApp
                    </label>
                    <input
                      name="phone"
                      defaultValue={editingItem.phone || ""}
                      placeholder="08xxxxxxxxxx"
                      className="w-full rounded-lg border p-2 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase">
                        Status
                      </label>
                      <select
                        name="attendance"
                        defaultValue={editingItem.attendance}
                        className="w-full rounded-lg border p-2 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                      >
                        <option value="hadir">Hadir</option>
                        <option value="ragu">Ragu</option>
                        <option value="tidak_hadir">Tidak Hadir</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase">
                        Pax
                      </label>
                      <input
                        type="number"
                        name="guest_count"
                        defaultValue={editingItem.guest_count}
                        min={1}
                        className="w-full rounded-lg border p-2 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">
                      Pesan
                    </label>
                    <textarea
                      name="message"
                      defaultValue={editingItem.message}
                      className="w-full rounded-lg border p-2 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                      rows={3}
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">
                      Nama Pengirim
                    </label>
                    <input
                      name="name"
                      defaultValue={editingItem.name}
                      className="w-full rounded-lg border p-2 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">
                      Ucapan
                    </label>
                    <textarea
                      name="message"
                      defaultValue={editingItem.message}
                      className="w-full rounded-lg border p-2 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                      rows={5}
                      required
                    />
                  </div>
                </>
              )}
              <div className="mt-6 flex justify-end gap-3 border-t border-slate-100 pt-4 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-lg px-4 py-2 text-sm font-bold text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-2 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {isSaving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
