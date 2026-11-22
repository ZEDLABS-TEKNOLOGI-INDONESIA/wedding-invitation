import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

export interface CoachmarkStep {
  selector?: string;
  title: string;
  body: string;
}

export interface CoachmarkGuide {
  key: string;
  name: string;
  steps: CoachmarkStep[];
}

export const ADMIN_COACHMARK_GUIDES: Record<string, CoachmarkGuide> = {
  rsvp: {
    key: "rsvp",
    name: "Data RSVP",
    steps: [
      {
        selector: "[data-tour='sidebar-nav']",
        title: "Navigasi Panel Admin",
        body: "Gunakan menu di sisi kiri untuk berpindah antar fitur. Tekan tombol '/' atau Ctrl+K kapan saja untuk mencari menu dengan cepat.",
      },
      {
        selector: "[data-tour='stat-cards']",
        title: "Ringkasan Kehadiran Real-Time",
        body: "Pantau total respon, jumlah tamu hadir beserta estimasi pax, tamu ragu, dan yang berhalangan secara langsung.",
      },
      {
        selector: "[data-tour='page-actions']",
        title: "Tambah Manual & Import CSV / Excel",
        body: "Anda bisa menambah data RSVP manual, mengimpor file CSV atau copy-paste dari Excel, serta mengunduh laporan CSV.",
      },
      {
        selector: "[data-tour='topbar-controls']",
        title: "Tema, Panduan & Pratinjau",
        body: "Ganti tema terang/gelap, putar ulang panduan halaman ini, atau buka halaman undangan langsung dari bilah atas.",
      },
    ],
  },
  wishes: {
    key: "wishes",
    name: "Ucapan & Doa",
    steps: [
      {
        selector: "[data-tour='page-actions']",
        title: "Kelola Buku Tamu",
        body: "Tambahkan ucapan secara manual, impor daftar ucapan dari CSV/Excel, atau ekspor seluruh doa tamu ke file CSV.",
      },
      {
        selector: "[data-tour='data-table']",
        title: "Moderasi & Pencarian Cepat",
        body: "Cari ucapan tertentu, edit teks yang typo (tombol hijau), atau hapus satuan maupun massal (tombol merah).",
      },
    ],
  },
  guests: {
    key: "guests",
    name: "Tamu & Check-In",
    steps: [
      {
        selector: "[data-tour='guest-subtabs']",
        title: "Daftar Tamu & Scanner Hari H",
        body: "Kelola daftar tamu permanen beserta kode QR uniknya, lalu pindah ke Scanner Check-In saat hari resepsi tiba.",
      },
      {
        selector: "[data-tour='guest-add-form']",
        title: "Input Mudah & Import Excel",
        body: "Tambahkan tamu satuan dengan preset grup dan stepper kuota pax, atau klik 'Import CSV / Excel' untuk ratusan tamu sekaligus.",
      },
    ],
  },
  wa: {
    key: "wa",
    name: "Kirim WhatsApp",
    steps: [
      {
        selector: "[data-tour='wa-mode-switch']",
        title: "Kirim Satuan atau Massal",
        body: "Pilih Kirim Satuan untuk satu tamu (bisa pilih cepat dari Daftar Tamu), atau Kirim Massal dengan tarik 1-klik dari Daftar Tamu / CSV.",
      },
      {
        selector: "[data-tour='wa-history']",
        title: "Pantau Status Pengiriman",
        body: "Cek status pesan (Antre, Terkirim, Sampai, Dibaca, Gagal) dan kirim ulang bila ada pesan yang gagal.",
      },
    ],
  },
  qr: {
    key: "qr",
    name: "QR Generator",
    steps: [
      {
        selector: "[data-tour='qr-mode-switch']",
        title: "QR Personal Satuan & Massal ZIP",
        body: "Buat QR Code undangan dengan inisial mempelai di tengah — satuan PNG atau ratusan sekaligus dalam 1 file ZIP dari Daftar Tamu / CSV.",
      },
    ],
  },
  pdf: {
    key: "pdf",
    name: "Design PDF",
    steps: [
      {
        selector: "[data-tour='pdf-themes']",
        title: "Pilih Tema Undangan Cetak A5",
        body: "Pilih salah satu dari 4 palet warna floral. Setiap PDF berisi 4 halaman A5 lengkap dengan QR undangan & QR Google Maps.",
      },
    ],
  },
  settings: {
    key: "settings",
    name: "Pengaturan Undangan",
    steps: [
      {
        selector: "[data-tour='settings-sticky-bar']",
        title: "Simpan, Import/Export & Lompat Cepat",
        body: "Bilah ini tetap menempel saat scroll. Anda bisa lompat ke bagian mana saja, backup/import CSV pengaturan, dan simpan kapan pun.",
      },
      {
        selector: "#sec-lokasi",
        title: "Ekstrak Koordinat Google Maps Otomatis",
        body: "Cukup tempel link Google Maps di kolom biru untuk mengisi Latitude dan Longitude secara otomatis.",
      },
      {
        selector: "#sec-jadwal",
        title: "Date & Time Picker Otomatis",
        body: "Pilih tanggal dan jam acara — nama hari, format tanggal Indonesia, dan jadwal kalender otomatis dibuatkan.",
      },
      {
        selector: "#sec-media",
        title: "Upload Foto & Audio Backsound",
        body: "Unggah foto Hero/Amplop serta musik latar (MP3/M4A/OGG/WAV hingga 15 MB) langsung dari perangkat dan dengarkan pratinjaunya.",
      },
    ],
  },
};

