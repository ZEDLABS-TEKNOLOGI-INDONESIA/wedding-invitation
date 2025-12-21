import React, { useState, useEffect } from "react";
import { MailOpen, Sparkles } from "lucide-react";
import { WEDDING_CONFIG } from "../constants";
interface EnvelopeProps {
  onOpen: () => void;
}
const Envelope: React.FC<EnvelopeProps> = ({ onOpen }) => {
  const [guestName, setGuestName] = useState<string>("");
  const [isAnimate, setIsAnimate] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const to = params.get("to");
    if (to) setGuestName(to);
    setTimeout(() => setIsAnimate(true), 300);
  }, []);
  const handleOpenClick = () => {
    setIsExiting(true);
    setTimeout(() => {
      onOpen();
    }, 800);
  };
  return (
    <div
      className={`bg-darkBg fixed inset-0 z-[2000] flex items-center justify-center overflow-hidden transition-all duration-1000 ease-in-out ${
        isExiting ? "pointer-events-none scale-110 opacity-0" : "opacity-100"
      }`}
    >
      <div className="absolute inset-0 scale-110">
        <img
          src="https://images.unsplash.com/photo-1519741497674-611481863552?q=80&w=2070&auto=format&fit=crop"
          className="animate-subtle-zoom h-full w-full object-cover opacity-30"
          alt="Wedding Backdrop"
        />
        <div className="from-darkBg/80 via-darkBg/20 to-darkBg/90 absolute inset-0 bg-gradient-to-b"></div>
        <div className="absolute inset-0 backdrop-blur-[2px]"></div>
      </div>
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="bg-accent/5 animate-pulse-soft absolute top-[10%] left-[5%] h-32 w-32 rounded-full blur-3xl"></div>
        <div className="bg-accentDark/10 animate-pulse-soft absolute right-[5%] bottom-[10%] h-48 w-48 rounded-full blur-3xl [animation-delay:2s]"></div>
      </div>
      <div
        className={`relative z-10 w-full max-w-2xl transform px-6 text-center transition-all duration-1000 ${
          isAnimate ? "translate-y-0 opacity-100" : "translate-y-20 opacity-0"
        }`}
      >
        <div className="space-y-12">
          <div className="space-y-6">
            <div className="flex items-center justify-center gap-4">
              <div className="to-accent/40 h-[1px] w-12 bg-gradient-to-r from-transparent md:w-24"></div>
              <Sparkles className="text-accent/60 animate-spin-slow h-5 w-5" />
              <div className="to-accent/40 h-[1px] w-12 bg-gradient-to-l from-transparent md:w-24"></div>
            </div>
            <div className="space-y-2">
              <span className="block text-[10px] font-light tracking-[0.5em] text-white/40 uppercase md:text-[12px]">
                The Wedding of
              </span>
              <h1 className="font-serif text-6xl leading-none tracking-tighter text-white italic md:text-9xl">
                {WEDDING_CONFIG.couple.bride.name}
                <span className="text-accent/30 mx-4 font-sans not-italic md:mx-8">
                  &
                </span>
                {WEDDING_CONFIG.couple.groom.name}
              </h1>
            </div>
          </div>
          <div className="group relative">
            <div className="from-accent/20 to-accentDark/20 absolute -inset-1 rounded-[3rem] bg-gradient-to-r opacity-30 blur transition duration-1000 group-hover:opacity-60"></div>
            <div className="frosted-glass relative space-y-8 overflow-hidden rounded-[2.8rem] border border-white/20 p-10 shadow-2xl md:p-16 dark:border-white/10">
              <div className="pointer-events-none absolute inset-0 opacity-[0.03] mix-blend-overlay">
                <img
                  src="https://www.transparenttextures.com/patterns/paper-fibers.png"
                  className="h-full w-full object-cover"
                  alt="texture"
                />
              </div>
              <div className="relative z-10 space-y-3">
                <p className="text-accentDark dark:text-accent text-[11px] font-bold tracking-[0.3em] uppercase transition-colors duration-500 md:text-[13px]">
                  Kepada Yth. Bapak/Ibu/Sdr/i:
                </p>
                <div className="dark:via-accent/30 mx-auto h-[1px] w-16 bg-gradient-to-r from-transparent via-slate-400 to-transparent opacity-50"></div>
              </div>
              <div className="relative z-10 py-2">
                <h2 className="font-serif text-4xl tracking-tight break-words text-slate-900 italic drop-shadow-sm transition-colors duration-500 md:text-6xl dark:text-white">
                  {guestName || "Tamu Undangan"}
                </h2>
              </div>
              <div className="relative z-10 pt-2">
                <p className="mx-auto max-w-xs text-[10px] leading-relaxed font-light text-slate-600 italic transition-colors duration-500 md:text-[12px] dark:text-slate-400">
                  Kami mengundang Anda untuk merayakan kebahagiaan kami dalam
                  ikatan suci pernikahan.
                </p>
              </div>
            </div>
          </div>
          <div className="flex flex-col items-center gap-6">
            <button
              onClick={handleOpenClick}
              className="group text-primary hover:bg-accent hover:text-darkBg relative inline-flex items-center gap-4 overflow-hidden rounded-full bg-white px-12 py-6 text-[11px] font-bold tracking-[0.2em] uppercase shadow-[0_15px_40px_-10px_rgba(255,255,255,0.3)] transition-all duration-700 active:scale-95 md:text-[13px]"
            >
              <div className="relative z-10 flex items-center gap-3">
                <MailOpen className="h-5 w-5 transition-transform duration-500 group-hover:scale-110" />
                Buka Undangan
              </div>
              <div className="bg-accent absolute inset-0 translate-y-full transition-transform duration-500 group-hover:translate-y-0"></div>
            </button>
          </div>
        </div>
      </div>
      <div className="pointer-events-none absolute inset-4 rounded-[2rem] border border-white/5 md:inset-8 md:rounded-[4rem]"></div>
      <style>{`
        .animate-spin-slow {
          animation: spin 8s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};
export default Envelope;
