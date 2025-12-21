import React, { useState } from "react";
import { Gift, Copy, Check, MapPin, CreditCard, Sparkles } from "lucide-react";
import { BANK_ACCOUNTS, WEDDING_CONFIG } from "../constants";
const GiftInfo: React.FC = () => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };
  return (
    <section
      id="gift"
      className="dark:bg-darkBg bg-white py-16 transition-colors duration-1000 md:py-40"
    >
      <div className="container mx-auto max-w-6xl px-4 md:px-6">
        <div className="mb-12 space-y-4 text-center md:mb-24 md:space-y-6">
          <div className="text-accentDark dark:text-accent mx-auto mb-6 flex h-12 w-12 items-center justify-center rounded-xl border border-slate-100 bg-slate-50 shadow-md md:mb-12 md:h-20 md:w-20 md:rounded-[2rem] dark:border-white/5 dark:bg-white/5">
            <Gift className="h-6 w-6 md:h-10 md:w-10" />
          </div>
          <h2 className="font-serif text-4xl tracking-tight text-slate-900 italic md:text-9xl dark:text-white">
            Kado Pernikahan
          </h2>
          <div className="bg-accent/30 mx-auto h-[1px] w-16"></div>
          <p className="mx-auto max-w-xl text-base leading-relaxed font-light text-balance text-slate-500 italic md:text-2xl dark:text-slate-400">
            Doa restu Anda adalah karunia terindah bagi kami. Jika bermaksud
            memberikan tanda kasih, dapat melalui:
          </p>
        </div>
        <div className="mb-10 grid grid-cols-1 gap-5 md:mb-20 md:grid-cols-2 md:gap-14">
          {BANK_ACCOUNTS.map((acc, idx) => (
            <div
              key={idx}
              className="editorial-card group relative space-y-6 overflow-hidden rounded-[1.5rem] border border-slate-100 p-8 shadow-sm transition-all hover:shadow-lg md:space-y-12 md:rounded-[4.5rem] md:p-20 dark:border-white/5"
            >
              <CreditCard className="text-accentDark/5 dark:text-accent/5 pointer-events-none absolute -top-10 -right-10 h-32 w-32 rotate-12 transition-transform duration-[3s] group-hover:scale-110 md:-top-16 md:-right-16 md:h-64 md:w-64" />
              <div className="relative z-10 space-y-6 text-center md:space-y-12 md:text-left">
                <div className="space-y-3 md:space-y-6">
                  <div className="flex items-center justify-center gap-2.5 md:justify-start">
                    <div className="bg-accent h-1.5 w-1.5 animate-pulse rounded-full"></div>
                    <p className="text-accentDark dark:text-accent tracking-luxury text-[9px] font-bold uppercase md:text-[12px]">
                      {acc.bank}
                    </p>
                  </div>
                  <p className="font-serif text-2xl leading-none tracking-tighter break-all text-slate-900 md:text-7xl dark:text-white">
                    {acc.number}
                  </p>
                  <p className="tracking-editorial text-[10px] font-medium text-slate-400 uppercase italic md:text-[14px] dark:text-slate-500">
                    A/N {acc.name}
                  </p>
                </div>
                <button
                  onClick={() => copyToClipboard(acc.number, `bank-${idx}`)}
                  className={`tracking-editorial inline-flex w-full items-center justify-center gap-2.5 rounded-full px-6 py-3.5 text-[9px] font-bold uppercase shadow-md transition-all md:w-auto md:gap-5 md:px-12 md:py-6 md:text-[12px] ${
                    copiedId === `bank-${idx}`
                      ? "bg-green-500 text-white"
                      : "bg-primary dark:text-primary text-white active:scale-95 dark:bg-white"
                  }`}
                >
                  {copiedId === `bank-${idx}` ? (
                    <Check className="h-3.5 w-3.5 md:h-5 md:w-5" />
                  ) : (
                    <Copy className="h-3.5 w-3.5 md:h-5 md:w-5" />
                  )}
                  {copiedId === `bank-${idx}` ? "Berhasil" : "Salin Nomor"}
                </button>
              </div>
            </div>
          ))}
        </div>
        <div className="editorial-card group relative flex flex-col items-center gap-6 overflow-hidden rounded-[1.5rem] border border-slate-100 p-6 text-center shadow-md transition-all duration-1000 md:flex-row md:gap-14 md:rounded-[5rem] md:p-20 md:text-left dark:border-white/5">
          <div className="from-accent/5 absolute inset-0 bg-gradient-to-r to-transparent opacity-0 transition-opacity group-hover:opacity-100"></div>
          <div className="text-accentDark dark:text-accent animate-float flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-full border border-slate-100 bg-slate-50 shadow-sm md:h-28 md:w-28 dark:border-white/10 dark:bg-white/5">
            <MapPin className="h-6 w-6 md:h-12 md:w-12" />
          </div>
          <div className="relative z-10 flex-grow space-y-1.5 md:space-y-4">
            <div className="text-accentDark dark:text-accent flex items-center justify-center gap-2.5 md:justify-start">
              <Sparkles className="h-3.5 w-3.5 md:h-5 md:w-5" />
              <h4 className="font-serif text-xl tracking-tight italic md:text-5xl">
                Kirim Kado Fisik
              </h4>
            </div>
            <p className="text-sm leading-relaxed font-light text-balance text-slate-500 italic md:text-2xl dark:text-slate-400">
              {WEDDING_CONFIG.venue.address}
            </p>
          </div>
          <button
            onClick={() =>
              copyToClipboard(WEDDING_CONFIG.venue.address, "address-gift")
            }
            className={`tracking-luxury relative z-10 inline-flex w-full items-center justify-center gap-3 rounded-xl px-8 py-3.5 text-[9px] font-bold uppercase shadow-md transition-all md:w-auto md:rounded-[2.5rem] md:px-14 md:py-6 md:text-[12px] ${
              copiedId === "address-gift"
                ? "bg-green-500 text-white"
                : "bg-primary dark:text-primary text-white active:scale-95 dark:bg-white"
            }`}
          >
            {copiedId === "address-gift" ? (
              <Check className="h-4 w-4 md:h-6 md:w-6" />
            ) : (
              <Copy className="h-4 w-4 md:h-6 md:w-6" />
            )}
            Salin Alamat
          </button>
        </div>
      </div>
    </section>
  );
};
export default GiftInfo;
