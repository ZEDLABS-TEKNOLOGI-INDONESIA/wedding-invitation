import FileSaver from "file-saver";
import JSZip from "jszip";
import {
  Copy,
  Download,
  Loader2,
  RefreshCcw,
  Trash2,
  Upload,
  Users,
} from "lucide-react";
import QRCode from "qrcode";
import { QRCodeCanvas } from "qrcode.react";
import React, { useEffect, useMemo, useState } from "react";
import { parseGuestsText, type ParsedGuestRow } from "../utils/csvImport";
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

const loadImage = (src: string): Promise<HTMLImageElement | null> =>
  new Promise((resolve) => {
    if (!src) {
      resolve(null);
      return;
    }
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });

const QRCodeManager: React.FC<{ siteUrl: string }> = ({ siteUrl }) => {
  const [activeTab, setActiveTab] = useState<"single" | "bulk">("single");
  const [singleName, setSingleName] = useState("");
  const [bulkNames, setBulkNames] = useState<string[]>([]);
  const [savedGuests, setSavedGuests] = useState<SavedGuestItem[]>([]);
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMsg, setStatusMsg] = useState("");
  const [brideInitial, setBrideInitial] = useState("B");
  const [groomInitial, setGroomInitial] = useState("G");
  const [toast, setToast] = useState<ToastState | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState | null>(
    null
  );

  const baseUrl = siteUrl?.endsWith("/") ? siteUrl.slice(0, -1) : siteUrl || "";

  useEffect(() => {
    fetch("/api/config")
      .then((r) => r.json())
      .then((data) => {
        if (data.BRIDE_NICKNAME)
          setBrideInitial(data.BRIDE_NICKNAME.charAt(0).toUpperCase());
        if (data.GROOM_NICKNAME)
          setGroomInitial(data.GROOM_NICKNAME.charAt(0).toUpperCase());
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
    if (!name) return baseUrl;
    return `${baseUrl}/?to=${encodeURIComponent(name.trim())}`;
  };

  const handleSaveAs = (blob: Blob | string, name: string) => {
    const saveAsFunc = (FileSaver as any).saveAs || FileSaver;
    saveAsFunc(blob, name);
  };

  const centerLogo = useMemo(() => {
    try {
      const svgString = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
          <defs>
            <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style="stop-color:#F59E0B;stop-opacity:1" />
              <stop offset="100%" style="stop-color:#B45309;stop-opacity:1" />
            </linearGradient>
          </defs>
          <circle cx="50" cy="50" r="48" fill="white" />
          <circle cx="50" cy="50" r="46" fill="none" stroke="url(#goldGradient)" stroke-width="2" />
          <circle cx="50" cy="50" r="42" fill="none" stroke="#f1f5f9" stroke-width="1" />
          <g font-family="'Times New Roman', Times, serif" font-weight="bold" font-size="40" fill="#334155" text-anchor="middle">
             <text x="26" y="64">${brideInitial}</text>
             <text x="74" y="64">${groomInitial}</text>
          </g>
          <path d="M50 38 C 46 32, 36 33, 36 42 C 36 52, 50 64, 50 64 C 50 64, 64 52, 64 42 C 64 33, 54 32, 50 38 Z" fill="#e11d48" stroke="white" stroke-width="1.5" />
        </svg>
      `.trim();
      return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgString)}`;
    } catch {
      return "";
    }
  }, [brideInitial, groomInitial]);

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
      message: `${savedGuests.length} nama tamu dimuat dari Daftar Tamu Permanen.`,
    });
  };

  const renderQrBase64 = async (
    name: string,
    logoImg: HTMLImageElement | null
  ): Promise<string> => {
    const size = 300;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    await QRCode.toCanvas(canvas, generateUrl(name), {
      width: size,
      margin: 2,
      errorCorrectionLevel: "H",
    });

    if (logoImg) {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        const logoSize = 64;
        const pos = (size - logoSize) / 2;
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(size / 2, size / 2, logoSize / 2 + 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.drawImage(logoImg, pos, pos, logoSize, logoSize);
      }
    }

    return canvas.toDataURL("image/png").split(",")[1];
  };

  const downloadAllZip = async () => {
    if (bulkNames.length === 0) return;
    setIsProcessing(true);
    setProgress(0);
    setStatusMsg("Menyiapkan assets...");
    try {
      const zip = new JSZip();
      const folder = zip.folder("QR_Codes_Wedding");
      const logoImg = await loadImage(centerLogo);
      const CHUNK_SIZE = 25;
      for (let i = 0; i < bulkNames.length; i += CHUNK_SIZE) {
        const chunk = bulkNames.slice(i, i + CHUNK_SIZE);
        setStatusMsg(
          `Memproses ${i + 1} - ${Math.min(i + chunk.length, bulkNames.length)} dari ${bulkNames.length}...`
        );
        await Promise.all(
          chunk.map(async (name, chunkIdx) => {
            const globalIdx = i + chunkIdx;
            const base64Data = await renderQrBase64(name, logoImg);
            const safeName = name.replace(/[^a-z0-9]/gi, "_").substring(0, 50);
            folder?.file(`${globalIdx + 1}_${safeName}.png`, base64Data, {
              base64: true,
            });
          })
        );
        setProgress(Math.round(((i + chunk.length) / bulkNames.length) * 100));
        await new Promise((resolve) => setTimeout(resolve, 20));
      }
      setStatusMsg("Mengompres file ZIP...");
      const content = await zip.generateAsync({ type: "blob" });
      handleSaveAs(
        content,
        `QR-Codes-${new Date().toISOString().slice(0, 10)}.zip`
      );
      setStatusMsg("Selesai!");
    } catch {
      setToast({
        type: "error",
        message: "Terjadi kesalahan saat membuat ZIP.",
      });
    } finally {
      setTimeout(() => {
        setIsProcessing(false);
        setProgress(0);
        setStatusMsg("");
      }, 1000);
    }
  };

  const downloadSingle = () => {
    const canvas = document.getElementById("single-qr") as HTMLCanvasElement;
    if (canvas) {
      handleSaveAs(
        canvas.toDataURL("image/png"),
        `QR-${singleName || "Wedding"}.png`
      );
    }
  };

  const copySingleLink = () => {
    navigator.clipboard.writeText(generateUrl(singleName));
    setToast({ type: "success", message: "Link undangan berhasil disalin!" });
  };

  return (
    <div className="space-y-8">
      <ToastBanner toast={toast} onClose={() => setToast(null)} />
      <ConfirmModal
        dialog={confirmDialog}
        onClose={() => setConfirmDialog(null)}
      />

      <CsvImportModal<ParsedGuestRow>
        isOpen={isCsvModalOpen}
        title="Import Daftar Nama untuk QR Code"
        description="Upload file CSV atau tempel daftar nama (1 nama per baris) langsung dari Excel/WhatsApp."
        templateFilename="template_qr_tamu.csv"
        templateHeaders={["Nama Tamu"]}
        templateRows={[
          ["Ahmad Syarief Ramadhan"],
          ["Muhammad Ikbal Pauji"],
          ["Keluarga Besar H. Syarif"],
        ]}
        pastePlaceholder={
          "Ahmad Syarief Ramadhan\nMuhammad Ikbal Pauji\nKeluarga Besar H. Syarif"
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
            message: `${rows.length} nama tamu siap dibuatkan QR Code.`,
          });
        }}
        onClose={() => setIsCsvModalOpen(false)}
        confirmLabel="Muat Daftar Nama"
      />

      <div data-tour="qr-mode-switch" className="flex justify-start">
        <div className="adm-seg">
          <button
            type="button"
            onClick={() => setActiveTab("single")}
            className={`adm-seg-btn ${activeTab === "single" ? "is-active" : ""}`}
          >
            Manual (Satuan)
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
        <div className="animate-reveal grid items-start gap-4 md:grid-cols-2">
          <div className="adm-card">
            <div className="adm-card-header">
              <div>
                <h3 className="adm-card-title">QR Code Satuan</h3>
                <p className="adm-card-desc">
                  Buat QR Code undangan personal untuk satu tamu.
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
                  Nama Tamu
                </label>
                <input
                  id="qr-single-name"
                  type="text"
                  value={singleName}
                  onChange={(e) => setSingleName(e.target.value)}
                  placeholder="Ketik nama tamu..."
                  className="adm-input"
                />
              </div>
              <div>
                <span className="adm-label">Tautan Undangan</span>
                <div className="rounded-md border border-(--adm-border) bg-(--adm-bg-tertiary) px-3 py-2 font-mono text-[11px] break-all text-(--adm-text-secondary)">
                  {generateUrl(singleName)}
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={copySingleLink}
                  className="adm-btn adm-btn-secondary flex-1"
                >
                  <Copy className="h-3.5 w-3.5" /> Salin Link
                </button>
                <button
                  type="button"
                  onClick={downloadSingle}
                  disabled={!singleName}
                  className="adm-btn adm-btn-primary flex-1"
                >
                  <Download className="h-3.5 w-3.5" /> Unduh PNG
                </button>
              </div>
            </div>
          </div>
          <div className="adm-card">
            <div className="adm-card-header">
              <h3 className="adm-card-title">Pratinjau Desain</h3>
            </div>
            <div className="adm-card-body flex justify-center">
              <div className="rounded-md border border-(--adm-border) bg-white p-3">
                <QRCodeCanvas
                  id="single-qr"
                  value={generateUrl(singleName)}
                  size={250}
                  level="H"
                  includeMargin={true}
                  imageSettings={
                    centerLogo
                      ? {
                          src: centerLogo,
                          height: 50,
                          width: 50,
                          excavate: true,
                        }
                      : undefined
                  }
                />
              </div>
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
                      Ambil dari Daftar Tamu Permanen
                    </h3>
                    <p className="adm-card-desc">
                      Generate QR Code massal untuk seluruh {savedGuests.length}{" "}
                      tamu tersimpan tanpa perlu upload ulang CSV.
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
                      Seret file CSV atau salin-tempel daftar nama dari Excel,
                      Google Sheets, atau catatan WhatsApp.
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
                        Desain premium dengan logo terpasang
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setConfirmDialog({
                          title: "Reset Daftar Tamu",
                          message:
                            "Yakin ingin menghapus semua data yang dimuat?",
                          confirmLabel: "Reset",
                          destructive: true,
                          onConfirm: () => setBulkNames([]),
                        })
                      }
                      className="adm-btn adm-btn-outline-danger"
                    >
                      <RefreshCcw className="h-3.5 w-3.5" />
                      Reset Data
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
                      {isProcessing ? "Memproses..." : "Unduh ZIP"}
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
                {bulkNames.slice(0, 50).map((name, idx) => (
                  <div
                    key={idx}
                    className="adm-card group relative flex flex-col items-center gap-2 p-3"
                  >
                    <button
                      type="button"
                      aria-label={`Hapus ${name}`}
                      title="Hapus"
                      onClick={() =>
                        setBulkNames((prev) => prev.filter((_, i) => i !== idx))
                      }
                      className="adm-btn-aksi aksi-hapus absolute top-2 right-2 opacity-0 transition-opacity group-hover:opacity-100"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                    <div className="rounded-md bg-white p-1">
                      <QRCodeCanvas
                        value={generateUrl(name)}
                        size={140}
                        level="H"
                        includeMargin={true}
                        imageSettings={
                          centerLogo
                            ? {
                                src: centerLogo,
                                height: 35,
                                width: 35,
                                excavate: true,
                              }
                            : undefined
                        }
                      />
                    </div>
                    <p className="w-full truncate text-center text-[12px] font-semibold text-(--adm-text-primary)">
                      {name}
                    </p>
                  </div>
                ))}
              </div>

              {bulkNames.length > 50 && (
                <p className="adm-hint text-center">
                  ... dan {bulkNames.length - 50} QR Code lainnya (disembunyikan
                  agar browser tidak berat, namun tetap akan terunduh).
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
