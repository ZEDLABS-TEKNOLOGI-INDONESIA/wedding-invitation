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
  Users,
  XCircle,
} from "lucide-react";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { parseGuestsText, type ParsedGuestRow } from "../utils/csvImport";
import {
  PDF_PREFS_EVENT,
  buildInvitationContentFromConfig,
  generateGuestQrStampBase64,
  generateInvitationPdfBase64,
  loadPdfPrefs,
  renderSharedMiddlePages,
  resolvePdfPrefs,
  savePdfPrefs,
  type PdfStationeryPrefs,
} from "../utils/pdfInvitation";
import {
  PAPER_SIZES,
  STATIONERY_DESIGNS,
  STATIONERY_THEMES,
  ensureStationeryFonts,
  type PaperSizeId,
  type StationeryDesignId,
} from "../utils/stationery";
import { ConfirmModal, type ConfirmDialogState } from "./Admin/AdminFeedback";
import CsvImportModal from "./Admin/CsvImportModal";

interface GuestInviteRow {
  name: string;
  phone: string;
  address: string;
}

interface SavedGuestItem {
  id: number;
  name: string;
  phone: string;
  address: string;
  group_name: string;
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
  queued: { label: "Antre", className: "adm-badge" },
  processing: { label: "Diproses", className: "adm-badge adm-badge-accent" },
  sent: { label: "Terkirim", className: "adm-badge adm-badge-accent" },
  delivered: { label: "Sampai", className: "adm-badge adm-badge-success" },
  read: { label: "Dibaca", className: "adm-badge adm-badge-success" },
  failed: { label: "Gagal", className: "adm-badge adm-badge-danger" },
};

