import React, { useState, useRef, useMemo } from "react";
import { QRCodeCanvas } from "qrcode.react";
import Papa from "papaparse";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import {
  Download,
  Upload,
  Copy,
  RefreshCcw,
  Loader2,
  FileText,
} from "lucide-react";
import { WEDDING_CONFIG } from "../constants";

interface QRCodeManagerProps {
  siteUrl: string;
}

const QRCodeManager: React.FC<QRCodeManagerProps> = ({ siteUrl }) => {
  const [activeTab, setActiveTab] = useState<"single" | "bulk">("single");
  const [singleName, setSingleName] = useState("");
  const [bulkNames, setBulkNames] = useState<string[]>([]);
  const [isZipping, setIsZipping] = useState(false);
  const qrRefs = useRef<{ [key: string]: HTMLCanvasElement | null }>({});

  const baseUrl = siteUrl?.endsWith("/") ? siteUrl.slice(0, -1) : siteUrl || "";

  const generateUrl = (name: string) => {
    if (!name) return baseUrl;
    return `${baseUrl}/?to=${encodeURIComponent(name.trim())}`;
  };

  // --- GENERATE PREMIUM LOGO ---
  const centerLogo = useMemo(() => {
    try {
      const bInitial = (WEDDING_CONFIG?.couple?.bride?.name || "B")
        .charAt(0)
        .toUpperCase();
      const gInitial = (WEDDING_CONFIG?.couple?.groom?.name || "G")
        .charAt(0)
        .toUpperCase();

      // Desain SVG Professional: Border Emas, Font Serif, Hati Elegan
      const svgString = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
          <defs>
            <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style="stop-color:#F59E0B;stop-opacity:1" />
              <stop offset="100%" style="stop-color:#B45309;stop-opacity:1" />
            </linearGradient>
          </defs>
          
          <!-- Background Putih Bersih -->
          <circle cx="50" cy="50" r="48" fill="white" />
          
          <!-- Border Emas Mewah (Double Stroke) -->
          <circle cx="50" cy="50" r="46" fill="none" stroke="url(#goldGradient)" stroke-width="2" />
          <circle cx="50" cy="50" r="42" fill="none" stroke="#f1f5f9" stroke-width="1" />

          <!-- Group Teks (Font Serif Mewah) -->
          <g font-family="'Times New Roman', Times, serif" font-weight="bold" font-size="40" fill="#334155" text-anchor="middle">
             <!-- Inisial Wanita (Kiri) -->
             <text x="26" y="64">${bInitial}</text>
             
             <!-- Inisial Pria (Kanan) -->
             <text x="74" y="64">${gInitial}</text>
          </g>

          <!-- Ikon Hati Merah (Rose Red) di Tengah -->
          <path d="M50 38 
                   C 46 32, 36 33, 36 42 
                   C 36 52, 50 64, 50 64 
                   C 50 64, 64 52, 64 42 
                   C 64 33, 54 32, 50 38 Z" 
                fill="#e11d48" 
                stroke="white" 
                stroke-width="1.5" />
        </svg>
      `.trim();

      return `data:image/svg+xml;base64,${btoa(svgString)}`;
    } catch (e) {
      console.error("Gagal generate logo QR:", e);
      return "";
    }
  }, []);

  // --- ACTIONS ---
  const downloadSingle = () => {
    const canvas = document.getElementById("single-qr") as HTMLCanvasElement;
    if (canvas) {
      const pngUrl = canvas.toDataURL("image/png");
      saveAs(pngUrl, `QR-${singleName || "Wedding"}.png`);
    }
  };

  const copySingleLink = () => {
    navigator.clipboard.writeText(generateUrl(singleName));
    alert("Link berhasil disalin!");
  };

  const downloadTemplate = () => {
    const csvContent =
      "Nama Tamu\nAhmad Syarief Ramadhan  & Partner\nMuhammad Ikbal Pauji\nKeluarga Bapak Jokowi";
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    saveAs(blob, "template_tamu.csv");
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      complete: (results) => {
        const names: string[] = [];
        results.data.forEach((row: any) => {
          if (row[0] && typeof row[0] === "string" && row[0].trim() !== "") {
            if (
              !["nama", "name", "nama tamu", "guest name"].includes(
                row[0].toLowerCase()
              )
            ) {
              names.push(row[0].trim());
            }
          }
        });
        setBulkNames(names);
      },
      header: false,
    });
  };

  const downloadAllZip = async () => {
    if (bulkNames.length === 0) return;
    setIsZipping(true);
    const zip = new JSZip();
    const folder = zip.folder("QR_Codes_Wedding");
    await new Promise((resolve) => setTimeout(resolve, 500));

    let count = 0;
    bulkNames.forEach((name, idx) => {
      const canvas = qrRefs.current[idx];
      if (canvas) {
        const dataUrl = canvas.toDataURL("image/png");
        const base64Data = dataUrl.replace(/^data:image\/png;base64,/, "");
        folder?.file(
          `${idx + 1}_${name.replace(/[^a-z0-9]/gi, "_")}.png`,
          base64Data,
          { base64: true }
        );
        count++;
      }
    });

    if (count > 0) {
      const content = await zip.generateAsync({ type: "blob" });
      saveAs(content, "Wedding-QR-Codes.zip");
    }
    setIsZipping(false);
  };

  return (
    <div className="space-y-8">
      {/* Tab Switcher */}
      <div className="flex justify-center">
        <div className="inline-flex rounded-xl bg-slate-100 p-1 dark:bg-slate-900">
          <button
            onClick={() => setActiveTab("single")}
            className={`rounded-lg px-6 py-2 text-sm font-bold transition-all ${activeTab === "single" ? "bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"}`}
          >
            Manual (Satuan)
          </button>
          <button
            onClick={() => setActiveTab("bulk")}
            className={`rounded-lg px-6 py-2 text-sm font-bold transition-all ${activeTab === "bulk" ? "bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"}`}
          >
            Import CSV (Banyak)
          </button>
        </div>
      </div>

      {/* --- MODE SINGLE --- */}
      {activeTab === "single" && (
        <div className="animate-reveal grid items-center gap-8 md:grid-cols-2">
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-bold tracking-widest text-slate-400 uppercase">
                Nama Tamu
              </label>
              <input
                type="text"
                value={singleName}
                onChange={(e) => setSingleName(e.target.value)}
                placeholder="Ketik nama tamu..."
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-4 text-lg focus:ring-2 focus:ring-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>
            <div className="rounded-xl bg-slate-50 p-4 font-mono text-xs break-all text-slate-500 dark:bg-slate-900">
              {generateUrl(singleName)}
            </div>
            <div className="flex gap-3">
              <button
                onClick={copySingleLink}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 py-3 text-xs font-bold uppercase hover:bg-slate-50 dark:border-slate-700 dark:text-white"
              >
                <Copy className="h-4 w-4" /> Copy Link
              </button>
              <button
                onClick={downloadSingle}
                disabled={!singleName}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-xs font-bold text-white uppercase hover:bg-blue-700 disabled:opacity-50"
              >
                <Download className="h-4 w-4" /> Download PNG
              </button>
            </div>
          </div>
          <div className="flex justify-center">
            <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-xl">
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
      )}

      {/* --- MODE BULK --- */}
      {activeTab === "bulk" && (
        <div className="animate-reveal space-y-8">
          {bulkNames.length === 0 ? (
            <div className="space-y-6 rounded-3xl border-2 border-dashed border-slate-300 bg-slate-50 p-8 text-center md:p-10 dark:border-slate-700 dark:bg-slate-800/50">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 text-blue-500 dark:bg-blue-900/20">
                <Upload className="h-8 w-8" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-slate-800 dark:text-white">
                  Upload File CSV
                </h3>
                <p className="mx-auto max-w-md text-sm leading-relaxed text-slate-500">
                  Siapkan file CSV sederhana dimana{" "}
                  <strong>kolom pertama</strong> berisi daftar nama tamu (1 nama
                  per baris).
                </p>
                <div className="mt-4 flex justify-center">
                  <div className="rounded-lg border border-slate-200 bg-white p-3 text-left shadow-sm dark:border-slate-600 dark:bg-slate-900">
                    <div className="mb-1 border-b border-slate-100 pb-1 text-[10px] tracking-widest text-slate-400 uppercase dark:border-slate-700">
                      Contoh Format CSV
                    </div>
                    <div className="space-y-1 font-mono text-xs text-slate-600 dark:text-slate-300">
                      <div className="font-bold text-blue-600 dark:text-blue-400">
                        Nama Tamu
                      </div>
                      <div>Ahmad Syarief Ramadhan & Partner</div>
                      <div>Muhammad Ikbal Pauji</div>
                    </div>
                  </div>
                </div>
                <button
                  onClick={downloadTemplate}
                  className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline dark:text-blue-400"
                >
                  <FileText className="h-3 w-3" /> Download Contoh Template
                  (.csv)
                </button>
              </div>
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-slate-900 px-8 py-3 text-sm font-bold text-white shadow-lg transition-all hover:-translate-y-1 hover:opacity-90 dark:bg-white dark:text-slate-900">
                Pilih File CSV
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center justify-between rounded-xl border border-blue-100 bg-blue-50 p-4 dark:border-blue-900/30 dark:bg-blue-900/10">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-blue-100 p-2 font-bold text-blue-600 dark:bg-blue-900/30">
                    {bulkNames.length}
                  </div>
                  <span className="text-sm font-medium text-slate-700 dark:text-blue-100">
                    Nama Tamu Terdeteksi
                  </span>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setBulkNames([])}
                    className="rounded-lg p-2 text-red-500 transition-colors hover:bg-red-50 dark:hover:bg-red-900/20"
                  >
                    <RefreshCcw className="h-5 w-5" />
                  </button>
                  <button
                    onClick={downloadAllZip}
                    disabled={isZipping}
                    className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white uppercase hover:bg-blue-700 disabled:opacity-70"
                  >
                    {isZipping ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Download className="h-4 w-4" />
                    )}
                    {isZipping ? "Processing..." : "Download ZIP"}
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-5">
                {bulkNames.map((name, idx) => (
                  <div
                    key={idx}
                    className="flex flex-col items-center gap-3 rounded-xl border border-slate-100 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-800"
                  >
                    <div className="rounded-lg bg-white p-1">
                      <QRCodeCanvas
                        ref={(el) => (qrRefs.current[idx] = el)}
                        value={generateUrl(name)}
                        size={150}
                        level="H"
                        includeMargin={true}
                        imageSettings={
                          centerLogo
                            ? {
                                src: centerLogo,
                                height: 35, // Ukuran di grid preview sedikit lebih kecil agar pas
                                width: 35,
                                excavate: true,
                              }
                            : undefined
                        }
                      />
                    </div>
                    <p className="w-full truncate text-center text-xs font-bold text-slate-600 dark:text-slate-300">
                      {name}
                    </p>
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

export default QRCodeManager;
