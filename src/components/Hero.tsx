import React, { useState, useEffect } from "react";
import { ChevronDown, Sparkles } from "lucide-react";
import { WEDDING_CONFIG } from "../constants";
const Hero: React.FC = () => {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });
  const [guestName, setGuestName] = useState<string | null>(null);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setGuestName(params.get("to"));
    const timer = setInterval(() => {
      const distance =
        WEDDING_CONFIG.events.akad.startDateTime.getTime() -
        new Date().getTime();
      if (distance > 0) {
        setTimeLeft({
          days: Math.floor(distance / (1000 * 60 * 60 * 24)),
          hours: Math.floor(
            (distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
          ),
          minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((distance % (1000 * 60)) / 1000),
        });
      }
    }, 1000);
    return () => clearInterval(timer);
  }, []);
  const handleScrollToContent = () => {
    document.getElementById("couple")?.scrollIntoView({ behavior: "smooth" });
  };
  return (
    <section className="relative h-screen w-full flex items-center justify-center overflow-hidden">
      <div className="absolute inset-0 z-0">
        <img
          src="https://images.unsplash.com/photo-1511795409834-ef04bbd61622?q=80&w=2069&auto=format&fit=crop"
          className="w-full h-full object-cover animate-subtle-zoom"
          alt="Wedding Backdrop"
        />
        <div className="absolute inset-0 bg-slate-950/40 dark:bg-slate-950/60 backdrop-blur-[0.5px]"></div>
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950/40 via-transparent to-slate-950/80"></div>
      </div>
      <div className="z-10 container mx-auto px-6 flex flex-col items-center text-center">
        <div className="animate-reveal [animation-delay:200ms] space-y-4 md:space-y-10 w-full">
          <div className="flex items-center justify-center gap-3 md:gap-4">
            <div className="h-[1px] w-6 md:w-20 bg-white/30"></div>
            <span className="text-white/80 tracking-luxury text-[8px] md:text-[12px] uppercase font-light">
              The Wedding Celebration
            </span>
            <div className="h-[1px] w-6 md:w-20 bg-white/30"></div>
          </div>
          <h1 className="text-white text-5xl sm:text-7xl md:text-[9rem] font-serif italic leading-tight md:leading-none tracking-tight break-words">
            {WEDDING_CONFIG.couple.bride.name}
            <span className="text-accent/30 mx-2 md:mx-6">&</span>
            {WEDDING_CONFIG.couple.groom.name}
          </h1>
          <div className="space-y-3 md:space-y-6">
            <p className="text-white font-serif italic text-xl sm:text-2xl md:text-5xl tracking-widest opacity-90">
              {WEDDING_CONFIG.events.akad.date}
            </p>
            <div className="flex items-center justify-center gap-3 md:gap-4">
              <Sparkles className="w-3 h-3 md:w-4 md:h-4 text-accent/40 animate-pulse" />
              <p className="text-accent/70 text-[9px] md:text-[13px] uppercase tracking-widest font-medium">
                Pandeglang, Banten
              </p>
              <Sparkles className="w-3 h-3 md:w-4 md:h-4 text-accent/40 animate-pulse" />
            </div>
          </div>
        </div>
        <div className="mt-8 md:mt-16 animate-reveal [animation-delay:600ms] flex items-center justify-center gap-4 md:gap-14 frosted-glass px-6 md:px-10 py-5 md:py-8 rounded-[1.5rem] md:rounded-[2.2rem] shadow-2xl border border-white/40 dark:border-white/10">
          {Object.entries(timeLeft).map(([label, value]) => (
            <div
              key={label}
              className="flex flex-col items-center min-w-[50px] md:min-w-[80px]"
            >
              <span className="text-2xl md:text-6xl font-serif font-bold text-slate-900 dark:text-white leading-none tracking-tighter">
                {String(value).padStart(2, "0")}
              </span>
              <span className="text-[7px] md:text-[11px] uppercase tracking-[0.2em] text-accentDark/80 dark:text-accent/60 font-black mt-1 md:mt-3">
                {label}
              </span>
            </div>
          ))}
        </div>
        <button
          onClick={handleScrollToContent}
          className="mt-12 md:mt-20 group flex flex-col items-center gap-3 md:gap-4 text-white/40 hover:text-white transition-all duration-500"
        >
          <div className="w-10 h-10 md:w-12 md:h-12 rounded-full border border-white/20 flex items-center justify-center group-hover:border-accent group-hover:bg-accent/10 transition-all shadow-lg backdrop-blur-sm">
            <ChevronDown className="w-4 h-4 md:w-5 md:h-5 animate-bounce" />
          </div>
          <span className="text-[8px] md:text-[9px] uppercase tracking-luxury font-bold opacity-50 group-hover:opacity-100">
            Lihat Detail
          </span>
        </button>
      </div>
    </section>
  );
};
export default Hero;
