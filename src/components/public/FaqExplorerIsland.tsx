import { ChevronDown, Search } from "lucide-react";
import { useMemo, useState } from "react";

export type FaqKategoriId =
  | "semua"
  | "umum"
  | "kuota"
  | "undangan"
  | "manajemen"
  | "whatsapp"
  | "akun";

export interface ItemFaq {
  pertanyaan: string;
  jawaban: string;
  kategori: Exclude<FaqKategoriId, "semua">;
}

const KATEGORI: { id: FaqKategoriId; label: string }[] = [
  { id: "semua", label: "Semua" },
  { id: "umum", label: "Umum & Isolasi" },
  { id: "kuota", label: "Kuota & Biaya" },
  { id: "undangan", label: "Undangan & Tema" },
  { id: "manajemen", label: "Manajemen Nikah" },
  { id: "whatsapp", label: "WhatsApp & QR" },
  { id: "akun", label: "Akun & Keamanan" },
];

const LABEL_KATEGORI: Record<Exclude<FaqKategoriId, "semua">, string> = {
  umum: "Umum & Isolasi",
  kuota: "Kuota & Biaya",
  undangan: "Undangan & Tema",
  manajemen: "Manajemen Nikah",
  whatsapp: "WhatsApp & QR",
  akun: "Akun & Keamanan",
};

interface Props {
  items: ItemFaq[];
}

export default function FaqExplorerIsland({ items }: Props) {
  const [kategori, setKategori] = useState<FaqKategoriId>("semua");
  const [cari, setCari] = useState("");

  const hitungPerKategori = useMemo(() => {
    const counts: Record<FaqKategoriId, number> = {
      semua: items.length,
      umum: 0,
      kuota: 0,
      undangan: 0,
      manajemen: 0,
      whatsapp: 0,
      akun: 0,
    };
    for (const item of items) {
      counts[item.kategori] += 1;
    }
    return counts;
  }, [items]);

  const hasil = useMemo(() => {
    const q = cari.trim().toLowerCase();
    return items.filter((item) => {
      if (kategori !== "semua" && item.kategori !== kategori) return false;
      if (!q) return true;
      return (
        item.pertanyaan.toLowerCase().includes(q) ||
        item.jawaban.toLowerCase().includes(q)
      );
    });
  }, [items, kategori, cari]);

  const adaFilter = kategori !== "semua" || cari.trim() !== "";

  return (
    <div className="space-y-6">
      <div className="adm-card space-y-4 p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative min-w-0 flex-1">
            <label htmlFor="faq-cari" className="sr-only">
              Cari pertanyaan atau topik FAQ
            </label>
            <Search
              className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-(--adm-text-muted)"
              aria-hidden="true"
            />
            <input
              id="faq-cari"
              type="search"
              value={cari}
              onChange={(e) => setCari(e.target.value)}
              placeholder="Cari topik, mis. kuota, OTP, pasangan, PDF, KUA, QR check-in..."
              className="adm-input pl-9"
            />
          </div>
          <p
            className="shrink-0 text-xs text-(--adm-text-secondary) tabular-nums"
            aria-live="polite"
          >
            Menampilkan <strong className="text-(--adm-text-primary)">{hasil.length}</strong> dari{" "}
            {items.length} pertanyaan
          </p>
        </div>

        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter kategori FAQ">
          {KATEGORI.map((k) => {
            const aktif = kategori === k.id;
            return (
              <button
                key={k.id}
                type="button"
                aria-pressed={aktif}
                onClick={() => setKategori(k.id)}
                className={`inline-flex min-h-8 cursor-pointer items-center gap-1.5 rounded-md border px-3 py-1 text-xs font-medium transition-colors ${
                  aktif
                    ? "border-(--adm-accent) bg-(--adm-accent-soft) text-(--adm-accent)"
                    : "border-(--adm-border) bg-(--adm-bg-secondary) text-(--adm-text-secondary) hover:border-(--adm-text-muted) hover:text-(--adm-text-primary)"
                }`}
              >
                <span>{k.label}</span>
                <span className="text-[11px] opacity-80 tabular-nums">
                  ({hitungPerKategori[k.id]})
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {hasil.length === 0 ? (
        <div className="adm-card space-y-3 p-8 text-center">
          <p className="text-sm font-semibold text-(--adm-text-primary)">
            Tidak ada pertanyaan yang cocok
          </p>
          <p className="text-xs text-(--adm-text-secondary)">
            Coba kata kunci lain atau tampilkan semua kategori.
          </p>
          {adaFilter && (
            <button
              type="button"
              onClick={() => {
                setKategori("semua");
                setCari("");
              }}
              className="adm-btn adm-btn-secondary adm-btn-sm"
            >
              Reset pencarian &amp; filter
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2.5">
          {hasil.map((item, idx) => (
            <details key={`${item.kategori}-${idx}`} className="group adm-card p-4">
              <summary className="flex cursor-pointer list-none items-start justify-between gap-3 text-sm font-medium text-(--adm-text-primary)">
                <span className="flex min-w-0 flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-2.5">
                  <span className="leading-snug">{item.pertanyaan}</span>
                  {kategori === "semua" && (
                    <span className="adm-badge shrink-0 self-start text-[11px] sm:self-auto">
                      {LABEL_KATEGORI[item.kategori]}
                    </span>
                  )}
                </span>
                <ChevronDown
                  className="mt-0.5 h-4 w-4 shrink-0 text-(--adm-text-secondary) transition-transform duration-200 group-open:rotate-180"
                  aria-hidden="true"
                />
              </summary>
              <p className="mt-3 border-t border-(--adm-border) pt-3 text-sm leading-relaxed whitespace-pre-line text-(--adm-text-secondary)">
                {item.jawaban}
              </p>
            </details>
          ))}
        </div>
      )}
    </div>
  );
}
