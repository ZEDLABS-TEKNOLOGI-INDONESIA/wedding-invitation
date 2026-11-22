import FileSaver from "file-saver";
import JSZip from "jszip";
import {
  CheckCircle2,
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
import {
  parseGuestsText,
  type ParsedGuestRow,
} from "../utils/csvImport";
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
  const [confirmDialog, setConfirmDialog] =
    useState<ConfirmDialogState | null>(null);

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
            const safeName = name
              .replace(/[^a-z0-9]/gi, "_")
              .substring(0, 50);
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

      <div className="flex justify-center">
        <div className="inline-flex rounded-xl bg-slate-100 p-1 dark:bg-slate-900">
          <button
            type="button"
            onClick={() => setActiveTab("single")}
            className={`rounded-lg px-6 py-2 text-sm font-bold transition-all ${
              activeTab === "single"
                ? "bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white"
                : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            Manual (Satuan)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("bulk")}
            className={`rounded-lg px-6 py-2 text-sm font-bold transition-all ${
              activeTab === "bulk"
                ? "bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white"
                : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            Massal (Daftar Tamu / CSV)
          </button>
        </div>
      </div>

      {activeTab === "single" && (
        <div className="animate-reveal grid items-center gap-8 md:grid-cols-2">
          <div className="space-y-5">
            {savedGuests.length > 0 && (
              <div className="space-y-1.5">
                <label
                  htmlFor="qr-quick-pick"
                  className="text-xs font-bold tracking-widest text-slate-400 uppercase"
                >
                  Pilih Cepat dari Daftar Tamu
                </label>
                <select
                  id="qr-quick-pick"
                  value=""
                  onChange={(e) => {
                    if (e.target.value) setSingleName(e.target.value);
                  }}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
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

            <div className="space-y-2">
              <label
                htmlFor="qr-single-name"
                className="text-xs font-bold tracking-widest text-slate-400 uppercase"
              >
                Nama Tamu
              </label>
              <input
                id="qr-single-name"
                type="text"
                value={singleName}
                onChange={(e) => setSingleName(e.target.value)}
                placeholder="Ketik nama tamu..."
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-4 text-lg focus:ring-2 focus:ring-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>
            <div className="rounded-xl bg-slate-50 p-4 font-mono text-xs break-all text-slate-500 dark:bg-slate-900/50 dark:text-slate-400">
              {generateUrl(singleName)}
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={copySingleLink}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 py-3 text-xs font-bold uppercase hover:bg-slate-50 dark:border-slate-700 dark:text-white dark:hover:bg-slate-800"
              >
                <Copy className="h-4 w-4" /> Copy Link
              </button>
              <button
                type="button"
                onClick={downloadSingle}
                disabled={!singleName}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-xs font-bold text-white uppercase shadow-lg transition-all hover:bg-blue-700 disabled:opacity-50"
              >
                <Download className="h-4 w-4" /> Download PNG
              </button>
            </div>
          </div>
          <div className="flex justify-center">
            <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-xl dark:border-slate-700 dark:bg-slate-800">
              <QRCodeCanvas
                id="single-qr"
                value={generateUrl(singleName)}
                size={250}
                level="H"
                includeMargin={true}
                imageSettings={
                  centerLogo
                    ? { src: centerLogo, height: 50, width: 50, excavate: true }
                    : undefined
                }
              />
              <div className="mt-4 text-center">
                <p className="text-xs font-bold tracking-widest text-slate-400 uppercase">
                  Preview Desain
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "bulk" && (
        <div className="animate-reveal space-y-8">
          {bulkNames.length === 0 ? (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="flex flex-col justify-between space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-6 dark:border-slate-700 dark:bg-slate-800/50">
                <div className="space-y-2">
                  <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                    <Users className="h-6 w-6" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-800 dark:text-white">
                    Ambil dari Daftar Tamu Permanen
                  </h3>
                  <p className="text-sm text-slate-500">
                    Generate QR Code massal untuk seluruh {savedGuests.length}{" "}
                    tamu tersimpan tanpa perlu upload ulang CSV.
                  </p>
                </div>
                <div>
                  <button
                    type="button"
                    disabled={savedGuests.length === 0}
                    onClick={loadFromGuestDb}
                    className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-xs font-bold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
                  >
                    <Users className="h-4 w-4" /> Muat {savedGuests.length} Tamu
                  </button>
                </div>
              </div>

              <div className="flex flex-col justify-between space-y-4 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-6 dark:border-slate-700 dark:bg-slate-800/50">
                <div className="space-y-2">
                  <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200">
                    <Upload className="h-6 w-6" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-800 dark:text-white">
                    Import CSV / Tempel Daftar Nama
                  </h3>
                  <p className="text-sm text-slate-500">
                    Seret file CSV atau salin-tempel daftar nama dari Excel,
                    Google Sheets, atau catatan WhatsApp.
                  </p>
                </div>
                <div>
                  <button
                    type="button"
                    onClick={() => setIsCsvModalOpen(true)}
                    className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-6 py-3 text-xs font-bold text-white shadow-sm hover:bg-slate-800 dark:bg-white dark:text-slate-900"
                  >
                    <Upload className="h-4 w-4" /> Buka Import CSV / Teks
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex flex-col gap-4 rounded-xl border border-blue-100 bg-blue-50 p-4 md:flex-row md:items-center md:justify-between dark:border-blue-900/30 dark:bg-blue-900/10">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-blue-100 p-2 font-bold text-blue-600 dark:bg-blue-900/30 dark:text-blue-300">
                    {bulkNames.length}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-slate-700 dark:text-blue-100">
                      Data Tamu Siap
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      Desain Premium dengan Logo Terpasang
                    </span>
                  </div>
                </div>
                <div className="flex gap-3">
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
                    className="group flex items-center gap-2 rounded-xl border border-red-100 bg-red-50 px-5 py-2.5 text-xs font-bold text-red-600 transition-all hover:bg-red-100 hover:shadow-sm active:scale-95 dark:border-red-900/30 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30"
                  >
                    <RefreshCcw className="h-4 w-4 transition-transform duration-500 group-hover:-rotate-180" />
                    Reset Data
                  </button>
                  <button
                    type="button"
                    onClick={downloadAllZip}
                    disabled={isProcessing}
                    className="group relative flex items-center justify-center gap-3 overflow-hidden rounded-xl bg-blue-600 px-8 py-2.5 text-xs font-bold text-white shadow-lg transition-all duration-300 hover:-translate-y-0.5 hover:bg-blue-700 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    <div className="relative z-10 flex items-center gap-2">
                      {isProcessing ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Download className="h-4 w-4" />
                      )}
                      <span>
                        {isProcessing ? "Memproses..." : "Download ZIP"}
                      </span>
                    </div>
                  </button>
                </div>
              </div>

              {isProcessing && (
                <div className="animate-reveal space-y-2">
                  <div className="flex justify-between text-xs font-bold text-slate-500 dark:text-slate-400">
                    <span>{statusMsg}</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="h-3 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                    <div
                      className="h-full bg-blue-600 transition-all duration-300 ease-out"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-5">
                {bulkNames.slice(0, 50).map((name, idx) => (
                  <div
                    key={idx}
                    className="group relative flex flex-col items-center gap-3 rounded-xl border border-slate-100 bg-white p-3 shadow-sm transition-all hover:shadow-md dark:border-slate-700 dark:bg-slate-800"
                  >
                    <button
                      type="button"
                      aria-label={`Hapus ${name}`}
                      onClick={() =>
                        setBulkNames((prev) =>
                          prev.filter((_, i) => i !== idx)
                        )
                      }
                      className="absolute top-2 right-2 rounded-md p-1 text-red-500 opacity-0 transition-opacity hover:bg-red-50 group-hover:opacity-100 dark:hover:bg-red-900/30"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                    <div className="rounded-lg bg-white p-1">
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
                    <div className="w-full text-center">
                      <p className="truncate text-xs font-bold text-slate-700 dark:text-slate-300">
                        {name}
                      </p>
                      <div className="mt-1 flex justify-center opacity-0 transition-opacity group-hover:opacity-100">
                        <CheckCircle2 className="h-3 w-3 text-green-500" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {bulkNames.length > 50 && (
                <p className="text-center text-xs text-slate-400 italic">
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
