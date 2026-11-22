import FileSaver from "file-saver";
import JSZip from "jszip";
import {
  Check,
  Download,
  Eye,
  FileSpreadsheet,
  Loader2,
  Printer,
  RefreshCcw,
  Sparkles,
  Trash2,
  Upload,
  Users,
} from "lucide-react";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { parseGuestsText, type ParsedGuestRow } from "../utils/csvImport";
import {
  buildInvitationContentFromConfig,
  generateInvitationPdfDoc,
  loadPdfPrefs,
  renderSharedMiddlePages,
  resolvePdfPrefs,
  savePdfPrefs,
} from "../utils/pdfInvitation";
import {
  PAPER_SIZES,
  STATIONERY_DESIGNS,
  STATIONERY_THEMES,
  ensureStationeryFonts,
  renderClosingPage,
  renderCouplePage,
  renderCoverPage,
  renderEventPage,
  type PaperSizeOption,
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

interface GuestData {
  name: string;
  address: string;
}

interface SavedGuestItem {
  id: number;
  name: string;
  address: string;
}

interface InvitationManagerProps {
  siteUrl: string;
}

const PAGE_LABELS = [
  "1. Sampul",
  "2. Mempelai",
  "3. Acara & Lokasi",
  "4. QR & Penutup",
] as const;

const InvitationManager: React.FC<InvitationManagerProps> = ({ siteUrl }) => {
  const [activeTab, setActiveTab] = useState<"single" | "bulk">("single");
  const [currentTheme, setCurrentTheme] = useState<StationeryTheme>(() => {
    return resolvePdfPrefs(loadPdfPrefs()).theme;
  });
  const [currentDesign, setCurrentDesign] = useState<StationeryDesignId>(() => {
    return resolvePdfPrefs(loadPdfPrefs()).designId;
  });
  const [currentPaper, setCurrentPaper] = useState<PaperSizeOption>(() => {
    return resolvePdfPrefs(loadPdfPrefs()).paper;
  });

  useEffect(() => {
    savePdfPrefs({
      designId: currentDesign,
      paperId: currentPaper.id,
      themeId: currentTheme.id,
    });
  }, [currentDesign, currentPaper.id, currentTheme.id]);
  const [singleData, setSingleData] = useState<GuestData>({
    name: "",
    address: "Di Tempat",
  });
  const [bulkData, setBulkData] = useState<GuestData[]>([]);
  const [savedGuests, setSavedGuests] = useState<SavedGuestItem[]>([]);
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isGeneratingSingle, setIsGeneratingSingle] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMsg, setStatusMsg] = useState("");
  const [previewPage, setPreviewPage] = useState<number>(0);
  const [previewImages, setPreviewImages] = useState<string[]>([]);
  const [cfg, setCfg] = useState<Record<string, string>>({});
  const [isConfigLoaded, setIsConfigLoaded] = useState(false);
  const [fontsReady, setFontsReady] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState | null>(
    null
  );
  const previewTimerRef = useRef<number | null>(null);

  useEffect(() => {
    void ensureStationeryFonts().then(() => setFontsReady(true));

    fetch("/api/config")
      .then((r) => r.json())
      .then((data) => {
        setCfg(data);
        setIsConfigLoaded(true);
      })
      .catch(() => {
        setIsConfigLoaded(true);
      });

    fetch("/api/guests", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : []))
      .then((list) => {
        if (Array.isArray(list)) setSavedGuests(list);
      })
      .catch(() => {});
  }, []);

  const baseUrl = siteUrl?.endsWith("/") ? siteUrl.slice(0, -1) : siteUrl || "";

  const handleSaveAs = (blob: Blob | string, name: string) => {
    const saveAsFunc =
      (FileSaver as unknown as { saveAs?: typeof FileSaver }).saveAs ||
      FileSaver;
    saveAsFunc(blob, name);
  };

  const invitationContent = useMemo(
    () => buildInvitationContentFromConfig(cfg),
    [cfg]
  );

  const pageOpts = useMemo(
    () => ({ design: currentDesign, paper: currentPaper }),
    [currentDesign, currentPaper]
  );

  // Pratinjau visual langsung 4 halaman
  const buildPreviewImages = useCallback(
    (guest: GuestData) => {
      const guestName = guest.name.trim() || "Bpk. Habibie & Keluarga";
      const guestUrl = `${baseUrl}/?to=${encodeURIComponent(guestName)}`;
      const pages = [
        renderCoverPage(
          invitationContent,
          { name: guestName, address: guest.address },
          currentTheme,
          pageOpts
        ),
        renderCouplePage(invitationContent, currentTheme, pageOpts),
        renderEventPage(invitationContent, currentTheme, pageOpts),
        renderClosingPage(invitationContent, guestUrl, currentTheme, pageOpts),
      ];
      return pages.map((c) => c.toDataURL("image/jpeg", 0.86));
    },
    [baseUrl, currentTheme, invitationContent, pageOpts]
  );

  useEffect(() => {
    if (!isConfigLoaded) return;
    if (previewTimerRef.current) window.clearTimeout(previewTimerRef.current);
    previewTimerRef.current = window.setTimeout(() => {
      setPreviewImages(buildPreviewImages(singleData));
    }, 90);
    return () => {
      if (previewTimerRef.current) window.clearTimeout(previewTimerRef.current);
    };
  }, [isConfigLoaded, fontsReady, singleData, buildPreviewImages]);

  const generatePDFDoc = (
    guest: GuestData,
    sharedMiddlePages?: { page2: string; page3: string }
  ) =>
    generateInvitationPdfDoc(
      invitationContent,
      guest,
      baseUrl,
      currentTheme,
      pageOpts,
      sharedMiddlePages,
      0.92
    );

  const handleOpenPdfPreview = async () => {
    if (!singleData.name.trim()) return;
    setIsGeneratingSingle(true);
    try {
      const doc = await generatePDFDoc(singleData);
      const blob = doc.output("blob");
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank", "noopener,noreferrer");
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } finally {
      setIsGeneratingSingle(false);
    }
  };

  const downloadSingle = async () => {
    if (!singleData.name.trim()) return;
    setIsGeneratingSingle(true);
    try {
      const doc = await generatePDFDoc(singleData);
      handleSaveAs(
        doc.output("blob"),
        `Undangan_${singleData.name.replace(/[^a-zA-Z0-9]/g, "_")}_${currentDesign}_${currentPaper.id}.pdf`
      );
    } finally {
      setIsGeneratingSingle(false);
    }
  };

  const loadFromGuestDb = () => {
    if (savedGuests.length === 0) {
      setToast({
        type: "error",
        message: "Daftar Tamu Permanen masih kosong.",
      });
      return;
    }
    setBulkData(
      savedGuests.map((g) => ({
        name: g.name,
        address: g.address || "Di Tempat",
      }))
    );
    setToast({
      type: "success",
      message: `${savedGuests.length} tamu berhasil dimuat dari Daftar Tamu Permanen.`,
    });
  };

  const processBulk = async () => {
    if (bulkData.length === 0) return;
    setIsProcessing(true);
    setProgress(0);
    setStatusMsg("Menyiapkan huruf & halaman dasar...");
    try {
      await ensureStationeryFonts();
      const sharedMiddlePages = renderSharedMiddlePages(
        invitationContent,
        currentTheme,
        pageOpts,
        0.92
      );

      const zip = new JSZip();
      const folder = zip.folder(
        `Undangan_${currentDesign}_${currentPaper.id.toUpperCase()}`
      );
      const CHUNK_SIZE = 5;
      for (let i = 0; i < bulkData.length; i += CHUNK_SIZE) {
        const chunk = bulkData.slice(i, i + CHUNK_SIZE);
        setStatusMsg(
          `Menyusun PDF ${i + 1} – ${Math.min(i + chunk.length, bulkData.length)} dari ${bulkData.length}...`
        );
        for (let idx = 0; idx < chunk.length; idx++) {
          const guest = chunk[idx];
          const doc = await generatePDFDoc(guest, sharedMiddlePages);
          const blob = doc.output("blob");
          const safeName = guest.name
            .replace(/[^a-zA-Z0-9]/g, "_")
            .substring(0, 50);
          folder?.file(`${i + idx + 1}_${safeName}.pdf`, blob);
        }
        setProgress(
          Math.round(
            (Math.min(i + CHUNK_SIZE, bulkData.length) / bulkData.length) * 100
          )
        );
        await new Promise((r) => setTimeout(r, 16));
      }
      setStatusMsg("Mengemas berkas ZIP...");
      const content = await zip.generateAsync({ type: "blob" });
      handleSaveAs(
        content,
        `Undangan-${currentDesign}-${currentPaper.id}-${new Date().toISOString().slice(0, 10)}.zip`
      );
      setStatusMsg("Selesai!");
    } catch (error) {
      console.error("Gagal menyusun undangan massal:", error);
      setToast({
        type: "error",
        message: "Mohon maaf, terjadi kendala sistem saat menyusun berkas PDF.",
      });
    } finally {
      setTimeout(() => {
        setIsProcessing(false);
        setProgress(0);
        setStatusMsg("");
      }, 1000);
    }
  };

  return (
    <div className="animate-reveal space-y-5">
      <ToastBanner toast={toast} onClose={() => setToast(null)} />
      <ConfirmModal
        dialog={confirmDialog}
        onClose={() => setConfirmDialog(null)}
      />

      <CsvImportModal<ParsedGuestRow>
        isOpen={isCsvModalOpen}
        title="Impor Daftar Tamu untuk Undangan PDF"
        description="Unggah berkas CSV atau salin-tempel langsung dari Excel (Nama Tamu & Alamat/Kota)."
        templateFilename="template_undangan_pdf.csv"
        templateHeaders={["Nama Tamu", "Alamat (Opsional)"]}
        templateRows={[
          ["Bapak Ahmad & Ibu Siti", "Jakarta"],
          ["Keluarga Besar H. Syarif", "Bandung"],
          ["Rekan-rekan Alumni SMA 1", "Di Tempat"],
        ]}
        pastePlaceholder={
          "Bapak Ahmad & Ibu Siti,Jakarta\nKeluarga Besar H. Syarif,Bandung\nRekan-rekan Alumni SMA 1,Di Tempat"
        }
        parseText={parseGuestsText}
        columns={[
          {
            header: "Nama Tamu",
            render: (r) => <span className="font-bold">{r.name}</span>,
          },
          { header: "Alamat / Kota", render: (r) => r.address },
        ]}
        onConfirm={(rows) => {
          setBulkData(
            rows.map((r) => ({
              name: r.name,
              address: r.address || "Di Tempat",
            }))
          );
          setToast({
            type: "success",
            message: `${rows.length} tamu siap dicetak ke berkas PDF.`,
          });
        }}
        onClose={() => setIsCsvModalOpen(false)}
        confirmLabel="Muat Daftar Tamu"
      />

      {/* Panel Pilihan Desain, Ukuran Kertas & Nuansa Warna */}
      <div
        data-tour="pdf-themes"
        className="space-y-3.5 rounded-lg border border-(--adm-border) bg-(--adm-bg-primary) p-4"
      >
        <div>
          <span className="adm-label mb-0.5 flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-(--adm-accent)" />
            Pengaturan Desain, Ukuran Kertas &amp; Nuansa Warna (4 Halaman)
          </span>
          <p className="text-xs text-(--adm-text-secondary)">
            Desain:{" "}
            <strong className="text-(--adm-text-primary)">
              {STATIONERY_DESIGNS.find((d) => d.id === currentDesign)?.name}
            </strong>{" "}
            · Kertas:{" "}
            <strong className="text-(--adm-text-primary)">
              {currentPaper.name} ({currentPaper.dimensionsLabel})
            </strong>{" "}
            · Warna:{" "}
            <strong className="text-(--adm-text-primary)">
              {currentTheme.name}
            </strong>
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          {/* Pilihan Motif Desain */}
          <div>
            <span className="adm-label">Motif Desain Surat Undangan</span>
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

          {/* Pilihan Ukuran Kertas & Nuansa Warna */}
          <div className="space-y-2.5">
            <div>
              <label htmlFor="pdf-paper-size" className="adm-label">
                Ukuran Kertas PDF
              </label>
              <select
                id="pdf-paper-size"
                value={currentPaper.id}
                onChange={(e) => {
                  const found = PAPER_SIZES.find(
                    (p) => p.id === e.target.value
                  );
                  if (found) setCurrentPaper(found);
                }}
                className="adm-input"
              >
                {PAPER_SIZES.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} — {p.dimensionsLabel}
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

      <div className="flex justify-start">
        <div className="adm-seg">
          <button
            type="button"
            onClick={() => setActiveTab("single")}
            className={`adm-seg-btn ${activeTab === "single" ? "is-active" : ""}`}
          >
            Satuan (Per Tamu)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("bulk")}
            className={`adm-seg-btn ${activeTab === "bulk" ? "is-active" : ""}`}
          >
            Massal (Daftar Tamu / CSV)
          </button>
        </div>
      </div>

      {activeTab === "single" && (
        <div className="grid items-start gap-4 md:grid-cols-2">
          <div className="adm-card">
            <div className="adm-card-header">
              <div>
                <h3 className="adm-card-title">Surat Undangan PDF Satuan</h3>
                <p className="adm-card-desc">
                  Cetak undangan 4 halaman ukuran {currentPaper.dimensionsLabel}{" "}
                  dengan desain &amp; nuansa pilihan Anda.
                </p>
              </div>
            </div>
            <div className="adm-card-body space-y-3">
              {savedGuests.length > 0 && (
                <div>
                  <label htmlFor="pdf-quick-pick" className="adm-label">
                    Pilih Cepat dari Daftar Tamu
                  </label>
                  <select
                    id="pdf-quick-pick"
                    value=""
                    onChange={(e) => {
                      const found = savedGuests.find(
                        (g) => String(g.id) === e.target.value
                      );
                      if (found) {
                        setSingleData({
                          name: found.name,
                          address: found.address || "Di Tempat",
                        });
                      }
                    }}
                    className="adm-input"
                  >
                    <option value="">
                      -- Pilih dari {savedGuests.length} tamu tersimpan --
                    </option>
                    {savedGuests.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name} ({g.address || "Di Tempat"})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label htmlFor="pdf-single-name" className="adm-label">
                  Nama Tamu Yang Terhormat
                </label>
                <input
                  id="pdf-single-name"
                  type="text"
                  value={singleData.name}
                  onChange={(e) =>
                    setSingleData({ ...singleData, name: e.target.value })
                  }
                  placeholder="Contoh: Bpk. Habibie & Keluarga"
                  className="adm-input"
                />
              </div>
              <div>
                <label htmlFor="pdf-single-address" className="adm-label">
                  Alamat / Kota (Opsional)
                </label>
                <input
                  id="pdf-single-address"
                  type="text"
                  value={singleData.address}
                  onChange={(e) =>
                    setSingleData({ ...singleData, address: e.target.value })
                  }
                  placeholder="Jakarta Selatan"
                  className="adm-input"
                />
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleOpenPdfPreview}
                  disabled={
                    !singleData.name.trim() ||
                    !isConfigLoaded ||
                    isGeneratingSingle
                  }
                  className="adm-btn adm-btn-secondary flex-1"
                >
                  {isGeneratingSingle ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Eye className="h-3.5 w-3.5" />
                  )}
                  Buka PDF
                </button>
                <button
                  type="button"
                  onClick={downloadSingle}
                  disabled={
                    !singleData.name.trim() ||
                    !isConfigLoaded ||
                    isGeneratingSingle
                  }
                  className="adm-btn adm-btn-primary flex-1"
                >
                  {isGeneratingSingle ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Printer className="h-3.5 w-3.5" />
                  )}
                  Unduh PDF
                </button>
              </div>
            </div>
          </div>

          <div className="adm-card">
            <div className="adm-card-header flex flex-wrap items-center justify-between gap-2">
              <h3 className="adm-card-title">Pratinjau Langsung</h3>
              <div className="flex flex-wrap gap-1">
                {PAGE_LABELS.map((label, idx) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => setPreviewPage(idx)}
                    className={`rounded px-2 py-1 text-[11px] font-medium transition-colors ${
                      previewPage === idx
                        ? "bg-(--adm-accent) text-white"
                        : "bg-(--adm-bg-tertiary) text-(--adm-text-secondary) hover:text-(--adm-text-primary)"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div className="adm-card-body flex min-h-[420px] flex-col items-center justify-center gap-3 bg-(--adm-bg-tertiary)">
              {previewImages[previewPage] ? (
                <>
                  <img
                    src={previewImages[previewPage]}
                    alt={`Pratinjau ${PAGE_LABELS[previewPage]}`}
                    className="max-h-[480px] w-auto rounded-md border border-(--adm-border) shadow-md"
                  />
                  <div className="flex items-center gap-1.5">
                    {previewImages.map((src, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setPreviewPage(idx)}
                        className={`overflow-hidden rounded border-2 transition-all ${
                          previewPage === idx
                            ? "border-(--adm-accent) shadow-xs"
                            : "border-transparent opacity-60 hover:opacity-100"
                        }`}
                        title={PAGE_LABELS[idx]}
                      >
                        <img
                          src={src}
                          alt={PAGE_LABELS[idx]}
                          className="h-14 w-auto object-cover"
                        />
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <div className="text-center text-(--adm-text-muted)">
                  <FileSpreadsheet className="mx-auto mb-2 h-10 w-10 opacity-50" />
                  <p className="text-[13px]">Menyiapkan pratinjau undangan…</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === "bulk" && (
        <div className="animate-reveal space-y-4">
          {bulkData.length === 0 ? (
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
                      Cetak PDF massal untuk seluruh {savedGuests.length} tamu
                      yang sudah tersimpan di pangkalan data.
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
                      Impor CSV / Tempel dari Excel
                    </h3>
                    <p className="adm-card-desc">
                      Unggah berkas CSV atau salin-tempel daftar tamu langsung
                      dari Excel maupun Google Sheets.
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
                      {bulkData.length}
                    </span>
                    <div className="flex flex-col">
                      <span className="adm-card-title">Tamu Siap Dicetak</span>
                      <span className="adm-hint">
                        {
                          STATIONERY_DESIGNS.find((d) => d.id === currentDesign)
                            ?.name
                        }{" "}
                        · {currentPaper.name} · {currentTheme.name}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setConfirmDialog({
                          title: "Atur Ulang Data Tamu",
                          message:
                            "Apakah Anda yakin ingin mengosongkan daftar tamu yang sedang dimuat?",
                          confirmLabel: "Atur Ulang",
                          destructive: true,
                          onConfirm: () => setBulkData([]),
                        })
                      }
                      className="adm-btn adm-btn-outline-danger"
                    >
                      <RefreshCcw className="h-3.5 w-3.5" />
                      Atur Ulang
                    </button>
                    <button
                      type="button"
                      onClick={processBulk}
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
                      className="h-full rounded-full bg-(--adm-accent) transition-all duration-300 ease-out"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              )}

              <div className="custom-scrollbar grid max-h-[400px] grid-cols-1 gap-2 overflow-y-auto pr-1 md:grid-cols-2 lg:grid-cols-3">
                {bulkData.map((guest, idx) => (
                  <div
                    key={idx}
                    className="adm-card flex items-center justify-between gap-3 px-3 py-2"
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-(--adm-bg-tertiary) text-[10px] font-semibold text-(--adm-text-secondary)">
                        {idx + 1}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-[12px] font-semibold text-(--adm-text-primary)">
                          {guest.name}
                        </p>
                        <p className="adm-hint truncate">{guest.address}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Check className="h-3.5 w-3.5 text-(--adm-green)" />
                      <button
                        type="button"
                        aria-label={`Hapus ${guest.name}`}
                        title="Hapus"
                        onClick={() =>
                          setBulkData((prev) =>
                            prev.filter((_, i) => i !== idx)
                          )
                        }
                        className="adm-btn-aksi aksi-hapus"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default InvitationManager;
