import { CheckCircle2, ClipboardList, MessageSquare, Palette } from "lucide-react";
import { useState } from "react";

type TabId = "undangan" | "manajemen" | "whatsapp";

const TABS: { id: TabId; label: string; badge: string }[] = [
  { id: "undangan", label: "Undangan & Tema", badge: "/u/slug" },
  { id: "manajemen", label: "Manajemen Nikah", badge: "6 Modul" },
  { id: "whatsapp", label: "WA Gateway & QR", badge: "Otomatis" },
];

export default function HeroPreviewIsland() {
  const [tab, setTab] = useState<TabId>("undangan");

  return (
    <div className="overflow-hidden rounded-xl border border-(--adm-code-border) bg-(--adm-code-bg) text-left shadow-(--adm-shadow-pop)">
      {/* Top chrome bar matching whatsapp-service HeroCodePreviewIsland */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-(--adm-code-border) bg-(--adm-code-surface) px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-[#f85149]/80" aria-hidden="true" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#d29922]/80" aria-hidden="true" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#3fb950]/80" aria-hidden="true" />
          <span className="ml-2 font-mono text-[11px] text-(--adm-code-muted)">
            wedding.zedlabs.id
          </span>
        </div>

        <div
          role="tablist"
          aria-label="Pratinjau kapabilitas Wedding Management"
          className="flex flex-wrap items-center gap-1"
        >
          {TABS.map((t) => {
            const aktif = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={aktif}
                onClick={() => setTab(t.id)}
                className={`inline-flex cursor-pointer items-center gap-1.5 rounded-md px-2.5 py-1 text-[11.5px] font-medium transition-colors ${
                  aktif
                    ? "bg-[#2f81f7]/20 text-[#58a6ff]"
                    : "text-(--adm-code-muted) hover:text-(--adm-code-text)"
                }`}
              >
                <span>{t.label}</span>
                <span className="hidden rounded bg-white/8 px-1.5 py-0.5 font-mono text-[10px] sm:inline">
                  {t.badge}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Content panel */}
      <div className="grid gap-4 p-4 sm:p-5 md:grid-cols-[minmax(0,1.25fr)_minmax(0,0.95fr)]">
        {tab === "undangan" && (
          <>
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-[#58a6ff]">
                <Palette className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Ruang Undangan Terisolasi per Pasangan</span>
              </div>
              <pre className="overflow-x-auto rounded-lg border border-(--adm-code-border) bg-(--adm-code-surface) p-3.5 font-mono text-[11.5px] leading-relaxed text-(--adm-code-text)">
                <code>{`URL Publik  : https://wedding.zedlabs.id/u/fera-yahya
Sapaan Tamu : ?to=Budi+Santoso (personal otomatis)
Tema Warna  : ocean | sage | blush | maroon | gold | lavender
Mode Tampil : Terang / Gelap + Animasi Latar Pilihan
Fitur Tamu  : Amplop, Peta, Galeri, Kisah Cinta, RSVP & Ucapan`}</code>
              </pre>
            </div>

            <div className="flex flex-col justify-between gap-3 rounded-lg border border-(--adm-code-border) bg-(--adm-code-surface) p-4">
              <div className="space-y-2">
                <p className="font-mono text-[11px] text-(--adm-code-muted)">
                  STATUS ISOLASI RUANG
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {["Ocean", "Sage", "Blush", "Maroon", "Gold", "Lavender"].map((tema) => (
                    <span
                      key={tema}
                      className="rounded-full border border-(--adm-code-border) bg-(--adm-code-bg) px-2 py-0.5 text-[11px] text-(--adm-code-text)"
                    >
                      {tema}
                    </span>
                  ))}
                </div>
              </div>
              <ul className="space-y-1.5 text-xs text-(--adm-code-muted)">
                <li className="flex items-center gap-2 text-[#3fb950]">
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  <span>2 akun login (Pemilik + 1 Pasangan)</span>
                </li>
                <li className="flex items-center gap-2 text-(--adm-code-text)">
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-[#58a6ff]" aria-hidden="true" />
                  <span>Tamu, RSVP &amp; ucapan terpisah ketat per wedding_id</span>
                </li>
              </ul>
            </div>
          </>
        )}

        {tab === "manajemen" && (
          <>
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-[#58a6ff]">
                <ClipboardList className="h-3.5 w-3.5" aria-hidden="true" />
                <span>6 Modul Persiapan Nikah Kolaboratif (Suami &amp; Istri)</span>
              </div>
              <pre className="overflow-x-auto rounded-lg border border-(--adm-code-border) bg-(--adm-code-surface) p-3.5 font-mono text-[11.5px] leading-relaxed text-(--adm-code-text)">
                <code>{`01. To-Do List     → Tahapan H-12 bulan s.d. Hari H
02. Anggaran       → POS biaya, DP, pelunasan & vendor
03. Tabungan Halal → Target setoran rutin & progres
04. Mahar & KUA    → Berkas PMA No. 30/2024, SIMKAH, Elsimil
05. Jurnal Menikah → Catatan bersama & refleksi persiapan
06. Fikih Nikah    → Rujukan ringkas fikih munakahat`}</code>
              </pre>
            </div>

            <div className="flex flex-col justify-between gap-3 rounded-lg border border-(--adm-code-border) bg-(--adm-code-surface) p-4">
              <div className="space-y-1.5">
                <p className="font-mono text-[11px] text-(--adm-code-muted)">
                  AKSES KOLABORASI BERDUA
                </p>
                <p className="text-xs leading-relaxed text-(--adm-code-text)">
                  Calon suami dan istri dapat login dengan akun masing-masing untuk memantau
                  progres anggaran, berkas KUA, hingga daftar tamu tanpa berbagi password.
                </p>
              </div>
              <div className="rounded-md border border-(--adm-code-border) bg-(--adm-code-bg) px-3 py-2 font-mono text-[11px] text-[#3fb950]">
                ✓ Referensi PMA No. 30 Tahun 2024 siap dicentang
              </div>
            </div>
          </>
        )}

        {tab === "whatsapp" && (
          <>
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-[#58a6ff]">
                <MessageSquare className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Integrasi WhatsApp Gateway + PDF 4 Halaman + QR Check-In</span>
              </div>
              <pre className="overflow-x-auto rounded-lg border border-(--adm-code-border) bg-(--adm-code-surface) p-3.5 font-mono text-[11.5px] leading-relaxed text-(--adm-code-text)">
                <code>{`Koneksi WA  : QR Code / Pairing Code (sesi per pasangan)
Kirim Massal: Impor CSV → Teks personal + PDF A5 + Kartu QR
Notifikasi  : RSVP & ucapan masuk real-time ke mempelai
Pengingat   : Jadwal pengingat H-1 otomatis ke tamu hadir
Hari H      : Scanner kamera QR langsung di /checkin`}</code>
              </pre>
            </div>

            <div className="flex flex-col justify-between gap-3 rounded-lg border border-(--adm-code-border) bg-(--adm-code-surface) p-4">
              <div className="space-y-1.5">
                <p className="font-mono text-[11px] text-(--adm-code-muted)">
                  KEAMANAN &amp; KUOTA TRANSPARAN
                </p>
                <p className="text-xs leading-relaxed text-(--adm-code-text)">
                  Terhubung ke WhatsApp Gateway ZEDLABS (HMAC-SHA256 v2). Gratis penuh hingga 200
                  tamu; tambahan hanya Rp200/tamu (min. Rp50.000).
                </p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <span className="rounded-full bg-[#238636]/25 px-2.5 py-0.5 font-mono text-[11px] text-[#3fb950]">
                  PDF A5 4 Hal
                </span>
                <span className="rounded-full bg-[#2f81f7]/20 px-2.5 py-0.5 font-mono text-[11px] text-[#58a6ff]">
                  QR Check-In
                </span>
                <span className="rounded-full bg-white/10 px-2.5 py-0.5 font-mono text-[11px] text-(--adm-code-text)">
                  OTP 6 Digit
                </span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
