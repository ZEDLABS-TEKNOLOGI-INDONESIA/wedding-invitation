import {
  Camera,
  CameraOff,
  CheckCircle2,
  Copy,
  Download,
  Edit,
  Loader2,
  Minus,
  Plus,
  QrCode,
  RotateCcw,
  Search,
  Send,
  Trash2,
  Upload,
  UserCheck,
  Users,
  X,
} from "lucide-react";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  parseGuestsText,
  type ParsedGuestRow,
} from "../utils/csvImport";
import { GUEST_GROUP_PRESETS } from "../utils/formHelpers";
import {
  ConfirmModal,
  ToastBanner,
  type ConfirmDialogState,
  type ToastState,
} from "./Admin/AdminFeedback";
import CsvImportModal from "./Admin/CsvImportModal";

interface GuestItem {
  id: number;
  code: string;
  name: string;
  phone: string;
  address: string;
  group_name: string;
  quota: number;
  checked_in: number;
  checked_in_at: string;
  checked_in_pax: number;
  created_at: string;
}

interface GuestManagerProps {
  siteUrl: string;
  initialSubTab?: "list" | "scanner";
}

const GuestManager: React.FC<GuestManagerProps> = ({
  siteUrl,
  initialSubTab = "list",
}) => {
  const [subTab, setSubTab] = useState<"list" | "scanner">(initialSubTab);
  const [guests, setGuests] = useState<GuestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<
    "all" | "checked" | "pending"
  >("all");
  const [toast, setToast] = useState<ToastState | null>(null);
  const [confirmDialog, setConfirmDialog] =
    useState<ConfirmDialogState | null>(null);
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);

  // Add guest form
  const [newGuest, setNewGuest] = useState({
    name: "",
    phone: "",
    address: "Di Tempat",
    group_name: "",
    quota: 2,
  });
  const [savingGuest, setSavingGuest] = useState(false);
  const [sendingWaId, setSendingWaId] = useState<number | null>(null);

  // Edit guest modal
  const [editingGuest, setEditingGuest] = useState<GuestItem | null>(null);
  const [updatingGuest, setUpdatingGuest] = useState(false);

  // Scanner state
  const [scanInput, setScanInput] = useState("");
  const [scanPax, setScanPax] = useState(2);
  const [checkingIn, setCheckingIn] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<{
    type: "success" | "warning" | "not_found";
    title: string;
    detail: string;
    suggestedName?: string;
  } | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastScannedRef = useRef<{ value: string; time: number }>({
    value: "",
    time: 0,
  });

  const baseUrl = siteUrl?.endsWith("/") ? siteUrl.slice(0, -1) : siteUrl || "";

  const loadGuests = useCallback(async () => {
    try {
      const res = await fetch("/api/guests", { credentials: "include" });
      if (res.ok) {
        const data = (await res.json()) as GuestItem[];
        setGuests(data);
      }
    } catch {
      // ignore initial error
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadGuests();
  }, [loadGuests]);

  useEffect(() => {
    if (!editingGuest) return;
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setEditingGuest(null);
    };
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [editingGuest]);

  const stopCamera = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  }, []);

  useEffect(() => {
    if (subTab !== "scanner") {
      stopCamera();
    }
    return () => stopCamera();
  }, [subTab, stopCamera]);

  const stats = useMemo(() => {
    const checked = guests.filter((g) => g.checked_in === 1);
    return {
      total: guests.length,
      checkedIn: checked.length,
      pending: guests.length - checked.length,
      totalPax: checked.reduce((sum, g) => sum + (g.checked_in_pax || 1), 0),
    };
  }, [guests]);

  const filteredGuests = useMemo(() => {
    return guests.filter((g) => {
      if (filterStatus === "checked" && g.checked_in !== 1) return false;
      if (filterStatus === "pending" && g.checked_in === 1) return false;
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        g.name.toLowerCase().includes(q) ||
        g.code.toLowerCase().includes(q) ||
        g.phone.toLowerCase().includes(q) ||
        g.group_name.toLowerCase().includes(q) ||
        g.address.toLowerCase().includes(q)
      );
    });
  }, [guests, filterStatus, search]);

  const scannerSuggestions = useMemo(() => {
    const q = scanInput.trim().toLowerCase();
    if (!q || q.startsWith("http")) return [];
    return guests
      .filter(
        (g) =>
          g.checked_in === 0 &&
          (g.name.toLowerCase().includes(q) ||
            g.code.toLowerCase().includes(q) ||
            g.group_name.toLowerCase().includes(q))
      )
      .slice(0, 6);
  }, [guests, scanInput]);

  const guestInviteLink = (g: GuestItem) =>
    `${baseUrl}/?to=${encodeURIComponent(g.name)}&code=${encodeURIComponent(g.code)}`;

  const handleAddGuest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGuest.name.trim()) return;
    setSavingGuest(true);
    try {
      const res = await fetch("/api/guests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(newGuest),
      });
      const payload = await res.json().catch(() => ({}));
      if (res.ok) {
        setToast({
          type: "success",
          message: `Tamu "${newGuest.name.trim()}" berhasil ditambahkan.`,
        });
        setNewGuest({
          name: "",
          phone: "",
          address: "Di Tempat",
          group_name: "",
          quota: 2,
        });
        await loadGuests();
      } else {
        setToast({
          type: "error",
          message: payload?.error || "Gagal menambah tamu.",
        });
      }
    } catch {
      setToast({ type: "error", message: "Gagal terhubung ke server." });
    } finally {
      setSavingGuest(false);
    }
  };

  const handleUpdateGuest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGuest || !editingGuest.name.trim()) return;
    setUpdatingGuest(true);
    try {
      const res = await fetch("/api/guests", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          id: editingGuest.id,
          action: "update",
          name: editingGuest.name,
          phone: editingGuest.phone,
          address: editingGuest.address,
          group_name: editingGuest.group_name,
          quota: editingGuest.quota,
        }),
      });
      const payload = await res.json().catch(() => ({}));
      if (res.ok && payload.guest) {
        setGuests((prev) =>
          prev.map((g) => (g.id === editingGuest.id ? payload.guest : g))
        );
        setToast({
          type: "success",
          message: `Data tamu "${editingGuest.name.trim()}" berhasil diperbarui.`,
        });
        setEditingGuest(null);
      } else {
        setToast({
          type: "error",
          message: payload?.error || "Gagal memperbarui tamu.",
        });
      }
    } catch {
      setToast({ type: "error", message: "Gagal terhubung ke server." });
    } finally {
      setUpdatingGuest(false);
    }
  };

  const handleConfirmCsvImport = async (rows: ParsedGuestRow[]) => {
    const CHUNK_SIZE = 200;
    let totalImported = 0;

    for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
      const chunk = rows.slice(i, i + CHUNK_SIZE);
      const res = await fetch("/api/guests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ guests: chunk }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(payload?.error || "Gagal mengimpor data tamu.");
      }
      totalImported += Number(payload.count || chunk.length);
    }

    setToast({
      type: "success",
      message: `${totalImported} tamu berhasil diimpor ke database.`,
    });
    await loadGuests();
  };

  const toggleManualCheckin = async (guest: GuestItem) => {
    const action = guest.checked_in === 1 ? "undo_checkin" : "checkin";
    try {
      const res = await fetch("/api/guests", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          id: guest.id,
          action,
          checked_in_pax: guest.quota || 1,
        }),
      });
      if (res.ok) {
        const payload = await res.json();
        setGuests((prev) =>
          prev.map((item) => (item.id === guest.id ? payload.guest : item))
        );
        setToast({
          type: "success",
          message:
            action === "checkin"
              ? `${guest.name} ditandai hadir.`
              : `Status check-in ${guest.name} dibatalkan.`,
        });
      }
    } catch {
      setToast({
        type: "error",
        message: "Gagal memperbarui status check-in.",
      });
    }
  };

  const sendWaInviteForGuest = async (guest: GuestItem) => {
    if (!guest.phone.trim()) {
      setToast({
        type: "error",
        message: `Nomor WhatsApp untuk ${guest.name} belum diisi.`,
      });
      return;
    }
    setSendingWaId(guest.id);
    try {
      const res = await fetch("/api/whatsapp/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          guests: [
            {
              name: guest.name,
              phone: guest.phone,
              address: guest.address,
            },
          ],
          siteUrl: baseUrl,
          attachQr: true,
        }),
      });
      const payload = await res.json().catch(() => ({}));
      if (res.ok && payload.queued > 0) {
        setToast({
          type: "success",
          message: `Undangan WhatsApp untuk ${guest.name} masuk antrean.`,
        });
      } else {
        setToast({
          type: "error",
          message:
            payload?.results?.[0]?.error_message ||
            payload?.error ||
            "Gagal mengirim undangan WhatsApp.",
        });
      }
    } catch {
      setToast({ type: "error", message: "Gagal terhubung ke server." });
    } finally {
      setSendingWaId(null);
    }
  };

  const deleteGuest = (guest: GuestItem) => {
    setConfirmDialog({
      title: "Hapus Tamu",
      message: `Yakin ingin menghapus "${guest.name}" dari daftar tamu permanen?`,
      confirmLabel: "Hapus",
      destructive: true,
      onConfirm: async () => {
        const res = await fetch("/api/guests", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ ids: [guest.id] }),
        });
        if (res.ok) {
          setGuests((prev) => prev.filter((item) => item.id !== guest.id));
          setToast({ type: "success", message: `${guest.name} telah dihapus.` });
        } else {
          setToast({ type: "error", message: "Gagal menghapus tamu." });
        }
      },
    });
  };

  const processCheckin = useCallback(
    async (query: string, pax: number, autoCreate = false) => {
      if (!query.trim()) return;
      setCheckingIn(true);
      setScanResult(null);
      try {
        const res = await fetch("/api/checkin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ query, pax, autoCreate }),
        });
        const payload = await res.json().catch(() => ({}));
        if (res.ok && payload.guest) {
          const g = payload.guest as GuestItem;
          if (payload.alreadyCheckedIn) {
            setScanResult({
              type: "warning",
              title: `${g.name} Sudah Check-In`,
              detail: `Tercatat hadir (${g.checked_in_pax} pax) pada ${new Date(
                g.checked_in_at
              ).toLocaleTimeString("id-ID", {
                hour: "2-digit",
                minute: "2-digit",
              })}.`,
            });
          } else {
            setScanResult({
              type: "success",
              title: `Selamat Datang, ${g.name}!`,
              detail: `${g.checked_in_pax} pax tercatat hadir${g.group_name ? ` · Grup: ${g.group_name}` : ""}.`,
            });
          }
          setScanInput("");
          await loadGuests();
        } else if (res.status === 404 && payload.suggestedName) {
          setScanResult({
            type: "not_found",
            title: "Tamu Belum Terdaftar",
            detail: payload.error || "Data tamu tidak ditemukan.",
            suggestedName: payload.suggestedName,
          });
        } else {
          setToast({
            type: "error",
            message: payload?.error || "Gagal memproses check-in.",
          });
        }
      } catch {
        setToast({ type: "error", message: "Gagal terhubung ke server." });
      } finally {
        setCheckingIn(false);
      }
    },
    [loadGuests]
  );

  const startCamera = async () => {
    setCameraError(null);
    const BarcodeDetectorCtor = (window as any).BarcodeDetector;
    if (!BarcodeDetectorCtor) {
      setCameraError(
        "Browser ini belum mendukung BarcodeDetector API. Gunakan Chrome/Edge Android atau ketik nama/kode secara manual di bawah."
      );
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      streamRef.current = stream;
      setCameraActive(true);

      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      }, 50);

      const detector = new BarcodeDetectorCtor({ formats: ["qr_code"] });
      const scanFrame = async () => {
        if (!streamRef.current) return;
        if (videoRef.current && videoRef.current.readyState === 4) {
          try {
            const barcodes = await detector.detect(videoRef.current);
            if (barcodes.length > 0 && barcodes[0].rawValue) {
              const rawVal = String(barcodes[0].rawValue);
              const now = Date.now();
              if (
                rawVal !== lastScannedRef.current.value ||
                now - lastScannedRef.current.time > 4000
              ) {
                lastScannedRef.current = { value: rawVal, time: now };
                await processCheckin(rawVal, scanPax);
              }
            }
          } catch {
            // ignore transient frame errors
          }
        }
        rafRef.current = requestAnimationFrame(scanFrame);
      };
      rafRef.current = requestAnimationFrame(scanFrame);
    } catch {
      setCameraError(
        "Izin kamera ditolak atau kamera tidak tersedia. Gunakan input manual di bawah."
      );
    }
  };

  return (
    <div className="space-y-6">
      <ToastBanner toast={toast} onClose={() => setToast(null)} />
      <ConfirmModal
        dialog={confirmDialog}
        onClose={() => setConfirmDialog(null)}
      />

      <CsvImportModal<ParsedGuestRow>
        isOpen={isCsvModalOpen}
        title="Import Daftar Tamu (CSV / Excel)"
        description="Upload file CSV atau tempel langsung dari Excel/Google Sheets. Kolom terdeteksi otomatis."
        templateFilename="template_daftar_tamu.csv"
        templateHeaders={[
          "Nama Tamu",
          "No WhatsApp",
          "Alamat",
          "Grup",
          "Kuota",
        ]}
        templateRows={[
          ["Bapak Ahmad & Ibu Siti", "081234567890", "Jakarta", "Keluarga", 2],
          ["Rina Kusuma", "089876543210", "Bandung", "Teman Kuliah", 2],
        ]}
        pastePlaceholder={
          "Bapak Ahmad & Ibu Siti,081234567890,Jakarta,Keluarga,2\nRina Kusuma,089876543210,Bandung,Sahabat,2\n(Atau salin langsung beberapa kolom dari Excel lalu Ctrl+V di sini)"
        }
        parseText={parseGuestsText}
        columns={[
          {
            header: "Nama Tamu",
            render: (r) => <span className="font-bold">{r.name}</span>,
          },
          {
            header: "WhatsApp",
            render: (r) => <span className="font-mono">{r.phone || "-"}</span>,
          },
          { header: "Alamat", render: (r) => r.address },
          { header: "Grup", render: (r) => r.group_name || "-" },
          { header: "Kuota", render: (r) => `${r.quota} Pax` },
        ]}
        onConfirm={handleConfirmCsvImport}
        onClose={() => setIsCsvModalOpen(false)}
        confirmLabel="Simpan Tamu"
      />

      {/* Ringkasan Tamu */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900/50">
          <p className="text-xs font-bold text-slate-400 uppercase">
            Total Tamu
          </p>
          <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
            {stats.total}
          </p>
        </div>
        <div className="rounded-xl border border-green-100 bg-green-50/70 p-4 dark:border-green-900/30 dark:bg-green-900/15">
          <p className="text-xs font-bold text-green-600 uppercase dark:text-green-400">
            Sudah Check-In
          </p>
          <p className="mt-1 text-2xl font-bold text-green-700 dark:text-green-300">
            {stats.checkedIn}
          </p>
        </div>
        <div className="rounded-xl border border-blue-100 bg-blue-50/70 p-4 dark:border-blue-900/30 dark:bg-blue-900/15">
          <p className="text-xs font-bold text-blue-600 uppercase dark:text-blue-400">
            Total Pax Hadir
          </p>
          <p className="mt-1 text-2xl font-bold text-blue-700 dark:text-blue-300">
            {stats.totalPax}
          </p>
        </div>
        <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900/50">
          <p className="text-xs font-bold text-slate-400 uppercase">
            Belum Hadir
          </p>
          <p className="mt-1 text-2xl font-bold text-slate-700 dark:text-slate-200">
            {stats.pending}
          </p>
        </div>
      </div>

      {/* Switcher Sub-Tab */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-xl bg-slate-100 p-1 dark:bg-slate-900">
          <button
            type="button"
            onClick={() => setSubTab("list")}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition-all ${
              subTab === "list"
                ? "bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white"
                : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            <Users className="h-4 w-4" /> Daftar Tamu Permanen
          </button>
          <button
            type="button"
            onClick={() => setSubTab("scanner")}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition-all ${
              subTab === "scanner"
                ? "bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white"
                : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            <QrCode className="h-4 w-4" /> Scanner Check-In Hari H
          </button>
        </div>

        <a
          href="/api/export-guests"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 dark:bg-blue-600 dark:hover:bg-blue-700"
        >
          <Download className="h-3.5 w-3.5" /> Export CSV Tamu
        </a>
      </div>

      {subTab === "scanner" ? (
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-5 dark:border-slate-700 dark:bg-slate-900/40">
            <div className="flex items-center justify-between">
              <h4 className="font-serif text-xl font-bold italic dark:text-white">
                Pindai QR Kamera
              </h4>
              <button
                type="button"
                onClick={cameraActive ? stopCamera : startCamera}
                className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold text-white ${
                  cameraActive
                    ? "bg-red-600 hover:bg-red-700"
                    : "bg-green-600 hover:bg-green-700"
                }`}
              >
                {cameraActive ? (
                  <>
                    <CameraOff className="h-4 w-4" /> Matikan Kamera
                  </>
                ) : (
                  <>
                    <Camera className="h-4 w-4" /> Aktifkan Kamera
                  </>
                )}
              </button>
            </div>

            {cameraError && (
              <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-300">
                {cameraError}
              </p>
            )}

            <div className="relative flex aspect-video items-center justify-center overflow-hidden rounded-xl bg-slate-900">
              {cameraActive ? (
                <video
                  ref={videoRef}
                  playsInline
                  muted
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="text-center text-slate-400">
                  <QrCode className="mx-auto mb-2 h-10 w-10 opacity-50" />
                  <p className="text-xs">
                    Klik &quot;Aktifkan Kamera&quot; untuk memindai QR tamu
                  </p>
                </div>
              )}
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                void processCheckin(scanInput, scanPax);
              }}
              className="space-y-3 border-t border-slate-200 pt-4 dark:border-slate-700"
            >
              <label
                htmlFor="manual-checkin-query"
                className="block text-xs font-bold text-slate-500 uppercase"
              >
                Check-In Manual (Ketik Nama / Kode / Tempel URL QR)
              </label>
              <div className="space-y-2">
                <input
                  id="manual-checkin-query"
                  type="text"
                  value={scanInput}
                  onChange={(e) => setScanInput(e.target.value)}
                  placeholder="Contoh: Ahmad atau G-A1B2C3D4..."
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />

                {scannerSuggestions.length > 0 && (
                  <div className="rounded-xl border border-blue-100 bg-white p-1.5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                    <p className="px-2.5 py-1 text-[10px] font-bold text-slate-400 uppercase">
                      Klik tamu untuk langsung check-in ({scanPax} pax):
                    </p>
                    <div className="divide-y divide-slate-100 dark:divide-slate-700">
                      {scannerSuggestions.map((g) => (
                        <button
                          key={g.id}
                          type="button"
                          onClick={() =>
                            void processCheckin(g.code, g.quota || scanPax)
                          }
                          className="flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-xs hover:bg-blue-50 dark:hover:bg-slate-700"
                        >
                          <div>
                            <span className="font-bold text-slate-900 dark:text-white">
                              {g.name}
                            </span>
                            <span className="ml-2 font-mono text-[11px] text-slate-400">
                              {g.code}
                            </span>
                          </div>
                          <span className="rounded bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                            Check-In ({g.quota} Pax)
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3.5 py-2 dark:border-slate-700 dark:bg-slate-800">
                  <span className="text-xs font-bold text-slate-500">
                    Jumlah Pax Hadir
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      aria-label="Kurangi pax"
                      onClick={() => setScanPax((p) => Math.max(1, p - 1))}
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 hover:bg-slate-100 dark:border-slate-600 dark:hover:bg-slate-700"
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <span className="w-10 text-center text-sm font-bold">
                      {scanPax}
                    </span>
                    <button
                      type="button"
                      aria-label="Tambah pax"
                      onClick={() => setScanPax((p) => Math.min(50, p + 1))}
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 hover:bg-slate-100 dark:border-slate-600 dark:hover:bg-slate-700"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
              <button
                type="submit"
                disabled={checkingIn || !scanInput.trim()}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-xs font-bold text-white uppercase hover:bg-blue-700 disabled:opacity-50"
              >
                {checkingIn ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <UserCheck className="h-4 w-4" />
                )}
                Catat Kehadiran
              </button>
            </form>
          </div>

          <div className="space-y-4">
            {scanResult && (
              <div
                className={`rounded-2xl border p-5 ${
                  scanResult.type === "success"
                    ? "border-green-200 bg-green-50 text-green-800 dark:border-green-900/40 dark:bg-green-900/20 dark:text-green-200"
                    : scanResult.type === "warning"
                      ? "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-200"
                      : "border-red-200 bg-red-50 text-red-800 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-200"
                }`}
              >
                <h4 className="text-lg font-bold">{scanResult.title}</h4>
                <p className="mt-1 text-sm">{scanResult.detail}</p>
                {scanResult.type === "not_found" &&
                  scanResult.suggestedName && (
                    <button
                      type="button"
                      onClick={() =>
                        void processCheckin(
                          scanResult.suggestedName!,
                          scanPax,
                          true
                        )
                      }
                      className="mt-3 rounded-lg bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900"
                    >
                      + Check-In sebagai Tamu Walk-In (
                      {scanResult.suggestedName})
                    </button>
                  )}
              </div>
            )}

            <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800">
              <h4 className="mb-3 text-sm font-bold text-slate-700 dark:text-slate-200">
                Check-In Terbaru
              </h4>
              <div className="custom-scrollbar max-h-72 space-y-2 overflow-y-auto">
                {guests.filter((g) => g.checked_in === 1).length === 0 ? (
                  <p className="py-6 text-center text-xs text-slate-400">
                    Belum ada tamu yang check-in hari ini.
                  </p>
                ) : (
                  guests
                    .filter((g) => g.checked_in === 1)
                    .sort((a, b) =>
                      (b.checked_in_at || "").localeCompare(
                        a.checked_in_at || ""
                      )
                    )
                    .slice(0, 15)
                    .map((g) => (
                      <div
                        key={g.id}
                        className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5 text-xs dark:border-slate-700 dark:bg-slate-900/50"
                      >
                        <div>
                          <span className="font-bold text-slate-900 dark:text-white">
                            {g.name}
                          </span>
                          <span className="ml-2 font-mono text-[11px] text-slate-400">
                            {g.code}
                          </span>
                        </div>
                        <span className="rounded-full bg-green-100 px-2.5 py-0.5 font-bold text-green-700 dark:bg-green-900/30 dark:text-green-300">
                          {g.checked_in_pax} Pax
                        </span>
                      </div>
                    ))
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Tambah Tamu & Import CSV */}
          <form
            onSubmit={handleAddGuest}
            className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-5 dark:border-slate-700 dark:bg-slate-900/40"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h4 className="text-sm font-bold text-slate-800 dark:text-white">
                  Tambah Tamu Undangan
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Isi form di bawah atau gunakan Import CSV / tempel langsung
                  dari Excel untuk banyak tamu sekaligus.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsCsvModalOpen(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-slate-800 dark:bg-blue-600 dark:hover:bg-blue-700"
              >
                <Upload className="h-3.5 w-3.5" /> Import CSV / Excel
              </button>
            </div>

            <datalist id="guest-group-presets">
              {GUEST_GROUP_PRESETS.map((grp) => (
                <option key={grp} value={grp} />
              ))}
            </datalist>

            <div className="grid gap-3 md:grid-cols-12">
              <div className="md:col-span-4">
                <label
                  htmlFor="add-guest-name"
                  className="mb-1 block text-[11px] font-bold text-slate-500 uppercase"
                >
                  Nama Tamu <span className="text-red-500">*</span>
                </label>
                <input
                  id="add-guest-name"
                  type="text"
                  required
                  placeholder="Contoh: Bpk. Ahmad & Ibu Siti"
                  value={newGuest.name}
                  onChange={(e) =>
                    setNewGuest({ ...newGuest, name: e.target.value })
                  }
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>
              <div className="md:col-span-3">
                <label
                  htmlFor="add-guest-phone"
                  className="mb-1 block text-[11px] font-bold text-slate-500 uppercase"
                >
                  No. WhatsApp
                </label>
                <input
                  id="add-guest-phone"
                  type="tel"
                  inputMode="tel"
                  placeholder="081234567890"
                  value={newGuest.phone}
                  onChange={(e) =>
                    setNewGuest({ ...newGuest, phone: e.target.value })
                  }
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>
              <div className="md:col-span-2">
                <label
                  htmlFor="add-guest-address"
                  className="mb-1 block text-[11px] font-bold text-slate-500 uppercase"
                >
                  Alamat / Kota
                </label>
                <input
                  id="add-guest-address"
                  type="text"
                  placeholder="Di Tempat"
                  value={newGuest.address}
                  onChange={(e) =>
                    setNewGuest({ ...newGuest, address: e.target.value })
                  }
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>
              <div className="md:col-span-3">
                <label
                  htmlFor="add-guest-group"
                  className="mb-1 block text-[11px] font-bold text-slate-500 uppercase"
                >
                  Grup / Kategori
                </label>
                <input
                  id="add-guest-group"
                  type="text"
                  list="guest-group-presets"
                  placeholder="Keluarga / Sahabat / VIP"
                  value={newGuest.group_name}
                  onChange={(e) =>
                    setNewGuest({ ...newGuest, group_name: e.target.value })
                  }
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-end justify-between gap-3 pt-1">
              <div>
                <span className="mb-1 block text-[11px] font-bold text-slate-500 uppercase">
                  Kuota Pax
                </span>
                <div className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 dark:border-slate-700 dark:bg-slate-800">
                  <button
                    type="button"
                    aria-label="Kurangi kuota"
                    onClick={() =>
                      setNewGuest((prev) => ({
                        ...prev,
                        quota: Math.max(1, prev.quota - 1),
                      }))
                    }
                    className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                  <span className="w-16 text-center text-sm font-bold">
                    {newGuest.quota} Pax
                  </span>
                  <button
                    type="button"
                    aria-label="Tambah kuota"
                    onClick={() =>
                      setNewGuest((prev) => ({
                        ...prev,
                        quota: Math.min(50, prev.quota + 1),
                      }))
                    }
                    className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={savingGuest || !newGuest.name.trim()}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
              >
                {savingGuest ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                Tambah ke Daftar Tamu
              </button>
            </div>
          </form>

          {/* Filter & Pencarian */}
          <div className="flex flex-col justify-between gap-3 sm:flex-row">
            <div className="flex gap-2">
              {(
                [
                  ["all", "Semua"],
                  ["checked", "Sudah Check-In"],
                  ["pending", "Belum Hadir"],
                ] as const
              ).map(([val, label]) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setFilterStatus(val)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold ${
                    filterStatus === val
                      ? "bg-slate-900 text-white dark:bg-blue-600"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-900 dark:text-slate-300"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Cari nama / kode / grup..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-lg border border-slate-200 py-2 pr-3 pl-9 text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              />
            </div>
          </div>

          {/* Tabel Daftar Tamu */}
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs text-slate-500 uppercase dark:bg-slate-900/50 dark:text-slate-400">
                  <tr>
                    <th className="px-4 py-3">Tamu & Kode</th>
                    <th className="px-4 py-3">Kontak & Grup</th>
                    <th className="px-4 py-3">Kuota</th>
                    <th className="px-4 py-3">Check-In</th>
                    <th className="px-4 py-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center">
                        <Loader2 className="mx-auto h-5 w-5 animate-spin text-slate-400" />
                      </td>
                    </tr>
                  ) : filteredGuests.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-4 py-8 text-center text-xs text-slate-400"
                      >
                        Belum ada daftar tamu ditemukan.
                      </td>
                    </tr>
                  ) : (
                    filteredGuests.map((guest) => (
                      <tr
                        key={guest.id}
                        className="hover:bg-slate-50 dark:hover:bg-slate-700/40"
                      >
                        <td className="px-4 py-3">
                          <div className="font-medium text-slate-900 dark:text-white">
                            {guest.name}
                          </div>
                          <div className="font-mono text-[11px] text-slate-400">
                            {guest.code} · {guest.address}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-300">
                          <div>{guest.phone || "-"}</div>
                          {guest.group_name && (
                            <span className="mt-0.5 inline-block rounded bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500 dark:bg-slate-700 dark:text-slate-300">
                              {guest.group_name}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs font-bold">
                          {guest.quota} Pax
                        </td>
                        <td className="px-4 py-3">
                          {guest.checked_in === 1 ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-1 text-[11px] font-bold text-green-700 dark:bg-green-900/30 dark:text-green-300">
                              <CheckCircle2 className="h-3 w-3" /> Hadir (
                              {guest.checked_in_pax})
                            </span>
                          ) : (
                            <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-500 dark:bg-slate-700 dark:text-slate-300">
                              Belum
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-1">
                            <button
                              type="button"
                              aria-label={`Edit ${guest.name}`}
                              title="Edit Data Tamu"
                              onClick={() => setEditingGuest({ ...guest })}
                              className="rounded p-1.5 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              aria-label={`Salin tautan ${guest.name}`}
                              title="Salin Link Undangan"
                              onClick={() => {
                                navigator.clipboard.writeText(
                                  guestInviteLink(guest)
                                );
                                setToast({
                                  type: "info",
                                  message: `Tautan untuk ${guest.name} disalin.`,
                                });
                              }}
                              className="rounded p-1.5 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700"
                            >
                              <Copy className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              aria-label={`Kirim WhatsApp ke ${guest.name}`}
                              title="Kirim Undangan via WhatsApp"
                              disabled={sendingWaId === guest.id}
                              onClick={() => sendWaInviteForGuest(guest)}
                              className="rounded p-1.5 text-green-600 hover:bg-green-50 disabled:opacity-50 dark:text-green-400 dark:hover:bg-green-900/20"
                            >
                              {sendingWaId === guest.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Send className="h-4 w-4" />
                              )}
                            </button>
                            <button
                              type="button"
                              aria-label={
                                guest.checked_in === 1
                                  ? `Batalkan check-in ${guest.name}`
                                  : `Check-in ${guest.name}`
                              }
                              title={
                                guest.checked_in === 1
                                  ? "Batalkan Check-In"
                                  : "Check-In Manual"
                              }
                              onClick={() => toggleManualCheckin(guest)}
                              className="rounded p-1.5 text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20"
                            >
                              {guest.checked_in === 1 ? (
                                <RotateCcw className="h-4 w-4" />
                              ) : (
                                <UserCheck className="h-4 w-4" />
                              )}
                            </button>
                            <button
                              type="button"
                              aria-label={`Hapus ${guest.name}`}
                              title="Hapus"
                              onClick={() => deleteGuest(guest)}
                              className="rounded p-1.5 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
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
        </div>
      )}

      {/* Modal Edit Tamu */}
      {editingGuest && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) setEditingGuest(null);
          }}
        >
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-800">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Edit Data Tamu
              </h3>
              <button
                type="button"
                aria-label="Tutup modal edit tamu"
                onClick={() => setEditingGuest(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleUpdateGuest} className="space-y-4">
              <div>
                <label
                  htmlFor="edit-guest-name"
                  className="mb-1 block text-xs font-bold text-slate-500 uppercase"
                >
                  Nama Tamu *
                </label>
                <input
                  id="edit-guest-name"
                  type="text"
                  required
                  value={editingGuest.name}
                  onChange={(e) =>
                    setEditingGuest({ ...editingGuest, name: e.target.value })
                  }
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                />
              </div>
              <div>
                <label
                  htmlFor="edit-guest-phone"
                  className="mb-1 block text-xs font-bold text-slate-500 uppercase"
                >
                  No. WhatsApp
                </label>
                <input
                  id="edit-guest-phone"
                  type="tel"
                  value={editingGuest.phone}
                  onChange={(e) =>
                    setEditingGuest({ ...editingGuest, phone: e.target.value })
                  }
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="edit-guest-address"
                    className="mb-1 block text-xs font-bold text-slate-500 uppercase"
                  >
                    Alamat / Kota
                  </label>
                  <input
                    id="edit-guest-address"
                    type="text"
                    value={editingGuest.address}
                    onChange={(e) =>
                      setEditingGuest({
                        ...editingGuest,
                        address: e.target.value,
                      })
                    }
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                  />
                </div>
                <div>
                  <label
                    htmlFor="edit-guest-group"
                    className="mb-1 block text-xs font-bold text-slate-500 uppercase"
                  >
                    Grup
                  </label>
                  <input
                    id="edit-guest-group"
                    type="text"
                    list="guest-group-presets"
                    value={editingGuest.group_name}
                    onChange={(e) =>
                      setEditingGuest({
                        ...editingGuest,
                        group_name: e.target.value,
                      })
                    }
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                  />
                </div>
              </div>
              <div>
                <span className="mb-1 block text-xs font-bold text-slate-500 uppercase">
                  Kuota Pax
                </span>
                <div className="inline-flex items-center gap-2 rounded-xl border border-slate-200 p-1 dark:border-slate-600">
                  <button
                    type="button"
                    onClick={() =>
                      setEditingGuest({
                        ...editingGuest,
                        quota: Math.max(1, editingGuest.quota - 1),
                      })
                    }
                    className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                  <span className="w-16 text-center text-sm font-bold">
                    {editingGuest.quota} Pax
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setEditingGuest({
                        ...editingGuest,
                        quota: Math.min(50, editingGuest.quota + 1),
                      })
                    }
                    className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              <div className="flex justify-end gap-2 border-t border-slate-100 pt-4 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setEditingGuest(null)}
                  className="rounded-xl px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={updatingGuest}
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {updatingGuest && <Loader2 className="h-4 w-4 animate-spin" />}
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default GuestManager;
