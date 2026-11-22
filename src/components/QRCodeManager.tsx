import FileSaver from "file-saver";
import JSZip from "jszip";
import {
  Copy,
  Download,
  Loader2,
  RefreshCcw,
  Sparkles,
  Trash2,
  Upload,
  Users,
} from "lucide-react";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { parseGuestsText, type ParsedGuestRow } from "../utils/csvImport";
import {
  QR_FORMATS,
  STATIONERY_DESIGNS,
  STATIONERY_THEMES,
  ensureStationeryFonts,
  renderQrCard,
  renderQrStamp,
  type QrFormatOption,
  type StationeryDesignId,
  type StationeryTheme,
} from "../utils/stationery";
import {
  ConfirmModal,
  ToastBanner,
  type ConfirmDialogState,
  type ToastState,
} from "./Admin/AdminFeedback";
import CsvImportModal from "./Admin/CsvImportModal";

interface SavedGuestItem {
  id: number;
  name: string;
}

const renderQrByFormat = (
  format: QrFormatOption,
  opts: {
    url: string;
    guestName: string;
    bride: string;
    groom: string;
    dateText: string;
    theme: StationeryTheme;
    design: StationeryDesignId;
    scale?: number;
  }
) => {
  const s = opts.scale ?? 1;
  const w = Math.round(format.width * s);
  const h = Math.round(format.height * s);
  if (format.isCompactStamp) {
    return renderQrStamp({
      url: opts.url,
      guestName: opts.guestName,
      bride: opts.bride,
      groom: opts.groom,
      dateText: opts.dateText,
      theme: opts.theme,
      design: opts.design,
      width: w,
    });
  }
  return renderQrCard({
    url: opts.url,
    guestName: opts.guestName,
    bride: opts.bride,
    groom: opts.groom,
    dateText: opts.dateText,
    theme: opts.theme,
    design: opts.design,
    width: w,
    height: h,
  });
};

const QrThumbPreview: React.FC<{
  url: string;
  name: string;
  bride: string;
  groom: string;
  dateText: string;
  theme: StationeryTheme;
  design: StationeryDesignId;
  format: QrFormatOption;
  fontsReady: boolean;
}> = ({
  url,
  name,
  bride,
  groom,
  dateText,
  theme,
  design,
  format,
  fontsReady,
}) => {
  const [src, setSrc] = useState("");

  useEffect(() => {
    const canvas = renderQrByFormat(format, {
      url,
      guestName: name,
      bride,
      groom,
      dateText,
      theme,
      design,
      scale: 260 / format.width,
    });
    setSrc(canvas.toDataURL("image/jpeg", 0.86));
  }, [url, name, bride, groom, dateText, theme, design, format, fontsReady]);

  if (!src) {
    return (
      <div
        className={`w-full animate-pulse rounded-md bg-(--adm-bg-tertiary) ${
          format.isCompactStamp ? "aspect-square" : "aspect-[3/4]"
        }`}
      />
    );
  }

  return (
    <img
      src={src}
      alt={`Kode QR ${name}`}
      className="w-full rounded-md border border-(--adm-border) object-cover shadow-xs"
    />
  );
};

