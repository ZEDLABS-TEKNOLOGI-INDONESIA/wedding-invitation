import React, { useState } from "react";
import jsPDF from "jspdf";
import Papa from "papaparse";
import JSZip from "jszip";
import QRCode from "qrcode";
import { saveAs } from "file-saver";
import {
  Download,
  Upload,
  Loader2,
  Printer,
  Eye,
  RefreshCcw,
  FileSpreadsheet,
  Check,
} from "lucide-react";
import { WEDDING_CONFIG, WEDDING_TEXT } from "../constants";

// --- TYPES ---
interface GuestData {
  name: string;
  address: string;
}

interface ThemeColor {
  name: string;
  id: string;
  bg: [number, number, number];
  primary: [number, number, number]; // Warna Border/Outline Bunga/Teks Gelap
  secondary: [number, number, number]; // Warna Daun/Fill Aksen
  textMain: [number, number, number]; // Teks Utama
  textMuted: [number, number, number]; // Teks Sekunder
}

// --- THEME PRESETS ---
const THEMES: ThemeColor[] = [
  {
    name: "Sage Green (Original)",
    id: "sage",
    bg: [255, 255, 255],
    primary: [85, 107, 47],
    secondary: [189, 209, 166],
    textMain: [47, 61, 26],
    textMuted: [110, 120, 90],
  },
  {
    name: "Classic Maroon",
    id: "maroon",
    bg: [255, 252, 252],
    primary: [128, 0, 32],
    secondary: [230, 180, 190],
    textMain: [80, 0, 20],
    textMuted: [150, 80, 90],
  },
  {
    name: "Royal Gold",
    id: "gold",
    bg: [255, 255, 252],
    primary: [184, 134, 11],
    secondary: [240, 230, 140],
    textMain: [101, 67, 33],
    textMuted: [160, 130, 90],
  },
  {
    name: "Dusty Blue",
    id: "blue",
    bg: [250, 250, 255],
    primary: [70, 90, 120],
    secondary: [190, 210, 230],
    textMain: [30, 45, 70],
    textMuted: [100, 120, 140],
  },
];

