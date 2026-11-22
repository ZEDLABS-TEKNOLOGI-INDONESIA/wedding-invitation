import FileSaver from "file-saver";
import {
  CheckCircle2,
  Clock,
  Eye,
  FileText,
  Loader2,
  RefreshCcw,
  Send,
  Trash2,
  Upload,
  XCircle,
} from "lucide-react";
import Papa from "papaparse";
import React, { useCallback, useEffect, useState } from "react";

interface GuestInviteRow {
  name: string;
  phone: string;
  address: string;
}

interface WaInvitationRecord {
  id: number;
  guest_name: string;
  phone: string;
  address: string;
  invitation_url: string;
  job_id: string;
  reference_id: string;
  status: string;
  error_message: string;
  created_at: string;
  updated_at: string;
}

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  queued: {
    label: "Antre",
    className: "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200",
  },
  processing: {
    label: "Diproses",
    className: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  },
  sent: {
    label: "Terkirim",
    className: "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300",
  },
  delivered: {
    label: "Sampai",
    className:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  },
  read: {
    label: "Dibaca",
    className:
      "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  },
  failed: {
    label: "Gagal",
    className: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  },
};

const WhatsAppManager: React.FC<{ siteUrl: string }> = ({ siteUrl }) => {
  const [activeMode, setActiveMode] = useState<"single" | "bulk">("single");
  const [singleForm, setSingleForm] = useState<GuestInviteRow>({
    name: "",
    phone: "",
    address: "Di Tempat",
  });
  const [attachQr, setAttachQr] = useState(true);
  const [bulkGuests, setBulkGuests] = useState<GuestInviteRow[]>([]);
  const [isReadingCsv, setIsReadingCsv] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [bulkProgress, setBulkProgress] = useState(0);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const [history, setHistory] = useState<WaInvitationRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [refreshingStatus, setRefreshingStatus] = useState(false);
  const [resendingId, setResendingId] = useState<number | null>(null);

  const baseUrl = siteUrl?.endsWith("/") ? siteUrl.slice(0, -1) : siteUrl || "";

  const loadHistory = useCallback(async () => {
    try {
      const res = await fetch("/api/whatsapp/invitations", {
        credentials: "include",
      });
      if (res.ok) {
        const data = (await res.json()) as WaInvitationRecord[];
        setHistory(data);
      }
    } catch {
      // ignore initial load error
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const handleSaveAs = (blob: Blob, filename: string) => {
    const saveAsFunc = (FileSaver as any).saveAs || FileSaver;
    saveAsFunc(blob, filename);
  };

  const downloadCsvTemplate = () => {
    const csvContent =
      "Nama Tamu,No WhatsApp,Alamat (Opsional)\nBapak Ahmad & Ibu Siti,081234567890,Jakarta\nRina Kusuma,6289876543210,Di Tempat";
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    handleSaveAs(blob, "template_undangan_whatsapp.csv");
  };

  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setIsReadingCsv(true);
    setFeedback(null);

    Papa.parse(file, {
      header: false,
      complete: (results) => {
        const parsed: GuestInviteRow[] = [];
        for (const row of results.data as unknown[]) {
          if (!Array.isArray(row)) continue;
          const name = typeof row[0] === "string" ? row[0].trim() : "";
          const phone =
            typeof row[1] === "string" || typeof row[1] === "number"
              ? String(row[1]).trim()
              : "";
          const address =
            typeof row[2] === "string" && row[2].trim()
              ? row[2].trim()
              : "Di Tempat";

          if (!name || name.toLowerCase().includes("nama tamu")) continue;
          parsed.push({ name, phone, address });
        }
        setBulkGuests(parsed);
        setIsReadingCsv(false);
      },
      error: () => {
        setFeedback({
          type: "error",
          message: "Gagal membaca file CSV. Pastikan format file valid.",
        });
        setIsReadingCsv(false);
      },
    });
  };

  const sendSingle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!singleForm.name.trim() || !singleForm.phone.trim()) return;
    setIsSending(true);
    setFeedback(null);

    try {
      const res = await fetch("/api/whatsapp/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          guests: [singleForm],
          siteUrl: baseUrl,
          attachQr,
        }),
      });
      const payload = await res.json().catch(() => ({}));
      if (res.ok && payload.queued > 0) {
        setFeedback({
          type: "success",
          message: `Undangan untuk ${singleForm.name.trim()} berhasil masuk antrean WhatsApp Gateway.`,
        });
        setSingleForm({ name: "", phone: "", address: "Di Tempat" });
        await loadHistory();
      } else {
        const detail =
          payload?.results?.[0]?.error_message ||
          payload?.error ||
          "Gagal mengirim undangan.";
        setFeedback({ type: "error", message: detail });
        await loadHistory();
      }
    } catch {
      setFeedback({
        type: "error",
        message: "Gagal terhubung ke server saat mengirim undangan.",
      });
    } finally {
      setIsSending(false);
    }
  };

  const sendBulk = async () => {
    if (bulkGuests.length === 0) return;
    setIsSending(true);
    setBulkProgress(0);
    setFeedback(null);

    let totalQueued = 0;
    let totalFailed = 0;
    const CHUNK_SIZE = 20;

    try {
      for (let i = 0; i < bulkGuests.length; i += CHUNK_SIZE) {
        const chunk = bulkGuests.slice(i, i + CHUNK_SIZE);
        const res = await fetch("/api/whatsapp/invitations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            guests: chunk,
            siteUrl: baseUrl,
            attachQr,
          }),
        });
        const payload = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(
            payload?.error || "Gagal mengirim batch undangan WhatsApp."
          );
        }
        totalQueued += Number(payload.queued || 0);
        totalFailed += Number(payload.failed || 0);
        setBulkProgress(
          Math.round(
            (Math.min(i + chunk.length, bulkGuests.length) / bulkGuests.length) *
              100
          )
        );
      }

      setFeedback({
        type: totalFailed === 0 ? "success" : "error",
        message: `Selesai diproses: ${totalQueued} masuk antrean, ${totalFailed} gagal. Periksa tabel riwayat di bawah untuk detailnya.`,
      });
      if (totalQueued > 0) setBulkGuests([]);
      await loadHistory();
    } catch (err) {
      setFeedback({
        type: "error",
        message:
          err instanceof Error
            ? err.message
            : "Terjadi kesalahan saat pengiriman massal.",
      });
      await loadHistory();
    } finally {
      setIsSending(false);
    }
  };

  const refreshStatuses = async () => {
    setRefreshingStatus(true);
    try {
      const res = await fetch("/api/whatsapp/status", {
        method: "POST",
        credentials: "include",
      });
      const payload = await res.json().catch(() => ({}));
      if (res.ok && Array.isArray(payload.invitations)) {
        setHistory(payload.invitations);
      } else if (payload?.error) {
        setFeedback({ type: "error", message: payload.error });
      }
    } catch {
      setFeedback({
        type: "error",
        message: "Gagal memperbarui status dari Gateway.",
      });
    } finally {
      setRefreshingStatus(false);
    }
  };

  const resendRow = async (row: WaInvitationRecord) => {
    setResendingId(row.id);
    setFeedback(null);
    try {
      const res = await fetch("/api/whatsapp/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          guests: [
            { name: row.guest_name, phone: row.phone, address: row.address },
          ],
          siteUrl: baseUrl,
          attachQr,
        }),
      });
      const payload = await res.json().catch(() => ({}));
      if (res.ok && payload.queued > 0) {
        setFeedback({
          type: "success",
          message: `Undangan untuk ${row.guest_name} dikirim ulang ke antrean.`,
        });
      } else {
        setFeedback({
          type: "error",
          message:
            payload?.results?.[0]?.error_message ||
            payload?.error ||
            "Gagal mengirim ulang.",
        });
      }
      await loadHistory();
    } finally {
      setResendingId(null);
    }
  };

  const deleteRow = async (id: number) => {
    if (!confirm("Hapus catatan riwayat pengiriman ini?")) return;
    const res = await fetch("/api/whatsapp/invitations", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ ids: [id] }),
    });
    if (res.ok) {
      setHistory((prev) => prev.filter((item) => item.id !== id));
    }
  };

  const previewLink = singleForm.name.trim()
    ? `${baseUrl}/?to=${encodeURIComponent(singleForm.name.trim())}`
    : baseUrl;

  return (
    <div className="space-y-8">
      <div className="space-y-2 text-center">
        <h3 className="font-serif text-3xl font-bold text-slate-900 italic dark:text-white">
          Kirim Undangan via WhatsApp
        </h3>
        <p className="mx-auto max-w-2xl text-sm text-slate-500 dark:text-slate-400">
          Kirim tautan undangan personal secara otomatis melalui antrean
          WhatsApp Gateway (<code>whatsapp.zedlabs.id</code>). Pastikan
          kredensial sudah diatur dan template telah disinkronkan di tab{" "}
          <strong>Pengaturan</strong>.
        </p>
      </div>

      {feedback && (
        <div
          role="alert"
          className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-sm font-medium ${
            feedback.type === "success"
              ? "border-green-200 bg-green-50 text-green-700 dark:border-green-900/40 dark:bg-green-900/20 dark:text-green-300"
              : "border-red-200 bg-red-50 text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-300"
          }`}
        >
          {feedback.type === "success" ? (
            <CheckCircle2 className="h-4 w-4 shrink-0" />
          ) : (
            <XCircle className="h-4 w-4 shrink-0" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
        <div className="inline-flex rounded-xl bg-slate-100 p-1 dark:bg-slate-900">
          <button
            type="button"
            onClick={() => setActiveMode("single")}
            className={`rounded-lg px-5 py-2 text-sm font-bold transition-all ${
              activeMode === "single"
                ? "bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white"
                : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            Kirim Satuan
          </button>
          <button
            type="button"
            onClick={() => setActiveMode("bulk")}
            className={`rounded-lg px-5 py-2 text-sm font-bold transition-all ${
              activeMode === "bulk"
                ? "bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white"
                : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            Kirim Massal (CSV)
          </button>
        </div>

        <label className="inline-flex cursor-pointer items-center gap-2.5 text-sm font-medium text-slate-700 dark:text-slate-300">
          <input
            type="checkbox"
            checked={attachQr}
            onChange={(e) => setAttachQr(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-green-600 focus:ring-green-500"
          />
          Lampirkan gambar QR Code undangan
        </label>
      </div>

      {activeMode === "single" ? (
        <form
          onSubmit={sendSingle}
          className="grid gap-6 rounded-2xl border border-slate-200 bg-slate-50/70 p-6 md:grid-cols-2 dark:border-slate-700 dark:bg-slate-900/40"
        >
          <div className="space-y-4">
            <div>
              <label
                htmlFor="wa-guest-name"
                className="mb-1.5 block text-xs font-bold text-slate-500 uppercase"
              >
                Nama Tamu
              </label>
              <input
                id="wa-guest-name"
                type="text"
                required
                maxLength={100}
                value={singleForm.name}
                onChange={(e) =>
                  setSingleForm({ ...singleForm, name: e.target.value })
                }
                placeholder="Contoh: Bpk. Ahmad & Ibu Siti"
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-green-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>
            <div>
              <label
                htmlFor="wa-guest-phone"
                className="mb-1.5 block text-xs font-bold text-slate-500 uppercase"
              >
                Nomor WhatsApp
              </label>
              <input
                id="wa-guest-phone"
                type="tel"
                required
                maxLength={25}
                value={singleForm.phone}
                onChange={(e) =>
                  setSingleForm({ ...singleForm, phone: e.target.value })
                }
                placeholder="081234567890 atau 6281234567890"
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-green-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>
            <div>
              <label
                htmlFor="wa-guest-address"
                className="mb-1.5 block text-xs font-bold text-slate-500 uppercase"
              >
                Alamat / Kota (Opsional)
              </label>
              <input
                id="wa-guest-address"
                type="text"
                maxLength={120}
                value={singleForm.address}
                onChange={(e) =>
                  setSingleForm({ ...singleForm, address: e.target.value })
                }
                placeholder="Di Tempat"
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-green-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>
          </div>

          <div className="flex flex-col justify-between space-y-4">
            <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase">
                <Eye className="h-3.5 w-3.5" /> Pratinjau Tautan Personal
              </div>
              <p className="font-mono text-xs break-all text-slate-600 dark:text-slate-300">
                {previewLink}
              </p>
              <p className="pt-2 text-xs text-slate-500 dark:text-slate-400">
                Gateway akan memilih salah satu dari 3 varian template{" "}
                <code>wedding_undangan_tamu</code> secara otomatis dengan antrean
                aman.
              </p>
            </div>

            <button
              type="submit"
              disabled={isSending || !singleForm.name.trim() || !singleForm.phone.trim()}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-green-600 px-6 py-3.5 text-xs font-bold tracking-wider text-white uppercase shadow-lg transition-all hover:bg-green-700 disabled:opacity-50"
            >
              {isSending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              {isSending ? "Mengirim ke Antrean..." : "Kirim Undangan WhatsApp"}
            </button>
          </div>
        </form>
      ) : (
        <div className="space-y-6">
          {bulkGuests.length === 0 ? (
            <div className="space-y-5 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-8 text-center dark:border-slate-700 dark:bg-slate-900/40">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400">
                {isReadingCsv ? (
                  <Loader2 className="h-7 w-7 animate-spin" />
                ) : (
                  <Upload className="h-7 w-7" />
                )}
              </div>
              <div className="space-y-1">
                <h4 className="text-lg font-bold text-slate-800 dark:text-white">
                  Upload Daftar Tamu CSV
                </h4>
                <p className="mx-auto max-w-md text-sm text-slate-500 dark:text-slate-400">
                  Format: <strong>Kolom 1: Nama Tamu</strong> |{" "}
                  <strong>Kolom 2: No WhatsApp</strong> |{" "}
                  <strong>Kolom 3: Alamat (Opsional)</strong>
                </p>
              </div>
              <div className="flex flex-wrap justify-center gap-3">
                <button
                  type="button"
                  onClick={downloadCsvTemplate}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
                >
                  <FileText className="h-4 w-4" /> Download Template CSV
                </button>
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-green-600 px-6 py-2.5 text-xs font-bold text-white shadow-md hover:bg-green-700">
                  Pilih File CSV
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleCsvUpload}
                    className="hidden"
                    disabled={isReadingCsv}
                  />
                </label>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-green-100 bg-green-50 p-4 dark:border-green-900/30 dark:bg-green-900/10">
                <div className="flex items-center gap-3">
                  <span className="rounded-lg bg-green-100 px-3 py-1.5 text-sm font-bold text-green-700 dark:bg-green-900/40 dark:text-green-300">
                    {bulkGuests.length} Tamu
                  </span>
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                    Siap dimasukkan ke antrean WhatsApp Gateway
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={isSending}
                    onClick={() => setBulkGuests([])}
                    className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-xs font-bold text-red-600 hover:bg-red-100 disabled:opacity-50 dark:border-red-900/30 dark:bg-red-900/20 dark:text-red-400"
                  >
                    Reset
                  </button>
                  <button
                    type="button"
                    disabled={isSending}
                    onClick={sendBulk}
                    className="inline-flex items-center gap-2 rounded-xl bg-green-600 px-6 py-2 text-xs font-bold text-white shadow-md hover:bg-green-700 disabled:opacity-50"
                  >
                    {isSending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                    {isSending ? `Mengirim (${bulkProgress}%)...` : "Kirim Semua"}
                  </button>
                </div>
              </div>

              {isSending && (
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                  <div
                    className="h-full bg-green-600 transition-all duration-300"
                    style={{ width: `${bulkProgress}%` }}
                  />
                </div>
              )}

              <div className="custom-scrollbar max-h-64 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-700">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 uppercase dark:bg-slate-900/60 dark:text-slate-400">
                    <tr>
                      <th className="px-4 py-3">#</th>
                      <th className="px-4 py-3">Nama Tamu</th>
                      <th className="px-4 py-3">No WhatsApp</th>
                      <th className="px-4 py-3">Alamat</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                    {bulkGuests.map((g, i) => (
                      <tr key={i}>
                        <td className="px-4 py-2.5 text-slate-400">{i + 1}</td>
                        <td className="px-4 py-2.5 font-medium">{g.name}</td>
                        <td className="px-4 py-2.5 font-mono">{g.phone || "-"}</td>
                        <td className="px-4 py-2.5 text-slate-500">
                          {g.address}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Riwayat & Status Pengiriman */}
      <div className="space-y-4 border-t border-slate-200 pt-6 dark:border-slate-700">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h4 className="font-serif text-xl font-bold text-slate-900 italic dark:text-white">
              Riwayat Pengiriman Undangan
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Total {history.length} catatan pengiriman terbaru
            </p>
          </div>
          <button
            type="button"
            onClick={refreshStatuses}
            disabled={refreshingStatus || history.length === 0}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            <RefreshCcw
              className={`h-3.5 w-3.5 ${refreshingStatus ? "animate-spin" : ""}`}
            />
            Perbarui Status
          </button>
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500 uppercase dark:bg-slate-900/50 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-3">Tamu</th>
                  <th className="px-4 py-3">WhatsApp</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Waktu</th>
                  <th className="px-4 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {loadingHistory ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center">
                      <Loader2 className="mx-auto h-5 w-5 animate-spin text-slate-400" />
                    </td>
                  </tr>
                ) : history.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-8 text-center text-xs text-slate-400"
                    >
                      Belum ada undangan yang dikirim lewat WhatsApp.
                    </td>
                  </tr>
                ) : (
                  history.map((row) => {
                    const badge = STATUS_BADGE[row.status] || STATUS_BADGE.queued;
                    return (
                      <tr
                        key={row.id}
                        className="hover:bg-slate-50 dark:hover:bg-slate-700/40"
                      >
                        <td className="px-4 py-3">
                          <div className="font-medium text-slate-900 dark:text-white">
                            {row.guest_name}
                          </div>
                          {row.error_message && (
                            <div className="mt-0.5 text-xs text-red-500">
                              {row.error_message}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-slate-600 dark:text-slate-300">
                          {row.phone}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase ${badge.className}`}
                          >
                            {row.status === "queued" && (
                              <Clock className="h-3 w-3" />
                            )}
                            {badge.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500">
                          {new Date(row.created_at).toLocaleString("id-ID", {
                            day: "2-digit",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-1.5">
                            {row.status === "failed" && (
                              <button
                                type="button"
                                aria-label={`Kirim ulang ke ${row.guest_name}`}
                                disabled={resendingId === row.id}
                                onClick={() => resendRow(row)}
                                className="rounded p-1.5 text-green-600 hover:bg-green-50 disabled:opacity-50 dark:text-green-400 dark:hover:bg-green-900/20"
                                title="Kirim Ulang"
                              >
                                {resendingId === row.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <RefreshCcw className="h-4 w-4" />
                                )}
                              </button>
                            )}
                            <button
                              type="button"
                              aria-label={`Hapus riwayat ${row.guest_name}`}
                              onClick={() => deleteRow(row.id)}
                              className="rounded p-1.5 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                              title="Hapus"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WhatsAppManager;