const QRCodeManager: React.FC<{ siteUrl: string }> = ({ siteUrl }) => {
  const [activeTab, setActiveTab] = useState<"single" | "bulk">("single");
  const [currentTheme, setCurrentTheme] = useState<StationeryTheme>(
    STATIONERY_THEMES[0]
  );
  const [currentDesign, setCurrentDesign] =
    useState<StationeryDesignId>("floral");
  const [currentFormat, setCurrentFormat] = useState<QrFormatOption>(
    QR_FORMATS[0]
  );
  const [singleName, setSingleName] = useState("");
  const [bulkNames, setBulkNames] = useState<string[]>([]);
  const [savedGuests, setSavedGuests] = useState<SavedGuestItem[]>([]);
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMsg, setStatusMsg] = useState("");
  const [brideName, setBrideName] = useState("Mempelai Wanita");
  const [groomName, setGroomName] = useState("Mempelai Pria");
  const [eventDate, setEventDate] = useState("");
  const [fontsReady, setFontsReady] = useState(false);
  const [previewSrc, setPreviewSrc] = useState("");
  const [toast, setToast] = useState<ToastState | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState | null>(
    null
  );
  const renderTimerRef = useRef<number | null>(null);

  const baseUrl = siteUrl?.endsWith("/") ? siteUrl.slice(0, -1) : siteUrl || "";

  useEffect(() => {
    void ensureStationeryFonts().then(() => setFontsReady(true));

    fetch("/api/config")
      .then((r) => r.json())
      .then((data) => {
        if (data.BRIDE_NICKNAME) setBrideName(data.BRIDE_NICKNAME);
        if (data.GROOM_NICKNAME) setGroomName(data.GROOM_NICKNAME);
        const dateParts = [data.RESEPSI_DAY, data.RESEPSI_DATE].filter(Boolean);
        if (dateParts.length > 0) setEventDate(dateParts.join(", "));
      })
      .catch(() => {});

    fetch("/api/guests", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : []))
      .then((list) => {
        if (Array.isArray(list)) setSavedGuests(list);
      })
      .catch(() => {});
  }, []);

  const generateUrl = (name: string) => {
    if (!name.trim()) return baseUrl;
    return `${baseUrl}/?to=${encodeURIComponent(name.trim())}`;
  };

  const handleSaveAs = (blob: Blob | string, name: string) => {
    const saveAsFunc =
      (FileSaver as unknown as { saveAs?: typeof FileSaver }).saveAs ||
      FileSaver;
    saveAsFunc(blob, name);
  };

  const singleUrl = useMemo(
    () =>
      singleName.trim()
        ? `${baseUrl}/?to=${encodeURIComponent(singleName.trim())}`
        : baseUrl,
    [singleName, baseUrl]
  );

  // Pratinjau langsung kartu QR
  useEffect(() => {
    if (renderTimerRef.current) window.clearTimeout(renderTimerRef.current);
    renderTimerRef.current = window.setTimeout(() => {
      const canvas = renderQrByFormat(currentFormat, {
        url: singleUrl,
        guestName: singleName.trim() || "Tamu Undangan",
        bride: brideName,
        groom: groomName,
        dateText: eventDate,
        theme: currentTheme,
        design: currentDesign,
        scale: 520 / currentFormat.width,
      });
      setPreviewSrc(canvas.toDataURL("image/png"));
    }, 60);
    return () => {
      if (renderTimerRef.current) window.clearTimeout(renderTimerRef.current);
    };
  }, [
    singleUrl,
    singleName,
    brideName,
    groomName,
    eventDate,
    currentTheme,
    currentDesign,
    currentFormat,
    fontsReady,
  ]);

  const loadFromGuestDb = () => {
    if (savedGuests.length === 0) {
      setToast({
        type: "error",
        message: "Daftar Tamu Permanen masih kosong.",
      });
      return;
    }
    setBulkNames(savedGuests.map((g) => g.name));
    setToast({
      type: "success",
      message: `${savedGuests.length} nama tamu berhasil dimuat dari Daftar Tamu Permanen.`,
    });
  };

  const downloadAllZip = async () => {
    if (bulkNames.length === 0) return;
    setIsProcessing(true);
    setProgress(0);
    setStatusMsg("Menyiapkan huruf & ornamen desain...");
    try {
      await ensureStationeryFonts();
      const zip = new JSZip();
      const folder = zip.folder(
        `QR_${currentDesign}_${currentTheme.id}_${currentFormat.id}`
      );
      const CHUNK_SIZE = 15;
      for (let i = 0; i < bulkNames.length; i += CHUNK_SIZE) {
        const chunk = bulkNames.slice(i, i + CHUNK_SIZE);
        setStatusMsg(
          `Menyusun ${i + 1} – ${Math.min(i + chunk.length, bulkNames.length)} dari ${bulkNames.length} kartu...`
        );
        chunk.forEach((name, chunkIdx) => {
          const globalIdx = i + chunkIdx;
          const canvas = renderQrByFormat(currentFormat, {
            url: generateUrl(name),
            guestName: name,
            bride: brideName,
            groom: groomName,
            dateText: eventDate,
            theme: currentTheme,
            design: currentDesign,
          });
          const base64Data = canvas.toDataURL("image/png").split(",")[1];
          const safeName = name.replace(/[^a-z0-9]/gi, "_").substring(0, 50);
          folder?.file(`${globalIdx + 1}_${safeName}.png`, base64Data, {
            base64: true,
          });
        });
        setProgress(Math.round(((i + chunk.length) / bulkNames.length) * 100));
        await new Promise((resolve) => setTimeout(resolve, 16));
      }
      setStatusMsg("Mengemas berkas ZIP...");
      const content = await zip.generateAsync({ type: "blob" });
      handleSaveAs(
        content,
        `QR-${currentDesign}-${currentFormat.id}-${new Date().toISOString().slice(0, 10)}.zip`
      );
      setStatusMsg("Selesai!");
    } catch {
      setToast({
        type: "error",
        message: "Mohon maaf, terjadi kendala saat mengemas berkas ZIP.",
      });
    } finally {
      setTimeout(() => {
        setIsProcessing(false);
        setProgress(0);
        setStatusMsg("");
      }, 1000);
    }
  };

  const downloadSingle = async () => {
    await ensureStationeryFonts();
    const canvas = renderQrByFormat(currentFormat, {
      url: singleUrl,
      guestName: singleName.trim() || "Tamu Undangan",
      bride: brideName,
      groom: groomName,
      dateText: eventDate,
      theme: currentTheme,
      design: currentDesign,
    });
    const safeName = (singleName.trim() || "Undangan")
      .replace(/[^a-z0-9]/gi, "_")
      .substring(0, 50);
    handleSaveAs(
      canvas.toDataURL("image/png"),
      `QR-${safeName}-${currentDesign}-${currentFormat.id}.png`
    );
  };

  const copySingleLink = () => {
    navigator.clipboard.writeText(singleUrl);
    setToast({
      type: "success",
      message: "Tautan undangan berhasil disalin ke papan klip.",
    });
  };

  return (
    <div className="space-y-5">
      <ToastBanner toast={toast} onClose={() => setToast(null)} />
      <ConfirmModal
        dialog={confirmDialog}
        onClose={() => setConfirmDialog(null)}
      />

      <CsvImportModal<ParsedGuestRow>
        isOpen={isCsvModalOpen}
        title="Impor Daftar Nama untuk Kartu QR"
        description="Unggah berkas CSV atau salin-tempel daftar nama tamu (satu nama per baris) dari Excel maupun WhatsApp."
        templateFilename="template_qr_tamu.csv"
        templateHeaders={["Nama Tamu"]}
        templateRows={[
          ["Bpk. Ahmad Syarief & Ibu"],
          ["Sdr. Muhammad Ikbal Pauji"],
          ["Keluarga Besar H. Syarif"],
        ]}
        pastePlaceholder={
          "Bpk. Ahmad Syarief & Ibu\nSdr. Muhammad Ikbal Pauji\nKeluarga Besar H. Syarif"
        }
        parseText={parseGuestsText}
        columns={[
          {
            header: "Nama Tamu",
            render: (r) => <span className="font-bold">{r.name}</span>,
          },
        ]}
        onConfirm={(rows) => {
          setBulkNames(rows.map((r) => r.name));
          setToast({
            type: "success",
            message: `${rows.length} nama tamu siap dibuatkan Kartu QR.`,
          });
        }}
        onClose={() => setIsCsvModalOpen(false)}
        confirmLabel="Muat Daftar Nama"
      />

      {/* Panel Pilihan Desain, Warna & Ukuran Kertas/Format QR */}
      <div className="space-y-3.5 rounded-lg border border-(--adm-border) bg-(--adm-bg-primary) p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <span className="adm-label mb-0.5 flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-(--adm-accent)" />
              Pengaturan Desain, Nuansa Warna &amp; Ukuran Cetak QR
            </span>
            <p className="text-xs text-(--adm-text-secondary)">
              Desain:{" "}
              <strong className="text-(--adm-text-primary)">
                {STATIONERY_DESIGNS.find((d) => d.id === currentDesign)?.name}
              </strong>{" "}
              · Warna:{" "}
              <strong className="text-(--adm-text-primary)">
                {currentTheme.name}
              </strong>{" "}
              · Ukuran:{" "}
              <strong className="text-(--adm-text-primary)">
                {currentFormat.name}
              </strong>
            </p>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          {/* Pilihan Motif Desain */}
          <div>
            <span className="adm-label">Motif Desain</span>
            <div className="grid grid-cols-2 gap-1.5">
              {STATIONERY_DESIGNS.map((design) => (
                <button
                  key={design.id}
                  type="button"
                  onClick={() => setCurrentDesign(design.id)}
                  className={`rounded-md border px-2.5 py-2 text-left transition-all ${
                    currentDesign === design.id
                      ? "border-(--adm-accent) bg-(--adm-accent-soft) text-(--adm-accent)"
                      : "border-(--adm-border) bg-(--adm-bg-secondary) text-(--adm-text-secondary) hover:text-(--adm-text-primary)"
                  }`}
                >
                  <div className="text-[12px] font-semibold">{design.name}</div>
                  <div className="truncate text-[10px] opacity-80">
                    {design.tagline}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Pilihan Ukuran Kertas / Format + Nuansa Warna */}
          <div className="space-y-2.5">
            <div>
              <label htmlFor="qr-format-select" className="adm-label">
                Ukuran Kertas / Format Cetak
              </label>
              <select
                id="qr-format-select"
                value={currentFormat.id}
                onChange={(e) => {
                  const next = QR_FORMATS.find((f) => f.id === e.target.value);
                  if (next) setCurrentFormat(next);
                }}
                className="adm-input"
              >
                {QR_FORMATS.map((fmt) => (
                  <option key={fmt.id} value={fmt.id}>
                    {fmt.name} — {fmt.sizeLabel}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <span className="adm-label">Nuansa Warna</span>
              <div className="flex flex-wrap items-center gap-1.5">
                {STATIONERY_THEMES.map((theme) => (
                  <button
                    key={theme.id}
                    type="button"
                    onClick={() => setCurrentTheme(theme)}
                    className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] font-medium transition-all ${
                      currentTheme.id === theme.id
                        ? "border-(--adm-accent) bg-(--adm-accent-soft) text-(--adm-accent)"
                        : "border-(--adm-border) bg-(--adm-bg-secondary) text-(--adm-text-secondary) hover:text-(--adm-text-primary)"
                    }`}
                  >
                    <span className="flex items-center -space-x-1">
                      <span
                        className="h-3 w-3 rounded-full border border-white/70"
                        style={{ backgroundColor: theme.accent }}
                      />
                      <span
                        className="h-3 w-3 rounded-full border border-white/70"
                        style={{ backgroundColor: theme.petal }}
                      />
                    </span>
                    {theme.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mode Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div
          data-tour="qr-mode-switch"
          className="adm-seg grid w-full grid-cols-2 sm:inline-flex sm:w-auto"
        >
          <button
            type="button"
            onClick={() => setActiveTab("single")}
            className={`adm-seg-btn justify-center ${activeTab === "single" ? "is-active" : ""}`}
          >
            <span>
              Satuan<span className="hidden sm:inline"> (Per Tamu)</span>
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("bulk")}
            className={`adm-seg-btn justify-center ${activeTab === "bulk" ? "is-active" : ""}`}
          >
            <span>
              Massal
              <span className="hidden sm:inline"> (Daftar Tamu / CSV)</span>
            </span>
          </button>
        </div>
      </div>

      {activeTab === "single" && (
        <div className="animate-reveal grid items-start gap-4 md:grid-cols-2">
          <div className="adm-card">
            <div className="adm-card-header">
              <div>
                <h3 className="adm-card-title">Kartu QR Satuan</h3>
                <p className="adm-card-desc">
                  Susun kartu QR personal lengkap dengan monogram inisial
                  mempelai.
                </p>
              </div>
            </div>
            <div className="adm-card-body space-y-3">
              {savedGuests.length > 0 && (
                <div>
                  <label htmlFor="qr-quick-pick" className="adm-label">
                    Pilih Cepat dari Daftar Tamu
                  </label>
                  <select
                    id="qr-quick-pick"
                    value=""
                    onChange={(e) => {
                      if (e.target.value) setSingleName(e.target.value);
                    }}
                    className="adm-input"
                  >
                    <option value="">
                      -- Pilih dari {savedGuests.length} tamu tersimpan --
                    </option>
                    {savedGuests.map((g) => (
                      <option key={g.id} value={g.name}>
                        {g.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label htmlFor="qr-single-name" className="adm-label">
                  Nama Tamu Yang Terhormat
                </label>
                <input
                  id="qr-single-name"
                  type="text"
                  value={singleName}
                  onChange={(e) => setSingleName(e.target.value)}
                  placeholder="Contoh: Bpk. Habibie & Keluarga"
                  className="adm-input"
                />
              </div>
              <div>
                <span className="adm-label">Tautan Undangan</span>
                <div className="rounded-md border border-(--adm-border) bg-(--adm-bg-tertiary) px-3 py-2 font-mono text-[11px] break-all text-(--adm-text-secondary)">
                  {singleUrl}
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={copySingleLink}
                  className="adm-btn adm-btn-secondary flex-1"
                >
                  <Copy className="h-3.5 w-3.5" /> Salin Tautan
                </button>
                <button
                  type="button"
                  onClick={downloadSingle}
                  disabled={!singleName.trim()}
                  className="adm-btn adm-btn-primary flex-1"
                >
                  <Download className="h-3.5 w-3.5" /> Unduh PNG HD
                </button>
              </div>
            </div>
          </div>

          <div className="adm-card">
            <div className="adm-card-header flex items-center justify-between">
              <h3 className="adm-card-title">Pratinjau Desain</h3>
              <span className="adm-badge adm-badge-accent">
                {currentFormat.sizeLabel}
              </span>
            </div>
            <div className="adm-card-body flex justify-center bg-(--adm-bg-tertiary)">
              {previewSrc ? (
                <img
                  src={previewSrc}
                  alt="Pratinjau Kartu QR"
                  className="max-h-[430px] w-auto rounded-md border border-(--adm-border) shadow-md"
                />
              ) : (
                <div className="flex h-64 items-center justify-center text-(--adm-text-muted)">
                  <Loader2 className="h-5 w-5 animate-spin" />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === "bulk" && (
        <div className="animate-reveal space-y-4">
          {bulkNames.length === 0 ? (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="adm-card flex flex-col">
                <div className="adm-card-body flex flex-1 flex-col justify-between gap-4">
                  <div className="space-y-2">
                    <div className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-(--adm-accent-soft) text-(--adm-accent)">
                      <Users className="h-4 w-4" />
                    </div>
                    <h3 className="adm-card-title">
                      Muat dari Daftar Tamu Permanen
                    </h3>
                    <p className="adm-card-desc">
                      Buat Kartu QR massal untuk seluruh {savedGuests.length}{" "}
                      tamu tersimpan tanpa perlu mengunggah ulang berkas CSV.
                    </p>
                  </div>
                  <div>
                    <button
                      type="button"
                      disabled={savedGuests.length === 0}
                      onClick={loadFromGuestDb}
                      className="adm-btn adm-btn-primary"
                    >
                      <Users className="h-3.5 w-3.5" /> Muat{" "}
                      {savedGuests.length} Tamu
                    </button>
                  </div>
                </div>
              </div>

              <div className="adm-card flex flex-col border-dashed">
                <div className="adm-card-body flex flex-1 flex-col justify-between gap-4">
                  <div className="space-y-2">
                    <div className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-(--adm-bg-tertiary) text-(--adm-text-secondary)">
                      <Upload className="h-4 w-4" />
                    </div>
                    <h3 className="adm-card-title">
                      Impor CSV / Tempel Daftar Nama
                    </h3>
                    <p className="adm-card-desc">
                      Unggah berkas CSV atau salin-tempel daftar nama dari
                      Excel, Google Sheets, maupun catatan WhatsApp.
                    </p>
                  </div>
                  <div>
                    <button
                      type="button"
                      onClick={() => setIsCsvModalOpen(true)}
                      className="adm-btn adm-btn-outline-primary"
                    >
                      <Upload className="h-3.5 w-3.5" /> Buka Impor CSV / Teks
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="adm-card">
                <div className="adm-card-body flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div className="flex items-center gap-3">
                    <span className="adm-badge adm-badge-accent">
                      {bulkNames.length}
                    </span>
                    <div className="flex flex-col">
                      <span className="adm-card-title">Data Tamu Siap</span>
                      <span className="adm-hint">
                        {
                          STATIONERY_DESIGNS.find((d) => d.id === currentDesign)
                            ?.name
                        }{" "}
                        · {currentTheme.name} · {currentFormat.name}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setConfirmDialog({
                          title: "Atur Ulang Daftar Tamu",
                          message:
                            "Apakah Anda yakin ingin mengosongkan daftar tamu yang sedang dimuat?",
                          confirmLabel: "Atur Ulang",
                          destructive: true,
                          onConfirm: () => setBulkNames([]),
                        })
                      }
                      className="adm-btn adm-btn-outline-danger"
                    >
                      <RefreshCcw className="h-3.5 w-3.5" />
                      Atur Ulang
                    </button>
                    <button
                      type="button"
                      onClick={downloadAllZip}
                      disabled={isProcessing}
                      className="adm-btn adm-btn-primary"
                    >
                      {isProcessing ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Download className="h-3.5 w-3.5" />
                      )}
                      {isProcessing ? "Menyusun..." : "Unduh ZIP"}
                    </button>
                  </div>
                </div>
              </div>

              {isProcessing && (
                <div className="animate-reveal space-y-1.5">
                  <div className="flex justify-between text-[11px] font-semibold text-(--adm-text-secondary)">
                    <span>{statusMsg}</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-(--adm-bg-tertiary)">
                    <div
                      className="h-full bg-(--adm-accent) transition-all duration-300 ease-out"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-5">
                {bulkNames.slice(0, 20).map((name, idx) => (
                  <div
                    key={`${name}-${idx}`}
                    className="adm-card group relative flex flex-col items-center gap-2 p-2.5"
                  >
                    <button
                      type="button"
                      aria-label={`Hapus ${name}`}
                      title="Hapus"
                      onClick={() =>
                        setBulkNames((prev) =>
                          prev.filter((_, i) => i !== idx)
                        )
                      }
                      className="adm-btn-aksi aksi-hapus absolute top-2 right-2 z-10 opacity-0 transition-opacity group-hover:opacity-100"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                    <QrThumbPreview
                      url={generateUrl(name)}
                      name={name}
                      bride={brideName}
                      groom={groomName}
                      dateText={eventDate}
                      theme={currentTheme}
                      design={currentDesign}
                      format={currentFormat}
                      fontsReady={fontsReady}
                    />
                    <p className="w-full truncate text-center text-[12px] font-semibold text-(--adm-text-primary)">
                      {name}
                    </p>
                  </div>
                ))}
              </div>

              {bulkNames.length > 20 && (
                <p className="adm-hint text-center">
                  … dan {bulkNames.length - 20} kartu QR lainnya (disembunyikan
                  agar peramban tetap ringan, namun seluruhnya tetap akan masuk
                  ke berkas ZIP).
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default QRCodeManager;
