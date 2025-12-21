import React, { useState } from "react";
import jsPDF from "jspdf";
import Papa from "papaparse";
import JSZip from "jszip";
import QRCode from "qrcode";
import FileSaver from "file-saver";
import {
  Download,
  Upload,
  Loader2,
  Printer,
  Eye,
  RefreshCcw,
  FileSpreadsheet,
  Check,
  FileText,
  Trash2,
} from "lucide-react";
import { WEDDING_CONFIG, WEDDING_TEXT } from "../constants";

interface GuestData {
  name: string;
  address: string;
}

interface ThemeColor {
  name: string;
  id: string;
  bg: [number, number, number];
  primary: [number, number, number];
  secondary: [number, number, number];
  textMain: [number, number, number];
  textMuted: [number, number, number];
}
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

  // Progress States
  const [isReadingCsv, setIsReadingCsv] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMsg, setStatusMsg] = useState("");

  const [previewUri, setPreviewUri] = useState<string | null>(null);

  // --- HELPER SAVE AS ---
  const handleSaveAs = (blob: Blob | string, name: string) => {
    const saveAsFunc = (FileSaver as any).saveAs || FileSaver;
    saveAsFunc(blob, name);
  };

  // --- DRAWING HELPERS ---
  const drawLeaf = (
    doc: jsPDF,
    x: number,
    y: number,
    size: number,
    angle: number,
  ) => {
    const rad = (angle * Math.PI) / 180;
    const ctx = { c: Math.cos(rad), s: Math.sin(rad) };
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
    doc.setLineWidth(0.15);
    const p1 = t(0, 0);
    const p2 = t(5, 2.5);
    const p3 = t(10, 0);
    const p4 = t(5, -2.5);
    doc.triangle(p1.x, p1.y, p3.x, p3.y, p2.x, p2.y, "FD");
    doc.triangle(p1.x, p1.y, p3.x, p3.y, p4.x, p4.y, "FD");
    doc.setLineWidth(0.1);
    doc.line(p1.x, p1.y, p3.x, p3.y);
  };

  const drawRose = (doc: jsPDF, x: number, y: number, size: number) => {
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(
      currentTheme.primary[0],
      currentTheme.primary[1],
      currentTheme.primary[2],
    );
    doc.setLineWidth(0.25);
    doc.circle(x, y, size, "FD");
    const steps = 18;
    let radius = 0.8;
    let angle = 0;
    let prevX = x;
    let prevY = y;
    for (let i = 0; i < steps; i++) {
      angle += 0.7;
      radius += size / steps;
      const nextX = x + Math.cos(angle) * radius;
      const nextY = y + Math.sin(angle) * radius;
      if (i > 1) {
        doc.setLineWidth(0.15 - i * 0.005);
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
      { s: 1.6, a: rot + 5, d: 9 },
      { s: 1.3, a: rot + 35, d: 9 },
      { s: 1.6, a: rot + 75, d: 9 },
      { s: 1.1, a: rot + 20, d: 13 },
      { s: 1.1, a: rot + 60, d: 13 },
      { s: 0.9, a: rot + 45, d: 15 },
    ];
    leaves.forEach((l) => {
      const lx = cx + Math.cos((l.a * Math.PI) / 180) * l.d;
      const ly = cy + Math.sin((l.a * Math.PI) / 180) * l.d;
      drawLeaf(doc, lx, ly, l.s, l.a);
    });
    drawRose(doc, cx, cy, 7.5);
    const buds = [
      { a: rot + 15, d: 10 },
      { a: rot + 65, d: 10 },
      { a: rot + 40, d: 12 },
    ];
    buds.forEach((b) => {
      const bx = cx + Math.cos((b.a * Math.PI) / 180) * b.d;
      const by = cy + Math.sin((b.a * Math.PI) / 180) * b.d;
      drawRose(doc, bx, by, 3.5);
    });
  };

  const drawBorder = (doc: jsPDF, w: number, h: number) => {
    const m = 6;
    doc.setDrawColor(
      currentTheme.primary[0],
      currentTheme.primary[1],
      currentTheme.primary[2],
    );
    doc.setLineWidth(0.5);
    doc.rect(m, m, w - m * 2, h - m * 2);
    doc.setLineWidth(0.15);
    doc.rect(m + 1.5, m + 1.5, w - (m + 1.5) * 2, h - (m + 1.5) * 2);
    doc.setLineWidth(0.15);
    doc.rect(m + 2.5, m + 2.5, w - (m + 2.5) * 2, h - (m + 2.5) * 2);
  };

  const drawCornerDecorations = (doc: jsPDF, width: number, height: number) => {
    const offset = 12;
    drawFloralCluster(doc, offset, offset, 0);
    drawFloralCluster(doc, width - offset, offset, 90);
    drawFloralCluster(doc, width - offset, height - offset, 180);
    drawFloralCluster(doc, offset, height - offset, 270);
    doc.setDrawColor(
      currentTheme.secondary[0],
      currentTheme.secondary[1],
      currentTheme.secondary[2],
    );
    doc.setLineWidth(0.1);
    const midTop = { x: width / 2, y: 8 };
    const midBottom = { x: width / 2, y: height - 8 };
    const midLeft = { x: 8, y: height / 2 };
    const midRight = { x: width - 8, y: height / 2 };
    [midTop, midBottom, midLeft, midRight].forEach((pos) => {
      for (let i = 0; i < 3; i++) {
        const size = 0.8 - i * 0.2;
        doc.circle(pos.x, pos.y, size, "D");
      }
    });
  };

  const generatePDFDoc = async (guest: GuestData): Promise<jsPDF> => {
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a5",
    });
    const width = doc.internal.pageSize.getWidth();
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

    doc.setFillColor(
      currentTheme.bg[0],
      currentTheme.bg[1],
      currentTheme.bg[2],
    );
    doc.rect(0, 0, width, height, "F");

    drawBorder(doc, width, height);
    drawCornerDecorations(doc, width, height);

    doc.setFont("times", "bold");
    doc.setFontSize(12);
    doc.setTextColor(
      currentTheme.textMuted[0],
      currentTheme.textMuted[1],
      currentTheme.textMuted[2],
    );
    doc.text("THE WEDDING OF", cx, 50, { align: "center" });
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
    doc.setDrawColor(
      currentTheme.secondary[0],
      currentTheme.secondary[1],
      currentTheme.secondary[2],
    );
    doc.setLineWidth(0.2);
    doc.line(cx - 20, 115, cx + 20, 115);
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

    const boxY = 155;
    const boxW = 85;
    const boxH = 30;
    doc.setFillColor(250, 250, 250);
    doc.setDrawColor(
      currentTheme.secondary[0],
      currentTheme.secondary[1],
      currentTheme.secondary[2],
    );
    doc.setLineWidth(0.3);
    doc.roundedRect(cx - boxW / 2 + 0.5, boxY + 0.5, boxW, boxH, 2, 2, "F");
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
    doc.setDrawColor(
      currentTheme.secondary[0],
      currentTheme.secondary[1],
      currentTheme.secondary[2],
    );
    doc.setLineWidth(0.15);
    doc.line(cx - 20, 70, cx - 5, 70);
    doc.line(cx + 5, 70, cx + 20, 70);
    doc.setFillColor(
      currentTheme.primary[0],
      currentTheme.primary[1],
      currentTheme.primary[2],
    );
    for (let i = 0; i < 3; i++) {
      doc.circle(cx - 2 + i, 70, 0.3, "F");
    }
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
    const qrSize = 22;
    const qrY = 145;
    doc.setDrawColor(
      currentTheme.secondary[0],
      currentTheme.secondary[1],
      currentTheme.secondary[2],
    );
    doc.setLineWidth(0.3);
    doc.roundedRect(
      cx - qrSize / 2 - 1.5,
      qrY - 1.5,
      qrSize + 3,
      qrSize + 3,
      1,
      1,
    );
    doc.addImage(qrMapsImg, "PNG", cx - qrSize / 2, qrY, qrSize, qrSize);
    doc.text("Scan Google Maps", cx, qrY + qrSize + 5, { align: "center" });

    doc.addPage();
    drawBorder(doc, width, height);
    drawCornerDecorations(doc, width, height);
    doc.setFont("times", "bold");
    doc.setFontSize(10);
    doc.setTextColor(
      currentTheme.primary[0],
      currentTheme.primary[1],
      currentTheme.primary[2],
    );
    doc.text("E-INVITATION", cx, 50, { align: "center" });
    const qrDigiSize = 40;
    const digiY = 60;
    doc.setFillColor(
      currentTheme.bg[0],
      currentTheme.bg[1],
      currentTheme.bg[2],
    );
    doc.setDrawColor(
      currentTheme.secondary[0],
      currentTheme.secondary[1],
      currentTheme.secondary[2],
    );
    doc.setLineWidth(0.3);
    doc.roundedRect(
      cx - qrDigiSize / 2 - 2.5,
      digiY - 2.5,
      qrDigiSize + 5,
      qrDigiSize + 5,
      2,
      2,
      "FD",
    );
    doc.setDrawColor(
      currentTheme.primary[0],
      currentTheme.primary[1],
      currentTheme.primary[2],
    );
    doc.setLineWidth(0.4);
    doc.roundedRect(
      cx - qrDigiSize / 2 - 2,
      digiY - 2,
      qrDigiSize + 4,
      qrDigiSize + 4,
      1.5,
      1.5,
      "D",
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
    doc.setDrawColor(
      currentTheme.secondary[0],
      currentTheme.secondary[1],
      currentTheme.secondary[2],
    );
    doc.setLineWidth(0.1);
    for (let i = 0; i < 5; i++) {
      const xOffset = -10 + i * 5;
      doc.circle(cx + xOffset, closingY + 48, 0.4, "D");
    }

    return doc;
  };

  const handlePreview = async () => {
    if (!singleData.name) return;
    const doc = await generatePDFDoc(singleData);
    const pdfDataUri = doc.output("datauristring");
    setPreviewUri(pdfDataUri);
  };

  const downloadSingle = async () => {
    if (!singleData.name) return;
    const doc = await generatePDFDoc(singleData);
    handleSaveAs(
      doc.output("blob"),
      `Inv_${singleData.name.replace(/[^a-zA-Z0-9]/g, "_")}_${currentTheme.id}.pdf`,
    );
  };

  const downloadTemplate = () => {
    const csvContent =
      "Nama Tamu,Alamat (Opsional)\nBapak Jokowi & Ibu Iriana,Jakarta\nTeman-teman Alumni SMA 1,Di Tempat\nKeluarga Besar H. Syarif,Bandung";
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    handleSaveAs(blob, "template_undangan_pdf.csv");
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsReadingCsv(true);

    setTimeout(() => {
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
          setIsReadingCsv(false);
        },
        header: false,
      });
    }, 100);
  };

  const processBulk = async () => {
    if (bulkData.length === 0) return;
    setIsProcessing(true);
    setProgress(0);
    setStatusMsg("Menyiapkan assets...");

    try {
      const zip = new JSZip();
      const folder = zip.folder(`Undangan_${currentTheme.name}_Floral`);
      const CHUNK_SIZE = 10;

      for (let i = 0; i < bulkData.length; i += CHUNK_SIZE) {
        const chunk = bulkData.slice(i, i + CHUNK_SIZE);

        setStatusMsg(
          `Generating PDF ${i + 1} - ${Math.min(i + chunk.length, bulkData.length)} dari ${bulkData.length}...`,
        );

        await Promise.all(
          chunk.map(async (guest, idx) => {
            const doc = await generatePDFDoc(guest);
            const blob = doc.output("blob");
            const safeName = guest.name
              .replace(/[^a-zA-Z0-9]/g, "_")
              .substring(0, 50);
            folder?.file(`${i + idx + 1}_${safeName}.pdf`, blob);
          }),
        );

        const currentCount = Math.min(i + CHUNK_SIZE, bulkData.length);
        setProgress(Math.round((currentCount / bulkData.length) * 100));

        await new Promise((r) => setTimeout(r, 20));
      }

      setStatusMsg("Mengompres ZIP...");
      const content = await zip.generateAsync({ type: "blob" });
      handleSaveAs(
        content,
        `Undangan-${currentTheme.id}-${new Date().toISOString().slice(0, 10)}.zip`,
      );
      setStatusMsg("Selesai!");
    } catch (error) {
      console.error("Gagal generate bulk:", error);
      alert("Terjadi kesalahan sistem saat memproses PDF.");
    } finally {
      setTimeout(() => {
        setIsProcessing(false);
        setProgress(0);
        setStatusMsg("");
      }, 1000);
    }
  };

  return (
    <div className="animate-reveal space-y-8">
      <div className="space-y-3 text-center">
        <div className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-slate-100 to-slate-50 px-4 py-1.5 shadow-sm dark:from-slate-800 dark:to-slate-900">
          <div className="h-2 w-2 animate-pulse rounded-full bg-emerald-500"></div>
          <span className="text-xs font-bold tracking-widest text-slate-500 uppercase dark:text-slate-400">
            Premium Edition
          </span>
        </div>
        <h3 className="bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text font-serif text-3xl font-bold text-transparent dark:from-white dark:to-slate-300">
          Floral PDF Invitation
        </h3>
        <p className="mx-auto max-w-2xl text-sm leading-relaxed text-slate-600 dark:text-slate-400">
          Template Floral Elegan (4 Halaman A5) dengan Ornamen Vektor, QR Code &
          Multi-Theme Support
        </p>
      </div>

      <div className="flex flex-col items-center gap-4">
        <span className="text-xs font-bold tracking-widest text-slate-400 uppercase">
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
              className={`group relative flex h-16 w-16 items-center justify-center rounded-full border-2 shadow-lg transition-all duration-300 hover:scale-110 hover:shadow-xl ${
                currentTheme.id === theme.id
                  ? "scale-110 border-slate-800 ring-4 ring-slate-200 dark:border-white dark:ring-slate-700"
                  : "border-transparent hover:border-slate-300 dark:hover:border-slate-600"
              }`}
              style={{
                backgroundColor: `rgb(${theme.bg[0]},${theme.bg[1]},${theme.bg[2]})`,
              }}
              title={theme.name}
            >
              <div className="relative h-9 w-9">
                <div
                  className="absolute top-0 right-0 h-6 w-6 rounded-full border-2 border-white shadow-md transition-transform group-hover:scale-110 dark:border-slate-900"
                  style={{
                    backgroundColor: `rgb(${theme.primary[0]},${theme.primary[1]},${theme.primary[2]})`,
                  }}
                />
                <div
                  className="absolute bottom-0 left-0 h-6 w-6 rounded-tl-xl rounded-br-xl border-2 border-white shadow-md transition-transform group-hover:scale-110 dark:border-slate-900"
                  style={{
                    backgroundColor: `rgb(${theme.secondary[0]},${theme.secondary[1]},${theme.secondary[2]})`,
                  }}
                />
              </div>

              {currentTheme.id === theme.id && (
                <div className="absolute -bottom-3 rounded-lg bg-gradient-to-r from-slate-800 to-slate-700 px-3 py-1 text-[10px] font-bold whitespace-nowrap text-white shadow-lg dark:from-white dark:to-slate-100 dark:text-slate-900">
                  {theme.name}
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

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

      {activeTab === "single" && (
        <div className="grid items-start gap-8 md:grid-cols-2">
          <div className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold tracking-widest text-slate-400 uppercase">
                  Nama Tamu
                </label>
                <input
                  type="text"
                  value={singleData.name}
                  onChange={(e) =>
                    setSingleData({ ...singleData, name: e.target.value })
                  }
                  placeholder="Contoh: Bpk. Habibie & Keluarga"
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-4 text-lg focus:ring-2 focus:ring-slate-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold tracking-widest text-slate-400 uppercase">
                  Alamat / Kota (Opsional)
                </label>
                <input
                  type="text"
                  value={singleData.address}
                  onChange={(e) =>
                    setSingleData({ ...singleData, address: e.target.value })
                  }
                  placeholder="Jakarta Selatan"
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base focus:ring-2 focus:ring-slate-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
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

      {activeTab === "bulk" && (
        <div className="animate-reveal space-y-8">
          {bulkData.length === 0 ? (
            <div className="space-y-6 rounded-3xl border-2 border-dashed border-slate-300 bg-slate-50 p-10 text-center dark:border-slate-700 dark:bg-slate-800/50">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                {isReadingCsv ? (
                  <Loader2 className="h-8 w-8 animate-spin" />
                ) : (
                  <Upload className="h-8 w-8" />
                )}
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-slate-800 dark:text-white">
                  {isReadingCsv
                    ? "Membaca File CSV..."
                    : "Upload Database Tamu"}
                </h3>
                <p className="mx-auto max-w-md text-sm text-slate-500">
                  Siapkan file CSV dengan format:
                  <br />
                  <strong>Kolom 1: Nama Tamu</strong> |{" "}
                  <strong>Kolom 2: Alamat/Kota (Opsional)</strong>
                </p>

                {/* CENTERED BUTTON */}
                <div className="flex justify-center pt-2">
                  <button
                    onClick={downloadTemplate}
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-white hover:shadow-sm dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
                  >
                    <FileText className="h-3.5 w-3.5" />
                    Download Template CSV
                  </button>
                </div>
              </div>

              <label
                className={`inline-flex cursor-pointer items-center gap-2 rounded-xl bg-slate-900 px-8 py-3 text-sm font-bold text-white shadow-lg transition-all hover:-translate-y-1 hover:opacity-90 dark:bg-white dark:text-slate-900 ${isReadingCsv ? "opacity-50 pointer-events-none" : ""}`}
              >
                Pilih File CSV
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="hidden"
                  disabled={isReadingCsv}
                />
              </label>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Header Control */}
              <div className="flex flex-col gap-4 rounded-xl border border-blue-100 bg-blue-50 p-4 md:flex-row md:items-center md:justify-between dark:border-blue-900/30 dark:bg-blue-900/10">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-blue-100 p-2 font-bold text-blue-600 dark:bg-blue-900/30 dark:text-blue-300">
                    {bulkData.length}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-slate-700 dark:text-blue-100">
                      Tamu Terdeteksi
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      Tema:{" "}
                      <span className="font-bold">{currentTheme.name}</span>
                    </span>
                  </div>
                </div>

                {/* BUTTONS GROUP */}
                <div className="flex gap-3">
                  {/* TOMBOL RESET ELEGAN */}
                  <button
                    onClick={() => {
                      if (confirm("Yakin ingin menghapus semua data?"))
                        setBulkData([]);
                    }}
                    className="group flex items-center gap-2 rounded-xl border border-red-100 bg-red-50 px-5 py-2.5 text-xs font-bold text-red-600 transition-all hover:bg-red-100 hover:shadow-sm active:scale-95 dark:border-red-900/30 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30"
                  >
                    <RefreshCcw className="h-4 w-4 transition-transform duration-500 group-hover:-rotate-180" />
                    Reset Data
                  </button>

                  {/* TOMBOL DOWNLOAD ELEGAN */}
                  <button
                    onClick={processBulk}
                    disabled={isProcessing}
                    className="group relative flex items-center justify-center gap-3 overflow-hidden rounded-xl bg-slate-900 px-8 py-2.5 text-xs font-bold text-white shadow-lg transition-all duration-300 hover:bg-slate-800 hover:shadow-slate-500/20 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-70 disabled:cursor-not-allowed dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
                  >
                    <div className="relative z-10 flex items-center gap-2">
                      {isProcessing ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Download className="h-4 w-4 transition-transform duration-300 group-hover:translate-y-0.5" />
                      )}
                      <span>
                        {isProcessing ? "Memproses..." : "Download ZIP"}
                      </span>
                    </div>
                  </button>
                </div>
              </div>

              {/* Progress Bar Visual */}
              {isProcessing && (
                <div className="space-y-2 animate-reveal">
                  <div className="flex justify-between text-xs font-bold text-slate-500 dark:text-slate-400">
                    <span>{statusMsg}</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-3 dark:bg-slate-700 overflow-hidden">
                    <div
                      className="bg-blue-600 h-full rounded-full transition-all duration-300 ease-out"
                      style={{ width: `${progress}%` }}
                    ></div>
                  </div>
                </div>
              )}

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
