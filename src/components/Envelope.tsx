import { MailOpen, Sparkles } from "lucide-react";
import React, { useEffect, useState } from "react";
import type { AppConfig } from "../types";
import { CornerFiligree } from "./WeddingOrnaments";

interface EnvelopeProps {
  onOpen: () => void;
  config: AppConfig;
}

const Envelope: React.FC<EnvelopeProps> = ({ onOpen, config }) => {
  const [guestName, setGuestName] = useState<string>("");
  const [isAnimate, setIsAnimate] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const to = params.get("to");
    if (to) setGuestName(to);
    const timer = setTimeout(() => setIsAnimate(true), 200);
    return () => clearTimeout(timer);
  }, []);

  const handleOpenClick = () => {
    if (isExiting) return;
    setIsExiting(true);
    setTimeout(() => {
      onOpen();
    }, 750);
  };

  const backdropImage =
    config.hero.envelopeImage ||
    config.hero.image ||
    "https://images.unsplash.com/photo-1519741497674-611481863552?q=80&w=2070&auto=format&fit=crop";

  return (
    <div
      className={`bg-darkBg fixed inset-0 z-[2000] flex items-center justify-center overflow-hidden px-5 py-8 transition-all duration-1000 ease-in-out ${
        isExiting ? "pointer-events-none scale-105 opacity-0" : "opacity-100"
      }`}
    >
      {/* Backdrop photo + subtle vignette */}
      <div className="absolute inset-0 scale-105">
        <img
          src={backdropImage}
          className="animate-subtle-zoom h-full w-full object-cover opacity-35"
          alt="Wedding Backdrop"
        />
        <div className="from-darkBg/85 via-darkBg/40 to-darkBg/95 absolute inset-0 bg-gradient-to-b" />
        <div className="absolute inset-0 backdrop-blur-[2px]" />
      </div>

      {/* Ambient theme glow */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="bg-accent/15 animate-pulse-soft absolute top-[8%] left-[8%] h-48 w-48 rounded-full blur-3xl" />
        <div className="bg-accentDark/20 animate-pulse-soft absolute right-[8%] bottom-[8%] h-56 w-56 rounded-full blur-3xl [animation-delay:2s]" />
      </div>

      {/* Outer luxury hairline frame */}
      <div className="pointer-events-none absolute inset-3 rounded-3xl border border-white/10 md:inset-7 md:rounded-[2rem]" />
      <div className="pointer-events-none absolute inset-5 rounded-2xl border border-white/5 md:inset-10 md:rounded-[1.5rem]" />

      {/* Center invitation card */}
      <div
        className={`relative z-10 w-full max-w-lg transform text-center transition-all duration-1000 ${
          isAnimate ? "translate-y-0 opacity-100" : "translate-y-10 opacity-0"
        }`}
      >
        <div className="space-y-7 md:space-y-9">
          {/* Header */}
          <div className="space-y-3">
            <div className="flex items-center justify-center gap-3">
              <span className="to-accent/60 h-[1px] w-10 bg-gradient-to-r from-transparent md:w-16" />
              <span className="text-[11px] font-medium tracking-[0.35em] text-white/75 uppercase">
                The Wedding of
              </span>
              <span className="to-accent/60 h-[1px] w-10 bg-gradient-to-l from-transparent md:w-16" />
            </div>

            <h1 className="font-script text-5xl leading-[1.15] text-white drop-shadow-[0_6px_24px_rgba(0,0,0,0.45)] sm:text-6xl md:text-7xl">
              {config.couple.bride.name}
              <span className="text-accent mx-3 text-4xl sm:text-5xl md:mx-4">
                &amp;
              </span>
              {config.couple.groom.name}
            </h1>

            {config.events.akad.date && (
              <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-1 text-[11px] font-medium tracking-[0.22em] text-white/85 uppercase backdrop-blur-md">
                <Sparkles className="text-accent h-3 w-3" />
                {config.events.akad.date}
              </p>
            )}
          </div>

          {/* Guest Invitation Card */}
          <div className="relative overflow-hidden rounded-3xl border border-white/20 bg-white/10 px-6 py-7 shadow-[0_24px_64px_rgba(0,0,0,0.45)] backdrop-blur-xl sm:px-10 sm:py-9">
            <CornerFiligree position="tl" className="!text-accent/50" />
            <CornerFiligree position="tr" className="!text-accent/50" />
            <CornerFiligree position="bl" className="!text-accent/50" />
            <CornerFiligree position="br" className="!text-accent/50" />

            <div className="relative z-10 space-y-3">
              <p className="text-accent text-[11px] font-semibold tracking-[0.25em] uppercase">
                Kepada Yth. Bapak/Ibu/Saudara/i
              </p>
              <h2 className="font-serif text-3xl font-medium tracking-tight break-words text-white italic sm:text-4xl">
                {guestName || "Tamu Undangan"}
              </h2>
              <div className="via-accent/40 mx-auto h-[1px] w-20 bg-gradient-to-r from-transparent to-transparent" />
              <p className="mx-auto max-w-xs text-xs leading-relaxed font-light text-white/75 sm:text-sm">
                Dengan memohon rahmat dan ridha Allah SWT, kami mengundang Anda
                untuk hadir di hari bahagia kami.
              </p>
            </div>
          </div>

          {/* CTA Button */}
          <div className="flex flex-col items-center">
            <button
              type="button"
              onClick={handleOpenClick}
              className="group text-primary hover:bg-accent hover:text-darkBg relative inline-flex items-center gap-3 overflow-hidden rounded-full bg-white px-9 py-4 text-xs font-bold tracking-[0.22em] uppercase shadow-[0_14px_40px_-8px_rgba(255,255,255,0.35)] transition-all duration-500 hover:scale-[1.03] active:scale-95"
            >
              <MailOpen className="relative z-10 h-4 w-4 transition-transform duration-500 group-hover:scale-110" />
              <span className="relative z-10">Buka Undangan</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Envelope;
