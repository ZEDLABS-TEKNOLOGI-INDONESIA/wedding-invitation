import { MailOpen, Sparkles } from "lucide-react";
import React, { useEffect, useState } from "react";
import type { AppConfig } from "../types";

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
    const timer = setTimeout(() => setIsAnimate(true), 150);
    return () => clearTimeout(timer);
  }, []);

  const handleOpenClick = () => {
    if (isExiting) return;
    setIsExiting(true);
    setTimeout(() => {
      onOpen();
    }, 650);
  };

  const backdropImage =
    config.hero.envelopeImage ||
    config.hero.image ||
    "https://images.unsplash.com/photo-1519741497674-611481863552?q=80&w=2070&auto=format&fit=crop";

  return (
    <div
      className={`bg-darkBg fixed inset-0 z-[2000] flex min-h-[100dvh] items-center justify-center overflow-y-auto px-5 py-8 transition-all duration-700 ease-out ${
        isExiting ? "pointer-events-none scale-105 opacity-0" : "opacity-100"
      }`}
    >
      {/* Harmonious tinted backdrop */}
      <div className="pointer-events-none fixed inset-0">
        <img
          src={backdropImage}
          className="animate-subtle-zoom h-full w-full object-cover opacity-35"
          alt="Wedding Backdrop"
        />
        <div className="from-darkBg/80 via-darkBg/55 to-darkBg/90 absolute inset-0 bg-gradient-to-b" />
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(circle at 50% 35%, color-mix(in srgb, var(--color-accent) 18%, transparent), transparent 62%)",
          }}
        />
      </div>

      {/* Subtle desktop frame */}
      <div className="pointer-events-none fixed inset-6 hidden rounded-3xl border border-white/10 md:block" />

      {/* Center invitation content */}
      <div
        className={`relative z-10 my-auto w-full max-w-md transform text-center transition-all duration-700 ${
          isAnimate ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
        }`}
      >
        <div className="space-y-6 sm:space-y-8">
          <div className="space-y-3">
            <div className="flex items-center justify-center gap-3">
              <span className="to-accent/60 h-[1px] w-10 bg-gradient-to-r from-transparent" />
              <span className="text-[11px] font-medium tracking-[0.32em] text-white/80 uppercase">
                The Wedding of
              </span>
              <span className="to-accent/60 h-[1px] w-10 bg-gradient-to-l from-transparent" />
            </div>

            <h1 className="font-script text-5xl leading-[1.15] text-white drop-shadow-[0_6px_24px_rgba(0,0,0,0.45)] sm:text-6xl">
              {config.couple.bride.name}
              <span className="text-accent mx-2.5 text-4xl sm:mx-3.5 sm:text-5xl">
                &amp;
              </span>
              {config.couple.groom.name}
            </h1>

            {config.events.akad.date && (
              <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-1 text-[11px] font-medium tracking-[0.2em] text-white/85 uppercase backdrop-blur-md">
                <Sparkles className="text-accent h-3 w-3" />
                {config.events.akad.date}
              </p>
            )}
          </div>

          {/* Clean translucent invitation card */}
          <div className="rounded-3xl border border-white/20 bg-white/[0.11] px-6 py-7 shadow-[0_24px_64px_rgba(0,0,0,0.45)] ring-1 ring-white/10 backdrop-blur-xl ring-inset sm:px-9 sm:py-8">
            <div className="space-y-3">
              <p className="text-accent text-[11px] font-semibold tracking-[0.24em] uppercase">
                Kepada Yth. Bapak/Ibu/Saudara/i
              </p>
              <h2 className="font-serif text-3xl font-medium tracking-tight break-words text-white italic sm:text-4xl">
                {guestName || "Tamu Undangan"}
              </h2>
              <div className="via-accent/45 mx-auto h-[1px] w-16 bg-gradient-to-r from-transparent to-transparent" />
              <p className="mx-auto max-w-xs text-xs leading-relaxed font-light text-white/75 sm:text-sm">
                Dengan memohon rahmat dan ridha Allah SWT, kami mengundang Anda
                untuk hadir di hari bahagia kami.
              </p>
            </div>
          </div>

          <div className="flex justify-center">
            <button
              type="button"
              onClick={handleOpenClick}
              className="group text-primary hover:bg-accent hover:text-darkBg inline-flex items-center gap-3 rounded-full bg-white px-8 py-3.5 text-xs font-bold tracking-[0.2em] uppercase shadow-[0_14px_38px_-10px_rgba(255,255,255,0.4)] transition-all duration-300 hover:scale-[1.03] active:scale-95"
            >
              <MailOpen className="h-4 w-4 transition-transform duration-300 group-hover:scale-110" />
              <span>Buka Undangan</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Envelope;
