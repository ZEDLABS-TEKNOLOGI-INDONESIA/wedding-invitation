import jsPDF from "jspdf";
import {
  PAPER_SIZES,
  STATIONERY_DESIGNS,
  STATIONERY_THEMES,
  ensureStationeryFonts,
  renderClosingPage,
  renderCouplePage,
  renderCoverPage,
  renderEventPage,
  renderQrStamp,
  type InvitationContent,
  type PaperSizeId,
  type PaperSizeOption,
  type StationeryDesignId,
  type StationeryTheme,
} from "./stationery";

export const PDF_PREFS_STORAGE_KEY = "wedding_pdf_prefs_v1";
export const PDF_PREFS_EVENT = "wedding-pdf-prefs-changed";

export interface PdfStationeryPrefs {
  designId: StationeryDesignId;
  paperId: PaperSizeId;
  themeId: string;
}

export interface PdfGuestInfo {
  name: string;
  address: string;
}

export interface SharedMiddlePages {
  page2: string;
  page3: string;
}

const DEFAULT_PREFS: PdfStationeryPrefs = {
  designId: "floral",
  paperId: PAPER_SIZES[0].id,
  themeId: STATIONERY_THEMES[0].id,
};

export function loadPdfPrefs(): PdfStationeryPrefs {
  if (typeof window === "undefined") return DEFAULT_PREFS;
  try {
    const raw = window.localStorage.getItem(PDF_PREFS_STORAGE_KEY);
    if (!raw) return DEFAULT_PREFS;
    const parsed = JSON.parse(raw) as Partial<PdfStationeryPrefs>;

    const validDesign = STATIONERY_DESIGNS.some(
      (d) => d.id === parsed.designId
    )
      ? (parsed.designId as StationeryDesignId)
      : DEFAULT_PREFS.designId;
    const validPaper = PAPER_SIZES.some((p) => p.id === parsed.paperId)
      ? (parsed.paperId as PaperSizeId)
      : DEFAULT_PREFS.paperId;
    const validTheme = STATIONERY_THEMES.some((t) => t.id === parsed.themeId)
      ? (parsed.themeId as string)
      : DEFAULT_PREFS.themeId;

    return {
      designId: validDesign,
      paperId: validPaper,
      themeId: validTheme,
    };
  } catch {
    return DEFAULT_PREFS;
  }
}

export function savePdfPrefs(partial: Partial<PdfStationeryPrefs>): void {
  if (typeof window === "undefined") return;
  try {
    const next: PdfStationeryPrefs = {
      ...loadPdfPrefs(),
      ...partial,
    };
    window.localStorage.setItem(PDF_PREFS_STORAGE_KEY, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent(PDF_PREFS_EVENT, { detail: next }));
  } catch {
    // Abaikan jika localStorage tidak tersedia
  }
}

export function resolvePdfPrefs(prefs: PdfStationeryPrefs): {
  designId: StationeryDesignId;
  paper: PaperSizeOption;
  theme: StationeryTheme;
} {
  const paper =
    PAPER_SIZES.find((p) => p.id === prefs.paperId) || PAPER_SIZES[0];
  const theme =
    STATIONERY_THEMES.find((t) => t.id === prefs.themeId) ||
    STATIONERY_THEMES[0];
  const designId = STATIONERY_DESIGNS.some((d) => d.id === prefs.designId)
    ? prefs.designId
    : "floral";
  return { designId, paper, theme };
}

export function buildInvitationContentFromConfig(
  cfg: Record<string, string>
): InvitationContent {
  const tz = cfg.EVENT_TIMEZONE || "WIB";
  const formatTime = (start?: string, end?: string) => {
    if (!start && !end) return "";
    if (start && end) return `Pukul ${start} – ${end} ${tz}`;
    return `Pukul ${start || end} ${tz}`;
  };
  const lat = cfg.VENUE_LAT || "0";
  const lng = cfg.VENUE_LNG || "0";

  return {
    brideName: cfg.BRIDE_NICKNAME || "Mempelai Wanita",
    groomName: cfg.GROOM_NICKNAME || "Mempelai Pria",
    brideFullName:
      cfg.BRIDE_FULLNAME || cfg.BRIDE_NICKNAME || "Mempelai Wanita",
    groomFullName: cfg.GROOM_FULLNAME || cfg.GROOM_NICKNAME || "Mempelai Pria",
    brideParents: cfg.BRIDE_PARENTS || "",
    groomParents: cfg.GROOM_PARENTS || "",
    venueName: cfg.VENUE_NAME || "",
    venueAddress: cfg.VENUE_ADDRESS || "",
    mapsUrl: `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`,
    akadTitle: cfg.AKAD_TITLE || "Akad Nikah",
    akadDay: cfg.AKAD_DAY || "",
    akadDate: cfg.AKAD_DATE || "",
    akadTime: formatTime(cfg.AKAD_START, cfg.AKAD_END),
    resepsiTitle: cfg.RESEPSI_TITLE || "Resepsi Pernikahan",
    resepsiDay: cfg.RESEPSI_DAY || "",
    resepsiDate: cfg.RESEPSI_DATE || "",
    resepsiTime: formatTime(cfg.RESEPSI_START, cfg.RESEPSI_END),
    salamOpening:
      cfg.TEXT_SALAM_OPENING || "Assalamu'alaikum Warahmatullahi Wabarakatuh",
    quote: cfg.TEXT_QUOTE_AR_RUM || "",
    closingText:
      cfg.TEXT_CLOSING ||
      "Merupakan suatu kehormatan dan kebahagiaan bagi kami apabila Bapak/Ibu/Saudara/i berkenan hadir untuk memberikan doa restu.",
    salamClosing:
      cfg.TEXT_SALAM_CLOSING || "Wassalamu'alaikum Warahmatullahi Wabarakatuh",
    signature: cfg.TEXT_SIGNATURE || "Kami yang berbahagia,",
  };
}

