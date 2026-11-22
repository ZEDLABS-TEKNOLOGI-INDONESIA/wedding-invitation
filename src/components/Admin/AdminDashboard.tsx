import {
  ChevronLeft,
  ChevronRight,
  Download,
  Edit,
  ExternalLink,
  Heart,
  Loader2,
  LogOut,
  Menu,
  MessageCircle,
  MessageSquare,
  Minus,
  Moon,
  Plus,
  Printer,
  QrCode,
  Save,
  Search,
  Settings,
  Sun,
  Trash2,
  Upload,
  UserCheck,
  Users,
  X,
} from "lucide-react";
import React, { Suspense, lazy, useEffect, useMemo, useRef, useState } from "react";
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

type AdminTabId =
  | "rsvp"
  | "wishes"
  | "guests"
  | "wa"
  | "qr"
  | "pdf"
  | "settings";

const TAB_META: Record<
  AdminTabId,
  { title: string; desc: string }
> = {
  rsvp: {
    title: "Data RSVP",
    desc: "Pantau konfirmasi kehadiran tamu, tambah manual, atau import dari CSV/Excel.",
  },
  wishes: {
    title: "Ucapan & Doa",
    desc: "Moderasi buku tamu, tambah ucapan manual, atau import/export CSV.",
  },
  guests: {
    title: "Tamu & Check-In",
    desc: "Kelola daftar tamu permanen, kode QR check-in, dan scanner kehadiran hari H.",
  },
  wa: {
    title: "Kirim WhatsApp",
    desc: "Kirim undangan personal otomatis lewat antrean WhatsApp Gateway.",
  },
  qr: {
    title: "QR Generator",
    desc: "Buat gambar QR Code undangan personal satuan maupun massal (ZIP).",
  },
  pdf: {
    title: "Design PDF",
    desc: "Cetak undangan floral 4 halaman A5 dengan QR Code personal dan peta.",
  },
  settings: {
    title: "Pengaturan Undangan",
    desc: "Ubah data mempelai, jadwal, lokasi peta, musik latar, galeri, dan WhatsApp Gateway.",
  },
};

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
    <div className="adm-card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-(--adm-border) px-4 py-2.5">
        <div className="flex items-center gap-2">
          <select
            aria-label="Jumlah data per halaman"
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPage(1);
            }}
            className="adm-input w-auto py-1 text-xs"
          >
            {[5, 10, 25, 50].map((size) => (
              <option key={size} value={size}>
                {size} baris
              </option>
            ))}
          </select>
          {onBulkDelete && selected.length > 0 && (
            <button
              type="button"
              onClick={executeBulkDelete}
              className="adm-btn adm-btn-danger h-7 px-2.5 text-xs"
            >
              <Trash2 className="h-3.5 w-3.5" /> Hapus ({selected.length})
            </button>
          )}
        </div>
        <div className="relative w-full sm:w-60">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-(--adm-text-muted)" />
          <input
            type="text"
            placeholder="Cari data..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="adm-input py-1 pl-8 text-xs"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-[13px]">
          <thead className="border-b border-(--adm-border) bg-(--adm-bg-primary) text-[11.5px] font-semibold text-(--adm-text-secondary)">
            <tr>
              {onBulkDelete && (
                <th className="w-4 px-4 py-2.5">
                  <input
                    type="checkbox"
                    aria-label="Pilih semua baris"
                    onChange={handleSelectAll}
                    checked={
                      paginatedData.length > 0 &&
                      paginatedData.every((d) => selected.includes(d.id))
                    }
                    className="rounded border-(--adm-border) text-blue-600 focus:ring-blue-500"
                  />
                </th>
              )}
              {columns.map((col, idx) => (
                <th
                  key={idx}
                  className={`px-4 py-2.5 whitespace-nowrap ${col.className || ""}`}
                >
                  {col.header}
                </th>
              ))}
              {(onEdit || onDelete) && (
                <th className="px-4 py-2.5 text-right">Aksi</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-(--adm-border)">
            {paginatedData.length === 0 ? (
              <tr>
                <td
                  colSpan={
                    columns.length + (onBulkDelete ? 2 : onEdit ? 1 : 0)
                  }
                  className="px-4 py-8 text-center text-xs text-(--adm-text-secondary)"
                >
                  Tidak ada data ditemukan.
                </td>
              </tr>
            ) : (
              paginatedData.map((item) => (
                <tr
                  key={item.id}
                  className="hover:bg-(--adm-bg-overlay)"
                >
                  {onBulkDelete && (
                    <td className="px-4 py-2.5">
                      <input
                        type="checkbox"
                        aria-label={`Pilih baris ${item.id}`}
                        checked={selected.includes(item.id)}
                        onChange={() => handleSelectOne(item.id)}
                        className="rounded border-(--adm-border) text-blue-600 focus:ring-blue-500"
                      />
                    </td>
                  )}
                  {columns.map((col, idx) => (
                    <td
                      key={idx}
                      className={`px-4 py-2.5 ${col.className || ""}`}
                    >
                      {typeof col.accessor === "function"
                        ? col.accessor(item)
                        : (item[col.accessor] as React.ReactNode)}
                    </td>
                  ))}
                  {(onEdit || onDelete) && (
                    <td className="px-4 py-2.5 text-right">
                      <div className="inline-flex items-center justify-end gap-1">
                        {onEdit && (
                          <button
                            type="button"
                            aria-label="Edit data"
                            onClick={() => onEdit(item)}
                            className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-green-600/30 bg-green-600/10 text-green-700 hover:bg-green-600 hover:text-white dark:text-green-400"
                          >
                            <Edit className="h-3.5 w-3.5" />
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
                            className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-red-600/30 bg-red-600/10 text-red-700 hover:bg-red-600 hover:text-white dark:text-red-400"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
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

      <div className="flex items-center justify-between border-t border-(--adm-border) bg-(--adm-bg-primary) px-4 py-2 text-xs text-(--adm-text-secondary)">
        <span className="tabular-nums">
          Hal. {filteredData.length === 0 ? 0 : page}/{totalPages} · Total{" "}
          {filteredData.length} data
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Halaman sebelumnya"
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1}
            className="adm-btn adm-btn-secondary h-7 w-7 p-0"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            aria-label="Halaman berikutnya"
            onClick={() => setPage(Math.min(totalPages, page + 1))}
            disabled={page === totalPages || totalPages === 0}
            className="adm-btn adm-btn-secondary h-7 w-7 p-0"
          >
            <ChevronRight className="h-3.5 w-3.5" />
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
  coupleLabel = "Wedding Panel",
}: {
  initialRsvps: RSVP[];
  initialWishes: Wish[];
  siteUrl: string;
  coupleLabel?: string;
}) => {
  const [activeTab, setActiveTab] = useState<AdminTabId>("rsvp");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [menuQuery, setMenuQuery] = useState("");
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

  const searchMenuRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("wedding_admin_sidebar_collapsed");
      if (stored !== null) {
        setSidebarCollapsed(stored === "1");
      } else if (window.innerWidth < 1200) {
        setSidebarCollapsed(true);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const inField = target?.closest("input, textarea, select, [contenteditable='true']");
      const isShortcut =
        (e.key === "/" && !inField) ||
        (e.key.toLowerCase() === "k" && (e.ctrlKey || e.metaKey));
      if (!isShortcut) return;
      e.preventDefault();
      if (window.innerWidth < 768) {
        setMobileMenuOpen(true);
      } else if (sidebarCollapsed) {
        setSidebarCollapsed(false);
      }
      setTimeout(() => searchMenuRef.current?.focus(), 40);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [sidebarCollapsed]);

  const toggleSidebarCollapsed = () => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("wedding_admin_sidebar_collapsed", next ? "1" : "0");
      } catch {
        // ignore
      }
      return next;
    });
  };

  const toggleTheme = () => {
    const isDark = document.documentElement.classList.toggle("dark");
    try {
      localStorage.setItem("theme", isDark ? "dark" : "light");
    } catch {
      // ignore
    }
  };

  const handleLogout = () => {
    setConfirmDialog({
      title: "Keluar dari Panel Admin",
      message:
        "Anda akan keluar dari panel admin dan perlu memasukkan password lagi untuk masuk kembali.",
      confirmLabel: "Keluar",
      destructive: true,
      onConfirm: async () => {
        await fetch("/admin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "logout" }),
        });
        window.location.reload();
      },
    });
  };

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

  const menuGroups: {
    judul: string;
    items: {
      id: AdminTabId;
      label: string;
      icon: React.ComponentType<{ className?: string }>;
      badge?: number;
      keywords?: string;
    }[];
  }[] = [
    {
      judul: "Tamu & Kehadiran",
      items: [
        {
          id: "rsvp",
          label: "Data RSVP",
          icon: Users,
          badge: rsvps.length,
          keywords: "reservasi konfirmasi hadir",
        },
        {
          id: "wishes",
          label: "Ucapan & Doa",
          icon: MessageCircle,
          badge: wishes.length,
          keywords: "buku tamu komentar",
        },
        {
          id: "guests",
          label: "Tamu & Check-In",
          icon: UserCheck,
          keywords: "scanner qr daftar tamu",
        },
      ],
    },
    {
      judul: "Distribusi & Cetak",
      items: [
        {
          id: "wa",
          label: "Kirim WhatsApp",
          icon: MessageSquare,
          keywords: "gateway broadcast undangan",
        },
        {
          id: "qr",
          label: "QR Generator",
          icon: QrCode,
          keywords: "barcode tautan zip",
        },
        {
          id: "pdf",
          label: "Design PDF",
          icon: Printer,
          keywords: "cetak a5 floral",
        },
      ],
    },
    {
      judul: "Konfigurasi",
      items: [
        {
          id: "settings",
          label: "Pengaturan",
          icon: Settings,
          keywords: "mempelai jadwal peta musik audio backsound galeri bank",
        },
      ],
    },
  ];

  const q = menuQuery.trim().toLowerCase();
  const filteredGroups = menuGroups
    .map((group) => ({
      ...group,
      items: group.items.filter(
        (item) =>
          !q ||
          item.label.toLowerCase().includes(q) ||
          group.judul.toLowerCase().includes(q) ||
          (item.keywords || "").includes(q)
      ),
    }))
    .filter((group) => group.items.length > 0);

  const activeMeta = TAB_META[activeTab];
  const currentYear = new Date().getFullYear();

  return (
    <div className="flex min-h-dvh bg-(--adm-bg-secondary) text-(--adm-text-primary)">
      <ToastBanner toast={toast} onClose={() => setToast(null)} />
      <ConfirmModal
        dialog={confirmDialog}
        onClose={() => setConfirmDialog(null)}
      />

      {/* Mobile Sidebar Backdrop */}
      {mobileMenuOpen && (
        <div
          onClick={() => setMobileMenuOpen(false)}
          className="fixed inset-0 z-40 bg-(--adm-backdrop) md:hidden"
        />
      )}

      {/* Compact Collapsible Sidebar (whatsapp-service style) */}
      <aside
        className={`fixed inset-y-0 top-0 left-0 z-50 flex h-dvh shrink-0 flex-col border-r border-(--adm-border) bg-(--adm-bg-secondary) transition-all duration-200 md:sticky md:z-auto ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        } ${sidebarCollapsed ? "w-[260px] md:w-[64px]" : "w-[260px] md:w-[220px]"}`}
      >
        {/* Brand */}
        <div
          className={`flex h-14 shrink-0 items-center border-b border-(--adm-border) ${
            sidebarCollapsed ? "justify-between px-4 md:justify-center md:px-0" : "justify-between px-4"
          }`}
        >
          <button
            type="button"
            onClick={() => {
              setActiveTab("rsvp");
              setMobileMenuOpen(false);
            }}
            className="flex min-w-0 items-center gap-2.5 text-left"
            title={coupleLabel}
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-(--adm-border) bg-(--adm-accent-soft) text-(--adm-accent)">
              <Heart className="h-3.5 w-3.5" />
            </span>
            <span
              className={`min-w-0 ${sidebarCollapsed ? "md:hidden" : ""}`}
            >
              <span className="block truncate text-[13px] font-bold text-(--adm-text-primary)">
                {coupleLabel}
              </span>
              <span className="block truncate text-[11px] text-(--adm-text-secondary)">
                Panel Admin
              </span>
            </span>
          </button>

          <button
            type="button"
            aria-label="Tutup menu"
            onClick={() => setMobileMenuOpen(false)}
            className="flex h-7 w-7 items-center justify-center rounded-md text-(--adm-text-secondary) hover:bg-(--adm-bg-overlay) md:hidden"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Search Menu */}
        <div
          className={`shrink-0 px-3 pt-2.5 pb-1 ${
            sidebarCollapsed ? "md:hidden" : ""
          }`}
        >
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-(--adm-text-muted)" />
            <input
              ref={searchMenuRef}
              type="search"
              value={menuQuery}
              onChange={(e) => setMenuQuery(e.target.value)}
              placeholder="Cari menu..."
              className="adm-input min-h-[28px] py-1 pr-7 pl-8 text-xs"
            />
            {!menuQuery && (
              <kbd className="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 rounded border border-(--adm-border) px-1 text-[10px] text-(--adm-text-muted)">
                /
              </kbd>
            )}
          </div>
        </div>

        {/* Nav Items */}
        <nav
          aria-label="Menu utama admin"
          className="custom-scrollbar flex-1 overflow-x-hidden overflow-y-auto py-2"
        >
          {filteredGroups.length === 0 ? (
            <p className="px-4 py-3 text-xs text-(--adm-text-secondary)">
              Menu tidak ditemukan.
            </p>
          ) : (
            filteredGroups.map((group, gIdx) => (
              <div
                key={group.judul}
                className={
                  gIdx > 0
                    ? `mt-2 ${sidebarCollapsed ? "md:border-t md:border-(--adm-border) md:pt-2" : ""}`
                    : ""
                }
              >
                <p
                  className={`px-4 pt-2 pb-1 text-[10.5px] font-semibold tracking-wider text-(--adm-text-muted) uppercase ${
                    sidebarCollapsed ? "md:hidden" : ""
                  }`}
                >
                  {group.judul}
                </p>
                <ul className="flex flex-col gap-0.5">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const active = activeTab === item.id;
                    return (
                      <li key={item.id}>
                        <button
                          type="button"
                          title={item.label}
                          onClick={() => {
                            setActiveTab(item.id);
                            setMobileMenuOpen(false);
                          }}
                          className={`adm-sidebar-item ${active ? "is-active" : ""} ${
                            sidebarCollapsed ? "md:justify-center md:px-0" : ""
                          }`}
                        >
                          <Icon className="h-[17px] w-[17px] shrink-0" />
                          <span
                            className={`truncate ${
                              sidebarCollapsed ? "md:hidden" : ""
                            }`}
                          >
                            {item.label}
                          </span>
                          {typeof item.badge === "number" && (
                            <span
                              className={`ml-auto rounded-full bg-(--adm-bg-tertiary) px-1.5 py-0.5 text-[10px] font-semibold text-(--adm-text-secondary) tabular-nums ${
                                sidebarCollapsed ? "md:hidden" : ""
                              }`}
                            >
                              {item.badge}
                            </span>
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))
          )}

          {/* Quick Links */}
          <div
            className={`mt-2 ${sidebarCollapsed ? "md:border-t md:border-(--adm-border) md:pt-2" : ""}`}
          >
            <p
              className={`px-4 pt-2 pb-1 text-[10.5px] font-semibold tracking-wider text-(--adm-text-muted) uppercase ${
                sidebarCollapsed ? "md:hidden" : ""
              }`}
            >
              Tautan Cepat
            </p>
            <ul className="flex flex-col gap-0.5">
              <li>
                <a
                  href="/checkin"
                  title="Scanner Check-In Layar Penuh"
                  className={`adm-sidebar-item ${
                    sidebarCollapsed ? "md:justify-center md:px-0" : ""
                  }`}
                >
                  <QrCode className="h-[17px] w-[17px] shrink-0" />
                  <span
                    className={`truncate ${
                      sidebarCollapsed ? "md:hidden" : ""
                    }`}
                  >
                    Scanner Check-In
                  </span>
                </a>
              </li>
              <li>
                <a
                  href="/"
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Lihat Halaman Undangan"
                  className={`adm-sidebar-item ${
                    sidebarCollapsed ? "md:justify-center md:px-0" : ""
                  }`}
                >
                  <ExternalLink className="h-[17px] w-[17px] shrink-0" />
                  <span
                    className={`truncate ${
                      sidebarCollapsed ? "md:hidden" : ""
                    }`}
                  >
                    Lihat Undangan
                  </span>
                </a>
              </li>
            </ul>
          </div>
        </nav>

        {/* Sidebar Footer */}
        <div className="flex h-11 shrink-0 items-stretch border-t border-(--adm-border)">
          <button
            type="button"
            onClick={handleLogout}
            title="Keluar"
            aria-label="Keluar"
            className={`flex flex-1 items-center gap-2.5 text-[12.5px] font-medium text-(--adm-red) hover:bg-(--adm-red-soft) ${
              sidebarCollapsed ? "px-4 md:justify-center md:px-0" : "px-4"
            }`}
          >
            <LogOut className="h-4 w-4 shrink-0" />
            <span className={sidebarCollapsed ? "md:hidden" : ""}>Keluar</span>
          </button>
          <button
            type="button"
            onClick={toggleSidebarCollapsed}
            title={sidebarCollapsed ? "Perluas sidebar" : "Ciutkan sidebar"}
            aria-label={sidebarCollapsed ? "Perluas sidebar" : "Ciutkan sidebar"}
            className="hidden w-10 items-center justify-center border-l border-(--adm-border) text-(--adm-text-secondary) hover:bg-(--adm-bg-overlay) md:flex"
          >
            <ChevronLeft
              className={`h-4 w-4 transition-transform duration-200 ${
                sidebarCollapsed ? "rotate-180" : ""
              }`}
            />
          </button>
        </div>
      </aside>

      {/* Main Column */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Sticky 56px Topbar */}
        <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between gap-2 border-b border-(--adm-border) bg-(--adm-bg-secondary) px-3 md:px-5">
          <div className="flex min-w-0 items-center gap-2">
            <button
              type="button"
              aria-label="Buka menu"
              onClick={() => setMobileMenuOpen(true)}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-(--adm-text-primary) hover:bg-(--adm-bg-overlay) md:hidden"
            >
              <Menu className="h-4 w-4" />
            </button>
            <nav aria-label="Breadcrumb" className="min-w-0">
              <ol className="flex items-center gap-1.5 text-[13px]">
                <li className="hidden whitespace-nowrap text-(--adm-text-secondary) sm:block">
                  Wedding Panel
                </li>
                <li className="hidden text-(--adm-text-muted) sm:block">/</li>
                <li className="truncate font-semibold text-(--adm-text-primary)">
                  {activeMeta.title}
                </li>
              </ol>
            </nav>
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            <div className="hidden h-7 items-center gap-1.5 rounded-full border border-(--adm-border) px-2.5 text-[11.5px] text-(--adm-text-secondary) sm:inline-flex">
              <span className="h-2 w-2 rounded-full bg-(--adm-green)" />
              <span className="tabular-nums">
                {stats.hadir} Hadir · {stats.guestCount} Pax
              </span>
            </div>

            <span
              className="mx-1 hidden h-4 w-px bg-(--adm-border) sm:block"
              aria-hidden="true"
            />

            <button
              type="button"
              onClick={toggleTheme}
              aria-label="Ubah tema terang atau gelap"
              title="Ubah Tema"
              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-(--adm-text-secondary) hover:bg-(--adm-bg-overlay) hover:text-(--adm-text-primary)"
            >
              <Moon className="h-4 w-4 dark:hidden" />
              <Sun className="hidden h-4 w-4 dark:inline" />
            </button>

            <a
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              title="Buka Halaman Undangan"
              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-(--adm-text-secondary) hover:bg-(--adm-bg-overlay) hover:text-(--adm-text-primary)"
            >
              <ExternalLink className="h-4 w-4" />
            </a>

            <div className="ml-1 flex items-center gap-2 rounded-md border border-(--adm-border) bg-(--adm-bg-primary) py-1 pr-2.5 pl-1.5">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-(--adm-accent-soft) text-[11px] font-semibold text-(--adm-accent)">
                A
              </span>
              <span className="hidden text-xs font-medium text-(--adm-text-primary) sm:inline">
                Admin
              </span>
            </div>
          </div>
        </header>

        {/* Rounded Content Panel (whatsapp-service .konten-utama) */}
        <main className="adm-panel-main m-2 flex-1 px-4 py-4 md:m-3 md:px-6 md:py-5">
          <div className="mx-auto w-full max-w-[1280px] space-y-5">
            {/* Page Header */}
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h1 className="text-[20px] leading-snug font-semibold text-(--adm-text-primary)">
                  {activeMeta.title}
                </h1>
                <p className="mt-0.5 text-xs text-(--adm-text-secondary)">
                  {activeMeta.desc}
                </p>
              </div>

              {activeTab === "rsvp" && (
                <div className="flex flex-wrap items-center gap-2">
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
                    className="adm-btn adm-btn-primary"
                  >
                    <Plus className="h-3.5 w-3.5" /> Tambah RSVP
                  </button>
                  <button
                    type="button"
                    onClick={() => setCsvImportTab("rsvp")}
                    className="adm-btn adm-btn-secondary"
                  >
                    <Upload className="h-3.5 w-3.5" /> Import CSV
                  </button>
                  <a
                    href="/api/export-rsvp"
                    target="_blank"
                    className="adm-btn adm-btn-secondary"
                  >
                    <Download className="h-3.5 w-3.5" /> Export CSV
                  </a>
                </div>
              )}

              {activeTab === "wishes" && (
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setWishModal({ name: "", message: "" })}
                    className="adm-btn adm-btn-primary"
                  >
                    <Plus className="h-3.5 w-3.5" /> Tambah Ucapan
                  </button>
                  <button
                    type="button"
                    onClick={() => setCsvImportTab("wish")}
                    className="adm-btn adm-btn-secondary"
                  >
                    <Upload className="h-3.5 w-3.5" /> Import CSV
                  </button>
                  <a
                    href="/api/export-wishes"
                    target="_blank"
                    className="adm-btn adm-btn-secondary"
                  >
                    <Download className="h-3.5 w-3.5" /> Export CSV
                  </a>
                </div>
              )}
            </div>

            {/* Compact Stat Row (tampil pada tab RSVP & Ucapan) */}
            {(activeTab === "rsvp" || activeTab === "wishes") && (
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <div className="adm-card flex flex-col gap-1.5 p-3.5">
                  <span className="text-xs text-(--adm-text-secondary)">
                    Total Respon RSVP
                  </span>
                  <span className="text-xl font-semibold text-(--adm-text-primary) tabular-nums">
                    {stats.total}
                  </span>
                  <span className="text-[11px] text-(--adm-text-muted)">
                    {wishes.length} ucapan masuk
                  </span>
                </div>
                <div className="adm-card flex flex-col gap-1.5 p-3.5">
                  <span className="text-xs text-(--adm-text-secondary)">
                    Konfirmasi Hadir
                  </span>
                  <span className="text-xl font-semibold text-(--adm-green) tabular-nums">
                    {stats.hadir}
                  </span>
                  <span className="text-[11px] text-(--adm-text-muted) tabular-nums">
                    Total estimasi {stats.guestCount} pax
                  </span>
                </div>
                <div className="adm-card flex flex-col gap-1.5 p-3.5">
                  <span className="text-xs text-(--adm-text-secondary)">
                    Masih Ragu
                  </span>
                  <span className="text-xl font-semibold text-(--adm-yellow) tabular-nums">
                    {stats.ragu}
                  </span>
                  <span className="text-[11px] text-(--adm-text-muted)">
                    Perlu konfirmasi ulang
                  </span>
                </div>
                <div className="adm-card flex flex-col gap-1.5 p-3.5">
                  <span className="text-xs text-(--adm-text-secondary)">
                    Tidak Hadir
                  </span>
                  <span className="text-xl font-semibold text-(--adm-red) tabular-nums">
                    {stats.tidak}
                  </span>
                  <span className="text-[11px] text-(--adm-text-muted)">
                    Berhalangan hadir
                  </span>
                </div>
              </div>
            )}

            {/* Active Tab Body */}
            {activeTab === "rsvp" && (
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
                      <span className="font-mono text-xs text-(--adm-text-secondary)">
                        {item.phone || "-"}
                      </span>
                    ),
                  },
                  {
                    header: "Status",
                    accessor: (item) => (
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium capitalize ${
                          item.attendance === "hadir"
                            ? "bg-(--adm-green-soft) text-(--adm-green)"
                            : item.attendance === "tidak_hadir"
                              ? "bg-(--adm-red-soft) text-(--adm-red)"
                              : "bg-(--adm-yellow-soft) text-(--adm-yellow)"
                        }`}
                      >
                        {item.attendance.replace("_", " ")}
                      </span>
                    ),
                  },
                  {
                    header: "Pax",
                    accessor: (item) => (
                      <span className="tabular-nums">{item.guest_count}</span>
                    ),
                  },
                  {
                    header: "Pesan",
                    accessor: (item) => (
                      <span className="block max-w-[220px] truncate text-xs text-(--adm-text-secondary)">
                        {item.message || "-"}
                      </span>
                    ),
                  },
                  {
                    header: "Waktu",
                    accessor: (item) => (
                      <span className="text-xs text-(--adm-text-secondary) tabular-nums">
                        {new Date(item.created_at).toLocaleDateString("id-ID")}
                      </span>
                    ),
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
            )}

            {activeTab === "wishes" && (
              <DataTable
                data={wishes}
                columns={[
                  {
                    header: "Nama Pengirim",
                    accessor: "name",
                    className: "font-medium",
                  },
                  {
                    header: "Ucapan & Doa",
                    accessor: (item) => (
                      <span className="block max-w-[380px] text-xs text-wrap text-(--adm-text-secondary)">
                        &quot;{item.message}&quot;
                      </span>
                    ),
                  },
                  {
                    header: "Waktu",
                    accessor: (item) => (
                      <span className="text-xs text-(--adm-text-secondary) tabular-nums">
                        {new Date(item.created_at).toLocaleDateString("id-ID")}
                      </span>
                    ),
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
            )}

            {activeTab === "guests" && (
              <div className="adm-card p-4 md:p-5">
                <Suspense
                  fallback={
                    <div className="flex items-center justify-center py-14">
                      <Loader2 className="h-6 w-6 animate-spin text-(--adm-text-muted)" />
                    </div>
                  }
                >
                  <GuestManager siteUrl={siteUrl} />
                </Suspense>
              </div>
            )}

            {activeTab === "wa" && (
              <div className="adm-card p-4 md:p-5">
                <Suspense
                  fallback={
                    <div className="flex items-center justify-center py-14">
                      <Loader2 className="h-6 w-6 animate-spin text-(--adm-text-muted)" />
                    </div>
                  }
                >
                  <WhatsAppManager siteUrl={siteUrl} />
                </Suspense>
              </div>
            )}

            {activeTab === "qr" && (
              <div className="adm-card p-4 md:p-5">
                <Suspense
                  fallback={
                    <div className="flex items-center justify-center py-14">
                      <Loader2 className="h-6 w-6 animate-spin text-(--adm-text-muted)" />
                    </div>
                  }
                >
                  <QRCodeManager siteUrl={siteUrl} />
                </Suspense>
              </div>
            )}

            {activeTab === "pdf" && (
              <div className="adm-card p-4 md:p-5">
                <Suspense
                  fallback={
                    <div className="flex items-center justify-center py-14">
                      <Loader2 className="h-6 w-6 animate-spin text-(--adm-text-muted)" />
                    </div>
                  }
                >
                  <InvitationManager siteUrl={siteUrl} />
                </Suspense>
              </div>
            )}

            {activeTab === "settings" && <SettingsTab onNotify={setToast} />}
          </div>
        </main>

        {/* Compact Footer */}
        <footer className="flex min-h-[44px] shrink-0 flex-wrap items-center justify-between gap-2 border-t border-(--adm-border) bg-(--adm-bg-secondary) px-4 py-1.5 text-[11px] text-(--adm-text-secondary) md:px-6">
          <span>
            &copy; 2018 - {currentYear}{" "}
            <strong className="font-semibold uppercase">
              ZEDLABS Teknologi Indonesia
            </strong>
          </span>
          <span>Wedding Invitation Admin Panel</span>
        </footer>
      </div>

      {/* Overlay Delete Loading */}
      {isDeleting && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-(--adm-backdrop) backdrop-blur-xs">
          <div className="adm-card flex items-center gap-3 px-5 py-4 shadow-xl">
            <Loader2 className="h-5 w-5 animate-spin text-(--adm-accent)" />
            <span className="text-sm font-semibold">Menghapus data...</span>
          </div>
        </div>
      )}

      {/* CSV Import Modals */}
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
            render: (r) => <span className="font-semibold">{r.guest_name}</span>,
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
            render: (r) => <span className="font-semibold">{r.name}</span>,
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

      {/* Modal Tambah / Edit RSVP */}
      {rsvpModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-(--adm-backdrop) p-4 backdrop-blur-xs"
          onClick={(e) => {
            if (e.target === e.currentTarget) setRsvpModal(null);
          }}
        >
          <div className="adm-card w-full max-w-md overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between border-b border-(--adm-border) px-4 py-3">
              <h3 className="text-sm font-semibold">
                {rsvpModal.id ? "Edit Data RSVP" : "Tambah Data RSVP"}
              </h3>
              <button
                type="button"
                aria-label="Tutup modal RSVP"
                onClick={() => setRsvpModal(null)}
                className="rounded p-1 text-(--adm-text-secondary) hover:bg-(--adm-bg-overlay)"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleSaveRsvpModal} className="space-y-3.5 p-4">
              <div className="space-y-1">
                <label
                  htmlFor="modal-rsvp-name"
                  className="text-xs font-semibold text-(--adm-text-secondary)"
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
                  className="adm-input"
                  required
                />
              </div>
              <div className="space-y-1">
                <label
                  htmlFor="modal-rsvp-phone"
                  className="text-xs font-semibold text-(--adm-text-secondary)"
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
                  className="adm-input"
                />
              </div>

              <div className="space-y-1.5">
                <span className="block text-xs font-semibold text-(--adm-text-secondary)">
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
                      className={`rounded-md border py-2 text-xs font-semibold transition-all ${
                        rsvpModal.attendance === val
                          ? val === "hadir"
                            ? "border-green-600 bg-green-600 text-white"
                            : val === "tidak_hadir"
                              ? "border-red-600 bg-red-600 text-white"
                              : "border-amber-500 bg-amber-500 text-white"
                          : "border-(--adm-border) bg-(--adm-bg-primary) text-(--adm-text-secondary) hover:text-(--adm-text-primary)"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {rsvpModal.attendance === "hadir" && (
                <div className="space-y-1.5">
                  <span className="block text-xs font-semibold text-(--adm-text-secondary)">
                    Jumlah Tamu (Pax)
                  </span>
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="inline-flex items-center gap-1 rounded-md border border-(--adm-border) bg-(--adm-bg-primary) p-0.5">
                      <button
                        type="button"
                        aria-label="Kurangi pax"
                        onClick={() =>
                          setRsvpModal({
                            ...rsvpModal,
                            guest_count: Math.max(1, rsvpModal.guest_count - 1),
                          })
                        }
                        className="flex h-7 w-7 items-center justify-center rounded hover:bg-(--adm-bg-overlay)"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <span className="w-12 text-center text-xs font-semibold tabular-nums">
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
                        className="flex h-7 w-7 items-center justify-center rounded hover:bg-(--adm-bg-overlay)"
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
                        className={`rounded-md border px-2.5 py-1 text-xs font-medium ${
                          rsvpModal.guest_count === n
                            ? "border-(--adm-accent) bg-(--adm-accent-soft) text-(--adm-accent)"
                            : "border-(--adm-border) text-(--adm-text-secondary)"
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
                    className="text-xs font-semibold text-(--adm-text-secondary)"
                  >
                    Pesan (Opsional)
                  </label>
                  <span className="text-[10.5px] text-(--adm-text-muted)">
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
                  className="adm-input"
                />
              </div>

              <div className="flex justify-end gap-2 border-t border-(--adm-border) pt-3">
                <button
                  type="button"
                  onClick={() => setRsvpModal(null)}
                  className="adm-btn adm-btn-secondary"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="adm-btn adm-btn-primary"
                >
                  {isSaving ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Save className="h-3.5 w-3.5" />
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-(--adm-backdrop) p-4 backdrop-blur-xs"
          onClick={(e) => {
            if (e.target === e.currentTarget) setWishModal(null);
          }}
        >
          <div className="adm-card w-full max-w-md overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between border-b border-(--adm-border) px-4 py-3">
              <h3 className="text-sm font-semibold">
                {wishModal.id ? "Edit Ucapan & Doa" : "Tambah Ucapan"}
              </h3>
              <button
                type="button"
                aria-label="Tutup modal ucapan"
                onClick={() => setWishModal(null)}
                className="rounded p-1 text-(--adm-text-secondary) hover:bg-(--adm-bg-overlay)"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleSaveWishModal} className="space-y-3.5 p-4">
              <div className="space-y-1">
                <label
                  htmlFor="modal-wish-name"
                  className="text-xs font-semibold text-(--adm-text-secondary)"
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
                  className="adm-input"
                  required
                />
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="modal-wish-msg"
                    className="text-xs font-semibold text-(--adm-text-secondary)"
                  >
                    Ucapan & Doa *
                  </label>
                  <span className="text-[10.5px] text-(--adm-text-muted)">
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
                  rows={4}
                  placeholder="Tuliskan ucapan & doa..."
                  className="adm-input"
                  required
                />
              </div>
              <div className="flex justify-end gap-2 border-t border-(--adm-border) pt-3">
                <button
                  type="button"
                  onClick={() => setWishModal(null)}
                  className="adm-btn adm-btn-secondary"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="adm-btn adm-btn-primary"
                >
                  {isSaving ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Save className="h-3.5 w-3.5" />
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
