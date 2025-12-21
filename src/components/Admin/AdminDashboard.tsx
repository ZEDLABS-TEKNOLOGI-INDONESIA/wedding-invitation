import React, { useState, useMemo } from "react";
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

// --- SHARED TABLE COMPONENT ---
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
  onEdit: (item: T) => void;
  onDelete: (id: number) => void;
  onBulkDelete: (ids: number[]) => void;
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
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
          >
            {[5, 10, 25, 50, 100].map((size) => (
              <option key={size} value={size}>
                {size} Data
              </option>
            ))}
          </select>
          {selected.length > 0 && (
            <button
              onClick={() => {
                if (confirm(`Hapus ${selected.length} data terpilih?`)) {
                  onBulkDelete(selected);
                  setSelected([]);
                }
              }}
              className="flex items-center gap-2 rounded-lg bg-red-100 px-4 py-2 text-xs font-bold text-red-600 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400"
            >
              <Trash2 className="h-3.5 w-3.5" /> Hapus ({selected.length})
            </button>
          )}
        </div>
        <div className="relative">
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari data..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
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
                <th className="w-4 px-6 py-4">
                  <input
                    type="checkbox"
                    onChange={handleSelectAll}
                    checked={
                      paginatedData.length > 0 &&
                      paginatedData.every((d) => selected.includes(d.id))
                    }
                  />
                </th>
                {columns.map((col, idx) => (
                  <th
                    key={idx}
                    className={`px-6 py-4 font-bold ${col.className || ""}`}
                  >
                    {col.header}
                  </th>
                ))}
                <th className="px-6 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {paginatedData.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length + 2}
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
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={selected.includes(item.id)}
                        onChange={() => handleSelectOne(item.id)}
                      />
                    </td>
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
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => onEdit(item)}
                          className="rounded p-1.5 text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20"
                          title="Edit"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm("Yakin hapus data ini?"))
                              onDelete(item.id);
                          }}
                          className="rounded p-1.5 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                          title="Hapus"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
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
          Menampilkan{" "}
          {filteredData.length === 0 ? 0 : (page - 1) * pageSize + 1} -{" "}
          {Math.min(page * pageSize, filteredData.length)} dari{" "}
          {filteredData.length} Data
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1}
            className="rounded-lg border border-slate-200 px-3 py-1.5 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:hover:bg-slate-800"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="flex items-center px-2 text-sm font-bold">
            {page}
          </span>
          <button
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

// --- MAIN DASHBOARD ---
const AdminDashboard = ({
  initialRsvps,
  initialWishes,
  siteUrl,
}: {
  initialRsvps: RSVP[];
  initialWishes: Wish[];
  siteUrl: string;
}) => {
  const [activeTab, setActiveTab] = useState<"rsvp" | "wishes" | "qr" | "pdf">(
    "rsvp",
  );
  const [rsvps, setRsvps] = useState(initialRsvps);
  const [wishes, setWishes] = useState(initialWishes);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // --- ACTIONS ---
  const handleUpdate = async (type: "rsvp" | "wish", id: number, data: any) => {
    setIsSaving(true);
    try {
      await fetch("/api/admin", {
        method: "POST",
        body: JSON.stringify({
          action: type === "rsvp" ? "update_rsvp" : "update_wish",
          id,
          data,
        }),
      });
      // Refresh local state
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
    } catch (error) {
      alert("Gagal menyimpan data");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (type: "rsvp" | "wish", ids: number[]) => {
    try {
      await fetch("/api/admin", {
        method: "POST",
        body: JSON.stringify({
          action: type === "rsvp" ? "delete_rsvp" : "delete_wish",
          ids,
        }),
      });
      if (type === "rsvp") {
        setRsvps((prev) => prev.filter((item) => !ids.includes(item.id)));
      } else {
        setWishes((prev) => prev.filter((item) => !ids.includes(item.id)));
      }
    } catch (error) {
      alert("Gagal menghapus data");
    }
  };

  // --- TABS CONFIG ---
  const tabs = [
    { id: "rsvp", label: "Data RSVP", icon: Users },
    { id: "wishes", label: "Ucapan & Doa", icon: MessageCircle },
    { id: "qr", label: "QR Generator", icon: QrCode },
    { id: "pdf", label: "Design PDF", icon: Printer },
  ];

  return (
    <div>
      {/* Tab Navigation */}
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

      {/* CONTENT: RSVP */}
      {activeTab === "rsvp" && (
        <div className="space-y-6">
          <div className="flex justify-end">
            <a
              href="/api/export-rsvp"
              target="_blank"
              className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-xs font-bold text-white hover:bg-green-700"
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
        <div className="space-y-6">
          <div className="flex justify-end">
            <a
              href="/api/export-wishes"
              target="_blank"
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700"
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

      {/* CONTENT: QR & PDF */}
      {activeTab === "qr" && (
        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <QRCodeManager siteUrl={siteUrl} />
        </div>
      )}

      {activeTab === "pdf" && (
        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <InvitationManager />
        </div>
      )}

      {/* EDIT MODAL */}
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
                      className="w-full rounded-lg border p-2 dark:bg-slate-700 dark:text-white"
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
                        className="w-full rounded-lg border p-2 dark:bg-slate-700 dark:text-white"
                      >
                        <option value="hadir">Hadir</option>
                        <option value="ragu">Ragu</option>
                        <option value="tidak_hadir">Tidak Hadir</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold uppercase text-slate-500">
                        Jumlah Pax
                      </label>
                      <input
                        type="number"
                        name="guest_count"
                        defaultValue={editingItem.guest_count}
                        min={1}
                        className="w-full rounded-lg border p-2 dark:bg-slate-700 dark:text-white"
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
                      className="w-full rounded-lg border p-2 dark:bg-slate-700 dark:text-white"
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
                      className="w-full rounded-lg border p-2 dark:bg-slate-700 dark:text-white"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase text-slate-500">
                      Ucapan & Doa
                    </label>
                    <textarea
                      name="message"
                      defaultValue={editingItem.message}
                      className="w-full rounded-lg border p-2 dark:bg-slate-700 dark:text-white"
                      rows={5}
                      required
                    ></textarea>
                  </div>
                </>
              )}

              <div className="mt-6 flex justify-end gap-3 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-lg px-4 py-2 text-sm font-bold text-slate-500 hover:bg-slate-100"
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