const STORAGE_KEY = "wedding_admin_coachmark_done_v1";

const readDoneSet = (): Set<string> => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? new Set(parsed.map(String)) : new Set();
  } catch {
    return new Set();
  }
};

const writeDoneSet = (set: Set<string>) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(set)));
  } catch {
    // ignore
  }
};

interface CoachmarkProps {
  guideKey: string;
  replayNonce: number;
}

/**
 * Coachmark interaktif mengikuti whatsapp-service (Coachmark.astro):
 * Spotlight ring biru Primer + backdrop 0.55 + kartu w-[min(20rem,calc(100vw-2rem))]
 * dengan tombol Lewati (ghost), Kembali (secondary), Lanjut/Selesai (primary) & navigasi keyboard.
 */
const Coachmark: React.FC<CoachmarkProps> = ({ guideKey, replayNonce }) => {
  const guide = ADMIN_COACHMARK_GUIDES[guideKey];
  const [active, setActive] = useState(false);
  const [stepIdx, setStepIdx] = useState(0);
  const [highlightRect, setHighlightRect] = useState<{
    top: number;
    left: number;
    width: number;
    height: number;
  } | null>(null);
  const [cardStyle, setCardStyle] = useState<React.CSSProperties>({
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
  });

  const cardRef = useRef<HTMLDivElement | null>(null);
  const nextBtnRef = useRef<HTMLButtonElement | null>(null);
  const lastReplayRef = useRef(replayNonce);

  const finishGuide = useCallback(() => {
    setActive(false);
    if (!guide) return;
    const done = readDoneSet();
    done.add(guide.key);
    writeDoneSet(done);
  }, [guide]);

  // Auto-open once per tab on first visit
  useEffect(() => {
    setActive(false);
    setStepIdx(0);
    if (!guide) return;
    const done = readDoneSet();
    if (done.has(guide.key)) return;
    const timer = window.setTimeout(() => {
      setStepIdx(0);
      setActive(true);
    }, 450);
    return () => window.clearTimeout(timer);
  }, [guide]);

  // Manual replay trigger from topbar "Panduan" button
  useEffect(() => {
    if (replayNonce === lastReplayRef.current) return;
    lastReplayRef.current = replayNonce;
    if (!guide) return;
    const done = readDoneSet();
    done.delete(guide.key);
    writeDoneSet(done);
    setStepIdx(0);
    setActive(true);
  }, [replayNonce, guide]);

  const positionCard = useCallback(() => {
    if (!active || !guide) return;
    const step = guide.steps[stepIdx];
    const candidate = step?.selector
      ? document.querySelector<HTMLElement>(step.selector)
      : null;
    const target =
      candidate && candidate.getClientRects().length > 0 ? candidate : null;

    if (target) {
      target.scrollIntoView({ block: "center", behavior: "smooth" });
      const rect = target.getBoundingClientRect();
      const pad = 6;
      setHighlightRect({
        top: rect.top - pad,
        left: rect.left - pad,
        width: rect.width + pad * 2,
        height: rect.height + pad * 2,
      });

      const cardH = cardRef.current?.offsetHeight || 180;
      const cardW = cardRef.current?.offsetWidth || 320;
      const belowTop = rect.bottom + 12;
      const fitsBelow = belowTop + cardH < window.innerHeight - 12;
      const topPos = fitsBelow ? belowTop : Math.max(12, rect.top - 12 - cardH);
      const leftPos = Math.min(
        Math.max(12, rect.left),
        window.innerWidth - cardW - 12
      );
      setCardStyle({
        top: `${topPos}px`,
        left: `${leftPos}px`,
        transform: "",
      });
    } else {
      setHighlightRect(null);
      setCardStyle({
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
      });
    }
  }, [active, guide, stepIdx]);

  useLayoutEffect(() => {
    if (!active) return;
    positionCard();
    const t = window.setTimeout(positionCard, 250);
    window.addEventListener("resize", positionCard);
    window.addEventListener("scroll", positionCard, true);
    nextBtnRef.current?.focus();
    return () => {
      window.clearTimeout(t);
      window.removeEventListener("resize", positionCard);
      window.removeEventListener("scroll", positionCard, true);
    };
  }, [active, positionCard]);

  useEffect(() => {
    if (!active || !guide) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        finishGuide();
      } else if (e.key === "ArrowRight") {
        if (stepIdx >= guide.steps.length - 1) finishGuide();
        else setStepIdx((i) => i + 1);
      } else if (e.key === "ArrowLeft" && stepIdx > 0) {
        setStepIdx((i) => i - 1);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [active, guide, stepIdx, finishGuide]);

  if (!active || !guide) return null;
  const step = guide.steps[stepIdx];
  if (!step) return null;

  const isLast = stepIdx === guide.steps.length - 1;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Panduan ${guide.name}`}
      className="fixed inset-0 z-[180]"
      style={highlightRect ? undefined : { background: "rgba(0, 0, 0, 0.55)" }}
    >
      {highlightRect && (
        <div
          className="pointer-events-none fixed rounded-lg ring-2 ring-(--adm-accent) transition-all duration-200"
          style={{
            top: `${highlightRect.top}px`,
            left: `${highlightRect.left}px`,
            width: `${highlightRect.width}px`,
            height: `${highlightRect.height}px`,
            boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.55)",
          }}
        />
      )}

      <div
        ref={cardRef}
        style={cardStyle}
        className="fixed z-[181] w-[min(20rem,calc(100vw-2rem))] rounded-lg border border-(--adm-border) bg-(--adm-bg-secondary) p-4 shadow-xl"
      >
        <p className="mb-1 text-[11px] text-(--adm-text-secondary)">
          Langkah {stepIdx + 1} dari {guide.steps.length}
        </p>
        <h2 className="text-sm font-semibold text-(--adm-text-primary)">
          {step.title}
        </h2>
        <p className="mt-1.5 text-[13px] leading-relaxed text-(--adm-text-secondary)">
          {step.body}
        </p>

        <div className="mt-4 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={finishGuide}
            className="adm-btn adm-btn-ghost adm-btn-sm"
          >
            Lewati
          </button>
          <div className="flex gap-2">
            {stepIdx > 0 && (
              <button
                type="button"
                onClick={() => setStepIdx((i) => Math.max(0, i - 1))}
                className="adm-btn adm-btn-secondary adm-btn-sm"
              >
                Kembali
              </button>
            )}
            <button
              ref={nextBtnRef}
              type="button"
              onClick={() => {
                if (isLast) finishGuide();
                else setStepIdx((i) => i + 1);
              }}
              className="adm-btn adm-btn-primary adm-btn-sm"
            >
              {isLast ? "Selesai" : "Lanjut"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Coachmark;
