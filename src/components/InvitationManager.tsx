import FileSaver from "file-saver";
import jsPDF from "jspdf";
import JSZip from "jszip";
import {
  Check,
  Download,
  Eye,
  FileSpreadsheet,
  Loader2,
  Printer,
  RefreshCcw,
  Trash2,
  Upload,
  Users,
} from "lucide-react";
import QRCode from "qrcode";
import React, { useEffect, useState } from "react";
import { parseGuestsText, type ParsedGuestRow } from "../utils/csvImport";
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

interface InvitationManagerProps {
  siteUrl: string;
}

const rgbToHex = ([r, g, b]: [number, number, number]): string =>
  "#" + [r, g, b].map((c) => c.toString(16).padStart(2, "0")).join("");

const InvitationManager: React.FC<InvitationManagerProps> = ({ siteUrl }) => {
  const [activeTab, setActiveTab] = useState<"single" | "bulk">("single");
  const [currentTheme, setCurrentTheme] = useState<ThemeColor>(THEMES[0]);
  const [singleData, setSingleData] = useState<GuestData>({
    name: "",
    address: "Di Tempat",
  });
  const [bulkData, setBulkData] = useState<GuestData[]>([]);
  const [savedGuests, setSavedGuests] = useState<SavedGuestItem[]>([]);
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMsg, setStatusMsg] = useState("");
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [cfg, setCfg] = useState<Record<string, string>>({});
  const [isConfigLoaded, setIsConfigLoaded] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState | null>(
    null
  );

  useEffect(() => {
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
    const saveAsFunc = (FileSaver as any).saveAs || FileSaver;
    saveAsFunc(blob, name);
  };

  const drawLeaf = (
    doc: jsPDF,
    x: number,
    y: number,
    size: number,
    angle: number
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
      currentTheme.secondary[2]
    );
    doc.setDrawColor(
      currentTheme.primary[0],
      currentTheme.primary[1],
      currentTheme.primary[2]
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
      currentTheme.primary[2]
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
    rot: number
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
      currentTheme.primary[2]
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
      currentTheme.secondary[2]
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
    const brideName = cfg.BRIDE_NICKNAME || "Bride";
    const groomName = cfg.GROOM_NICKNAME || "Groom";
    const brideFullName = cfg.BRIDE_FULLNAME || "Bride";
    const groomFullName = cfg.GROOM_FULLNAME || "Groom";
    const brideParents = cfg.BRIDE_PARENTS || "";
    const groomParents = cfg.GROOM_PARENTS || "";
    const venueName = cfg.VENUE_NAME || "";
    const venueAddress = cfg.VENUE_ADDRESS || "";
    const venueLat = cfg.VENUE_LAT || "0";
    const venueLng = cfg.VENUE_LNG || "0";
    const akadTitle = cfg.AKAD_TITLE || "Akad Nikah";
    const akadDay = cfg.AKAD_DAY || "";
    const akadDate = cfg.AKAD_DATE || "";
    const akadStart = cfg.AKAD_START || "";
    const akadEnd = cfg.AKAD_END || "";
    const resepsiTitle = cfg.RESEPSI_TITLE || "Resepsi Pernikahan";
    const resepsiDay = cfg.RESEPSI_DAY || "";
    const resepsiDate = cfg.RESEPSI_DATE || "";
    const resepsiStart = cfg.RESEPSI_START || "";
    const resepsiEnd = cfg.RESEPSI_END || "";
    const timezone = cfg.EVENT_TIMEZONE || "WIB";
    const salamOpening =
      cfg.TEXT_SALAM_OPENING || "Assalamu'alaikum Warahmatullahi Wabarakatuh";
    const quoteArRum = cfg.TEXT_QUOTE_AR_RUM || "";
    const closingText = cfg.TEXT_CLOSING || "";
    const salamClosing =
      cfg.TEXT_SALAM_CLOSING || "Wassalamu'alaikum Warahmatullahi Wabarakatuh";
    const signature = cfg.TEXT_SIGNATURE || "Kami yang berbahagia,";

    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a5",
    });
    const width = doc.internal.pageSize.getWidth();
    const height = doc.internal.pageSize.getHeight();
    const cx = width / 2;

    const qrDarkHex = rgbToHex(currentTheme.textMain);
    const guestUrl = `${baseUrl}/?to=${encodeURIComponent(guest.name)}`;
    const qrGuestImg = await QRCode.toDataURL(guestUrl, {
      margin: 0,
      color: { dark: qrDarkHex, light: "#ffffff" },
    });
    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${venueLat},${venueLng}`;
    const qrMapsImg = await QRCode.toDataURL(mapsUrl, {
      margin: 0,
      color: { dark: qrDarkHex, light: "#ffffff" },
    });

    const fillPageBackground = () => {
      doc.setFillColor(
        currentTheme.bg[0],
        currentTheme.bg[1],
        currentTheme.bg[2]
      );
      doc.rect(0, 0, width, height, "F");
    };

    fillPageBackground();
    drawBorder(doc, width, height);
    drawCornerDecorations(doc, width, height);

    doc.setFont("times", "bold");
    doc.setFontSize(12);
    doc.setTextColor(
      currentTheme.textMuted[0],
      currentTheme.textMuted[1],
      currentTheme.textMuted[2]
    );
    doc.text("THE WEDDING OF", cx, 50, { align: "center" });
    doc.setFont("times", "italic");
    doc.setFontSize(40);
    doc.setTextColor(
      currentTheme.textMain[0],
      currentTheme.textMain[1],
      currentTheme.textMain[2]
    );
    doc.text(brideName, cx, 75, { align: "center" });
    doc.setFont("times", "normal");
    doc.setFontSize(16);
    doc.setTextColor(
      currentTheme.primary[0],
      currentTheme.primary[1],
      currentTheme.primary[2]
    );
    doc.text("&", cx, 88, { align: "center" });
    doc.setFont("times", "italic");
    doc.setFontSize(40);
    doc.setTextColor(
      currentTheme.textMain[0],
      currentTheme.textMain[1],
      currentTheme.textMain[2]
    );
    doc.text(groomName, cx, 105, { align: "center" });
    doc.setDrawColor(
      currentTheme.secondary[0],
      currentTheme.secondary[1],
      currentTheme.secondary[2]
    );
    doc.setLineWidth(0.2);
    doc.line(cx - 20, 115, cx + 20, 115);
    doc.setFont("times", "bold");
    doc.setFontSize(9);
    doc.setTextColor(
      currentTheme.textMuted[0],
      currentTheme.textMuted[1],
      currentTheme.textMuted[2]
    );
    doc.text(resepsiDate.toUpperCase(), cx, 125, { align: "center" });

    const boxW = 90;
    doc.setFont("times", "bolditalic");
    doc.setFontSize(13);
    const splitName = doc.splitTextToSize(guest.name, boxW - 10) as string[];
    const nameLineHeight = 5.5;
    const nameBlockHeight = splitName.length * nameLineHeight;
    const boxH = Math.max(30, 18 + nameBlockHeight + (guest.address ? 8 : 2));
    const boxY = Math.min(155, height - boxH - 22);

    doc.setFillColor(250, 250, 250);
    doc.setDrawColor(
      currentTheme.secondary[0],
      currentTheme.secondary[1],
      currentTheme.secondary[2]
    );
    doc.setLineWidth(0.3);
    doc.roundedRect(cx - boxW / 2 + 0.5, boxY + 0.5, boxW, boxH, 2, 2, "F");
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(
      currentTheme.primary[0],
      currentTheme.primary[1],
      currentTheme.primary[2]
    );
    doc.setLineWidth(0.5);
    doc.roundedRect(cx - boxW / 2, boxY, boxW, boxH, 2, 2, "FD");
    doc.setFont("times", "normal");
    doc.setFontSize(9);
    doc.text("Kepada Yth. Bapak/Ibu/Saudara/i:", cx, boxY + 8, {
      align: "center",
    });
    doc.setFont("times", "bolditalic");
    doc.setFontSize(13);
    doc.setTextColor(
      currentTheme.textMain[0],
      currentTheme.textMain[1],
      currentTheme.textMain[2]
    );
    doc.text(splitName, cx, boxY + 16, { align: "center" });
    if (guest.address) {
      doc.setFont("times", "normal");
      doc.setFontSize(9);
      doc.setTextColor(
        currentTheme.textMuted[0],
        currentTheme.textMuted[1],
        currentTheme.textMuted[2]
      );
      doc.text(guest.address, cx, boxY + 16 + nameBlockHeight + 3, {
        align: "center",
      });
    }

    doc.addPage();
    fillPageBackground();
    drawBorder(doc, width, height);
    drawCornerDecorations(doc, width, height);
    doc.setFont("times", "bold");
    doc.setFontSize(12);
    doc.setTextColor(
      currentTheme.textMain[0],
      currentTheme.textMain[1],
      currentTheme.textMain[2]
    );
    doc.text(salamOpening, cx, 42, { align: "center" });
    doc.setFont("times", "italic");
    doc.setFontSize(9.5);
    doc.setTextColor(
      currentTheme.textMuted[0],
      currentTheme.textMuted[1],
      currentTheme.textMuted[2]
    );
    const quote = doc.splitTextToSize(quoteArRum, width - 48) as string[];
    doc.text(quote, cx, 52, { align: "center" });
    const afterQuoteY = Math.max(92, 52 + quote.length * 4.5 + 8);
    doc.setFont("times", "normal");
    doc.setFontSize(10);
    doc.text(
      "Kami bermaksud menyelenggarakan pernikahan putra-putri kami:",
      cx,
      afterQuoteY,
      { align: "center" }
    );
    doc.setFont("times", "bold");
    doc.setFontSize(16);
    doc.setTextColor(
      currentTheme.primary[0],
      currentTheme.primary[1],
      currentTheme.primary[2]
    );
    doc.text(brideFullName, cx, afterQuoteY + 14, { align: "center" });
    doc.setFont("times", "normal");
    doc.setFontSize(9);
    doc.setTextColor(
      currentTheme.textMuted[0],
      currentTheme.textMuted[1],
      currentTheme.textMuted[2]
    );
    const brideParentsLines = doc.splitTextToSize(
      brideParents,
      width - 44
    ) as string[];
    doc.text(brideParentsLines, cx, afterQuoteY + 21, { align: "center" });
    const ampY = afterQuoteY + 21 + brideParentsLines.length * 4.5 + 6;
    doc.setFont("times", "italic");
    doc.setFontSize(12);
    doc.text("&", cx, ampY, { align: "center" });
    doc.setFont("times", "bold");
    doc.setFontSize(16);
    doc.setTextColor(
      currentTheme.primary[0],
      currentTheme.primary[1],
      currentTheme.primary[2]
    );
    doc.text(groomFullName, cx, ampY + 10, { align: "center" });
    doc.setFont("times", "normal");
    doc.setFontSize(9);
    doc.setTextColor(
      currentTheme.textMuted[0],
      currentTheme.textMuted[1],
      currentTheme.textMuted[2]
    );
    const groomParentsLines = doc.splitTextToSize(
      groomParents,
      width - 44
    ) as string[];
    doc.text(groomParentsLines, cx, ampY + 17, { align: "center" });

    doc.addPage();
    fillPageBackground();
    drawBorder(doc, width, height);
    drawCornerDecorations(doc, width, height);
    doc.setFont("times", "italic");
    doc.setFontSize(11);
    doc.setTextColor(
      currentTheme.textMain[0],
      currentTheme.textMain[1],
      currentTheme.textMain[2]
    );
    doc.text("Insya Allah acara akan dilaksanakan pada:", cx, 35, {
      align: "center",
    });
    doc.setFont("times", "bold");
    doc.setFontSize(14);
    doc.setTextColor(
      currentTheme.primary[0],
      currentTheme.primary[1],
      currentTheme.primary[2]
    );
    doc.text(akadTitle, cx, 50, { align: "center" });
    doc.setFont("times", "normal");
    doc.setFontSize(10);
    doc.setTextColor(
      currentTheme.textMain[0],
      currentTheme.textMain[1],
      currentTheme.textMain[2]
    );
    doc.text(`${akadDay}, ${akadDate}`, cx, 57, { align: "center" });
    doc.text(`Pukul: ${akadStart} - ${akadEnd} ${timezone}`, cx, 62, {
      align: "center",
    });
    doc.setDrawColor(
      currentTheme.secondary[0],
      currentTheme.secondary[1],
      currentTheme.secondary[2]
    );
    doc.setLineWidth(0.15);
    doc.line(cx - 20, 70, cx - 5, 70);
    doc.line(cx + 5, 70, cx + 20, 70);
    doc.setFillColor(
      currentTheme.primary[0],
      currentTheme.primary[1],
      currentTheme.primary[2]
    );
    for (let i = 0; i < 3; i++) {
      doc.circle(cx - 2 + i, 70, 0.3, "F");
    }
    doc.setFont("times", "bold");
    doc.setFontSize(14);
    doc.setTextColor(
      currentTheme.primary[0],
      currentTheme.primary[1],
      currentTheme.primary[2]
    );
    doc.text(resepsiTitle, cx, 85, { align: "center" });
    doc.setFont("times", "normal");
    doc.setFontSize(10);
    doc.setTextColor(
      currentTheme.textMain[0],
      currentTheme.textMain[1],
      currentTheme.textMain[2]
    );
    doc.text(`${resepsiDay}, ${resepsiDate}`, cx, 92, { align: "center" });
    doc.text(`Pukul: ${resepsiStart} - ${resepsiEnd} ${timezone}`, cx, 97, {
      align: "center",
    });
    doc.setFont("times", "bold");
    doc.setFontSize(12);
    doc.setTextColor(
      currentTheme.textMain[0],
      currentTheme.textMain[1],
      currentTheme.textMain[2]
    );
    doc.text("BERTEMPAT DI:", cx, 115, { align: "center" });
    doc.setFont("times", "normal");
    doc.setFontSize(11);
    doc.text(venueName, cx, 122, { align: "center" });
    doc.setFontSize(9);
    doc.setTextColor(
      currentTheme.textMuted[0],
      currentTheme.textMuted[1],
      currentTheme.textMuted[2]
    );
    const addr = doc.splitTextToSize(venueAddress, 80);
    doc.text(addr, cx, 128, { align: "center" });
    const qrSize = 22;
    const qrY = 145;
    doc.setDrawColor(
      currentTheme.secondary[0],
      currentTheme.secondary[1],
      currentTheme.secondary[2]
    );
    doc.setLineWidth(0.3);
    doc.roundedRect(
      cx - qrSize / 2 - 1.5,
      qrY - 1.5,
      qrSize + 3,
      qrSize + 3,
      1,
      1
    );
    doc.addImage(qrMapsImg, "PNG", cx - qrSize / 2, qrY, qrSize, qrSize);
    doc.text("Scan Google Maps", cx, qrY + qrSize + 5, { align: "center" });

    doc.addPage();
    fillPageBackground();
    drawBorder(doc, width, height);
    drawCornerDecorations(doc, width, height);
    doc.setFont("times", "bold");
    doc.setFontSize(10);
    doc.setTextColor(
      currentTheme.primary[0],
      currentTheme.primary[1],
      currentTheme.primary[2]
    );
    doc.text("E-INVITATION", cx, 50, { align: "center" });
    const qrDigiSize = 40;
    const digiY = 60;
    doc.setFillColor(
      currentTheme.bg[0],
      currentTheme.bg[1],
      currentTheme.bg[2]
    );
    doc.setDrawColor(
      currentTheme.secondary[0],
      currentTheme.secondary[1],
      currentTheme.secondary[2]
    );
    doc.setLineWidth(0.3);
    doc.roundedRect(
      cx - qrDigiSize / 2 - 2.5,
      digiY - 2.5,
      qrDigiSize + 5,
      qrDigiSize + 5,
      2,
      2,
      "FD"
    );
    doc.setDrawColor(
      currentTheme.primary[0],
      currentTheme.primary[1],
      currentTheme.primary[2]
    );
    doc.setLineWidth(0.4);
    doc.roundedRect(
      cx - qrDigiSize / 2 - 2,
      digiY - 2,
      qrDigiSize + 4,
      qrDigiSize + 4,
      1.5,
      1.5,
      "D"
    );
    doc.addImage(
      qrGuestImg,
      "PNG",
      cx - qrDigiSize / 2,
      digiY,
      qrDigiSize,
      qrDigiSize
    );
    doc.setFont("times", "normal");
    doc.setFontSize(9);
    doc.setTextColor(
      currentTheme.textMuted[0],
      currentTheme.textMuted[1],
      currentTheme.textMuted[2]
    );
    doc.text(
      "Scan untuk buka undangan digital & konfirmasi kehadiran",
      cx,
      digiY + qrDigiSize + 8,
      { align: "center" }
    );
    const closingY = 128;
    doc.setFont("times", "normal");
    doc.setFontSize(10);
    doc.setTextColor(
      currentTheme.textMain[0],
      currentTheme.textMain[1],
      currentTheme.textMain[2]
    );
    const closing = doc.splitTextToSize(closingText, width - 50) as string[];
    doc.text(closing, cx, closingY, { align: "center" });
    const afterClosingY = Math.max(
      closingY + 18,
      closingY + closing.length * 4.5 + 6
    );
    doc.setFont("times", "bolditalic");
    doc.text(salamClosing, cx, afterClosingY, { align: "center" });
    doc.setFont("times", "normal");
    doc.setFontSize(9);
    doc.text(signature, cx, afterClosingY + 10, { align: "center" });
    doc.setFont("times", "bold");
    doc.setFontSize(12);
    doc.setTextColor(
      currentTheme.primary[0],
      currentTheme.primary[1],
      currentTheme.primary[2]
    );
    doc.text(`${brideName} & ${groomName}`, cx, afterClosingY + 18, {
      align: "center",
    });
    doc.setDrawColor(
      currentTheme.secondary[0],
      currentTheme.secondary[1],
      currentTheme.secondary[2]
    );
    doc.setLineWidth(0.1);
    for (let i = 0; i < 5; i++) {
      doc.circle(cx + (-10 + i * 5), afterClosingY + 26, 0.4, "D");
    }

    return doc;
  };

  const handlePreview = async () => {
    if (!singleData.name) return;
    const doc = await generatePDFDoc(singleData);
    setPreviewUri(doc.output("datauristring"));
  };

  const downloadSingle = async () => {
    if (!singleData.name) return;
    const doc = await generatePDFDoc(singleData);
    handleSaveAs(
      doc.output("blob"),
      `Inv_${singleData.name.replace(/[^a-zA-Z0-9]/g, "_")}_${currentTheme.id}.pdf`
    );
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
      message: `${savedGuests.length} tamu dimuat dari Daftar Tamu Permanen.`,
    });
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
          `Generating PDF ${i + 1} - ${Math.min(i + chunk.length, bulkData.length)} dari ${bulkData.length}...`
        );
        await Promise.all(
          chunk.map(async (guest, idx) => {
            const doc = await generatePDFDoc(guest);
            const blob = doc.output("blob");
            const safeName = guest.name
              .replace(/[^a-zA-Z0-9]/g, "_")
              .substring(0, 50);
            folder?.file(`${i + idx + 1}_${safeName}.pdf`, blob);
          })
        );
        setProgress(
          Math.round(
            (Math.min(i + CHUNK_SIZE, bulkData.length) / bulkData.length) * 100
          )
        );
        await new Promise((r) => setTimeout(r, 20));
      }
      setStatusMsg("Mengompres ZIP...");
      const content = await zip.generateAsync({ type: "blob" });
      handleSaveAs(
        content,
        `Undangan-${currentTheme.id}-${new Date().toISOString().slice(0, 10)}.zip`
      );
      setStatusMsg("Selesai!");
    } catch (error) {
      console.error("Gagal generate bulk:", error);
      setToast({
        type: "error",
        message: "Terjadi kesalahan sistem saat memproses PDF.",
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
    <div className="animate-reveal space-y-8">
      <ToastBanner toast={toast} onClose={() => setToast(null)} />
      <ConfirmModal
        dialog={confirmDialog}
        onClose={() => setConfirmDialog(null)}
      />

      <CsvImportModal<ParsedGuestRow>
        isOpen={isCsvModalOpen}
        title="Import Daftar Tamu untuk Undangan PDF"
        description="Upload file CSV atau salin-tempel langsung dari Excel (Nama Tamu & Alamat/Kota)."
        templateFilename="template_undangan_pdf.csv"
        templateHeaders={["Nama Tamu", "Alamat (Opsional)"]}
        templateRows={[
          ["Bapak Ahmad & Ibu Siti", "Jakarta"],
          ["Teman-teman Alumni SMA 1", "Di Tempat"],
          ["Keluarga Besar H. Syarif", "Bandung"],
        ]}
        pastePlaceholder={
          "Bapak Ahmad & Ibu Siti,Jakarta\nTeman-teman Alumni SMA 1,Di Tempat\nKeluarga Besar H. Syarif,Bandung"
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
            message: `${rows.length} tamu siap dicetak ke PDF.`,
          });
        }}
        onClose={() => setIsCsvModalOpen(false)}
        confirmLabel="Muat Daftar Tamu"
      />
      <div
        data-tour="pdf-themes"
        className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-(--adm-border) bg-(--adm-bg-primary) p-4"
      >
        <div>
          <span className="adm-label mb-0.5">
            Nuansa Warna Undangan (A5 · 4 Halaman)
          </span>
          <p className="text-xs text-(--adm-text-secondary)">
            Tema aktif:{" "}
            <strong className="text-(--adm-text-primary)">
              {currentTheme.name}
            </strong>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          {THEMES.map((theme) => (
            <button
              key={theme.id}
              type="button"
              onClick={() => {
                setCurrentTheme(theme);
                setPreviewUri(null);
              }}
              className={`inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs font-medium transition-all ${
                currentTheme.id === theme.id
                  ? "border-(--adm-accent) bg-(--adm-accent-soft) text-(--adm-accent)"
                  : "border-(--adm-border) bg-(--adm-bg-secondary) text-(--adm-text-secondary) hover:text-(--adm-text-primary)"
              }`}
              title={theme.name}
            >
              <span
                className="h-3.5 w-3.5 rounded-full border border-(--adm-border)"
                style={{
                  backgroundColor: `rgb(${theme.primary[0]},${theme.primary[1]},${theme.primary[2]})`,
                }}
              />
              {theme.name}
            </button>
          ))}
        </div>
      </div>

      <div className="flex justify-start">
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
        <div className="grid items-start gap-4 md:grid-cols-2">
          <div className="adm-card">
            <div className="adm-card-header">
              <div>
                <h3 className="adm-card-title">Undangan PDF Satuan</h3>
                <p className="adm-card-desc">
                  Cetak satu undangan PDF personal dengan tema terpilih.
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
                  Nama Tamu
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
                  onClick={handlePreview}
                  disabled={!singleData.name || !isConfigLoaded}
                  className="adm-btn adm-btn-secondary flex-1"
                >
                  <Eye className="h-3.5 w-3.5" /> Pratinjau
                </button>
                <button
                  type="button"
                  onClick={downloadSingle}
                  disabled={!singleData.name || !isConfigLoaded}
                  className="adm-btn adm-btn-primary flex-1"
                >
                  <Printer className="h-3.5 w-3.5" /> Unduh PDF
                </button>
              </div>
            </div>
          </div>
          <div className="adm-card">
            <div className="adm-card-header">
              <h3 className="adm-card-title">Pratinjau PDF</h3>
            </div>
            <div className="adm-card-body flex min-h-[400px] items-center justify-center bg-(--adm-bg-tertiary)">
              {previewUri ? (
                <iframe
                  src={previewUri}
                  className="h-[500px] w-full rounded-md border border-(--adm-border) bg-white"
                  title="PDF Preview"
                />
              ) : (
                <div className="text-center text-(--adm-text-muted)">
                  <FileSpreadsheet className="mx-auto mb-2 h-10 w-10 opacity-50" />
                  <p className="text-[13px]">Masukkan data & klik Pratinjau</p>
                  <p className="adm-hint mt-1">
                    (Ornamen bunga dirender menggunakan vektor PDF)
                  </p>
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
                      Ambil dari Daftar Tamu Permanen
                    </h3>
                    <p className="adm-card-desc">
                      Cetak PDF massal untuk seluruh {savedGuests.length} tamu
                      yang sudah tersimpan di database.
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
                      Seret & lepas file CSV atau tempel daftar tamu langsung
                      dari Excel/Google Sheets.
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
                      <span className="adm-card-title">Tamu Terdeteksi</span>
                      <span className="adm-hint">
                        Tema:{" "}
                        <span className="font-semibold">
                          {currentTheme.name}
                        </span>
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setConfirmDialog({
                          title: "Reset Data Tamu",
                          message:
                            "Yakin ingin menghapus semua data yang dimuat?",
                          confirmLabel: "Reset",
                          destructive: true,
                          onConfirm: () => setBulkData([]),
                        })
                      }
                      className="adm-btn adm-btn-outline-danger"
                    >
                      <RefreshCcw className="h-3.5 w-3.5" />
                      Reset Data
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
