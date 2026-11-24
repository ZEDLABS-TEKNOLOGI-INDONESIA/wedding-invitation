import { Check, Copy } from "lucide-react";
import { useState } from "react";

type TabId = "tautan" | "csv" | "whatsapp" | "checkin";

interface TabItem {
  id: TabId;
  label: string;
  file: string;
  content: string;
}

const TABS: TabItem[] = [
  {
    id: "tautan",
    label: "Tautan Personal",
    file: "undangan-url.txt",
    content: `# Format alamat undangan terisolasi per pasangan
https://wedding.zedlabs.id/u/nama-pasangan

# Sapaan nama tamu personal di sampul amplop & kartu QR
https://wedding.zedlabs.id/u/nama-pasangan?to=Nama+Tamu

# Pilihan tema publik (mendukung mode terang & gelap)
ocean | sage | blush | maroon | gold | lavender`,
  },
  {
    id: "csv",
    label: "Impor CSV",
    file: "daftar-tamu.csv",
    content: `name,phone,group
Keluarga Mempelai Pria,0812xxxxxxxx,Keluarga
Rekan Kerja Divisi Operasional,0813xxxxxxxx,Kantor
Sahabat Kuliah,0852xxxxxxxx,Teman

# Mendukung pemisah koma (,), titik koma (;) Excel ID, dan tempel langsung dari spreadsheet
# Kuota gratis hingga 200 kontak tamu per ruang undangan`,
  },
  {
    id: "whatsapp",
    label: "Kirim WhatsApp",
    file: "pesan-undangan.txt",
    content: `Assalamu'alaikum Wr. Wb.
Yth. {{nama_tamu}},

Dengan memohon rahmat dan ridho Allah SWT, kami mengundang Bapak/Ibu/Saudara/i
untuk menghadiri acara pernikahan {{mempelai}}.

Tautan undangan : https://wedding.zedlabs.id/u/nama-pasangan?to={{nama_tamu}}
Lampiran opsional: Undangan PDF A5 (4 halaman) + Kartu QR Check-In`,
  },
  {
    id: "checkin",
    label: "QR Check-In",
    file: "rekap-hadir.json",
    content: `{
  "route_scanner": "/checkin",
  "metode": "Scan kamera QR tamu atau pencarian manual",
  "status_tamu": "checked_in",
  "sinkronisasi": "Real-time ke panel admin & pasangan",
  "ekspor": ["daftar-tamu.csv", "rekap-rsvp.csv", "buku-ucapan.csv"]
}`,
  },
];

export default function HeroPreviewIsland() {
  const [aktif, setAktif] = useState<TabId>("tautan");
  const [tersalin, setTersalin] = useState(false);

  const tab = TABS.find((t) => t.id === aktif) ?? TABS[0];

  const salin = async () => {
    try {
      await navigator.clipboard.writeText(tab.content);
      setTersalin(true);
      setTimeout(() => setTersalin(false), 1800);
    } catch {
      // Abaikan bila clipboard tidak tersedia di browser.
    }
  };

  return (
    <div className="overflow-hidden rounded-xl border border-(--adm-code-border) bg-(--adm-code-bg) text-left text-(--adm-code-text) shadow-(--adm-shadow-pop)">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-(--adm-code-border) bg-(--adm-code-surface) px-3.5 py-2">
        <div
          role="tablist"
          aria-label="Contoh format operasional Wedding Management"
          className="flex flex-wrap items-center gap-1"
        >
          {TABS.map((item) => {
            const terpilih = item.id === aktif;
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={terpilih}
                onClick={() => {
                  setAktif(item.id);
                  setTersalin(false);
                }}
                className={`cursor-pointer rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors ${
                  terpilih
                    ? "border-(--adm-code-border) bg-(--adm-code-bg) text-(--adm-code-text)"
                    : "border-transparent text-(--adm-code-muted) hover:text-(--adm-code-text)"
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <span className="hidden font-mono text-[11px] text-(--adm-code-muted) sm:inline">
            {tab.file}
          </span>
          <button
            type="button"
            onClick={() => void salin()}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-(--adm-code-border) bg-(--adm-code-bg) px-2.5 py-1 text-[11px] font-medium text-(--adm-code-text) transition-colors hover:border-(--adm-accent)"
            aria-label={`Salin contoh ${tab.label}`}
          >
            {tersalin ? (
              <Check className="h-3.5 w-3.5" aria-hidden="true" />
            ) : (
              <Copy className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            <span>{tersalin ? "Tersalin" : "Salin"}</span>
          </button>
        </div>
      </div>

      <pre
        role="tabpanel"
        tabIndex={0}
        className="m-0 overflow-x-auto p-4 font-mono text-[12.5px] leading-relaxed text-(--adm-code-text) sm:p-5"
      >
        <code>{tab.content}</code>
      </pre>
    </div>
  );
}
