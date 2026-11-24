import {
  Check,
  Copy,
  CreditCard,
  ExternalLink,
  MessageSquare,
  Send,
  Users,
  Wrench,
} from "lucide-react";
import { useRef, useState, type SyntheticEvent } from "react";

export interface TopikBantuan {
  id: string;
  judul: string;
  isi: string;
}

export interface SumberBantuan {
  href: string;
  judul: string;
  isi: string;
}

interface Props {
  topik: TopikBantuan[];
  sumber: SumberBantuan[];
  kontakWhatsapp: string;
  kontakWhatsappDisplay: string;
}

function IkonTopik({ id }: { id: string }) {
  if (id === "akun") return <Users className="h-5 w-5" aria-hidden="true" />;
  if (id === "kuota") return <CreditCard className="h-5 w-5" aria-hidden="true" />;
  if (id === "teknis") return <Wrench className="h-5 w-5" aria-hidden="true" />;
  return <MessageSquare className="h-5 w-5" aria-hidden="true" />;
}

export default function BantuanIsland({
  topik,
  sumber,
  kontakWhatsapp,
  kontakWhatsappDisplay,
}: Props) {
  const [topikAktif, setTopikAktif] = useState(topik[0]?.judul ?? "");
  const [nama, setNama] = useState("");
  const [slug, setSlug] = useState("");
  const [pesan, setPesan] = useState("");
  const [galat, setGalat] = useState("");
  const [tersalin, setTersalin] = useState(false);

  const namaRef = useRef<HTMLInputElement | null>(null);

  const pilihTopik = (judul: string) => {
    setTopikAktif(judul);
    setGalat("");
    namaRef.current?.focus();
  };

  const susunTeks = () => {
    const baris = [
      `Halo tim Wedding Management ZEDLABS,`,
      `Topik: ${topikAktif}`,
      `Nama: ${nama.trim()}`,
      slug.trim() ? `Slug Undangan: /u/${slug.trim().replace(/^\/?u\//, "")}` : null,
      ``,
      pesan.trim(),
    ].filter((v): v is string => v !== null);
    return baris.join("\n");
  };

  const validasi = () => {
    if (nama.trim().length < 2) {
      setGalat("Isi nama lengkap Anda terlebih dahulu.");
      namaRef.current?.focus();
      return false;
    }
    if (pesan.trim().length < 5) {
      setGalat("Tuliskan kendala atau pertanyaan Anda (minimal 5 karakter).");
      return false;
    }
    setGalat("");
    return true;
  };

  const kirimKeWhatsapp = (e: SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!validasi()) return;
    const teks = susunTeks();
    if (kontakWhatsapp) {
      window.open(
        `https://wa.me/${kontakWhatsapp}?text=${encodeURIComponent(teks)}`,
        "_blank",
        "noopener,noreferrer",
      );
      return;
    }
    void salinPesan();
  };

  const salinPesan = async () => {
    if (!validasi()) return;
    try {
      await navigator.clipboard.writeText(susunTeks());
      setTersalin(true);
      setTimeout(() => setTersalin(false), 2500);
    } catch {
      setGalat("Gagal menyalin pesan ke papan klip.");
    }
  };

  return (
    <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[1fr_420px]">
      <div>
        <h2 className="text-lg font-semibold text-(--adm-text-primary)">Pilih topik bantuan</h2>
        <div
          className="mt-4 grid gap-3 sm:grid-cols-2"
          role="radiogroup"
          aria-label="Topik bantuan"
        >
          {topik.map((t) => {
            const terpilih = topikAktif === t.judul;
            return (
              <button
                key={t.id}
                type="button"
                role="radio"
                aria-checked={terpilih}
                onClick={() => pilihTopik(t.judul)}
                className={`flex cursor-pointer flex-col items-start gap-1.5 rounded-xl border bg-(--adm-bg-secondary) p-4 text-left text-(--adm-accent) transition-colors ${
                  terpilih
                    ? "border-(--adm-accent) ring-2 ring-(--adm-accent-soft)"
                    : "border-(--adm-border) hover:border-(--adm-accent)"
                }`}
              >
                <IkonTopik id={t.id} />
                <span className="text-sm font-semibold text-(--adm-text-primary)">{t.judul}</span>
                <span className="text-xs leading-relaxed text-(--adm-text-secondary)">
                  {t.isi}
                </span>
              </button>
            );
          })}
        </div>

        <h2 className="mt-10 text-lg font-semibold text-(--adm-text-primary)">Sumber bantuan</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {sumber.map((s) => (
            <a
              key={s.href}
              href={s.href}
              className="rounded-xl border border-(--adm-border) bg-(--adm-bg-secondary) p-4 transition-colors hover:border-(--adm-accent)"
            >
              <span className="text-sm font-semibold text-(--adm-text-primary)">{s.judul}</span>
              <span className="mt-1 block text-xs leading-relaxed text-(--adm-text-secondary)">
                {s.isi}
              </span>
            </a>
          ))}
        </div>

        <div className="adm-card mt-6 grid gap-4 p-5 sm:grid-cols-2">
          <div>
            <p className="text-xs text-(--adm-text-secondary)">Pengelola Layanan</p>
            <p className="mt-0.5 text-sm font-semibold text-(--adm-text-primary)">
              ZEDLABS Teknologi Indonesia
            </p>
          </div>
          <div>
            <p className="text-xs text-(--adm-text-secondary)">Website Resmi</p>
            <a
              href="https://zedlabs.id"
              target="_blank"
              rel="noopener noreferrer"
              className="adm-link mt-0.5 inline-flex items-center gap-1 text-sm font-medium"
            >
              https://zedlabs.id
              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            </a>
          </div>
        </div>
      </div>

      <div className="adm-card self-start">
        <div className="adm-card-header">
          <h2 className="adm-card-title">Susun pesan ke tim dukungan</h2>
        </div>

        <form onSubmit={kirimKeWhatsapp} className="adm-card-body space-y-4" noValidate>
          {galat && (
            <div className="adm-alert adm-alert-danger" role="alert">
              {galat}
            </div>
          )}

          <div>
            <label htmlFor="bantuan-nama" className="adm-label">
              Nama lengkap *
            </label>
            <input
              ref={namaRef}
              id="bantuan-nama"
              value={nama}
              onChange={(e) => {
                setNama(e.target.value);
                if (galat) setGalat("");
              }}
              placeholder="Nama Anda atau pasangan"
              className="adm-input"
              maxLength={100}
              required
            />
          </div>

          <div>
            <label htmlFor="bantuan-slug" className="adm-label">
              URL Undangan / Slug (opsional)
            </label>
            <input
              id="bantuan-slug"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="contoh: fera-yahya"
              className="adm-input"
              maxLength={80}
            />
            <p className="adm-hint mt-1">
              Sertakan slug atau username agar tim kami lebih cepat mengecek akun Anda.
            </p>
          </div>

          <div>
            <label htmlFor="bantuan-topik" className="adm-label">
              Topik
            </label>
            <select
              id="bantuan-topik"
              value={topikAktif}
              onChange={(e) => setTopikAktif(e.target.value)}
              className="adm-input"
            >
              {topik.map((t) => (
                <option key={t.id} value={t.judul}>
                  {t.judul}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="bantuan-pesan" className="adm-label">
              Pesan / kendala *
            </label>
            <textarea
              id="bantuan-pesan"
              value={pesan}
              onChange={(e) => {
                setPesan(e.target.value);
                if (galat) setGalat("");
              }}
              rows={4}
              maxLength={1500}
              required
              placeholder="Ceritakan kendala, nomor invoice, atau pertanyaan Anda..."
              className="adm-input min-h-[96px] resize-y py-2"
            />
          </div>

          <div className="flex flex-col gap-2">
            {kontakWhatsapp ? (
              <button type="submit" className="adm-btn adm-btn-primary adm-btn-block">
                <Send className="h-3.5 w-3.5" aria-hidden="true" />
                Lanjutkan ke WhatsApp ({kontakWhatsappDisplay})
              </button>
            ) : (
              <button type="submit" className="adm-btn adm-btn-primary adm-btn-block">
                {tersalin ? (
                  <>
                    <Check className="h-3.5 w-3.5" aria-hidden="true" />
                    Format Pesan Tersalin
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                    Salin Format Pesan Bantuan
                  </>
                )}
              </button>
            )}

            {kontakWhatsapp && (
              <button
                type="button"
                onClick={() => void salinPesan()}
                className="adm-btn adm-btn-secondary adm-btn-block"
              >
                {tersalin ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-(--adm-green)" aria-hidden="true" />
                    Pesan tersalin ke papan klip
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                    Salin teks pesan
                  </>
                )}
              </button>
            )}
          </div>

          <p className="adm-hint">
            {kontakWhatsapp
              ? "Tombol di atas akan membuka WhatsApp dengan format topik dan detail kendala Anda yang sudah terisi otomatis."
              : "Salin pesan bantuan Anda dan kirimkan melalui kanal resmi ZEDLABS Teknologi Indonesia."}
          </p>
        </form>
      </div>
    </div>
  );
}