const InvitationManager: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"single" | "bulk">("single");
  const [currentTheme, setCurrentTheme] = useState<ThemeColor>(THEMES[0]);
  const [singleData, setSingleData] = useState<GuestData>({
    name: "",
    address: "Di Tempat",
  });
  const [bulkData, setBulkData] = useState<GuestData[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewUri, setPreviewUri] = useState<string | null>(null);

  // --- VECTOR FLORAL ENGINE ---

  const drawLeaf = (
    doc: jsPDF,
    x: number,
    y: number,
    size: number,
    angle: number,
  ) => {
    const rad = (angle * Math.PI) / 180;
    const ctx = {
      c: Math.cos(rad),
      s: Math.sin(rad),
    };

    const t = (lx: number, ly: number) => ({
      x: x + (lx * ctx.c - ly * ctx.s) * size,
      y: y + (lx * ctx.s + ly * ctx.c) * size,
    });

    doc.setFillColor(
      currentTheme.secondary[0],
      currentTheme.secondary[1],
      currentTheme.secondary[2],
    );
    doc.setDrawColor(
      currentTheme.primary[0],
      currentTheme.primary[1],
      currentTheme.primary[2],
    );
    doc.setLineWidth(0.2);

    const p1 = t(0, 0);
    const p2 = t(5, 2);
    const p3 = t(10, 0);
    const p4 = t(5, -2);

    doc.triangle(p1.x, p1.y, p3.x, p3.y, p2.x, p2.y, "F");
    doc.triangle(p1.x, p1.y, p3.x, p3.y, p4.x, p4.y, "F");

    doc.line(p1.x, p1.y, p2.x, p2.y);
    doc.line(p2.x, p2.y, p3.x, p3.y);
    doc.line(p3.x, p3.y, p4.x, p4.y);
    doc.line(p4.x, p4.y, p1.x, p1.y);
    doc.line(p1.x, p1.y, p3.x, p3.y);
  };

  const drawRose = (doc: jsPDF, x: number, y: number, size: number) => {
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(
      currentTheme.primary[0],
      currentTheme.primary[1],
      currentTheme.primary[2],
    );
    doc.setLineWidth(0.3);

    doc.circle(x, y, size, "FD");

    const steps = 15;
    let radius = 1;
    let angle = 0;
    let prevX = x;
    let prevY = y;

    for (let i = 0; i < steps; i++) {
      angle += 0.8;
      radius += size / steps;
      const nextX = x + Math.cos(angle) * radius;
      const nextY = y + Math.sin(angle) * radius;
      if (i > 2) {
        doc.line(prevX, prevY, nextX, nextY);
      }
      prevX = nextX;
      prevY = nextY;
    }
  };

  const drawFloralCluster = (
    doc: jsPDF,
    cx: number,
    cy: number,
    rot: number,
  ) => {
    const leaves = [
      { s: 1.5, a: rot + 10, d: 8 },
      { s: 1.2, a: rot + 40, d: 8 },
      { s: 1.5, a: rot + 80, d: 8 },
      { s: 1.0, a: rot + 25, d: 12 },
      { s: 1.0, a: rot + 65, d: 12 },
    ];

    leaves.forEach((l) => {
      const lx = cx + Math.cos((l.a * Math.PI) / 180) * l.d;
      const ly = cy + Math.sin((l.a * Math.PI) / 180) * l.d;
      drawLeaf(doc, lx, ly, l.s, l.a);
    });

    drawRose(doc, cx, cy, 7);

    const bx1 = cx + Math.cos(((rot + 20) * Math.PI) / 180) * 9;
    const by1 = cy + Math.sin(((rot + 20) * Math.PI) / 180) * 9;
    drawRose(doc, bx1, by1, 3.5);

    const bx2 = cx + Math.cos(((rot + 70) * Math.PI) / 180) * 9;
    const by2 = cy + Math.sin(((rot + 70) * Math.PI) / 180) * 9;
    drawRose(doc, bx2, by2, 3.5);
  };

  const drawBorder = (doc: jsPDF, w: number, h: number) => {
    const m = 6;
    doc.setDrawColor(
      currentTheme.primary[0],
      currentTheme.primary[1],
      currentTheme.primary[2],
    );
    doc.setLineWidth(0.4);
    doc.rect(m, m, w - m * 2, h - m * 2);
    doc.setLineWidth(0.2);
    doc.rect(m + 1.5, m + 1.5, w - (m + 1.5) * 2, h - (m + 1.5) * 2);
  };

  const drawCornerDecorations = (doc: jsPDF, width: number, height: number) => {
    const offset = 12;
    // Kiri Atas
    drawFloralCluster(doc, offset, offset, 0);
    // Kanan Atas
    drawFloralCluster(doc, width - offset, offset, 90);
    // Kanan Bawah
    drawFloralCluster(doc, width - offset, height - offset, 180);
    // Kiri Bawah
    drawFloralCluster(doc, offset, height - offset, 270);
  };

  // --- PDF GENERATION LOGIC ---

  const generatePDFDoc = async (guest: GuestData): Promise<jsPDF> => {
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a5",
    });
    const width = doc.internal.pageSize.getWidth(); // 148mm
    const height = doc.internal.pageSize.getHeight();
    const cx = width / 2;

    const siteUrl = window.location.origin;
    const guestUrl = `${siteUrl}/?to=${encodeURIComponent(guest.name)}`;
    const qrGuestImg = await QRCode.toDataURL(guestUrl, {
      margin: 0,
      color: { dark: "#2f3d1a", light: "#ffffff" },
    });
    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${WEDDING_CONFIG.venue.latitude},${WEDDING_CONFIG.venue.longitude}`;
    const qrMapsImg = await QRCode.toDataURL(mapsUrl, {
      margin: 0,
      color: { dark: "#2f3d1a", light: "#ffffff" },
    });

    // Background
    doc.setFillColor(
      currentTheme.bg[0],
      currentTheme.bg[1],
      currentTheme.bg[2],
    );
    doc.rect(0, 0, width, height, "F");

    // ==========================================
    // PAGE 1: COVER
    // ==========================================
    drawBorder(doc, width, height);
    drawCornerDecorations(doc, width, height);

    // 1. THE WEDDING OF
    doc.setFont("times", "normal");
    doc.setFontSize(9);
    doc.setTextColor(
      currentTheme.textMuted[0],
      currentTheme.textMuted[1],
      currentTheme.textMuted[2],
    );
    doc.text("THE WEDDING OF", cx, 50, {
      align: "center",
    });

    // Nama Mempelai
    doc.setFont("times", "italic");
    doc.setFontSize(40);
    doc.setTextColor(
      currentTheme.textMain[0],
      currentTheme.textMain[1],
      currentTheme.textMain[2],
    );
    doc.text(WEDDING_CONFIG.couple.bride.name, cx, 75, { align: "center" });

    doc.setFont("times", "normal");
    doc.setFontSize(16);
    doc.setTextColor(
      currentTheme.primary[0],
      currentTheme.primary[1],
      currentTheme.primary[2],
    );
    doc.text("&", cx, 88, { align: "center" });

    doc.setFont("times", "italic");
    doc.setFontSize(40);
    doc.setTextColor(
      currentTheme.textMain[0],
      currentTheme.textMain[1],
      currentTheme.textMain[2],
    );
    doc.text(WEDDING_CONFIG.couple.groom.name, cx, 105, { align: "center" });

    // 2. TANGGAL
    doc.setFont("times", "bold");
    doc.setFontSize(9);
    doc.setTextColor(
      currentTheme.textMuted[0],
      currentTheme.textMuted[1],
      currentTheme.textMuted[2],
    );
    doc.text(WEDDING_CONFIG.events.resepsi.date.toUpperCase(), cx, 125, {
      align: "center",
    });

    // Kotak Tamu
    const boxY = 155;
    const boxW = 85;
    const boxH = 30;

    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(
      currentTheme.primary[0],
      currentTheme.primary[1],
      currentTheme.primary[2],
    );
    doc.setLineWidth(0.5);
    doc.roundedRect(cx - boxW / 2, boxY, boxW, boxH, 2, 2, "FD");

    doc.setFont("times", "normal");
    doc.setFontSize(9);
    doc.text("Kepada Yth. Bapak/Ibu/Saudara/i:", cx, boxY + 8, {
      align: "center",
      charSpace: 0,
    });

    doc.setFont("times", "bolditalic");
    doc.setFontSize(14);
    doc.setTextColor(
      currentTheme.textMain[0],
      currentTheme.textMain[1],
      currentTheme.textMain[2],
    );
    const splitName = doc.splitTextToSize(guest.name, boxW - 5);
    doc.text(splitName, cx, boxY + 18, { align: "center" });

    if (guest.address) {
      doc.setFont("times", "normal");
      doc.setFontSize(9);
      doc.setTextColor(
        currentTheme.textMuted[0],
        currentTheme.textMuted[1],
        currentTheme.textMuted[2],
      );
      doc.text(guest.address, cx, boxY + 26, { align: "center" });
    }

    // ==========================================
    // PAGE 2: OPENING & PARENTS
    // ==========================================
    doc.addPage();
    drawBorder(doc, width, height);
    drawCornerDecorations(doc, width, height);

    doc.setFont("times", "bold");
    doc.setFontSize(12);
    doc.setTextColor(
      currentTheme.textMain[0],
      currentTheme.textMain[1],
      currentTheme.textMain[2],
    );
    doc.text(WEDDING_TEXT.opening.salam, cx, 50, { align: "center" });

    doc.setFont("times", "italic");
    doc.setFontSize(10);
    doc.setTextColor(
      currentTheme.textMuted[0],
      currentTheme.textMuted[1],
      currentTheme.textMuted[2],
    );
    const quote = doc.splitTextToSize(WEDDING_TEXT.quote.ar_rum, width - 60);
    doc.text(quote, cx, 60, { align: "center" });

    doc.setFont("times", "normal");
    doc.setFontSize(10);
    doc.text(
      "Kami bermaksud menyelenggarakan pernikahan putra-putri kami:",
      cx,
      95,
      { align: "center" },
    );

    // Detail Mempelai
    doc.setFont("times", "bold");
    doc.setFontSize(16);
    doc.setTextColor(
      currentTheme.primary[0],
      currentTheme.primary[1],
      currentTheme.primary[2],
    );
    doc.text(WEDDING_CONFIG.couple.bride.fullName, cx, 110, {
      align: "center",
    });

    doc.setFont("times", "normal");
    doc.setFontSize(9);
    doc.setTextColor(
      currentTheme.textMuted[0],
      currentTheme.textMuted[1],
      currentTheme.textMuted[2],
    );
    doc.text(WEDDING_CONFIG.couple.bride.parents, cx, 117, { align: "center" });

    doc.setFont("times", "italic");
    doc.setFontSize(12);
    doc.text("&", cx, 127, { align: "center" });

    doc.setFont("times", "bold");
    doc.setFontSize(16);
    doc.setTextColor(
      currentTheme.primary[0],
      currentTheme.primary[1],
      currentTheme.primary[2],
    );
    doc.text(WEDDING_CONFIG.couple.groom.fullName, cx, 137, {
      align: "center",
    });

    doc.setFont("times", "normal");
    doc.setFontSize(9);
    doc.setTextColor(
      currentTheme.textMuted[0],
      currentTheme.textMuted[1],
      currentTheme.textMuted[2],
    );
    doc.text(WEDDING_CONFIG.couple.groom.parents, cx, 144, { align: "center" });

    // ==========================================
    // PAGE 3: EVENTS
    // ==========================================
    doc.addPage();
    drawBorder(doc, width, height);
    drawCornerDecorations(doc, width, height);

    doc.setFont("times", "italic");
    doc.setFontSize(11);
    doc.setTextColor(
      currentTheme.textMain[0],
      currentTheme.textMain[1],
      currentTheme.textMain[2],
    );
    doc.text("Insya Allah acara akan dilaksanakan pada:", cx, 35, {
      align: "center",
    });

    // Akad
    doc.setFont("times", "bold");
    doc.setFontSize(14);
    doc.setTextColor(
      currentTheme.primary[0],
      currentTheme.primary[1],
      currentTheme.primary[2],
    );
    doc.text(WEDDING_CONFIG.events.akad.title, cx, 50, { align: "center" });

    doc.setFont("times", "normal");
    doc.setFontSize(10);
    doc.setTextColor(
      currentTheme.textMain[0],
      currentTheme.textMain[1],
      currentTheme.textMain[2],
    );
    doc.text(
      `${WEDDING_CONFIG.events.akad.day}, ${WEDDING_CONFIG.events.akad.date}`,
      cx,
      57,
      { align: "center" },
    );
    doc.text(
      `Pukul: ${WEDDING_CONFIG.events.akad.startTime} - ${WEDDING_CONFIG.events.akad.endTime} WIB`,
      cx,
      62,
      { align: "center" },
    );

    // Separator
    doc.setLineWidth(0.2);
    doc.line(cx - 15, 70, cx + 15, 70);

    // Resepsi
    doc.setFont("times", "bold");
    doc.setFontSize(14);
    doc.setTextColor(
      currentTheme.primary[0],
      currentTheme.primary[1],
      currentTheme.primary[2],
    );
    doc.text(WEDDING_CONFIG.events.resepsi.title, cx, 85, { align: "center" });

    doc.setFont("times", "normal");
    doc.setFontSize(10);
    doc.setTextColor(
      currentTheme.textMain[0],
      currentTheme.textMain[1],
      currentTheme.textMain[2],
    );
    doc.text(
      `${WEDDING_CONFIG.events.resepsi.day}, ${WEDDING_CONFIG.events.resepsi.date}`,
      cx,
      92,
      { align: "center" },
    );
    doc.text(
      `Pukul: ${WEDDING_CONFIG.events.resepsi.startTime} - ${WEDDING_CONFIG.events.resepsi.endTime} WIB`,
      cx,
      97,
      { align: "center" },
    );

    // Lokasi
    doc.setFont("times", "bold");
    doc.setFontSize(12);
    doc.setTextColor(
      currentTheme.textMain[0],
      currentTheme.textMain[1],
      currentTheme.textMain[2],
    );
    doc.text("BERTEMPAT DI:", cx, 115, { align: "center" });

    doc.setFont("times", "normal");
    doc.setFontSize(11);
    doc.text(WEDDING_CONFIG.venue.name, cx, 122, { align: "center" });

    doc.setFontSize(9);
    doc.setTextColor(
      currentTheme.textMuted[0],
      currentTheme.textMuted[1],
      currentTheme.textMuted[2],
    );
    const addr = doc.splitTextToSize(WEDDING_CONFIG.venue.address, 80);
    doc.text(addr, cx, 128, { align: "center" });

    // QR Maps
    const qrSize = 22;
    const qrY = 145;
    doc.addImage(qrMapsImg, "PNG", cx - qrSize / 2, qrY, qrSize, qrSize);
    doc.text("Scan Google Maps", cx, qrY + qrSize + 5, { align: "center" });

    // ==========================================
    // PAGE 4: DIGITAL ACCESS & CLOSING
    // ==========================================
    doc.addPage();
    drawBorder(doc, width, height);
    drawCornerDecorations(doc, width, height);

    // 3. E-INVITATION & RSVP
    doc.setFont("times", "bold");
    doc.setFontSize(10);
    doc.setTextColor(
      currentTheme.primary[0],
      currentTheme.primary[1],
      currentTheme.primary[2],
    );
    doc.text("E-INVITATION", cx, 50, {
      align: "center",
    });

    const qrDigiSize = 40;
    const digiY = 60;

    // Frame QR
    doc.setDrawColor(
      currentTheme.secondary[0],
      currentTheme.secondary[1],
      currentTheme.secondary[2],
    );
    doc.roundedRect(
      cx - qrDigiSize / 2 - 2,
      digiY - 2,
      qrDigiSize + 4,
      qrDigiSize + 4,
      1,
      1,
    );
    doc.addImage(
      qrGuestImg,
      "PNG",
      cx - qrDigiSize / 2,
      digiY,
      qrDigiSize,
      qrDigiSize,
    );

    doc.setFont("times", "normal");
    doc.setFontSize(9);
    doc.setTextColor(
      currentTheme.textMuted[0],
      currentTheme.textMuted[1],
      currentTheme.textMuted[2],
    );
    doc.text(
      "Scan untuk buka undangan digital & konfirmasi kehadiran",
      cx,
      digiY + qrDigiSize + 8,
      { align: "center" },
    );

    // Closing
    const closingY = 135;
    doc.setFont("times", "normal");
    doc.setFontSize(10);
    doc.setTextColor(
      currentTheme.textMain[0],
      currentTheme.textMain[1],
      currentTheme.textMain[2],
    );
    const closing = doc.splitTextToSize(WEDDING_TEXT.closing.text, width - 60);
    doc.text(closing, cx, closingY, { align: "center" });

    doc.setFont("times", "bolditalic");
    doc.text(WEDDING_TEXT.closing.salam, cx, closingY + 20, {
      align: "center",
    });

    doc.setFont("times", "normal");
    doc.setFontSize(9);
    doc.text(WEDDING_TEXT.closing.signature, cx, closingY + 30, {
      align: "center",
    });

    doc.setFont("times", "bold");
    doc.setFontSize(12);
    doc.setTextColor(
      currentTheme.primary[0],
      currentTheme.primary[1],
      currentTheme.primary[2],
    );
    doc.text(
      `${WEDDING_CONFIG.couple.bride.name} & ${WEDDING_CONFIG.couple.groom.name}`,
      cx,
      closingY + 38,
      { align: "center" },
    );

    return doc;
  };

  // --- ACTIONS ---

  const handlePreview = async () => {
    if (!singleData.name) return;
    const doc = await generatePDFDoc(singleData);
    const pdfDataUri = doc.output("datauristring");
    setPreviewUri(pdfDataUri);
  };

  const downloadSingle = async () => {
    if (!singleData.name) return;
    const doc = await generatePDFDoc(singleData);
    doc.save(
      `Inv_${singleData.name.replace(/[^a-zA-Z0-9]/g, "_")}_${currentTheme.id}.pdf`,
    );
  };

  const downloadTemplate = () => {
    const csvContent =
      "Nama Tamu,Alamat (Opsional)\nBapak Jokowi & Ibu Iriana,Jakarta\nTeman-teman Alumni SMA 1,Di Tempat\nKeluarga Besar H. Syarif,Bandung";
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    saveAs(blob, "template_undangan_pdf.csv");
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      complete: (results) => {
        const guests: GuestData[] = [];
        results.data.forEach((row: any) => {
          const name = row[0];
          const address = row[1] || "Di Tempat";

          if (name && typeof name === "string" && name.trim() !== "") {
            if (!name.toLowerCase().includes("nama tamu")) {
              guests.push({ name: name.trim(), address: address.trim() });
            }
          }
        });
        setBulkData(guests);
      },
      header: false,
    });
  };

  const processBulk = async () => {
    if (bulkData.length === 0) return;
    setIsProcessing(true);

    try {
      const zip = new JSZip();
      const folder = zip.folder(`Undangan_${currentTheme.name}_Floral`);

      for (let i = 0; i < bulkData.length; i++) {
        const guest = bulkData[i];
        const doc = await generatePDFDoc(guest);
        const blob = doc.output("blob");
        const safeName = guest.name
          .replace(/[^a-zA-Z0-9]/g, "_")
          .substring(0, 50);

        folder?.file(`${i + 1}_${safeName}.pdf`, blob);
        if (i % 5 === 0) await new Promise((r) => setTimeout(r, 10));
      }

      const content = await zip.generateAsync({ type: "blob" });
      saveAs(
        content,
        `Undangan-${currentTheme.id}-${new Date().toISOString().slice(0, 10)}.zip`,
      );
    } catch (error) {
      console.error("Gagal generate bulk:", error);
      alert("Terjadi kesalahan sistem saat memproses PDF.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="animate-reveal space-y-8">
      {/* Header */}
      <div className="space-y-2 text-center">
        <h3 className="font-serif text-2xl font-bold dark:text-white">
          Floral PDF Invitation
        </h3>
        <p className="text-sm text-slate-500">
          Template Floral Elegan (4 Halaman A5) dengan Ornamen Vektor & QR Code.
        </p>
      </div>

      {/* --- THEME SELECTOR --- */}
      <div className="flex flex-col items-center gap-4">
        <span className="text-xs font-bold uppercase tracking-widest text-slate-400">
          Pilih Nuansa Warna
        </span>
        <div className="flex gap-4">
          {THEMES.map((theme) => (
            <button
              key={theme.id}
              onClick={() => {
                setCurrentTheme(theme);
                setPreviewUri(null);
              }}
              className={`group relative flex h-14 w-14 items-center justify-center rounded-full border-2 shadow-sm transition-all hover:scale-110 ${
                currentTheme.id === theme.id
                  ? "scale-110 border-slate-800 dark:border-white"
                  : "border-transparent"
              }`}
              style={{
                backgroundColor: `rgb(${theme.bg[0]},${theme.bg[1]},${theme.bg[2]})`,
              }}
              title={theme.name}
            >
              {/* Preview Warna Bunga & Daun */}
              <div className="relative h-8 w-8">
                <div
                  className="absolute top-0 right-0 h-5 w-5 rounded-full border shadow-sm"
                  style={{
                    backgroundColor: `rgb(${theme.primary[0]},${theme.primary[1]},${theme.primary[2]})`,
                  }}
                />
                <div
                  className="absolute bottom-0 left-0 h-5 w-5 rounded-tl-xl rounded-br-xl shadow-sm"
                  style={{
                    backgroundColor: `rgb(${theme.secondary[0]},${theme.secondary[1]},${theme.secondary[2]})`,
                  }}
                />
              </div>

              {currentTheme.id === theme.id && (
                <div className="absolute -bottom-2 whitespace-nowrap rounded-md bg-slate-800 px-2 py-0.5 text-[9px] font-bold text-white shadow-md dark:bg-white dark:text-slate-900">
                  {theme.name}
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex justify-center">
        <div className="inline-flex rounded-xl bg-slate-100 p-1 dark:bg-slate-900">
          <button
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
            onClick={() => setActiveTab("bulk")}
            className={`rounded-lg px-6 py-2 text-sm font-bold transition-all ${
              activeTab === "bulk"
                ? "bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white"
                : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            Import CSV (Banyak)
          </button>
        </div>
      </div>

      {/* --- MODE SINGLE --- */}
      {activeTab === "single" && (
        <div className="grid items-start gap-8 md:grid-cols-2">
          <div className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-slate-400">
                  Nama Tamu
                </label>
                <input
                  type="text"
                  value={singleData.name}
                  onChange={(e) =>
                    setSingleData({ ...singleData, name: e.target.value })
                  }
                  placeholder="Contoh: Bpk. Habibie & Keluarga"
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-4 text-lg focus:outline-none focus:ring-2 focus:ring-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-slate-400">
                  Alamat / Kota (Opsional)
                </label>
                <input
                  type="text"
                  value={singleData.address}
                  onChange={(e) =>
                    setSingleData({ ...singleData, address: e.target.value })
                  }
                  placeholder="Jakarta Selatan"
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handlePreview}
                disabled={!singleData.name}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 py-3 text-xs font-bold uppercase hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-white dark:hover:bg-slate-800"
              >
                <Eye className="h-4 w-4" /> Preview
              </button>
              <button
                onClick={downloadSingle}
                disabled={!singleData.name}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-slate-800 py-3 text-xs font-bold text-white uppercase shadow-lg hover:bg-slate-900 disabled:opacity-50 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
              >
                <Printer className="h-4 w-4" /> Download PDF
              </button>
            </div>
          </div>

          <div className="flex min-h-[400px] items-center justify-center rounded-xl bg-slate-200 p-4 dark:bg-slate-900/50">
            {previewUri ? (
              <iframe
                src={previewUri}
                className="h-[500px] w-full rounded-lg bg-white shadow-2xl"
                title="PDF Preview"
              />
            ) : (
              <div className="text-center text-slate-400">
                <FileSpreadsheet className="mx-auto mb-2 h-12 w-12 opacity-50" />
                <p className="text-sm">Masukkan data & klik Preview</p>
                <p className="mt-1 text-xs text-slate-500">
                  (Ornamen bunga dirender menggunakan vektor PDF)
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- MODE BULK --- */}
      {activeTab === "bulk" && (
        <div className="animate-reveal space-y-8">
          {bulkData.length === 0 ? (
            <div className="space-y-6 rounded-3xl border-2 border-dashed border-slate-300 bg-slate-50 p-10 text-center dark:border-slate-700 dark:bg-slate-800/50">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                <Upload className="h-8 w-8" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-slate-800 dark:text-white">
                  Upload Database Tamu
                </h3>
                <p className="mx-auto max-w-md text-sm text-slate-500">
                  Siapkan file CSV dengan format:
                  <br />
                  <strong>Kolom 1: Nama Tamu</strong> |{" "}
                  <strong>Kolom 2: Alamat/Kota (Opsional)</strong>
                </p>
                <button
                  onClick={downloadTemplate}
                  className="mx-auto mt-2 flex items-center justify-center gap-1 text-xs font-bold text-blue-600 hover:underline dark:text-blue-400"
                >
                  <Download className="h-3 w-3" /> Download Template CSV
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
              <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-slate-200 p-2 font-bold text-slate-700 dark:bg-slate-700 dark:text-slate-200">
                    {bulkData.length}
                  </div>
                  <div className="text-sm">
                    <p className="font-bold text-slate-800 dark:text-white">
                      Tamu Terdeteksi
                    </p>
                    <p className="text-xs text-slate-500">
                      Tema:{" "}
                      <span className="font-bold">{currentTheme.name}</span>
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setBulkData([])}
                    className="p-2 text-slate-400 transition-colors hover:text-red-500"
                    title="Reset"
                  >
                    <RefreshCcw className="h-5 w-5" />
                  </button>
                  <button
                    onClick={processBulk}
                    disabled={isProcessing}
                    className="flex items-center gap-2 rounded-lg bg-slate-800 px-6 py-2 text-xs font-bold text-white uppercase shadow-lg hover:bg-slate-900 disabled:opacity-70 dark:bg-white dark:text-slate-900"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Memproses ({bulkData.length})...
                      </>
                    ) : (
                      <>
                        <Download className="h-4 w-4" />
                        Generate ZIP
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="custom-scrollbar grid max-h-[400px] grid-cols-1 gap-3 overflow-y-auto pr-2 md:grid-cols-2 lg:grid-cols-3">
                {bulkData.map((guest, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-800"
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-500 dark:bg-slate-700">
                        {idx + 1}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-xs font-bold text-slate-700 dark:text-slate-300">
                          {guest.name}
                        </p>
                        <p className="truncate text-[10px] text-slate-400">
                          {guest.address}
                        </p>
                      </div>
                    </div>
                    {/* Visual check */}
                    <Check className="h-4 w-4 text-green-500" />
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