const WhatsAppManager: React.FC<{
  siteUrl: string;
  onQuotaExceeded?: (projectedTotal?: number, message?: string) => void;
}> = ({ siteUrl, onQuotaExceeded }) => {
  const [activeMode, setActiveMode] = useState<"single" | "bulk">("single");
  const [singleForm, setSingleForm] = useState<GuestInviteRow>({
    name: "",
    phone: "",
    address: "Di Tempat",
  });
  const [attachPdf, setAttachPdf] = useState(true);
  const [attachQr, setAttachQr] = useState(true);
  const [pdfPrefs, setPdfPrefs] = useState<PdfStationeryPrefs>(() =>
    loadPdfPrefs()
  );
  const [cfg, setCfg] = useState<Record<string, string>>({});
  const [bulkGuests, setBulkGuests] = useState<GuestInviteRow[]>([]);
  const [savedGuests, setSavedGuests] = useState<SavedGuestItem[]>([]);
  const [selectedGroupFilter, setSelectedGroupFilter] = useState<string>("all");
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sendingLabel, setSendingLabel] = useState("");
  const [bulkProgress, setBulkProgress] = useState(0);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const [history, setHistory] = useState<WaInvitationRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [refreshingStatus, setRefreshingStatus] = useState(false);
  const [resendingId, setResendingId] = useState<number | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState | null>(
    null
  );

  const baseUrl = siteUrl?.endsWith("/") ? siteUrl.slice(0, -1) : siteUrl || "";

  const resolvedPdf = useMemo(() => resolvePdfPrefs(pdfPrefs), [pdfPrefs]);
  const invitationContent = useMemo(
    () => buildInvitationContentFromConfig(cfg),
    [cfg]
  );

  const updatePdfPref = (partial: Partial<PdfStationeryPrefs>) => {
    setPdfPrefs((prev) => {
      const next = { ...prev, ...partial };
      savePdfPrefs(next);
      return next;
    });
  };

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

  const loadSavedGuests = useCallback(async () => {
    try {
      const res = await fetch("/api/guests", { credentials: "include" });
      if (res.ok) {
        const data = (await res.json()) as SavedGuestItem[];
        setSavedGuests(data);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    loadHistory();
    loadSavedGuests();
    fetch("/api/config")
      .then((r) => (r.ok ? r.json() : {}))
      .then((data) => {
        if (data && typeof data === "object") {
          setCfg(data as Record<string, string>);
        }
      })
      .catch(() => {});

    const handlePrefsSync = () => {
      setPdfPrefs(loadPdfPrefs());
    };
    window.addEventListener(PDF_PREFS_EVENT, handlePrefsSync);
    window.addEventListener("storage", handlePrefsSync);
    return () => {
      window.removeEventListener(PDF_PREFS_EVENT, handlePrefsSync);
      window.removeEventListener("storage", handlePrefsSync);
    };
  }, [loadHistory, loadSavedGuests]);

  const savedGuestsWithPhone = savedGuests.filter((g) => g.phone.trim() !== "");
  const availableGroups = Array.from(
    new Set(
      savedGuestsWithPhone
        .map((g) => g.group_name.trim())
        .filter((g) => g !== "")
    )
  );

  const loadFromGuestDb = () => {
    const filtered = savedGuestsWithPhone.filter(
      (g) =>
        selectedGroupFilter === "all" ||
        g.group_name.trim() === selectedGroupFilter
    );
    if (filtered.length === 0) {
      setFeedback({
        type: "error",
        message:
          "Belum ada tamu dengan nomor WhatsApp pada Daftar Tamu Permanen (atau grup terpilih).",
      });
      return;
    }
    setBulkGuests(
      filtered.map((g) => ({
        name: g.name,
        phone: g.phone,
        address: g.address || "Di Tempat",
      }))
    );
    setFeedback({
      type: "success",
      message: `${filtered.length} tamu berhasil dimuat dari Daftar Tamu Permanen.`,
    });
  };

  const handleCsvConfirmed = (rows: ParsedGuestRow[]) => {
    setBulkGuests(
      rows.map((r) => ({
        name: r.name,
        phone: r.phone,
        address: r.address || "Di Tempat",
      }))
    );
    setFeedback({
      type: "success",
      message: `${rows.length} baris tamu siap dikirim lewat WhatsApp.`,
    });
  };

  const buildGuestAttachmentPayload = async (
    guest: GuestInviteRow,
    sharedMiddlePages?: { page2: string; page3: string }
  ) => {
    const out: GuestInviteRow & { pdfBase64?: string; qrBase64?: string } = {
      ...guest,
    };
    const cleanName = guest.name.trim();
    const guestUrl = `${baseUrl}/?to=${encodeURIComponent(cleanName)}`;

    if (attachPdf) {
      out.pdfBase64 = await generateInvitationPdfBase64(
        invitationContent,
        { name: cleanName, address: guest.address || "Di Tempat" },
        baseUrl,
        resolvedPdf.theme,
        { design: resolvedPdf.designId, paper: resolvedPdf.paper },
        sharedMiddlePages,
        0.85
      );
    }
    if (attachQr) {
      out.qrBase64 = await generateGuestQrStampBase64(
        invitationContent,
        cleanName,
        guestUrl,
        resolvedPdf.theme,
        resolvedPdf.designId
      );
    }
    return out;
  };

  const attachmentSummaryLabel =
    attachPdf && attachQr
      ? " beserta PDF & QR Tamu"
      : attachPdf
        ? " beserta berkas PDF"
        : attachQr
          ? " beserta gambar QR Tamu"
          : "";

  const sendSingle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!singleForm.name.trim() || !singleForm.phone.trim()) return;
    setIsSending(true);
    setSendingLabel(
      attachPdf || attachQr
        ? "Menyusun lampiran undangan..."
        : "Mengirim ke Antrean..."
    );
    setFeedback(null);

    try {
      const guestPayload = await buildGuestAttachmentPayload(singleForm);
      setSendingLabel("Mengirim ke Antrean...");
      const res = await fetch("/api/whatsapp/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          guests: [guestPayload],
          siteUrl: baseUrl,
          attachPdf,
          attachQr,
        }),
      });
      const payload = await res.json().catch(() => ({}));
      if (res.ok && payload.queued > 0) {
        setFeedback({
          type: "success",
          message: `Undangan${attachmentSummaryLabel} untuk ${singleForm.name.trim()} berhasil masuk antrean WhatsApp Gateway (otomatis tercatat di Daftar Tamu & Data RSVP).`,
        });
        setSingleForm({ name: "", phone: "", address: "Di Tempat" });
        await loadHistory();
      } else if (res.status === 402 || payload?.code === "QUOTA_EXCEEDED") {
        if (onQuotaExceeded) {
          onQuotaExceeded(payload?.projectedTotal, payload?.error);
          return;
        }
        setFeedback({ type: "error", message: payload?.error || "Kuota tamu terlampaui." });
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
      setSendingLabel("");
    }
  };

  const sendBulk = async () => {
    if (bulkGuests.length === 0) return;
    setIsSending(true);
    setBulkProgress(0);
    setSendingLabel(
      attachPdf || attachQr
        ? "Menyiapkan lampiran PDF & QR..."
        : "Mengirim undangan..."
    );
    setFeedback(null);

    let totalQueued = 0;
    let totalFailed = 0;
    const CHUNK_SIZE = attachPdf || attachQr ? 3 : 20;

    try {
      let sharedMiddlePages: { page2: string; page3: string } | undefined;
      if (attachPdf) {
        await ensureStationeryFonts();
        sharedMiddlePages = renderSharedMiddlePages(
          invitationContent,
          resolvedPdf.theme,
          { design: resolvedPdf.designId, paper: resolvedPdf.paper },
          0.85
        );
      }

      for (let i = 0; i < bulkGuests.length; i += CHUNK_SIZE) {
        const chunk = bulkGuests.slice(i, i + CHUNK_SIZE);
        const preparedGuests = [];
        for (let idx = 0; idx < chunk.length; idx++) {
          if (attachPdf || attachQr) {
            setSendingLabel(
              `Menyusun lampiran ${i + idx + 1}/${bulkGuests.length}...`
            );
          }
          preparedGuests.push(
            await buildGuestAttachmentPayload(chunk[idx], sharedMiddlePages)
          );
        }

        setSendingLabel(
          `Mengirim ${Math.min(i + chunk.length, bulkGuests.length)}/${bulkGuests.length}...`
        );
        const res = await fetch("/api/whatsapp/invitations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            guests: preparedGuests,
            siteUrl: baseUrl,
            attachPdf,
            attachQr,
          }),
        });
        const payload = await res.json().catch(() => ({}));
        if (res.status === 402 || payload?.code === "QUOTA_EXCEEDED") {
          if (onQuotaExceeded) {
            onQuotaExceeded(payload?.projectedTotal, payload?.error);
            return;
          }
          throw new Error(payload?.error || "Kuota tamu terlampaui.");
        }
        if (!res.ok) {
          throw new Error(
            payload?.error || "Gagal mengirim batch undangan WhatsApp."
          );
        }
        totalQueued += Number(payload.queued || 0);
        totalFailed += Number(payload.failed || 0);
        setBulkProgress(
          Math.round(
            (Math.min(i + chunk.length, bulkGuests.length) /
              bulkGuests.length) *
              100
          )
        );
      }

      setFeedback({
        type: totalFailed === 0 ? "success" : "error",
        message: `Selesai diproses: ${totalQueued} masuk antrean, ${totalFailed} gagal. Kontak broadcast juga otomatis masuk ke Daftar Tamu & Data RSVP (status Ragu).`,
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
      setSendingLabel("");
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
      const guestPayload = await buildGuestAttachmentPayload({
        name: row.guest_name,
        phone: row.phone,
        address: row.address || "Di Tempat",
      });
      const res = await fetch("/api/whatsapp/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          guests: [guestPayload],
          siteUrl: baseUrl,
          attachPdf,
          attachQr,
        }),
      });
      const payload = await res.json().catch(() => ({}));
      if (res.ok && payload.queued > 0) {
        setFeedback({
          type: "success",
          message: `Undangan${attachmentSummaryLabel} untuk ${row.guest_name} dikirim ulang ke antrean.`,
        });
      } else if (res.status === 402 || payload?.code === "QUOTA_EXCEEDED") {
        if (onQuotaExceeded) {
          onQuotaExceeded(payload?.projectedTotal, payload?.error);
          return;
        }
        setFeedback({ type: "error", message: payload?.error || "Kuota tamu terlampaui." });
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

  const deleteRow = (id: number) => {
    setConfirmDialog({
      title: "Hapus Riwayat",
      message: "Hapus catatan riwayat pengiriman WhatsApp ini?",
      confirmLabel: "Hapus",
      destructive: true,
      onConfirm: async () => {
        const res = await fetch("/api/whatsapp/invitations", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ ids: [id] }),
        });
        if (res.ok) {
          setHistory((prev) => prev.filter((item) => item.id !== id));
        }
      },
    });
  };

  const previewLink = singleForm.name.trim()
    ? `${baseUrl}/?to=${encodeURIComponent(singleForm.name.trim())}`
    : baseUrl;

  return (
    <div className="space-y-8">
      <ConfirmModal
        dialog={confirmDialog}
        onClose={() => setConfirmDialog(null)}
      />

      <CsvImportModal<ParsedGuestRow>
        isOpen={isCsvModalOpen}
        title="Import Penerima Undangan WhatsApp"
        description="Upload file CSV atau salin-tempel daftar tamu + nomor WhatsApp dari Excel."
        templateFilename="template_undangan_whatsapp.csv"
        templateHeaders={["Nama Tamu", "No WhatsApp", "Alamat (Opsional)"]}
        templateRows={[
          ["Bapak Ahmad & Ibu Siti", "081234567890", "Jakarta"],
          ["Rina Kusuma", "6289876543210", "Di Tempat"],
        ]}
        pastePlaceholder={
          "Bapak Ahmad & Ibu Siti,081234567890,Jakarta\nRina Kusuma,089876543210,Di Tempat"
        }
        parseText={parseGuestsText}
        columns={[
          {
            header: "Nama Tamu",
            render: (r) => <span className="font-bold">{r.name}</span>,
          },
          {
            header: "No WhatsApp",
            render: (r) => (
              <span className={`font-mono ${!r.phone ? "text-red-500" : ""}`}>
                {r.phone || "(Kosong)"}
              </span>
            ),
          },
          { header: "Alamat", render: (r) => r.address },
        ]}
        onConfirm={handleCsvConfirmed}
        onClose={() => setIsCsvModalOpen(false)}
        confirmLabel="Muat ke Antrean"
      />

      {feedback && (
        <div
          role="alert"
          className={`adm-alert ${
            feedback.type === "success"
              ? "adm-alert-success"
              : "adm-alert-danger"
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

      <div
        data-tour="wa-mode-switch"
        className="flex flex-wrap items-center justify-between gap-3"
      >
        <div className="adm-seg grid w-full grid-cols-2 sm:inline-flex sm:w-auto">
          <button
            type="button"
            onClick={() => setActiveMode("single")}
            className={`adm-seg-btn justify-center ${activeMode === "single" ? "is-active" : ""}`}
          >
            <span>
              <span className="hidden sm:inline">Kirim </span>Satuan
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveMode("bulk")}
            className={`adm-seg-btn justify-center ${activeMode === "bulk" ? "is-active" : ""}`}
          >
            <span>
              <span className="hidden sm:inline">Kirim </span>Massal
              <span className="hidden sm:inline"> (Daftar Tamu / CSV)</span>
            </span>
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-medium text-(--adm-text-secondary)">
            <input
              type="checkbox"
              checked={attachPdf}
              onChange={(e) => setAttachPdf(e.target.checked)}
              className="h-4 w-4 accent-(--adm-accent)"
            />
            Lampirkan Surat Undangan PDF
          </label>
          <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-medium text-(--adm-text-secondary)">
            <input
              type="checkbox"
              checked={attachQr}
              onChange={(e) => setAttachQr(e.target.checked)}
              className="h-4 w-4 accent-(--adm-accent)"
            />
            Lampirkan Gambar QR Tamu (Check-In)
          </label>
        </div>
      </div>

      {(attachPdf || attachQr) && (
        <div className="rounded-lg border border-(--adm-border) bg-(--adm-bg-primary) p-3.5">
          <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-(--adm-text-primary)">
              <FileText className="h-3.5 w-3.5 text-(--adm-accent)" />
              Format Lampiran ({attachPdf && attachQr ? "PDF 4 Halaman + Gambar QR Tamu" : attachPdf ? "PDF 4 Halaman" : "Gambar QR Tamu"})
            </span>
            <span className="text-[11px] text-(--adm-text-secondary)">
              Tersinkron otomatis dengan pilihan pada tab{" "}
              <strong className="text-(--adm-text-primary)">Design PDF</strong>
            </span>
          </div>
          <div className="grid gap-2.5 sm:grid-cols-3">
            <div>
              <label htmlFor="wa-pdf-design" className="adm-label">
                Motif Desain
              </label>
              <select
                id="wa-pdf-design"
                value={resolvedPdf.designId}
                onChange={(e) =>
                  updatePdfPref({
                    designId: e.target.value as StationeryDesignId,
                  })
                }
                className="adm-input adm-input-sm bg-(--adm-bg-secondary)"
              >
                {STATIONERY_DESIGNS.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="wa-pdf-paper" className="adm-label">
                Ukuran Kertas
              </label>
              <select
                id="wa-pdf-paper"
                value={resolvedPdf.paper.id}
                onChange={(e) =>
                  updatePdfPref({ paperId: e.target.value as PaperSizeId })
                }
                className="adm-input adm-input-sm bg-(--adm-bg-secondary)"
              >
                {PAPER_SIZES.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} — {p.dimensionsLabel}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="wa-pdf-theme" className="adm-label">
                Nuansa Warna
              </label>
              <select
                id="wa-pdf-theme"
                value={resolvedPdf.theme.id}
                onChange={(e) => updatePdfPref({ themeId: e.target.value })}
                className="adm-input adm-input-sm bg-(--adm-bg-secondary)"
              >
                {STATIONERY_THEMES.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {activeMode === "single" ? (
        <form
          onSubmit={sendSingle}
          className="grid min-w-0 gap-5 rounded-lg border border-(--adm-border) bg-(--adm-bg-primary) p-3.5 sm:p-4 md:grid-cols-2"
        >
          <div className="min-w-0 space-y-3.5">
            {savedGuestsWithPhone.length > 0 && (
              <div>
                <label htmlFor="wa-quick-pick" className="adm-label">
                  Pilih Cepat dari Daftar Tamu (Opsional)
                </label>
                <select
                  id="wa-quick-pick"
                  value=""
                  onChange={(e) => {
                    const found = savedGuestsWithPhone.find(
                      (g) => String(g.id) === e.target.value
                    );
                    if (found) {
                      setSingleForm({
                        name: found.name,
                        phone: found.phone,
                        address: found.address || "Di Tempat",
                      });
                    }
                  }}
                  className="adm-input bg-(--adm-bg-secondary)"
                >
                  <option value="">
                    -- Pilih dari {savedGuestsWithPhone.length} tamu tersimpan
                    --
                  </option>
                  {savedGuestsWithPhone.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name} ({g.phone})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label htmlFor="wa-guest-name" className="adm-label">
                Nama Tamu *
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
                className="adm-input bg-(--adm-bg-secondary)"
              />
            </div>
            <div>
              <label htmlFor="wa-guest-phone" className="adm-label">
                Nomor WhatsApp *
              </label>
              <input
                id="wa-guest-phone"
                type="tel"
                inputMode="tel"
                required
                maxLength={25}
                value={singleForm.phone}
                onChange={(e) =>
                  setSingleForm({ ...singleForm, phone: e.target.value })
                }
                placeholder="081234567890 atau 6281234567890"
                className="adm-input bg-(--adm-bg-secondary)"
              />
            </div>
            <div>
              <label htmlFor="wa-guest-address" className="adm-label">
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
                className="adm-input bg-(--adm-bg-secondary)"
              />
            </div>
          </div>

          <div className="flex min-w-0 flex-col justify-between space-y-4">
            <div className="min-w-0 space-y-2 rounded-lg border border-(--adm-border) bg-(--adm-bg-secondary) p-3.5 sm:p-4">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-(--adm-text-secondary)">
                <Eye className="h-3.5 w-3.5 shrink-0" /> Pratinjau Tautan Personal
              </div>
              <p className="font-mono text-xs break-all text-(--adm-text-primary)">
                {previewLink}
              </p>
              <p className="pt-1 text-xs leading-relaxed break-words text-(--adm-text-secondary)">
                Gateway akan memilih salah satu dari 3 varian template{" "}
                <code className="break-all">wedding_undangan_tamu</code> secara
                otomatis dengan antrean aman.
              </p>
            </div>

            <button
              type="submit"
              disabled={
                isSending || !singleForm.name.trim() || !singleForm.phone.trim()
              }
              className="adm-btn adm-btn-edit adm-btn-lg h-auto min-h-[40px] w-full py-2 text-center leading-snug whitespace-normal"
            >
              {isSending ? (
                <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
              ) : (
                <Send className="h-4 w-4 shrink-0" />
              )}
              <span>
                {isSending ? (
                  sendingLabel || "Mengirim ke Antrean..."
                ) : attachPdf && attachQr ? (
                  <>
                    Kirim<span className="hidden sm:inline"> Undangan</span> +
                    PDF &amp; QR
                    <span className="hidden sm:inline"> via WhatsApp</span>
                  </>
                ) : attachPdf ? (
                  <>
                    Kirim<span className="hidden sm:inline"> Undangan</span> +
                    PDF<span className="hidden sm:inline"> via WhatsApp</span>
                  </>
                ) : attachQr ? (
                  <>
                    Kirim<span className="hidden sm:inline"> Undangan</span> +
                    QR<span className="hidden sm:inline"> via WhatsApp</span>
                  </>
                ) : (
                  <>
                    Kirim<span className="hidden sm:inline"> Undangan</span>{" "}
                    WhatsApp
                  </>
                )}
              </span>
            </button>
          </div>
        </form>
      ) : (
        <div className="space-y-4">
          {bulkGuests.length === 0 ? (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="flex flex-col justify-between space-y-4 rounded-lg border border-(--adm-border) bg-(--adm-bg-primary) p-5">
                <div className="space-y-1.5">
                  <div className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-(--adm-border) bg-(--adm-accent-soft) text-(--adm-accent)">
                    <Users className="h-4 w-4" />
                  </div>
                  <h4 className="text-sm font-semibold text-(--adm-text-primary)">
                    Ambil dari Daftar Tamu Permanen
                  </h4>
                  <p className="text-xs text-(--adm-text-secondary)">
                    Muat otomatis {savedGuestsWithPhone.length} tamu yang sudah
                    memiliki nomor WhatsApp di tab Tamu &amp; Check-In.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {availableGroups.length > 0 && (
                    <select
                      aria-label="Filter grup tamu"
                      value={selectedGroupFilter}
                      onChange={(e) => setSelectedGroupFilter(e.target.value)}
                      className="adm-input adm-input-sm w-auto bg-(--adm-bg-secondary)"
                    >
                      <option value="all">Semua Grup</option>
                      {availableGroups.map((grp) => (
                        <option key={grp} value={grp}>
                          {grp}
                        </option>
                      ))}
                    </select>
                  )}
                  <button
                    type="button"
                    onClick={loadFromGuestDb}
                    disabled={savedGuestsWithPhone.length === 0}
                    className="adm-btn adm-btn-primary"
                  >
                    <Users className="h-3.5 w-3.5" /> Muat Daftar Tamu
                  </button>
                </div>
              </div>

              <div className="flex flex-col justify-between space-y-4 rounded-lg border-2 border-dashed border-(--adm-border) bg-(--adm-bg-primary) p-5">
                <div className="space-y-1.5">
                  <div className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-(--adm-border) bg-(--adm-green-soft) text-(--adm-green)">
                    <Upload className="h-4 w-4" />
                  </div>
                  <h4 className="text-sm font-semibold text-(--adm-text-primary)">
                    Import CSV / Tempel dari Excel
                  </h4>
                  <p className="text-xs text-(--adm-text-secondary)">
                    Seret &amp; lepas file CSV (koma atau titik koma Excel) atau
                    copy-paste langsung dari Google Sheets/Excel.
                  </p>
                </div>
                <div>
                  <button
                    type="button"
                    onClick={() => setIsCsvModalOpen(true)}
                    className="adm-btn adm-btn-edit"
                  >
                    <Upload className="h-3.5 w-3.5" /> Buka Import CSV / Excel
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3.5">
              <div className="adm-alert adm-alert-success flex-wrap justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="adm-badge adm-badge-success font-semibold">
                    {bulkGuests.length} Tamu
                  </span>
                  <span className="text-xs text-(--adm-text-primary)">
                    Siap dimasukkan ke antrean WhatsApp Gateway
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={isSending}
                    onClick={() => setBulkGuests([])}
                    className="adm-btn adm-btn-outline-danger adm-btn-sm"
                  >
                    Reset
                  </button>
                  <button
                    type="button"
                    disabled={isSending}
                    onClick={sendBulk}
                    className="adm-btn adm-btn-edit adm-btn-sm"
                  >
                    {isSending ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Send className="h-3.5 w-3.5" />
                    )}
                    {isSending
                      ? sendingLabel || `Mengirim (${bulkProgress}%)...`
                      : attachPdf
                        ? "Kirim Semua + PDF"
                        : "Kirim Semua"}
                  </button>
                </div>
              </div>

              {isSending && (
                <div className="h-2 w-full overflow-hidden rounded-full bg-(--adm-bg-tertiary)">
                  <div
                    className="h-full bg-(--adm-green) transition-all duration-300"
                    style={{ width: `${bulkProgress}%` }}
                  />
                </div>
              )}

              <div className="custom-scrollbar max-h-60 overflow-y-auto rounded-lg border border-(--adm-border)">
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 border-b border-(--adm-border) bg-(--adm-bg-primary) text-(--adm-text-secondary)">
                    <tr>
                      <th className="px-3.5 py-2.5">#</th>
                      <th className="px-3.5 py-2.5 font-semibold">Nama Tamu</th>
                      <th className="px-3.5 py-2.5 font-semibold">
                        No WhatsApp
                      </th>
                      <th className="px-3.5 py-2.5 font-semibold">Alamat</th>
                      <th className="px-3.5 py-2.5 text-right font-semibold">
                        Hapus
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-(--adm-border)">
                    {bulkGuests.map((g, i) => (
                      <tr key={i} className="hover:bg-(--adm-bg-overlay)">
                        <td className="px-3.5 py-2 text-(--adm-text-muted) tabular-nums">
                          {i + 1}
                        </td>
                        <td className="px-3.5 py-2 font-medium">{g.name}</td>
                        <td className="px-3.5 py-2 font-mono">
                          {g.phone || "-"}
                        </td>
                        <td className="px-3.5 py-2 text-(--adm-text-secondary)">
                          {g.address}
                        </td>
                        <td className="px-3.5 py-2 text-right">
                          <button
                            type="button"
                            aria-label={`Hapus ${g.name} dari antrean`}
                            onClick={() =>
                              setBulkGuests((prev) =>
                                prev.filter((_, idx) => idx !== i)
                              )
                            }
                            className="adm-btn-aksi aksi-hapus"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
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
      <div
        data-tour="wa-history"
        className="space-y-3 border-t border-(--adm-border) pt-5"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h4 className="text-sm font-semibold text-(--adm-text-primary)">
              Riwayat Pengiriman Undangan
            </h4>
            <p className="text-xs text-(--adm-text-secondary)">
              Total {history.length} catatan pengiriman terbaru
            </p>
          </div>
          <button
            type="button"
            onClick={refreshStatuses}
            disabled={refreshingStatus || history.length === 0}
            className="adm-btn adm-btn-secondary adm-btn-sm"
          >
            <RefreshCcw
              className={`h-3.5 w-3.5 ${refreshingStatus ? "animate-spin" : ""}`}
            />
            Perbarui Status
          </button>
        </div>

        <div className="adm-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead className="border-b border-(--adm-border) bg-(--adm-bg-primary) text-[12px] font-semibold text-(--adm-text-secondary)">
                <tr>
                  <th className="px-4 py-2.5">Tamu</th>
                  <th className="px-4 py-2.5">WhatsApp</th>
                  <th className="px-4 py-2.5">Status</th>
                  <th className="px-4 py-2.5">Waktu</th>
                  <th className="px-4 py-2.5 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-(--adm-border)">
                {loadingHistory ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center">
                      <Loader2 className="mx-auto h-5 w-5 animate-spin text-(--adm-text-muted)" />
                    </td>
                  </tr>
                ) : history.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-8 text-center text-xs text-(--adm-text-secondary)"
                    >
                      Belum ada undangan yang dikirim lewat WhatsApp.
                    </td>
                  </tr>
                ) : (
                  history.map((row) => {
                    const badge =
                      STATUS_BADGE[row.status] || STATUS_BADGE.queued;
                    return (
                      <tr key={row.id} className="hover:bg-(--adm-bg-overlay)">
                        <td className="px-4 py-2.5">
                          <div className="font-medium text-(--adm-text-primary)">
                            {row.guest_name}
                          </div>
                          {row.error_message && (
                            <div className="mt-0.5 text-xs text-(--adm-red)">
                              {row.error_message}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-2.5 font-mono text-xs text-(--adm-text-secondary)">
                          {row.phone}
                        </td>
                        <td className="px-4 py-2.5">
                          <span className={badge.className}>
                            {row.status === "queued" && (
                              <Clock className="h-3 w-3" />
                            )}
                            {badge.label}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-xs text-(--adm-text-secondary) tabular-nums">
                          {new Date(row.created_at).toLocaleString("id-ID", {
                            day: "2-digit",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          <div className="inline-flex justify-end gap-1">
                            {row.status === "failed" && (
                              <button
                                type="button"
                                aria-label={`Kirim ulang ke ${row.guest_name}`}
                                disabled={resendingId === row.id}
                                onClick={() => resendRow(row)}
                                className="adm-btn-aksi aksi-ubah"
                                title="Kirim Ulang"
                              >
                                {resendingId === row.id ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <RefreshCcw className="h-3.5 w-3.5" />
                                )}
                              </button>
                            )}
                            <button
                              type="button"
                              aria-label={`Hapus riwayat ${row.guest_name}`}
                              onClick={() => deleteRow(row.id)}
                              className="adm-btn-aksi aksi-hapus"
                              title="Hapus"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
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
