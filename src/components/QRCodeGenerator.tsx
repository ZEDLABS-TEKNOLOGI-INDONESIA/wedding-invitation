import React, { useState, useRef, useMemo } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { Download, Link as LinkIcon } from "lucide-react";
import { WEDDING_CONFIG } from "../constants"; // Import Config

const QRCodeGenerator: React.FC<{ siteUrl: string }> = ({ siteUrl }) => {
  const [guestName, setGuestName] = useState("");
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const baseUrl = siteUrl?.endsWith("/") ? siteUrl.slice(0, -1) : siteUrl || "";

  const generateUrl = () => {
    if (!guestName) return baseUrl;
    return `${baseUrl}/?to=${encodeURIComponent(guestName.trim())}`;
  };

  // --- GENERATE PREMIUM LOGO (SAMA DENGAN QR MANAGER) ---
  const centerLogo = useMemo(() => {
    try {
      const bInitial = (WEDDING_CONFIG?.couple?.bride?.name || "B")
        .charAt(0)
        .toUpperCase();
      const gInitial = (WEDDING_CONFIG?.couple?.groom?.name || "G")
        .charAt(0)
        .toUpperCase();

      const svgString = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
          <defs>
            <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style="stop-color:#F59E0B;stop-opacity:1" />
              <stop offset="100%" style="stop-color:#B45309;stop-opacity:1" />
            </linearGradient>
          </defs>
          
          <!-- Background Putih -->
          <circle cx="50" cy="50" r="48" fill="white" />
          
          <!-- Border Emas -->
          <circle cx="50" cy="50" r="46" fill="none" stroke="url(#goldGradient)" stroke-width="2" />
          <circle cx="50" cy="50" r="42" fill="none" stroke="#f1f5f9" stroke-width="1" />

          <!-- Teks Inisial Serif -->
          <g font-family="'Times New Roman', Times, serif" font-weight="bold" font-size="40" fill="#334155" text-anchor="middle">
             <text x="26" y="64">${bInitial}</text>
             <text x="74" y="64">${gInitial}</text>
          </g>

          <!-- Hati Merah -->
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
      console.error("Logo Generation Error:", e);
      return "";
    }
  }, []);

  const downloadQR = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const pngUrl = canvas.toDataURL("image/png");
      const downloadLink = document.createElement("a");
      downloadLink.href = pngUrl;
      downloadLink.download = `QR-${guestName || "Wedding"}.png`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(generateUrl());
    alert("Link berhasil disalin!");
  };

  return (
    <div className="animate-reveal grid items-center gap-10 md:grid-cols-2">
      {/* Kolom Kiri: Input */}
      <div className="space-y-6">
        <div className="space-y-2">
          <label className="text-xs font-bold tracking-widest text-slate-400 uppercase">
            Nama Tamu
          </label>
          <input
            type="text"
            value={guestName}
            onChange={(e) => setGuestName(e.target.value)}
            placeholder="Contoh: Ahmad SYarief Ramadhan & Partner"
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-4 text-lg transition-all focus:ring-2 focus:ring-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          />
          <p className="text-xs text-slate-400 italic">
            *Nama akan otomatis muncul di sampul undangan & form RSVP.
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 font-mono text-xs break-all text-slate-500 dark:border-slate-700 dark:bg-slate-900/50">
          {generateUrl()}
        </div>

        <div className="flex gap-4">
          <button
            onClick={copyLink}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 py-3 text-xs font-bold uppercase transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <LinkIcon className="h-4 w-4" /> Copy Link
          </button>
          <button
            onClick={downloadQR}
            disabled={!guestName}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-xs font-bold text-white uppercase shadow-lg transition-colors hover:bg-blue-700 hover:shadow-blue-500/30 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Download className="h-4 w-4" /> Download QR
          </button>
        </div>
      </div>

      {/* Kolom Kanan: Preview */}
      <div className="flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-slate-200 bg-white p-8 dark:border-white/10 dark:bg-white/5">
        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-xl">
          <QRCodeCanvas
            ref={canvasRef}
            value={generateUrl()}
            size={280} // Ukuran sedikit lebih besar untuk halaman ini
            level={"H"}
            includeMargin={true}
            imageSettings={
              centerLogo
                ? {
                    src: centerLogo,
                    height: 60, // Ukuran logo proporsional
                    width: 60,
                    excavate: true,
                  }
                : undefined
            }
          />
        </div>
        <div className="mt-8 space-y-1 text-center">
          <p className="text-sm font-bold tracking-widest text-slate-400 uppercase">
            Preview Result
          </p>
          {guestName && (
            <p className="font-serif text-lg text-slate-800 italic dark:text-white">
              "{guestName}"
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default QRCodeGenerator;
