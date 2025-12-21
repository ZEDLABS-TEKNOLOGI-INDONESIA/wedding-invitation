import React, { useState, useMemo, useEffect } from "react";
import {
  Search,
  Trash2,
  Edit,
  ChevronLeft,
  ChevronRight,
  Download,
  Users,
  MessageCircle,
  QrCode,
  Printer,
  Save,
  Loader2,
  X,
  Database,
  History,
  Clock,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import QRCodeManager from "../QRCodeManager";
import InvitationManager from "../InvitationManager";

// --- TYPES ---
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

interface HistoryLog {
  id: number;
  action_type: string;
  filename: string;
  status: "SUCCESS" | "FAILED";
  details?: string;
  created_at: string;
}

// --- REUSABLE TABLE COMPONENT ---
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

  // Filter Search
  const filteredData = useMemo(() => {
    return data.filter((item) =>
      Object.values(item).some((val) =>
        String(val).toLowerCase().includes(search.toLowerCase()),
      ),
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
    page * pageSize,
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
      prev.includes(id) ? prev.filter((pid) => pid !== id) : [...prev, id],
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
      {/* Table Controls */}
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

      {/* Table Content */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-slate-900/50 dark:text-slate-400">
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
                              title="Edit"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                          )}
                          {onDelete && (
                            <button
                              type="button"
                              onClick={() => {
                                if (
                                  confirm(
                                    "Yakin hapus data ini secara permanen?",
                                  )
                                )
                                  onDelete(item.id);
                              }}
                              className="rounded p-1.5 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                              title="Hapus"
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

      {/* Simple Pagination */}
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

// --- MAIN DASHBOARD COMPONENT ---
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
    "rsvp" | "wishes" | "qr" | "pdf" | "db"
  >("rsvp");

  // Data States
  const [rsvps, setRsvps] = useState(initialRsvps);
  const [wishes, setWishes] = useState(initialWishes);
  const [historyLogs, setHistoryLogs] = useState<HistoryLog[]>([]);

  // UI/Loading States
  const [isProcessing, setIsProcessing] = useState(false); // Untuk Backup/Restore
  const [processMsg, setProcessMsg] = useState("");
  const [isDeleting, setIsDeleting] = useState(false); // Untuk Hapus Data
  const [isSaving, setIsSaving] = useState(false); // Untuk Edit Form

  // Edit Modal State
  const [editingItem, setEditingItem] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Fetch History saat tab DB dibuka
  useEffect(() => {
    if (activeTab === "db") {
      fetchHistory();
    }
  }, [activeTab]);

  const fetchHistory = () => {
    fetch("/api/history")
      .then((res) => res.json())
      .then((data) => setHistoryLogs(data))
      .catch((err) => console.error("Failed to load history:", err));
  };

  // --- GENERIC DELETE HANDLER ---
  const handleDelete = async (
    type: "rsvp" | "wish" | "history",
    ids: number[],
  ) => {
    if (ids.length === 0) return;
    setIsDeleting(true);

    try {
      const actionKey =
        type === "history"
          ? "delete_history"
          : type === "rsvp"
            ? "delete_rsvp"
            : "delete_wish";

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
        if (type === "history")
          setHistoryLogs((prev) => prev.filter((i) => !ids.includes(i.id)));
      } else {
        alert("Gagal menghapus: " + (json.error || "Unknown Error"));
      }
    } catch (e) {
      alert("Error Network: Gagal menghubungi server.");
    } finally {
      setIsDeleting(false);
    }
  };

  // --- GENERIC UPDATE HANDLER ---
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
            prev.map((item) => (item.id === id ? { ...item, ...data } : item)),
          );
        } else {
          setWishes((prev) =>
            prev.map((item) => (item.id === id ? { ...item, ...data } : item)),
          );
        }
        setIsModalOpen(false);
      } else {
        alert("Gagal update data.");
      }
    } catch (e) {
      alert("Gagal menyimpan perubahan.");
    } finally {
      setIsSaving(false);
    }
  };

  // --- DATABASE: CREATE BACKUP ---
  const handleCreateBackup = async () => {
    setIsProcessing(true);
    setProcessMsg("Membuat Backup di Server...");
    try {
      const res = await fetch("/api/backup", { method: "POST" });
      const json = await res.json();
      if (res.ok) {
        alert("Backup Berhasil! File tersimpan di server.");
        fetchHistory(); // Refresh list
      } else {
        alert("Gagal Backup: " + json.error);
      }
    } catch (e) {
      alert("Server Error saat backup.");
    } finally {
      setIsProcessing(false);
    }
  };

  // --- DATABASE: RESTORE ---
  const handleRestoreFromHistory = async (filename: string) => {
    if (
      !confirm(
        `PERINGATAN: Database aktif akan DITIMPA dengan backup "${filename}".\n\nData yang masuk setelah tanggal backup ini akan HILANG.\n\nLanjutkan?`,
      )
    )
      return;

    setIsProcessing(true);
    setProcessMsg("Merestore Database...");

    try {
      const res = await fetch("/api/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename }),
      });
      const json = await res.json();

      if (res.ok) {
        alert("Restore Berhasil! Halaman akan dimuat ulang.");
        window.location.reload();
      } else {
        alert("Gagal Restore: " + json.error);
      }
    } catch (e) {
      alert("Gagal menghubungi server.");
    } finally {
      setIsProcessing(false);
    }
  };

  // --- DATABASE: CLEAR LOGS ---
  const handleClearLogs = () => {
    if (
      confirm(
        "Hapus semua riwayat log? File backup fisik di server tidak akan terhapus.",
      )
    ) {
      handleDelete(
        "history",
        historyLogs.map((h) => h.id),
      );
    }
  };

  // --- TABS CONFIG ---
  const tabs = [
    { id: "rsvp", label: "Data RSVP", icon: Users },
    { id: "wishes", label: "Ucapan & Doa", icon: MessageCircle },
    { id: "qr", label: "QR Generator", icon: QrCode },
    { id: "pdf", label: "Design PDF", icon: Printer },
    { id: "db", label: "Database Center", icon: Database },
  ];

  return (
    <div>
      {/* LOADING OVERLAY */}
      {(isProcessing || isDeleting) && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="flex items-center gap-4 rounded-xl bg-white p-6 shadow-2xl">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <span className="text-lg font-bold text-slate-700">
              {isDeleting ? "Menghapus Data..." : processMsg}
            </span>
          </div>
        </div>
      )}

      {/* NAVIGATION */}
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

      {/* --- TAB: RSVP --- */}
      {activeTab === "rsvp" && (
        <div className="space-y-6 animate-reveal">
          <div className="flex justify-end">
            <a
              href="/api/export-rsvp"
              target="_blank"
              className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-xs font-bold text-white hover:bg-green-700 transition-colors"
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

      {/* --- TAB: WISHES --- */}
      {activeTab === "wishes" && (
        <div className="space-y-6 animate-reveal">
          <div className="flex justify-end">
            <a
              href="/api/export-wishes"
              target="_blank"
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700 transition-colors"
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

      {/* --- TAB: QR --- */}
      {activeTab === "qr" && (
        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-700 dark:bg-slate-800 animate-reveal">
          <QRCodeManager siteUrl={siteUrl} />
        </div>
      )}

      {/* --- TAB: PDF --- */}
      {activeTab === "pdf" && (
        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-700 dark:bg-slate-800 animate-reveal">
          <InvitationManager />
        </div>
      )}

      {/* --- TAB: DATABASE --- */}
      {activeTab === "db" && (
        <div className="animate-reveal space-y-8">
          {/* Header & Create Backup */}
          <div className="flex flex-col items-center justify-between gap-6 rounded-3xl border border-blue-100 bg-blue-50 p-8 md:flex-row dark:border-blue-900/30 dark:bg-blue-900/10">
            <div className="space-y-2 text-center md:text-left">
              <h2 className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                Database Center
              </h2>
              <p className="max-w-md text-sm text-blue-700/80 dark:text-blue-200">
                Buat titik pengembalian (restore point) aman. Data akan disimpan
                di folder <code>/database/backup/</code> di server.
              </p>
            </div>
            <button
              onClick={handleCreateBackup}
              className="flex items-center gap-3 rounded-xl bg-blue-600 px-8 py-4 font-bold text-white shadow-lg shadow-blue-600/20 transition-all hover:scale-105 hover:bg-blue-700 active:scale-95"
            >
              <Save className="h-5 w-5" />
              BUAT BACKUP BARU
            </button>
          </div>

          {/* History List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-lg font-bold text-slate-700 dark:text-slate-300">
                <History className="h-5 w-5" /> Riwayat Backup Server
              </h3>
              {historyLogs.length > 0 && (
                <button
                  onClick={handleClearLogs}
                  className="flex items-center gap-1 text-xs font-bold text-slate-400 hover:text-red-500 transition-colors"
                >
                  <Trash2 className="h-3 w-3" /> Bersihkan Log
                </button>
              )}
            </div>

            <DataTable
              data={historyLogs}
              columns={[
                {
                  header: "Waktu Backup",
                  accessor: (item) => (
                    <div className="flex flex-col">
                      <span className="font-bold text-slate-700 dark:text-slate-200">
                        {new Date(item.created_at).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-slate-400">
                        <Clock className="h-3 w-3" />
                        {new Date(item.created_at).toLocaleTimeString("id-ID")}
                      </span>
                    </div>
                  ),
                },
                {
                  header: "Nama File",
                  accessor: "filename",
                  className: "font-mono text-xs text-slate-500",
                },
                {
                  header: "Status",
                  accessor: (item) => (
                    <div className="flex items-center gap-1.5">
                      {item.status === "SUCCESS" ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      ) : (
                        <AlertTriangle className="h-4 w-4 text-red-500" />
                      )}
                      <span
                        className={`text-xs font-bold ${item.status === "SUCCESS" ? "text-green-600" : "text-red-600"}`}
                      >
                        {item.status}
                      </span>
                    </div>
                  ),
                },
                {
                  header: "Aksi",
                  accessor: (item) =>
                    item.action_type === "BACKUP" &&
                    item.status === "SUCCESS" ? (
                      <div className="flex gap-2">
                        {/* Tombol Restore */}
                        <button
                          onClick={() =>
                            handleRestoreFromHistory(item.filename)
                          }
                          className="flex items-center gap-1.5 rounded-lg bg-orange-100 px-3 py-1.5 text-xs font-bold text-orange-700 transition-colors hover:bg-orange-200 dark:bg-orange-900/30 dark:text-orange-400"
                          title="Kembalikan database ke titik ini"
                        >
                          <RotateCcw className="h-3.5 w-3.5" /> Restore
                        </button>

                        {/* Tombol Download */}
                        <a
                          href={`/api/download-backup?file=${item.filename}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300"
                          title="Download file fisik"
                        >
                          <Download className="h-3.5 w-3.5" /> Unduh
                        </a>
                      </div>
                    ) : (
                      <span className="text-xs italic text-slate-400">
                        {item.details}
                      </span>
                    ),
                },
              ]}
              onDelete={(id) => handleDelete("history", [id])}
            />
          </div>
        </div>
      )}

      {/* --- EDIT MODAL (RSVP & WISHES) --- */}
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
                  data,
                );
              }}
              className="space-y-4"
            >
              {activeTab === "rsvp" ? (
                <>
                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase text-slate-500">
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
                      <label className="text-xs font-bold uppercase text-slate-500">
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
                      <label className="text-xs font-bold uppercase text-slate-500">
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
                    <label className="text-xs font-bold uppercase text-slate-500">
                      Pesan
                    </label>
                    <textarea
                      name="message"
                      defaultValue={editingItem.message}
                      className="w-full rounded-lg border p-2 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                      rows={3}
                    ></textarea>
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase text-slate-500">
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
                    <label className="text-xs font-bold uppercase text-slate-500">
                      Ucapan
                    </label>
                    <textarea
                      name="message"
                      defaultValue={editingItem.message}
                      className="w-full rounded-lg border p-2 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                      rows={5}
                      required
                    ></textarea>
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
                  )}{" "}
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
