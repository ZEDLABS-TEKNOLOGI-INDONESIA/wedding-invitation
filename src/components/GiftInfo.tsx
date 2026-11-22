import React, { useState } from "react";
import { Gift, Copy, Check, MapPin } from "lucide-react";
import type { AppConfig } from "../types";
import { BotanicalWatermark, SectionDivider } from "./WeddingOrnaments";

const GiftInfo: React.FC<{ config: AppConfig }> = ({ config }) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const giftAddress = config.gift.address.trim() || config.venue.address;

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <section
      id="gift"
      className="relative overflow-hidden py-20 transition-colors duration-700 md:py-28"
    >
      <BotanicalWatermark side="left" />
      <div className="container mx-auto max-w-5xl px-5 md:px-6">
        <div className="mb-14 space-y-3 text-center md:mb-18">
          <div className="bg-accentDark/10 text-accentDark dark:bg-accent/15 dark:text-accent mx-auto flex h-12 w-12 items-center justify-center rounded-2xl">
            <Gift className="h-5 w-5" />
          </div>
          <h2 className="font-serif text-4xl font-medium tracking-tight text-primary italic sm:text-5xl md:text-6xl dark:text-white">
            {config.text.gift.title}
          </h2>
          <SectionDivider className="py-1" />
          <p className="mx-auto max-w-xl text-sm leading-relaxed font-light text-balance text-slate-600 italic sm:text-base dark:text-slate-300">
            {config.text.gift.desc}
          </p>
        </div>

        {/* Bank Account Cards */}
        <div className="mb-8 grid grid-cols-1 gap-5 md:mb-10 md:grid-cols-2 md:gap-6">
          {config.bankAccounts.map((acc, idx) => (
            <div
              key={idx}
              className="editorial-card group relative overflow-hidden rounded-3xl p-7 ring-1 ring-accentDark/8 ring-inset sm:p-8 dark:ring-accent/10"
            >

              <div className="relative z-10 flex h-full flex-col justify-between gap-6">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="bg-accentDark dark:bg-accent h-2 w-2 rounded-full" />
                    <p className="text-accentDark dark:text-accent text-xs font-bold tracking-[0.22em] uppercase">
                      {acc.bank}
                    </p>
                  </div>
                  <p className="font-serif text-2xl font-semibold tracking-wide break-all text-primary sm:text-3xl dark:text-white">
                    {acc.number}
                  </p>
                  <p className="text-xs font-medium tracking-wider text-slate-500 uppercase dark:text-slate-400">
                    a.n. {acc.name}
                  </p>
                </div>

                <div>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(acc.number, `bank-${idx}`)}
                    className={`inline-flex w-full items-center justify-center gap-2 rounded-full px-5 py-3 text-xs font-bold tracking-[0.16em] uppercase shadow-xs transition-all sm:w-auto ${
                      copiedId === `bank-${idx}`
                        ? "bg-emerald-600 text-white"
                        : "bg-primary dark:bg-accentDark text-white hover:opacity-95 active:scale-[0.98]"
                    }`}
                  >
                    {copiedId === `bank-${idx}` ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                    {copiedId === `bank-${idx}` ? "Disalin!" : "Salin Rekening"}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Physical Gift Address */}
        {giftAddress && (
          <div className="editorial-card flex flex-col items-center justify-between gap-5 rounded-3xl p-6 text-center md:flex-row md:p-8 md:text-left">
            <div className="flex flex-col items-center gap-4 md:flex-row">
              <div className="bg-accentDark/10 text-accentDark dark:bg-accent/15 dark:text-accent flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl">
                <MapPin className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <span className="text-accentDark dark:text-accent text-[10px] font-bold tracking-[0.24em] uppercase">
                  Pengiriman Kado Fisik
                </span>
                <p className="max-w-xl text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                  {giftAddress}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => copyToClipboard(giftAddress, "address-gift")}
              className={`inline-flex w-full shrink-0 items-center justify-center gap-2 rounded-full px-6 py-3 text-xs font-bold tracking-[0.16em] uppercase shadow-xs transition-all md:w-auto ${
                copiedId === "address-gift"
                  ? "bg-emerald-600 text-white"
                  : "border-accentDark/25 hover:bg-accentDark/5 dark:border-accent/25 dark:hover:bg-accent/10 border text-slate-700 dark:text-slate-200"
              }`}
            >
              {copiedId === "address-gift" ? (
                <Check className="h-4 w-4" />
              ) : (
                <Copy className="text-accentDark dark:text-accent h-4 w-4" />
              )}
              {copiedId === "address-gift" ? "Disalin!" : "Salin Alamat"}
            </button>
          </div>
        )}
      </div>
    </section>
  );
};

export default GiftInfo;
