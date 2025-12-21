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
      className="py-16 md:py-40 bg-white dark:bg-darkBg transition-colors duration-1000"
    >
      <div className="container mx-auto px-4 md:px-6 max-w-6xl">
        <div className="text-center mb-12 md:mb-24 space-y-4 md:space-y-6">
          <div className="w-12 h-12 md:w-20 md:h-20 bg-slate-50 dark:bg-white/5 text-accentDark dark:text-accent rounded-xl md:rounded-[2rem] flex items-center justify-center mx-auto mb-6 md:mb-12 border border-slate-100 dark:border-white/5 shadow-md">
            <Gift className="w-6 h-6 md:w-10 md:h-10" />
          </div>
          <h2 className="text-4xl md:text-9xl font-serif italic text-slate-900 dark:text-white tracking-tight">
            Kado Pernikahan
          </h2>
          <div className="w-16 h-[1px] bg-accent/30 mx-auto"></div>
          <p className="text-slate-500 dark:text-slate-400 max-w-xl mx-auto leading-relaxed italic text-balance font-light text-base md:text-2xl">
            Doa restu Anda adalah karunia terindah bagi kami. Jika bermaksud
            memberikan tanda kasih, dapat melalui:
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-14 mb-10 md:mb-20">
          {BANK_ACCOUNTS.map((acc, idx) => (
            <div
              key={idx}
              className="editorial-card p-8 md:p-20 rounded-[1.5rem] md:rounded-[4.5rem] border border-slate-100 dark:border-white/5 space-y-6 md:space-y-12 relative overflow-hidden group shadow-sm hover:shadow-lg transition-all"
            >
              <CreditCard className="absolute -top-10 -right-10 md:-top-16 md:-right-16 w-32 h-32 md:w-64 md:h-64 text-accentDark/5 dark:text-accent/5 rotate-12 group-hover:scale-110 transition-transform duration-[3s] pointer-events-none" />
              <div className="relative z-10 space-y-6 md:space-y-12 text-center md:text-left">
                <div className="space-y-3 md:space-y-6">
                  <div className="flex items-center justify-center md:justify-start gap-2.5">
                    <div className="w-1.5 h-1.5 bg-accent rounded-full animate-pulse"></div>
                    <p className="text-[9px] md:text-[12px] font-bold text-accentDark dark:text-accent uppercase tracking-luxury">
                      {acc.bank}
                    </p>
                  </div>
                  <p className="text-2xl md:text-7xl font-serif text-slate-900 dark:text-white tracking-tighter leading-none break-all">
                    {acc.number}
                  </p>
                  <p className="text-slate-400 dark:text-slate-500 font-medium tracking-editorial text-[10px] md:text-[14px] uppercase italic">
                    A/N {acc.name}
                  </p>
                </div>
                <button
                  onClick={() => copyToClipboard(acc.number, `bank-${idx}`)}
                  className={`inline-flex items-center gap-2.5 md:gap-5 px-6 py-3.5 md:px-12 md:py-6 rounded-full transition-all text-[9px] md:text-[12px] font-bold uppercase tracking-editorial shadow-md w-full md:w-auto justify-center ${
                    copiedId === `bank-${idx}`
                      ? "bg-green-500 text-white"
                      : "bg-primary dark:bg-white text-white dark:text-primary active:scale-95"
                  }`}
                >
                  {copiedId === `bank-${idx}` ? (
                    <Check className="w-3.5 h-3.5 md:w-5 md:h-5" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 md:w-5 md:h-5" />
                  )}
                  {copiedId === `bank-${idx}` ? "Berhasil" : "Salin Nomor"}
                </button>
              </div>
            </div>
          ))}
        </div>
        <div className="editorial-card p-6 md:p-20 rounded-[1.5rem] md:rounded-[5rem] flex flex-col md:flex-row items-center gap-6 md:gap-14 text-center md:text-left transition-all group duration-1000 relative overflow-hidden border border-slate-100 dark:border-white/5 shadow-md">
          <div className="absolute inset-0 bg-gradient-to-r from-accent/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <div className="w-16 h-16 md:w-28 md:h-28 bg-slate-50 dark:bg-white/5 text-accentDark dark:text-accent rounded-full flex items-center justify-center flex-shrink-0 animate-float border border-slate-100 dark:border-white/10 shadow-sm">
            <MapPin className="w-6 h-6 md:w-12 md:h-12" />
          </div>
          <div className="flex-grow space-y-1.5 md:space-y-4 relative z-10">
            <div className="flex items-center justify-center md:justify-start gap-2.5 text-accentDark dark:text-accent">
              <Sparkles className="w-3.5 h-3.5 md:w-5 md:h-5" />
              <h4 className="font-serif italic text-xl md:text-5xl tracking-tight">
                Kirim Kado Fisik
              </h4>
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-sm md:text-2xl font-light leading-relaxed italic text-balance">
              {WEDDING_CONFIG.venue.address}
            </p>
          </div>
          <button
            onClick={() =>
              copyToClipboard(WEDDING_CONFIG.venue.address, "address-gift")
            }
            className={`inline-flex items-center gap-3 px-8 py-3.5 md:px-14 md:py-6 rounded-xl md:rounded-[2.5rem] transition-all font-bold text-[9px] md:text-[12px] uppercase tracking-luxury shadow-md w-full md:w-auto justify-center relative z-10 ${
              copiedId === "address-gift"
                ? "bg-green-500 text-white"
                : "bg-primary dark:bg-white text-white dark:text-primary active:scale-95"
            }`}
          >
            {copiedId === "address-gift" ? (
              <Check className="w-4 h-4 md:w-6 md:h-6" />
            ) : (
              <Copy className="w-4 h-4 md:w-6 md:h-6" />
            )}
            Salin Alamat
          </button>
        </div>
      </div>
    </section>
  );
};
export default GiftInfo;
