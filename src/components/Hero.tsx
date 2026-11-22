import React, { useState, useEffect } from "react";
import { ChevronDown, MapPin } from "lucide-react";
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
      className="relative flex min-h-[100dvh] w-full items-center justify-center overflow-hidden px-5 py-20"
    >
      {/* Background image with harmonious vignette + seamless bottom dissolve into page canvas */}
      <div className="absolute inset-0 z-0">
        <img
          src={config.hero.image}
          className="animate-subtle-zoom h-full w-full object-cover"
          alt="Latar Belakang Undangan Pernikahan"
        />
        <div className="bg-darkBg/40 absolute inset-0 dark:bg-darkBg/50" />
        <div className="from-darkBg/55 via-darkBg/15 to-transparent absolute inset-0 bg-gradient-to-b" />
        {/* Seamless eased dissolve into page background */}
        <div className="hero-bottom-fade pointer-events-none absolute right-0 bottom-0 left-0 h-60 md:h-80" />
      </div>

      <div className="relative z-10 mx-auto flex w-full max-w-3xl flex-col items-center pb-10 text-center">
        <div className="animate-reveal w-full space-y-4 sm:space-y-6">
          <div className="flex items-center justify-center gap-3">
            <span className="h-[1px] w-8 bg-white/40 md:w-14" />
            <span className="text-[11px] font-medium tracking-[0.34em] text-white/85 uppercase">
              Undangan Pernikahan
            </span>
            <span className="h-[1px] w-8 bg-white/40 md:w-14" />
          </div>

          <h1 className="font-script text-6xl leading-[1.12] break-words text-white drop-shadow-[0_10px_28px_rgba(0,0,0,0.45)] sm:text-7xl md:text-8xl">
            {config.couple.bride.name}
            <span className="text-accent mx-3 text-4xl sm:text-6xl md:mx-4">
              &amp;
            </span>
            {config.couple.groom.name}
          </h1>

          {guestName && (
            <div className="inline-flex max-w-full flex-wrap items-center justify-center gap-x-2.5 gap-y-1 rounded-full border border-white/20 bg-white/10 px-5 py-2 shadow-[0_8px_24px_rgba(0,0,0,0.2)] backdrop-blur-md">
              <span className="font-serif text-sm leading-none tracking-[0.06em] text-white/80 italic sm:text-[15px]">
                Kepada Yth.
              </span>
              <span
                aria-hidden="true"
                className="bg-accent/70 h-3 w-[1px] shrink-0"
              />
              <span className="font-serif text-sm leading-none font-semibold tracking-[0.04em] text-white sm:text-[15px]">
                {guestName}
              </span>
            </div>
          )}

          <div className="space-y-1.5 pt-1">
            <p className="font-serif text-2xl tracking-[0.14em] text-white italic sm:text-3xl md:text-4xl">
              {config.events.akad.date}
            </p>
            {config.hero.city && (
              <p className="text-accent inline-flex items-center justify-center gap-1.5 text-xs font-medium tracking-[0.22em] uppercase">
                <MapPin className="h-3.5 w-3.5" />
                {config.hero.city}
              </p>
            )}
          </div>
        </div>

        {/* Unified Translucent Countdown */}
        <div
          suppressHydrationWarning
          className="animate-reveal mt-8 w-full max-w-md rounded-2xl border border-white/20 bg-white/12 px-4 py-4 shadow-[0_20px_48px_rgba(0,0,0,0.3)] backdrop-blur-xl [animation-delay:300ms] sm:max-w-lg sm:px-6 sm:py-5"
        >
          {countdown.isPast ? (
            <p className="font-serif text-xl tracking-wide text-white italic sm:text-2xl">
              Hari Bahagia Telah Tiba
            </p>
          ) : (
            <div className="grid grid-cols-4 divide-x divide-white/20">
              {(
                [
                  ["Hari", countdown.days],
                  ["Jam", countdown.hours],
                  ["Menit", countdown.minutes],
                  ["Detik", countdown.seconds],
                ] as const
              ).map(([label, value]) => (
                <div key={label} className="flex flex-col items-center px-1">
                  <span
                    suppressHydrationWarning
                    className="font-serif text-3xl leading-none font-semibold tracking-tight text-white tabular-nums sm:text-4xl md:text-5xl"
                  >
                    {String(value).padStart(2, "0")}
                  </span>
                  <span className="text-accent mt-1.5 text-[10px] font-semibold tracking-[0.18em] uppercase sm:text-[11px]">
                    {label}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={handleScrollToContent}
          aria-label="Gulir ke detail undangan"
          className="group mt-9 flex flex-col items-center gap-2.5 text-white/80 transition-all duration-500 hover:text-white focus:outline-none"
        >
          <span className="text-[10px] font-medium tracking-[0.32em] uppercase opacity-80 transition-opacity duration-500 group-hover:opacity-100">
            Gulir ke Bawah
          </span>
          <span className="from-white/50 via-accent/60 to-transparent h-6 w-[1px] bg-gradient-to-b transition-all duration-500 group-hover:h-8" />
          <div className="group-hover:border-accent/80 group-hover:bg-accent/20 relative flex h-10 w-10 items-center justify-center rounded-full border border-white/30 bg-white/10 shadow-[0_8px_24px_rgba(0,0,0,0.2)] backdrop-blur-md transition-all duration-500 group-hover:scale-105">
            <span className="pointer-events-none absolute -inset-1.5 rounded-full border border-white/15 transition-all duration-500 group-hover:scale-110 group-hover:border-accent/40" />
            <ChevronDown className="h-4 w-4 transition-transform duration-500 group-hover:translate-y-0.5" />
          </div>
        </button>
      </div>
    </section>
  );
};

export default Hero;
