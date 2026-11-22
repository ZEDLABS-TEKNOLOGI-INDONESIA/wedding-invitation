import React, { useState, useEffect } from "react";
import { ChevronDown, Sparkles } from "lucide-react";
import type { AppConfig } from "../types";

const calculateTimeLeft = (targetDate: Date) => {
  const distance = targetDate.getTime() - Date.now();
  if (Number.isNaN(distance) || distance <= 0) {
    return {
      isPast: true,
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
    };
  }
  return {
    isPast: false,
    days: Math.floor(distance / (1000 * 60 * 60 * 24)),
    hours: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
    minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
    seconds: Math.floor((distance % (1000 * 60)) / 1000),
  };
};

const Hero: React.FC<{ config: AppConfig }> = ({ config }) => {
  const [countdown, setCountdown] = useState(() =>
    calculateTimeLeft(config.events.akad.startDateTime)
  );
  const [guestName, setGuestName] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setGuestName(params.get("to"));

    const initial = calculateTimeLeft(config.events.akad.startDateTime);
    setCountdown(initial);
    if (initial.isPast) return;

    const timer = setInterval(() => {
      const next = calculateTimeLeft(config.events.akad.startDateTime);
      setCountdown(next);
      if (next.isPast) {
        clearInterval(timer);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [config.events.akad.startDateTime]);

  const handleScrollToContent = () => {
    document.getElementById("couple")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section
      id="hero"
      className="relative flex h-screen w-full items-center justify-center overflow-hidden"
    >
      <div className="absolute inset-0 z-0">
        <img
          src={config.hero.image}
          className="animate-subtle-zoom h-full w-full object-cover"
          alt="Latar Belakang Undangan Pernikahan"
        />
        <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-[0.5px] dark:bg-slate-950/60"></div>
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950/40 via-transparent to-slate-950/80"></div>
      </div>

      <div className="z-10 container mx-auto flex flex-col items-center px-6 text-center">
        <div className="animate-reveal w-full space-y-4 [animation-delay:200ms] md:space-y-10">
          <div className="flex items-center justify-center gap-3 md:gap-4">
            <div className="h-[1px] w-6 bg-white/30 md:w-20"></div>
            <span className="tracking-luxury text-[11px] font-light text-white/85 uppercase md:text-xs">
              Undangan Pernikahan
            </span>
            <div className="h-[1px] w-6 bg-white/30 md:w-20"></div>
          </div>

          <h1 className="font-serif text-5xl leading-tight tracking-tight break-words text-white italic sm:text-7xl md:text-[9rem] md:leading-none">
            {config.couple.bride.name}
            <span className="text-accent/30 mx-2 md:mx-6">&</span>
            {config.couple.groom.name}
          </h1>

          {guestName && (
            <p className="animate-reveal mt-4 font-serif text-xl text-white/90 italic">
              Kepada Yth. {guestName}
            </p>
          )}

          <div className="space-y-3 md:space-y-6">
            <p className="font-serif text-xl tracking-widest text-white italic opacity-90 sm:text-2xl md:text-5xl">
              {config.events.akad.date}
            </p>
            <div className="flex items-center justify-center gap-3 md:gap-4">
              <Sparkles className="text-accent/50 h-3.5 w-3.5 animate-pulse md:h-4 md:w-4" />
              <p className="text-accent/85 text-xs font-medium tracking-widest uppercase md:text-sm">
                {config.hero.city}
              </p>
              <Sparkles className="text-accent/50 h-3.5 w-3.5 animate-pulse md:h-4 md:w-4" />
            </div>
          </div>
        </div>

        <div
          suppressHydrationWarning
          className="animate-reveal frosted-glass mt-8 flex items-center justify-center gap-4 rounded-[1.5rem] border border-white/40 px-6 py-5 shadow-2xl [animation-delay:600ms] md:mt-16 md:gap-14 md:rounded-[2.2rem] md:px-10 md:py-8 dark:border-white/10"
        >
          {countdown.isPast ? (
            <p className="font-serif text-lg tracking-wide text-slate-900 italic md:text-3xl dark:text-white">
              Hari Bahagia Telah Tiba
            </p>
          ) : (
            (
              [
                ["Hari", countdown.days],
                ["Jam", countdown.hours],
                ["Menit", countdown.minutes],
                ["Detik", countdown.seconds],
              ] as const
            ).map(([label, value]) => (
              <div
                key={label}
                className="flex min-w-[52px] flex-col items-center md:min-w-[80px]"
              >
                <span
                  suppressHydrationWarning
                  className="font-serif text-2xl leading-none font-bold tracking-tighter text-slate-900 md:text-6xl dark:text-white"
                >
                  {String(value).padStart(2, "0")}
                </span>
                <span className="text-accentDark dark:text-accent mt-1.5 text-[11px] font-black tracking-[0.2em] uppercase md:mt-3 md:text-xs">
                  {label}
                </span>
              </div>
            ))
          )}
        </div>

        <button
          type="button"
          onClick={handleScrollToContent}
          aria-label="Gulir ke detail undangan"
          className="group mt-10 flex flex-col items-center gap-3 text-white/60 transition-all duration-500 hover:text-white md:mt-16 md:gap-4"
        >
          <div className="group-hover:border-accent group-hover:bg-accent/10 flex h-10 w-10 items-center justify-center rounded-full border border-white/30 shadow-lg backdrop-blur-sm transition-all md:h-12 md:w-12">
            <ChevronDown className="h-4 w-4 animate-bounce md:h-5 md:w-5" />
          </div>
          <span className="tracking-luxury text-[11px] font-bold uppercase opacity-75 group-hover:opacity-100">
            Lihat Detail
          </span>
        </button>
      </div>
    </section>
  );
};

export default Hero;