export function renderSharedMiddlePages(
  content: InvitationContent,
  theme: StationeryTheme,
  opts: { design: StationeryDesignId; paper: PaperSizeOption },
  jpegQuality = 0.92
): SharedMiddlePages {
  return {
    page2: renderCouplePage(content, theme, opts).toDataURL(
      "image/jpeg",
      jpegQuality
    ),
    page3: renderEventPage(content, theme, opts).toDataURL(
      "image/jpeg",
      jpegQuality
    ),
  };
}

export async function generateInvitationPdfDoc(
  content: InvitationContent,
  guest: PdfGuestInfo,
  baseUrl: string,
  theme: StationeryTheme,
  opts: { design: StationeryDesignId; paper: PaperSizeOption },
  sharedMiddlePages?: SharedMiddlePages,
  jpegQuality = 0.92
): Promise<jsPDF> {
  await ensureStationeryFonts();

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: [opts.paper.mmWidth, opts.paper.mmHeight],
    compress: true,
  });
  const width = doc.internal.pageSize.getWidth();
  const height = doc.internal.pageSize.getHeight();
  const cleanName = guest.name.trim();
  const guestUrl = `${baseUrl}/?to=${encodeURIComponent(cleanName)}`;

  const page1 = renderCoverPage(
    content,
    { name: cleanName, address: guest.address || "Di Tempat" },
    theme,
    opts
  ).toDataURL("image/jpeg", jpegQuality);
  const page2 =
    sharedMiddlePages?.page2 ||
    renderCouplePage(content, theme, opts).toDataURL("image/jpeg", jpegQuality);
  const page3 =
    sharedMiddlePages?.page3 ||
    renderEventPage(content, theme, opts).toDataURL("image/jpeg", jpegQuality);
  const page4 = renderClosingPage(content, guestUrl, theme, opts).toDataURL(
    "image/jpeg",
    jpegQuality
  );

  [page1, page2, page3, page4].forEach((img, idx) => {
    if (idx > 0) doc.addPage([opts.paper.mmWidth, opts.paper.mmHeight]);
    doc.addImage(img, "JPEG", 0, 0, width, height, undefined, "FAST");
  });

  return doc;
}

export async function generateInvitationPdfBase64(
  content: InvitationContent,
  guest: PdfGuestInfo,
  baseUrl: string,
  theme: StationeryTheme,
  opts: { design: StationeryDesignId; paper: PaperSizeOption },
  sharedMiddlePages?: SharedMiddlePages,
  jpegQuality = 0.85
): Promise<string> {
  const doc = await generateInvitationPdfDoc(
    content,
    guest,
    baseUrl,
    theme,
    opts,
    sharedMiddlePages,
    jpegQuality
  );
  const dataUri = doc.output("datauristring");
  const commaIdx = dataUri.indexOf(",");
  return commaIdx >= 0 ? dataUri.slice(commaIdx + 1) : dataUri;
}

export async function generateGuestQrStampBase64(
  content: InvitationContent,
  guestName: string,
  guestUrl: string,
  theme: StationeryTheme,
  design: StationeryDesignId
): Promise<string> {
  await ensureStationeryFonts();
  const canvas = renderQrStamp({
    url: guestUrl,
    guestName: guestName.trim() || "Tamu Undangan",
    bride: content.brideName,
    groom: content.groomName,
    theme,
    design,
    width: 900,
  });
  const dataUri = canvas.toDataURL("image/png");
  const commaIdx = dataUri.indexOf(",");
  return commaIdx >= 0 ? dataUri.slice(commaIdx + 1) : dataUri;
}
