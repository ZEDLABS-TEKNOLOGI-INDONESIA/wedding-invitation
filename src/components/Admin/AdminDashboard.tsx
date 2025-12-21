import React, { useState, useMemo, useRef, useEffect } from "react";
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
  Upload,
  AlertTriangle,
  FileDown,
  History,
  Clock,
  CheckCircle2,
  RefreshCcw,
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
  status: string;
  details?: string;
  created_at: string;
}

// --- SHARED TABLE COMPONENT (DIPERBAIKI) ---
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

  // Filter & Search
  const filteredData = useMemo(() => {
    return data.filter((item) =>
      Object.values(item).some((val) =>
        String(val).toLowerCase().includes(search.toLowerCase()),
      ),
    );
  }, [data, search]);

  // Reset page if search changes
  useEffect(() => {
    setPage(1);
  }, [search]);

  // Reset selection if data changes
  useEffect(() => {
    setSelected([]);
  }, [data]);

  // Pagination
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
    if (!onBulkDelete) return;
    if (selected.length === 0) {
      alert("Pilih data terlebih dahulu!");
      return;
    }
    const confirmed = window.confirm(
      `Yakin ingin menghapus ${selected.length} data terpilih?`,
    );
    if (confirmed) {
      onBulkDelete(selected);
      setSelected([]); // Reset selection immediately
    }
  };

  return (
    <div className="space-y-4">
      {/* Controls */}
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
            {[5, 10, 25, 50, 100].map((size) => (
              <option key={size} value={size}>
                {size} Data
              </option>
            ))}
          </select>

          {onBulkDelete && selected.length > 0 && (
            <button
              type="button"
              onClick={executeBulkDelete}
              className="flex items-center gap-2 rounded-lg bg-red-100 px-4 py-2 text-xs font-bold text-red-600 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 cursor-pointer"
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

      {/* Table */}
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
                                  window.confirm(
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

      {/* Pagination */}
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
  const [rsvps, setRsvps] = useState(initialRsvps);
  const [wishes, setWishes] = useState(initialWishes);
  const [historyLogs, setHistoryLogs] = useState<HistoryLog[]>([]);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreProgress, setRestoreProgress] = useState(0);
  const [isBackingUp, setIsBackingUp] = useState(false);

  // STATE LOADING UNTUK DELETE
  const [isDeleting, setIsDeleting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (activeTab === "db") {
      fetch("/api/history")
        .then((res) => res.json())
        .then((data) => setHistoryLogs(data))
        .catch(console.error);
    }
  }, [activeTab]);

  // FUNGSI DELETE UTAMA (PERBAIKAN LOGGING)
  const handleDelete = async (
    type: "rsvp" | "wish" | "history",
    ids: number[],
  ) => {
    if (ids.length === 0) return;

    // Konfirmasi ulang untuk bulk delete
    console.log(`[CLIENT] Memulai hapus ${type}, IDs:`, ids);

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
        headers: {
          "Content-Type": "application/json", // Header Wajib
        },
        body: JSON.stringify({
          action: actionKey,
          ids: ids, // Pastikan dikirim sebagai array number
        }),
      });

      const json = await res.json();
      console.log("[CLIENT] Respon Server:", json);

      if (res.ok && json.success) {
        // Update State UI Secara Langsung
        if (type === "rsvp") {
          setRsvps((prev) => prev.filter((item) => !ids.includes(item.id)));
        } else if (type === "wish") {
          setWishes((prev) => prev.filter((item) => !ids.includes(item.id)));
        } else if (type === "history") {
          setHistoryLogs((prev) =>
            prev.filter((item) => !ids.includes(item.id)),
          );
        }
      } else {
        alert("Gagal menghapus data: " + (json.error || "Unknown Error"));
      }
    } catch (error) {
      console.error(error);
      alert("Gagal menghubungi server. Periksa koneksi internet.");
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
    } catch (error) {
      alert("Gagal menyimpan data");
    } finally {
      setIsSaving(false);
    }
  };

  // ... (Sisa fungsi handleRestore dan handleDownloadBackup sama seperti sebelumnya, pastikan xhr upload ada) ...
  const handleRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (
      !confirm(
        "PERINGATAN: Database akan ditimpa dengan file ini. Data baru mungkin akan hilang jika tidak ada di backup. Lanjutkan?",
      )
    ) {
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setIsRestoring(true);
    setRestoreProgress(0);

    const formData = new FormData();
    formData.append("file", file);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/restore", true);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        setRestoreProgress(Math.round((event.loaded / event.total) * 100));
      }
    };

    xhr.onload = () => {
      setIsRestoring(false);
      setRestoreProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = "";

      if (xhr.status === 200) {
        alert("Database berhasil direstore! Halaman akan direfresh.");
        window.location.reload();
      } else {
        try {
          const resp = JSON.parse(xhr.responseText);
          alert("Error: " + resp.error);
        } catch (e) {
          alert("Error Server");
        }
      }
    };

    xhr.onerror = () => {
      setIsRestoring(false);
      alert("Gagal Upload");
    };

    xhr.send(formData);
  };

  const handleDownloadBackup = () => {
    setIsBackingUp(true);
    setTimeout(() => {
      setIsBackingUp(false);
      fetch("/api/history")
        .then((res) => res.json())
        .then((data) => setHistoryLogs(data))
        .catch(console.error);
    }, 3000);
  };

  const tabs = [
    { id: "rsvp", label: "Data RSVP", icon: Users },
    { id: "wishes", label: "Ucapan & Doa", icon: MessageCircle },
    { id: "qr", label: "QR Generator", icon: QrCode },
    { id: "pdf", label: "Design PDF", icon: Printer },
    { id: "db", label: "Database", icon: Database },
  ];

  return (
    <div>
      {/* OVERLAY LOADING SAAT MENGHAPUS */}
      {isDeleting && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/20 backdrop-blur-[2px]">
          <div className="rounded-xl bg-white p-5 shadow-2xl dark:bg-slate-800 flex items-center gap-3">
            <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
            <span className="font-bold text-slate-700 dark:text-white">
              Menghapus Data...
            </span>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="mb-8 flex gap-2 overflow-x-auto border-b border-slate-200 pb-1 dark:border-slate-700">
        {tabs.map((tab) => (
          <button
            type="button"
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

      {/* CONTENT: RSVP */}
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
                  new Date(item.created_at).toLocaleDateString(),
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

      {/* CONTENT: WISHES */}
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
                  new Date(item.created_at).toLocaleDateString(),
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

      {/* CONTENT: QR */}
      {activeTab === "qr" && (
        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-700 dark:bg-slate-800 animate-reveal">
          <QRCodeManager siteUrl={siteUrl} />
        </div>
      )}

      {/* CONTENT: PDF */}
      {activeTab === "pdf" && (
        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-700 dark:bg-slate-800 animate-reveal">
          <InvitationManager />
        </div>
      )}

      {/* CONTENT: DATABASE */}
      {activeTab === "db" && (
        <div className="animate-reveal space-y-8">
          <div className="grid gap-8 md:grid-cols-2">
            {/* BACKUP */}
            <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-700 dark:bg-slate-800">
              <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-900/20">
                <FileDown className="h-8 w-8" />
              </div>
              <h3 className="mb-2 text-xl font-bold text-slate-900 dark:text-white">
                Backup Database
              </h3>
              <p className="mb-6 text-sm text-slate-500">
                Download file .db terbaru (Snapshot aman).
              </p>
              <a
                href="/api/backup"
                target="_blank"
                onClick={handleDownloadBackup}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 py-3 text-sm font-bold text-white transition-all hover:bg-slate-800 hover:-translate-y-1 dark:bg-white dark:text-slate-900"
              >
                {isBackingUp ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                {isBackingUp ? "Processing..." : "Download Backup"}
              </a>
            </div>

            {/* RESTORE */}
            <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-700 dark:bg-slate-800">
              <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-50 text-orange-600 dark:bg-orange-900/20">
                <Upload className="h-8 w-8" />
              </div>
              <h3 className="mb-2 text-xl font-bold text-slate-900 dark:text-white">
                Restore Database
              </h3>
              <p className="mb-6 text-sm text-slate-500">
                Upload .db untuk menimpa data saat ini.
              </p>

              {isRestoring ? (
                <div className="w-full space-y-2">
                  <div className="flex justify-between text-xs font-bold text-orange-600">
                    <span>Uploading...</span>
                    <span>{restoreProgress}%</span>
                  </div>
                  <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-orange-500 transition-all duration-200"
                      style={{ width: `${restoreProgress}%` }}
                    ></div>
                  </div>
                </div>
              ) : (
                <label className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-orange-200 bg-orange-50 py-3 text-sm font-bold text-orange-600 hover:bg-orange-100 dark:border-orange-900/50 dark:bg-orange-900/10">
                  <AlertTriangle className="h-4 w-4" /> Pilih File & Restore
                  <input
                    type="file"
                    accept=".db"
                    className="hidden"
                    ref={fileInputRef}
                    onChange={handleRestore}
                  />
                </label>
              )}
            </div>
          </div>

          {/* HISTORY */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-lg font-bold text-slate-700 dark:text-slate-300">
                <History className="h-5 w-5" /> Riwayat Backup
              </h3>
              {historyLogs.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    if (confirm("Hapus semua log riwayat?")) {
                      handleDelete(
                        "history",
                        historyLogs.map((h) => h.id),
                      );
                    }
                  }}
                  className="flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-red-500"
                >
                  <RefreshCcw className="h-3 w-3" /> Bersihkan Log
                </button>
              )}
            </div>
            <DataTable
              data={historyLogs}
              columns={[
                {
                  header: "Tipe",
                  accessor: (item) => (
                    <span className="font-bold uppercase text-xs">
                      {item.action_type}
                    </span>
                  ),
                },
                { header: "File", accessor: "filename" },
                { header: "Status", accessor: "status" },
                {
                  header: "Waktu",
                  accessor: (item) =>
                    new Date(item.created_at).toLocaleString(),
                },
              ]}
              onDelete={(id) => handleDelete("history", [id])}
              onBulkDelete={(ids) => handleDelete("history", ids)}
            />
          </div>
        </div>
      )}

      {/* EDIT MODAL (Simplified for brevity, ensure form logic matches handleUpdate) */}
      {isModalOpen && editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-800">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                handleUpdate(
                  activeTab === "rsvp" ? "rsvp" : "wish",
                  editingItem.id,
                  Object.fromEntries(formData),
                );
              }}
            >
              <h3 className="text-lg font-bold mb-4">Edit Data</h3>
              {/* Render input fields based on activeTab (like previous code) */}
              {activeTab === "rsvp" ? (
                <div className="space-y-4">
                  <input
                    name="guest_name"
                    defaultValue={editingItem.guest_name}
                    className="w-full border p-2 rounded"
                    placeholder="Nama"
                    required
                  />
                  <select
                    name="attendance"
                    defaultValue={editingItem.attendance}
                    className="w-full border p-2 rounded"
                  >
                    <option value="hadir">Hadir</option>
                    <option value="ragu">Ragu</option>
                    <option value="tidak_hadir">Tidak Hadir</option>
                  </select>
                  <input
                    type="number"
                    name="guest_count"
                    defaultValue={editingItem.guest_count}
                    className="w-full border p-2 rounded"
                    placeholder="Pax"
                  />
                  <textarea
                    name="message"
                    defaultValue={editingItem.message}
                    className="w-full border p-2 rounded"
                    placeholder="Pesan"
                  ></textarea>
                </div>
              ) : (
                <div className="space-y-4">
                  <input
                    name="name"
                    defaultValue={editingItem.name}
                    className="w-full border p-2 rounded"
                    placeholder="Nama"
                    required
                  />
                  <textarea
                    name="message"
                    defaultValue={editingItem.message}
                    className="w-full border p-2 rounded"
                    placeholder="Ucapan"
                    required
                  ></textarea>
                </div>
              )}
              <div className="mt-6 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded text-slate-500"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="bg-blue-600 text-white px-4 py-2 rounded font-bold"
                >
                  {isSaving ? "Menyimpan..." : "Simpan"}
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
