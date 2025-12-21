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
      className={`fixed inset-0 z-[2000] flex items-center justify-center overflow-hidden bg-darkBg transition-all duration-1000 ease-in-out ${
        isExiting ? "opacity-0 scale-110 pointer-events-none" : "opacity-100"
      }`}
    >
      <div className="absolute inset-0 scale-110">
        <img
          src="https://images.unsplash.com/photo-1519741497674-611481863552?q=80&w=2070&auto=format&fit=crop"
          className="w-full h-full object-cover opacity-30 animate-subtle-zoom"
          alt="Wedding Backdrop"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-darkBg/80 via-darkBg/20 to-darkBg/90"></div>
        <div className="absolute inset-0 backdrop-blur-[2px]"></div>
      </div>
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[10%] left-[5%] w-32 h-32 bg-accent/5 rounded-full blur-3xl animate-pulse-soft"></div>
        <div className="absolute bottom-[10%] right-[5%] w-48 h-48 bg-accentDark/10 rounded-full blur-3xl animate-pulse-soft [animation-delay:2s]"></div>
      </div>
      <div
        className={`relative z-10 w-full max-w-2xl px-6 text-center transition-all duration-1000 transform ${
          isAnimate ? "translate-y-0 opacity-100" : "translate-y-20 opacity-0"
        }`}
      >
        <div className="space-y-12">
          <div className="space-y-6">
            <div className="flex items-center justify-center gap-4">
              <div className="h-[1px] w-12 md:w-24 bg-gradient-to-r from-transparent to-accent/40"></div>
              <Sparkles className="w-5 h-5 text-accent/60 animate-spin-slow" />
              <div className="h-[1px] w-12 md:w-24 bg-gradient-to-l from-transparent to-accent/40"></div>
            </div>
            <div className="space-y-2">
              <span className="text-white/40 tracking-[0.5em] text-[10px] md:text-[12px] uppercase font-light block">
                The Wedding of
              </span>
              <h1 className="text-white text-6xl md:text-9xl font-serif italic leading-none tracking-tighter">
                {WEDDING_CONFIG.couple.bride.name}
                <span className="text-accent/30 mx-4 md:mx-8 font-sans not-italic">
                  &
                </span>
                {WEDDING_CONFIG.couple.groom.name}
              </h1>
            </div>
          </div>
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-accent/20 to-accentDark/20 rounded-[3rem] blur opacity-30 group-hover:opacity-60 transition duration-1000"></div>
            <div className="relative frosted-glass p-10 md:p-16 rounded-[2.8rem] shadow-2xl border border-white/20 dark:border-white/10 space-y-8 overflow-hidden">
              <div className="absolute inset-0 opacity-[0.03] pointer-events-none mix-blend-overlay">
                <img
                  src="https://www.transparenttextures.com/patterns/paper-fibers.png"
                  className="w-full h-full object-cover"
                  alt="texture"
                />
              </div>
              <div className="space-y-3 relative z-10">
                <p className="text-[11px] md:text-[13px] uppercase tracking-[0.3em] font-bold text-accentDark dark:text-accent transition-colors duration-500">
                  Kepada Yth. Bapak/Ibu/Sdr/i:
                </p>
                <div className="h-[1px] w-16 bg-gradient-to-r from-transparent via-slate-400 dark:via-accent/30 to-transparent mx-auto opacity-50"></div>
              </div>
              <div className="py-2 relative z-10">
                <h2 className="text-4xl md:text-6xl font-serif italic tracking-tight break-words drop-shadow-sm text-slate-900 dark:text-white transition-colors duration-500">
                  {guestName || "Tamu Undangan"}
                </h2>
              </div>
              <div className="pt-2 relative z-10">
                <p className="text-[10px] md:text-[12px] italic font-light max-w-xs mx-auto leading-relaxed text-slate-600 dark:text-slate-400 transition-colors duration-500">
                  Kami mengundang Anda untuk merayakan kebahagiaan kami dalam
                  ikatan suci pernikahan.
                </p>
              </div>
            </div>
          </div>
          <div className="flex flex-col items-center gap-6">
            <button
              onClick={handleOpenClick}
              className="group relative inline-flex items-center gap-4 px-12 py-6 bg-white text-primary rounded-full font-bold uppercase tracking-[0.2em] text-[11px] md:text-[13px] hover:bg-accent hover:text-darkBg transition-all duration-700 shadow-[0_15px_40px_-10px_rgba(255,255,255,0.3)] active:scale-95 overflow-hidden"
            >
              <div className="relative z-10 flex items-center gap-3">
                <MailOpen className="w-5 h-5 group-hover:scale-110 transition-transform duration-500" />
                Buka Undangan
              </div>
              <div className="absolute inset-0 bg-accent translate-y-full group-hover:translate-y-0 transition-transform duration-500"></div>
            </button>
          </div>
        </div>
      </div>
      <div className="absolute inset-4 md:inset-8 border border-white/5 rounded-[2rem] md:rounded-[4rem] pointer-events-none"></div>
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
