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
  const [setGuestName] = useState<string | null>(null);

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
    <section className="relative flex h-screen w-full items-center justify-center overflow-hidden">
      <div className="absolute inset-0 z-0">
        <img
          src="https://images.unsplash.com/photo-1511795409834-ef04bbd61622?q=80&w=2069&auto=format&fit=crop"
          className="animate-subtle-zoom h-full w-full object-cover"
          alt="Wedding Backdrop"
        />
        <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-[0.5px] dark:bg-slate-950/60"></div>
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950/40 via-transparent to-slate-950/80"></div>
      </div>

      <div className="z-10 container mx-auto flex flex-col items-center px-6 text-center">
        <div className="animate-reveal w-full space-y-4 [animation-delay:200ms] md:space-y-10">
          <div className="flex items-center justify-center gap-3 md:gap-4">
            <div className="h-[1px] w-6 bg-white/30 md:w-20"></div>
            <span className="tracking-luxury text-[8px] font-light text-white/80 uppercase md:text-[12px]">
              The Wedding Celebration
            </span>
            <div className="h-[1px] w-6 bg-white/30 md:w-20"></div>
          </div>

          <h1 className="font-serif text-5xl leading-tight tracking-tight break-words text-white italic sm:text-7xl md:text-[9rem] md:leading-none">
            {WEDDING_CONFIG.couple.bride.name}
            <span className="text-accent/30 mx-2 md:mx-6">&</span>
            {WEDDING_CONFIG.couple.groom.name}
          </h1>

          <div className="space-y-3 md:space-y-6">
            <p className="font-serif text-xl tracking-widest text-white italic opacity-90 sm:text-2xl md:text-5xl">
              {WEDDING_CONFIG.events.akad.date}
            </p>
            <div className="flex items-center justify-center gap-3 md:gap-4">
              <Sparkles className="text-accent/40 h-3 w-3 animate-pulse md:h-4 md:w-4" />
              <p className="text-accent/70 text-[9px] font-medium tracking-widest uppercase md:text-[13px]">
                Pandeglang, Banten
              </p>
              <Sparkles className="text-accent/40 h-3 w-3 animate-pulse md:h-4 md:w-4" />
            </div>
          </div>
        </div>

        <div className="animate-reveal frosted-glass mt-8 flex items-center justify-center gap-4 rounded-[1.5rem] border border-white/40 px-6 py-5 shadow-2xl [animation-delay:600ms] md:mt-16 md:gap-14 md:rounded-[2.2rem] md:px-10 md:py-8 dark:border-white/10">
          {Object.entries(timeLeft).map(([label, value]) => (
            <div
              key={label}
              className="flex min-w-[50px] flex-col items-center md:min-w-[80px]"
            >
              <span className="font-serif text-2xl leading-none font-bold tracking-tighter text-slate-900 md:text-6xl dark:text-white">
                {String(value).padStart(2, "0")}
              </span>
              <span className="text-accentDark/80 dark:text-accent/60 mt-1 text-[7px] font-black tracking-[0.2em] uppercase md:mt-3 md:text-[11px]">
                {label}
              </span>
            </div>
          ))}
        </div>

        <button
          onClick={handleScrollToContent}
          className="group mt-12 flex flex-col items-center gap-3 text-white/40 transition-all duration-500 hover:text-white md:mt-20 md:gap-4"
        >
          <div className="group-hover:border-accent group-hover:bg-accent/10 flex h-10 w-10 items-center justify-center rounded-full border border-white/20 shadow-lg backdrop-blur-sm transition-all md:h-12 md:w-12">
            <ChevronDown className="h-4 w-4 animate-bounce md:h-5 md:w-5" />
          </div>
          <span className="tracking-luxury text-[8px] font-bold uppercase opacity-50 group-hover:opacity-100 md:text-[9px]">
            Lihat Detail
          </span>
        </button>
      </div>
    </section>
  );
};

export default Hero;
