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
        body: "Gunakan menu di sisi kiri untuk berpindah fitur. Menu Pengaturan kini terbagi menjadi 6 sub-menu ringkas. Tekan '/' atau Ctrl+K untuk pencarian cepat.",
      },
      {
        selector: "[data-tour='stat-cards']",
        title: "Ringkasan Kehadiran Real-Time",
        body: "Pantau total respon, tamu hadir beserta estimasi pax, tamu ragu/belum konfirmasi (termasuk dari broadcast WhatsApp), dan yang berhalangan.",
      },
      {
        selector: "[data-tour='page-actions']",
        title: "Tambah Manual & Impor/Ekspor CSV",
        body: "Tambah data RSVP secara manual, impor dari CSV/Excel, atau unduh laporan daftar kehadiran tamu kapan saja.",
      },
      {
        selector: "[data-tour='topbar-controls']",
        title: "Tema, Panduan & Pratinjau",
        body: "Ganti mode terang/gelap, putar ulang panduan halaman ini, atau buka pratinjau halaman undangan langsung dari bilah atas.",
      },
    ],
  },
  wishes: {
    key: "wishes",
    name: "Ucapan & Doa",
    steps: [
      {
        selector: "[data-tour='page-actions']",
        title: "Kelola Ucapan & Doa Restu",
        body: "Tambahkan ucapan secara manual, impor daftar ucapan dari CSV/Excel, atau ekspor seluruh doa tamu ke berkas CSV.",
      },
      {
        selector: "[data-tour='data-table']",
        title: "Moderasi & Pencarian Cepat",
        body: "Cari ucapan tertentu, sunting teks (tombol hijau), atau hapus satuan maupun massal (tombol merah).",
      },
    ],
  },
  guests: {
    key: "guests",
    name: "Buku Tamu & Check-In Hari H",
    steps: [
      {
        selector: "[data-tour='guest-subtabs']",
        title: "Daftar Tamu & Scanner Check-In Hari H",
        body: "Kelola daftar tamu permanen beserta kode QR uniknya, lalu pindah ke Scanner Check-In (kamera lintas browser & pencarian nama parsial) saat hari acara.",
      },
      {
        selector: "[data-tour='guest-add-form']",
        title: "Input Tamu & Impor Excel",
        body: "Tambahkan tamu satuan dengan preset grup dan kuota pax, atau klik 'Impor CSV / Excel' untuk ratusan tamu sekaligus. Tamu dari broadcast WhatsApp juga otomatis masuk ke sini.",
      },
    ],
  },
  planner: {
    key: "planner",
    name: "Manajemen Pernikahan",
    steps: [
      {
        selector: "[data-tour='planner-nav']",
        title: "6 Modul Persiapan Pernikahan Terpadu",
        body: "Berpindah cepat antara To-Do Persiapan, Anggaran & Vendor, Tabungan Menuju Halal, Mahar/Seserahan & Berkas KUA (PMA 30/2024), Jurnal Menikah, dan Tuntunan Fikih Munakahat.",
      },
      {
        selector: "[data-tour='planner-summary']",
        title: "Ringkasan Progres & Finansial Real-Time",
        body: "Pantau persentase penyelesaian tugas, estimasi vs harga deal vendor, saldo Dompet Nikah, dan perkiraan setoran bulanan menuju hari akad.",
      },
      {
        selector: "[data-tour='planner-form']",
        title: "Templat 1-Klik & Kelola Data Lengkap",
        body: "Gunakan tombol Muat Templat untuk mengisi daftar persiapan, anggaran, mahar, dan berkas KUA secara otomatis tanpa duplikasi, lalu sunting atau hapus kapan saja.",
      },
    ],
  },
  wa: {
    key: "wa",
    name: "Kirim WhatsApp",
    steps: [
      {
        selector: "[data-tour='wa-mode-switch']",
        title: "Teks Undangan + Lampiran PDF & QR Tamu",
        body: "Kirim satuan atau massal: setiap tamu menerima 1 pesan teks undangan, 1 berkas Surat Undangan PDF 4 halaman, dan 1 gambar Kartu QR untuk Check-In Hari H. Kontak broadcast otomatis masuk ke Daftar Tamu & Data RSVP (status Ragu).",
      },
      {
        selector: "[data-tour='wa-history']",
        title: "Pantau Status Pengiriman",
        body: "Cek status pesan (Antre, Terkirim, Sampai, Dibaca, Gagal) dan kirim ulang bila ada pengiriman yang gagal.",
      },
    ],
  },
  qr: {
    key: "qr",
    name: "QR Generator",
    steps: [
      {
        selector: "[data-tour='qr-mode-switch']",
        title: "Kartu QR Elegan Satuan & Massal ZIP",
        body: "Pilih dari 4 motif desain megah, 5 format/ukuran kartu QR, dan 5 nuansa warna — unduh satuan PNG atau ratusan sekaligus dalam berkas ZIP.",
      },
    ],
  },
  pdf: {
    key: "pdf",
    name: "Design PDF",
    steps: [
      {
        selector: "[data-tour='pdf-themes']",
        title: "Desain, Ukuran Kertas & Nuansa Warna",
        body: "Pilih 4 motif desain megah, 5 ukuran kertas (A5, A4, A6, B5, Persegi), dan 5 nuansa warna. Pilihan Anda otomatis tersinkron ke lampiran PDF & QR di menu Kirim WhatsApp.",
      },
    ],
  },
  settings: {
    key: "settings",
    name: "Pengaturan Undangan",
    steps: [
      {
        selector: "[data-tour='sidebar-nav']",
        title: "6 Sub-Menu Pengaturan Terstruktur",
        body: "Gunakan sub-menu Pengaturan di sidebar untuk berpindah cepat antara Tema & Tampilan, Profil Mempelai, Jadwal & Lokasi, Media & Audio, Konten & Hadiah, serta WhatsApp & Pengingat H-1.",
      },
      {
        selector: "[data-tour='settings-sticky-bar']",
        title: "Simpan & Cadangkan Pengaturan",
        body: "Bilah ini tetap menempel saat halaman digulir. Simpan perubahan, atau ekspor/impor seluruh pengaturan melalui berkas CSV kapan saja.",
      },
    ],
  },
  sa_weddings: {
    key: "sa_weddings",
    name: "Superadmin — Pasangan & Undangan",
    steps: [
      {
        selector: "[data-tour='sa-sidebar-nav']",
        title: "Navigasi Panel Superadmin",
        body: "Gunakan sidebar di kiri untuk berpindah antara daftar tenant pasangan, verifikasi tagihan, gateway WhatsApp platform, dan profil akun. Sidebar bisa diciutkan melalui tombol panah di pojok kiri bawah, dan tekan '/' atau Ctrl+K untuk cari menu cepat.",
      },
      {
        selector: "[data-tour='sa-stat-cards']",
        title: "Ringkasan Platform Real-Time",
        body: "Pantau total undangan terdaftar, undangan aktif, jumlah bukti transfer yang perlu diperiksa, serta total RSVP lintas seluruh pasangan.",
      },
      {
        selector: "[data-tour='sa-weddings-table']",
        title: "Kelola Tenant & Impersonate",
        body: "Klik Kelola untuk masuk ke dashboard pasangan tertentu, Tangguhkan untuk menonaktifkan akses undangan, atau buka URL publik masing-masing pasangan.",
      },
      {
        selector: "[data-tour='sa-topbar-controls']",
        title: "Panduan, Tema & Profil",
        body: "Putar ulang panduan halaman ini kapan saja, ganti tema terang/gelap, buka demo publik, atau klik profil Anda untuk mengubah foto avatar.",
      },
    ],
  },
  sa_billing: {
    key: "sa_billing",
    name: "Superadmin — Tagihan & Pembayaran",
    steps: [
      {
        selector: "[data-tour='sa-billing-filter']",
        title: "Filter Status Tagihan",
        body: "Saring tagihan berdasarkan status: Perlu diperiksa (bukti sudah diunggah), Belum dibayar, Lunas, Ditolak, atau Semua.",
      },
      {
        selector: "[data-tour='sa-billing-table']",
        title: "Review Bukti Transfer & Invoicing WA",
        body: "Klik Review Bukti untuk melihat foto nota bayar ukuran penuh, lalu Setujui (kuota langsung aktif + invoice lunas terkirim via WhatsApp) atau Tolak beserta alasannya.",
      },
      {
        selector: "[data-tour='sa-billing-settings']",
        title: "Rekening Tujuan Permanen di Database",
        body: "Atur hingga 3 rekening bank/e-wallet tujuan dan nomor WhatsApp penerima notifikasi pembayaran. Data tersimpan permanen di database dan aman saat pembaruan aplikasi.",
      },
    ],
  },
  sa_platform_wa: {
    key: "sa_platform_wa",
    name: "Superadmin — WhatsApp Gateway Platform",
    steps: [
      {
        selector: "[data-tour='sa-wa-card']",
        title: "Gateway OTP & Notifikasi Invoicing",
        body: "Masukkan kredensial API Key dan HMAC Secret dari whatsapp.zedlabs.id, lalu klik Sinkron 5 Template Platform agar OTP pendaftaran, reset password, dan notifikasi pembayaran terkirim otomatis.",
      },
    ],
  },
  sa_account: {
    key: "sa_account",
    name: "Superadmin — Akun & Profil",
    steps: [
      {
        selector: "[data-tour='sa-account-form']",
        title: "Foto Profil & Nomor WhatsApp Admin",
        body: "Unggah foto profil Anda, perbarui username atau password, dan pastikan nomor WhatsApp diisi agar Anda menerima notifikasi otomatis setiap ada pembayaran baru.",
      },
    ],
  },
};

const STORAGE_KEY = "wedding_admin_coachmark_done_v2";

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
