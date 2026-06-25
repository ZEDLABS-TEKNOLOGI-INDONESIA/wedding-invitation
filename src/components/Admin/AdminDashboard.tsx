import {
  ChevronLeft,
  ChevronRight,
  Download,
  Edit,
  Loader2,
  MessageCircle,
  Printer,
  QrCode,
  Save,
  Search,
  Settings,
  Trash2,
  Users,
  X,
} from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";
import { invalidateConfigCache } from "../../hooks/useConfig";
import InvitationManager from "../InvitationManager";
import QRCodeManager from "../QRCodeManager";

interface RSVP {
  id: number;
  guest_name: string;
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
                              onClick={() => onEdit(item)}
                              className="rounded p-1.5 text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                          )}
                          {onDelete && (
                            <button
                              type="button"
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
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1}
            className="rounded-lg border border-slate-200 px-3 py-1.5 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:hover:bg-slate-800"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
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
        key: "HERO_CITY",
        label: "Kota",
        type: "text",
        placeholder: "Kab. Pandeglang, Banten",
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
    ],
  },
  {
    title: "Rekening Bank",
    fields: [
      {
        key: "BANK_ACCOUNTS",
        label: 'JSON Array [{"bank":"...","number":"...","name":"..."}]',
        type: "json",
      },
    ],
  },
  {
    title: "Kisah Cinta",
    fields: [
      {
        key: "LOVE_STORY",
        label: 'JSON Array [{"date":"...","title":"...","desc":"..."}]',
        type: "json",
      },
    ],
  },
  {
    title: "Galeri",
    fields: [
      {
        key: "GALLERY_IMAGES",
        label: 'JSON Array ["url1","url2",...]',
        type: "json",
      },
    ],
  },
  {
    title: "Notifikasi Telegram",
    fields: [
      {
        key: "TELEGRAM_BOT_TOKEN",
        label: "Bot Token",
        type: "text",
        placeholder: "123456:ABC...",
      },
      {
        key: "TELEGRAM_CHAT_ID",
        label: "Chat ID",
        type: "text",
        placeholder: "7671009829",
      },
    ],
  },
];

const SettingsTab: React.FC = () => {
  const [rawConfig, setRawConfig] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [jsonErrors, setJsonErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    fetch("/api/config/full", { credentials: "include" })
      .then((r) => r.json())
      .then((full) => {
        setRawConfig(full);
        setLoading(false);
      })
      .catch(() => {
        fetch("/api/config", { credentials: "include" })
          .then((r) => r.json())
          .then((data) => {
            setRawConfig(data);
            setLoading(false);
          });
      });
  }, []);

  const handleChange = (key: string, value: string) => {
    setRawConfig((prev) => ({ ...prev, [key]: value }));
    if (jsonErrors[key]) {
      setJsonErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  };

  const validateJson = (key: string, value: string): boolean => {
    try {
      JSON.parse(value);
      return true;
    } catch {
      setJsonErrors((prev) => ({ ...prev, [key]: "JSON tidak valid" }));
      return false;
    }
  };

  const handleSave = async () => {
    const jsonFields = ["BANK_ACCOUNTS", "LOVE_STORY", "GALLERY_IMAGES"];
    let hasError = false;
    for (const key of jsonFields) {
      if (rawConfig[key] && !validateJson(key, rawConfig[key])) {
        hasError = true;
      }
    }
    if (hasError) return;

    setSaving(true);
    try {
      const res = await fetch("/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(rawConfig),
      });
      if (res.ok) {
        invalidateConfigCache();
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
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

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Perubahan akan langsung diterapkan setelah disimpan.
        </p>
        <button
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
            {section.fields.map((field) => (
              <div
                key={field.key}
                className={
                  field.type === "textarea" || field.type === "json"
                    ? "md:col-span-2"
                    : ""
                }
              >
                <label className="mb-1.5 block text-[11px] font-bold tracking-widest text-slate-400 uppercase dark:text-slate-500">
                  {field.label}
                </label>
                {field.type === "textarea" || field.type === "json" ? (
                  <textarea
                    value={rawConfig[field.key] ?? ""}
                    onChange={(e) => handleChange(field.key, e.target.value)}
                    placeholder={field.placeholder}
                    rows={field.type === "json" ? 5 : 3}
                    className={`w-full rounded-lg border bg-slate-50 px-4 py-3 font-mono text-sm transition-all outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-900 dark:text-white ${
                      jsonErrors[field.key]
                        ? "border-red-400 dark:border-red-500"
                        : "border-slate-200 dark:border-slate-700"
                    }`}
                  />
                ) : (
                  <input
                    type={field.type === "number" ? "number" : "text"}
                    value={rawConfig[field.key] ?? ""}
                    onChange={(e) => handleChange(field.key, e.target.value)}
                    placeholder={field.placeholder}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm transition-all outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  />
                )}
                {jsonErrors[field.key] && (
                  <p className="mt-1 text-xs text-red-500">
                    {jsonErrors[field.key]}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      <div className="flex justify-end pb-8">
        <button
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
    "rsvp" | "wishes" | "qr" | "pdf" | "settings"
  >("rsvp");
  const [rsvps, setRsvps] = useState(initialRsvps);
  const [wishes, setWishes] = useState(initialWishes);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

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
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: type === "rsvp" ? "update_rsvp" : "update_wish",
          id,
          data,
        }),
      });
      if (res.ok) {
        if (type === "rsvp") {
          setRsvps((prev) =>
            prev.map((item) => (item.id === id ? { ...item, ...data } : item))
          );
        } else {
          setWishes((prev) =>
            prev.map((item) => (item.id === id ? { ...item, ...data } : item))
          );
        }
        setIsModalOpen(false);
      } else {
        alert("Gagal update data.");
      }
    } finally {
      setIsSaving(false);
    }
  };

  const tabs = [
    { id: "rsvp", label: "Data RSVP", icon: Users },
    { id: "wishes", label: "Ucapan & Doa", icon: MessageCircle },
    { id: "qr", label: "QR Generator", icon: QrCode },
    { id: "pdf", label: "Design PDF", icon: Printer },
    { id: "settings", label: "Pengaturan", icon: Settings },
  ];

  return (
    <div>
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

      {activeTab === "qr" && (
        <div className="animate-reveal rounded-3xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <QRCodeManager siteUrl={siteUrl} />
        </div>
      )}

      {activeTab === "pdf" && (
        <div className="animate-reveal rounded-3xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <InvitationManager siteUrl={siteUrl} />
        </div>
      )}

      {activeTab === "settings" && (
        <div className="animate-reveal">
          <SettingsTab />
        </div>
      )}

      {isModalOpen && editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-800">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold dark:text-white">Edit Data</h3>
              <button onClick={() => setIsModalOpen(false)}>
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
