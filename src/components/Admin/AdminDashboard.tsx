import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  Edit,
  HelpCircle,
  Loader2,
  MessageCircle,
  MessageSquare,
  Minus,
  Plus,
  Printer,
  QrCode,
  Save,
  Search,
  Settings,
  Trash2,
  Upload,
  UserCheck,
  Users,
  X,
  XCircle,
} from "lucide-react";
import React, { Suspense, lazy, useEffect, useMemo, useState } from "react";
import {
  parseRsvpsText,
  parseWishesText,
  type ParsedRsvpRow,
  type ParsedWishRow,
} from "../../utils/csvImport";
import {
  ConfirmModal,
  ToastBanner,
  type ConfirmDialogState,
  type ToastState,
} from "./AdminFeedback";
import CsvImportModal from "./CsvImportModal";
import SettingsTab from "./SettingsTab";

const GuestManager = lazy(() => import("../GuestManager"));
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
  onRequestConfirm,
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
  onRequestConfirm?: (dialog: ConfirmDialogState) => void;
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
      const idsToDelete = [...selected];
      const runDelete = () => {
        onBulkDelete(idsToDelete);
        setSelected([]);
      };
      if (onRequestConfirm) {
        onRequestConfirm({
          title: "Hapus Data Terpilih",
          message: `Yakin ingin menghapus ${idsToDelete.length} data yang dipilih?`,
          confirmLabel: "Hapus Semua",
          destructive: true,
          onConfirm: runDelete,
        });
      } else {
        runDelete();
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
                                if (onRequestConfirm) {
                                  onRequestConfirm({
                                    title: "Hapus Data",
                                    message: "Yakin ingin menghapus data ini?",
                                    confirmLabel: "Hapus",
                                    destructive: true,
                                    onConfirm: () => onDelete(item.id),
                                  });
                                } else {
                                  onDelete(item.id);
                                }
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

interface RsvpFormDraft {
  id?: number;
  guest_name: string;
  phone: string;
  attendance: "hadir" | "tidak_hadir" | "ragu";
  guest_count: number;
  message: string;
}

interface WishFormDraft {
  id?: number;
  name: string;
  message: string;
}

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
    "rsvp" | "wishes" | "guests" | "wa" | "qr" | "pdf" | "settings"
  >("rsvp");
  const [rsvps, setRsvps] = useState(initialRsvps);
  const [wishes, setWishes] = useState(initialWishes);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [rsvpModal, setRsvpModal] = useState<RsvpFormDraft | null>(null);
  const [wishModal, setWishModal] = useState<WishFormDraft | null>(null);
  const [csvImportTab, setCsvImportTab] = useState<"rsvp" | "wish" | null>(
    null
  );
  const [toast, setToast] = useState<ToastState | null>(null);
  const [confirmDialog, setConfirmDialog] =
    useState<ConfirmDialogState | null>(null);

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
    if (!rsvpModal && !wishModal) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setRsvpModal(null);
        setWishModal(null);
      }
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [rsvpModal, wishModal]);

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
        setToast({
          type: "success",
          message: `${ids.length} data berhasil dihapus.`,
        });
      } else {
        setToast({
          type: "error",
          message: "Gagal menghapus: " + (json.error || "Unknown Error"),
        });
      }
    } catch {
      setToast({ type: "error", message: "Gagal terhubung ke server." });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSaveRsvpModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rsvpModal || !rsvpModal.guest_name.trim()) return;
    setIsSaving(true);
    try {
      const payloadData = {
        guest_name: rsvpModal.guest_name.trim(),
        phone: rsvpModal.phone.trim(),
        attendance: rsvpModal.attendance,
        guest_count:
          rsvpModal.attendance === "hadir"
            ? Math.max(1, Number(rsvpModal.guest_count) || 1)
            : 0,
        message: rsvpModal.message.trim(),
      };

      const isEdit = Boolean(rsvpModal.id);
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          isEdit
            ? { action: "update_rsvp", id: rsvpModal.id, data: payloadData }
            : { action: "create_rsvp", data: payloadData }
        ),
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok) {
        if (isEdit && rsvpModal.id) {
          setRsvps((prev) =>
            prev.map((item) =>
              item.id === rsvpModal.id ? { ...item, ...payloadData } : item
            )
          );
          setToast({ type: "success", message: "Data RSVP diperbarui." });
        } else if (json.item) {
          setRsvps((prev) => [json.item, ...prev]);
          setToast({
            type: "success",
            message: `RSVP "${payloadData.guest_name}" berhasil ditambahkan.`,
          });
        }
        setRsvpModal(null);
      } else {
        setToast({
          type: "error",
          message: json?.error || "Gagal menyimpan RSVP.",
        });
      }
    } catch {
      setToast({ type: "error", message: "Gagal terhubung ke server." });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveWishModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wishModal || !wishModal.name.trim() || !wishModal.message.trim())
      return;
    setIsSaving(true);
    try {
      const payloadData = {
        name: wishModal.name.trim(),
        message: wishModal.message.trim(),
      };
      const isEdit = Boolean(wishModal.id);
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          isEdit
            ? { action: "update_wish", id: wishModal.id, data: payloadData }
            : { action: "create_wish", data: payloadData }
        ),
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok) {
        if (isEdit && wishModal.id) {
          setWishes((prev) =>
            prev.map((item) =>
              item.id === wishModal.id ? { ...item, ...payloadData } : item
            )
          );
          setToast({ type: "success", message: "Ucapan berhasil diperbarui." });
        } else if (json.item) {
          setWishes((prev) => [json.item, ...prev]);
          setToast({
            type: "success",
            message: `Ucapan dari "${payloadData.name}" berhasil ditambahkan.`,
          });
        }
        setWishModal(null);
      } else {
        setToast({
          type: "error",
          message: json?.error || "Gagal menyimpan ucapan.",
        });
      }
    } catch {
      setToast({ type: "error", message: "Gagal terhubung ke server." });
    } finally {
      setIsSaving(false);
    }
  };

  const handleImportRsvps = async (rows: ParsedRsvpRow[]) => {
    const res = await fetch("/api/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "import_rsvp", items: rows }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(json?.error || "Gagal mengimpor data RSVP.");
    }
    if (Array.isArray(json.items)) {
      setRsvps((prev) => [...json.items.reverse(), ...prev]);
    }
    setToast({
      type: "success",
      message: `${json.count || rows.length} data RSVP berhasil diimpor.`,
    });
  };

  const handleImportWishes = async (rows: ParsedWishRow[]) => {
    const res = await fetch("/api/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "import_wish", items: rows }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(json?.error || "Gagal mengimpor data ucapan.");
    }
    if (Array.isArray(json.items)) {
      setWishes((prev) => [...json.items.reverse(), ...prev]);
    }
    setToast({
      type: "success",
      message: `${json.count || rows.length} ucapan berhasil diimpor.`,
    });
  };

  const tabs = [
    { id: "rsvp", label: "Data RSVP", icon: Users },
    { id: "wishes", label: "Ucapan & Doa", icon: MessageCircle },
    { id: "guests", label: "Tamu & Check-In", icon: UserCheck },
    { id: "wa", label: "Kirim WhatsApp", icon: MessageSquare },
    { id: "qr", label: "QR Generator", icon: QrCode },
    { id: "pdf", label: "Design PDF", icon: Printer },
    { id: "settings", label: "Pengaturan", icon: Settings },
  ];

  return (
    <div>
      <ToastBanner toast={toast} onClose={() => setToast(null)} />
      <ConfirmModal
        dialog={confirmDialog}
        onClose={() => setConfirmDialog(null)}
      />

      <CsvImportModal<ParsedRsvpRow>
        isOpen={csvImportTab === "rsvp"}
        title="Import Data RSVP (CSV / Excel)"
        description="Upload file CSV atau tempel dari Excel. Status (Hadir/Ragu/Tidak Hadir) dinormalisasi otomatis."
        templateFilename="template_rsvp.csv"
        templateHeaders={["Nama Tamu", "No WhatsApp", "Status", "Pax", "Pesan"]}
        templateRows={[
          ["Bpk. Andi Pratama", "081234567890", "Hadir", 2, "InsyaAllah hadir"],
          ["Ibu Dewi", "089876543210", "Tidak Hadir", 0, "Maaf sedang di luar kota"],
          ["Raka Wijaya", "", "Ragu", 1, "Diupayakan hadir"],
        ]}
        pastePlaceholder={
          "Bpk. Andi Pratama,081234567890,Hadir,2,InsyaAllah hadir\nIbu Dewi,089876543210,Tidak Hadir,0,Maaf berhalangan"
        }
        parseText={parseRsvpsText}
        columns={[
          {
            header: "Nama Tamu",
            render: (r) => <span className="font-bold">{r.guest_name}</span>,
          },
          {
            header: "Kontak",
            render: (r) => <span className="font-mono">{r.phone || "-"}</span>,
          },
          {
            header: "Status",
            render: (r) => (
              <span className="uppercase">{r.attendance.replace("_", " ")}</span>
            ),
          },
          { header: "Pax", render: (r) => r.guest_count },
          {
            header: "Pesan",
            render: (r) => (
              <span className="block max-w-[180px] truncate">
                {r.message || "-"}
              </span>
            ),
          },
        ]}
        onConfirm={handleImportRsvps}
        onClose={() => setCsvImportTab(null)}
        confirmLabel="Simpan RSVP"
      />

      <CsvImportModal<ParsedWishRow>
        isOpen={csvImportTab === "wish"}
        title="Import Ucapan & Doa (CSV / Excel)"
        description="Upload file CSV atau salin-tempel daftar ucapan dari Excel/Google Sheets."
        templateFilename="template_ucapan.csv"
        templateHeaders={["Nama Pengirim", "Ucapan & Doa"]}
        templateRows={[
          [
            "Keluarga Besar H. Budi",
            "Semoga menjadi keluarga sakinah mawaddah warahmah!",
          ],
          ["Siti Rahma", "Selamat menempuh hidup baru, bahagia selalu."],
        ]}
        pastePlaceholder={
          "Keluarga Besar H. Budi,Semoga menjadi keluarga sakinah mawaddah warahmah!\nSiti Rahma,Selamat menempuh hidup baru."
        }
        parseText={parseWishesText}
        columns={[
          {
            header: "Nama Pengirim",
            render: (r) => <span className="font-bold">{r.name}</span>,
          },
          {
            header: "Ucapan & Doa",
            render: (r) => <span className="line-clamp-2">{r.message}</span>,
          },
        ]}
        onConfirm={handleImportWishes}
        onClose={() => setCsvImportTab(null)}
        confirmLabel="Simpan Ucapan"
      />

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
            type="button"
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
          <div className="flex flex-wrap justify-end gap-2">
            <button
              type="button"
              onClick={() =>
                setRsvpModal({
                  guest_name: "",
                  phone: "",
                  attendance: "hadir",
                  guest_count: 2,
                  message: "",
                })
              }
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" /> TAMBAH RSVP
            </button>
            <button
              type="button"
              onClick={() => setCsvImportTab("rsvp")}
              className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-slate-800 dark:bg-slate-700 dark:hover:bg-slate-600"
            >
              <Upload className="h-4 w-4" /> IMPORT CSV / EXCEL
            </button>
            <a
              href="/api/export-rsvp"
              target="_blank"
              className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-green-700"
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
            onEdit={(item) =>
              setRsvpModal({
                id: item.id,
                guest_name: item.guest_name,
                phone: item.phone || "",
                attendance: item.attendance,
                guest_count: item.guest_count || 1,
                message: item.message || "",
              })
            }
            onDelete={(id) => handleDelete("rsvp", [id])}
            onBulkDelete={(ids) => handleDelete("rsvp", ids)}
            onRequestConfirm={setConfirmDialog}
          />
        </div>
      )}

      {activeTab === "wishes" && (
        <div className="animate-reveal space-y-6">
          <div className="flex flex-wrap justify-end gap-2">
            <button
              type="button"
              onClick={() => setWishModal({ name: "", message: "" })}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" /> TAMBAH UCAPAN
            </button>
            <button
              type="button"
              onClick={() => setCsvImportTab("wish")}
              className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-slate-800 dark:bg-slate-700 dark:hover:bg-slate-600"
            >
              <Upload className="h-4 w-4" /> IMPORT CSV / EXCEL
            </button>
            <a
              href="/api/export-wishes"
              target="_blank"
              className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-green-700"
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
                    &quot;{item.message}&quot;
                  </span>
                ),
              },
              {
                header: "Waktu",
                accessor: (item) =>
                  new Date(item.created_at).toLocaleDateString("id-ID"),
              },
            ]}
            onEdit={(item) =>
              setWishModal({
                id: item.id,
                name: item.name,
                message: item.message,
              })
            }
            onDelete={(id) => handleDelete("wish", [id])}
            onBulkDelete={(ids) => handleDelete("wish", ids)}
            onRequestConfirm={setConfirmDialog}
          />
        </div>
      )}

      {activeTab === "guests" && (
        <div className="animate-reveal rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8 dark:border-slate-700 dark:bg-slate-800">
          <Suspense
            fallback={
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
              </div>
            }
          >
            <GuestManager siteUrl={siteUrl} />
          </Suspense>
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
          <SettingsTab onNotify={setToast} />
        </div>
      )}

      {/* Modal Tambah / Edit RSVP */}
      {rsvpModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) setRsvpModal(null);
          }}
        >
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-800">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold dark:text-white">
                {rsvpModal.id ? "Edit Data RSVP" : "Tambah Data RSVP Manual"}
              </h3>
              <button
                type="button"
                aria-label="Tutup modal RSVP"
                onClick={() => setRsvpModal(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSaveRsvpModal} className="space-y-4">
              <div className="space-y-1">
                <label
                  htmlFor="modal-rsvp-name"
                  className="text-xs font-bold text-slate-500 uppercase"
                >
                  Nama Tamu *
                </label>
                <input
                  id="modal-rsvp-name"
                  value={rsvpModal.guest_name}
                  onChange={(e) =>
                    setRsvpModal({ ...rsvpModal, guest_name: e.target.value })
                  }
                  placeholder="Contoh: Bpk. Ahmad & Ibu Siti"
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                  required
                />
              </div>
              <div className="space-y-1">
                <label
                  htmlFor="modal-rsvp-phone"
                  className="text-xs font-bold text-slate-500 uppercase"
                >
                  No. HP / WhatsApp (Opsional)
                </label>
                <input
                  id="modal-rsvp-phone"
                  type="tel"
                  inputMode="tel"
                  value={rsvpModal.phone}
                  onChange={(e) =>
                    setRsvpModal({ ...rsvpModal, phone: e.target.value })
                  }
                  placeholder="08xxxxxxxxxx"
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                />
              </div>

              <div className="space-y-1.5">
                <span className="block text-xs font-bold text-slate-500 uppercase">
                  Status Kehadiran
                </span>
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      ["hadir", "Hadir"],
                      ["ragu", "Ragu"],
                      ["tidak_hadir", "Tidak Hadir"],
                    ] as const
                  ).map(([val, label]) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() =>
                        setRsvpModal({
                          ...rsvpModal,
                          attendance: val,
                          guest_count:
                            val === "hadir"
                              ? Math.max(1, rsvpModal.guest_count)
                              : 0,
                        })
                      }
                      className={`rounded-xl border py-2.5 text-xs font-bold transition-all ${
                        rsvpModal.attendance === val
                          ? val === "hadir"
                            ? "border-green-600 bg-green-600 text-white"
                            : val === "tidak_hadir"
                              ? "border-red-600 bg-red-600 text-white"
                              : "border-amber-500 bg-amber-500 text-white"
                          : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-300"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {rsvpModal.attendance === "hadir" && (
                <div className="space-y-1.5">
                  <span className="block text-xs font-bold text-slate-500 uppercase">
                    Jumlah Tamu (Pax)
                  </span>
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="inline-flex items-center gap-1 rounded-xl border border-slate-200 p-1 dark:border-slate-600">
                      <button
                        type="button"
                        aria-label="Kurangi pax"
                        onClick={() =>
                          setRsvpModal({
                            ...rsvpModal,
                            guest_count: Math.max(1, rsvpModal.guest_count - 1),
                          })
                        }
                        className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <span className="w-14 text-center text-sm font-bold">
                        {rsvpModal.guest_count} Pax
                      </span>
                      <button
                        type="button"
                        aria-label="Tambah pax"
                        onClick={() =>
                          setRsvpModal({
                            ...rsvpModal,
                            guest_count: Math.min(
                              100,
                              rsvpModal.guest_count + 1
                            ),
                          })
                        }
                        className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    {[1, 2, 3, 4].map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() =>
                          setRsvpModal({ ...rsvpModal, guest_count: n })
                        }
                        className={`rounded-lg border px-3 py-1.5 text-xs font-bold ${
                          rsvpModal.guest_count === n
                            ? "border-blue-600 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                            : "border-slate-200 text-slate-500 hover:bg-slate-50 dark:border-slate-600"
                        }`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="modal-rsvp-msg"
                    className="text-xs font-bold text-slate-500 uppercase"
                  >
                    Pesan (Opsional)
                  </label>
                  <span className="text-[10px] text-slate-400">
                    {rsvpModal.message.length}/500
                  </span>
                </div>
                <textarea
                  id="modal-rsvp-msg"
                  maxLength={500}
                  value={rsvpModal.message}
                  onChange={(e) =>
                    setRsvpModal({ ...rsvpModal, message: e.target.value })
                  }
                  rows={3}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                />
              </div>

              <div className="mt-6 flex justify-end gap-3 border-t border-slate-100 pt-4 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setRsvpModal(null)}
                  className="rounded-xl px-4 py-2 text-sm font-bold text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-2 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50"
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

      {/* Modal Tambah / Edit Ucapan */}
      {wishModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) setWishModal(null);
          }}
        >
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-800">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold dark:text-white">
                {wishModal.id ? "Edit Ucapan & Doa" : "Tambah Ucapan Manual"}
              </h3>
              <button
                type="button"
                aria-label="Tutup modal ucapan"
                onClick={() => setWishModal(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSaveWishModal} className="space-y-4">
              <div className="space-y-1">
                <label
                  htmlFor="modal-wish-name"
                  className="text-xs font-bold text-slate-500 uppercase"
                >
                  Nama Pengirim *
                </label>
                <input
                  id="modal-wish-name"
                  maxLength={100}
                  value={wishModal.name}
                  onChange={(e) =>
                    setWishModal({ ...wishModal, name: e.target.value })
                  }
                  placeholder="Contoh: Keluarga Besar H. Budi"
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                  required
                />
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="modal-wish-msg"
                    className="text-xs font-bold text-slate-500 uppercase"
                  >
                    Ucapan & Doa *
                  </label>
                  <span className="text-[10px] text-slate-400">
                    {wishModal.message.length}/1000
                  </span>
                </div>
                <textarea
                  id="modal-wish-msg"
                  maxLength={1000}
                  value={wishModal.message}
                  onChange={(e) =>
                    setWishModal({ ...wishModal, message: e.target.value })
                  }
                  rows={5}
                  placeholder="Tuliskan ucapan & doa..."
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                  required
                />
              </div>
              <div className="mt-6 flex justify-end gap-3 border-t border-slate-100 pt-4 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setWishModal(null)}
                  className="rounded-xl px-4 py-2 text-sm font-bold text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-2 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50"
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
