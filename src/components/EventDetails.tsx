import {
  Calendar,
  CalendarPlus,
  Check,
  ChevronDown,
  Clock,
  Copy,
  ExternalLink,
  Heart,
  MapPin,
  Sparkles,
} from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import type { AppConfig } from "../types";
import { downloadICS, generateGoogleCalendarUrl } from "../utils/calendarUtils";
import { BotanicalWatermark, SectionDivider } from "./WeddingOrnaments";

const EventDetails: React.FC<{ config: AppConfig }> = ({ config }) => {
  const [copied, setCopied] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<
    "akad" | "resepsi" | null
  >(null);
  const dropdownContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!activeDropdown) return;
    const handlePointerDown = (e: MouseEvent) => {
      if (
        dropdownContainerRef.current &&
        !dropdownContainerRef.current.contains(e.target as Node)
      ) {
        setActiveDropdown(null);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setActiveDropdown(null);
    };
    document.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [activeDropdown]);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(config.venue.address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const mapUrl = `https://maps.google.com/maps?q=${config.venue.latitude},${config.venue.longitude}&t=&z=15&ie=UTF8&iwloc=&output=embed`;

  const handleCalendar = (
    type: "google" | "ics",
    eventType: "akad" | "resepsi"
  ) => {
    const ev = config.events[eventType];
    const event = {
      title: `${ev.title} ${config.couple.bride.name} & ${config.couple.groom.name}`,
      description: `Menghadiri ${ev.title} pernikahan ${config.couple.bride.name} & ${config.couple.groom.name}.`,
      location: config.venue.address,
      startTime: ev.startDateTime,
      endTime: ev.endDateTime,
    };
    if (type === "google") {
      window.open(generateGoogleCalendarUrl(event), "_blank");
    } else {
      downloadICS(event);
    }
    setActiveDropdown(null);
  };

  return (
    <section
      id="event"
      className="relative overflow-x-clip px-5 py-20 transition-colors duration-700 md:px-6 md:py-28"
    >
      <BotanicalWatermark side="left" variant={config.appearance.ornament} />
      <div className="container mx-auto max-w-5xl">
        <div className="mb-14 space-y-3 text-center md:mb-18">
          <span className="text-accentDark dark:text-accent text-[11px] font-semibold tracking-[0.3em] uppercase">
            Rangkaian Acara
          </span>
          <h2 className="font-serif text-4xl font-medium tracking-tight text-primary italic sm:text-5xl md:text-6xl dark:text-white">
            Waktu &amp; Tempat
          </h2>
          <SectionDivider className="py-1" />
          <p className="mx-auto max-w-2xl text-sm font-light text-balance text-slate-600 italic sm:text-base dark:text-slate-300">
            {config.text.invitation}
          </p>
        </div>

        {/* Akad & Resepsi Cards */}
        <div
          ref={dropdownContainerRef}
          className="relative z-20 mb-10 grid gap-6 md:mb-12 md:grid-cols-2 md:gap-8"
        >
          {(["akad", "resepsi"] as const).map((type) => {
            const ev = config.events[type];
            const isOpen = activeDropdown === type;
            return (
              <div
                key={type}
                className={`editorial-card relative flex flex-col items-center justify-between space-y-6 rounded-3xl p-7 text-center ring-1 ring-accentDark/8 ring-inset sm:p-9 dark:ring-accent/10 ${
                  isOpen ? "z-30" : "z-10"
                }`}
              >

                <div className="space-y-3 pt-1">
                  <div className="bg-accentDark/10 text-accentDark dark:bg-accent/15 dark:text-accent mx-auto flex h-12 w-12 items-center justify-center rounded-full">
                    {type === "akad" ? (
                      <Heart className="h-5 w-5" />
                    ) : (
                      <Sparkles className="h-5 w-5" />
                    )}
                  </div>
                  <h3 className="font-script text-4xl text-primary sm:text-5xl dark:text-white">
                    {ev.title}
                  </h3>
                </div>

                <div className="border-accentDark/12 dark:border-accent/15 w-full space-y-3 border-y py-5">
                  <div className="flex items-center justify-center gap-2.5 font-serif text-xl font-medium text-primary italic sm:text-2xl dark:text-white">
                    <Calendar className="text-accentDark dark:text-accent h-4 w-4 shrink-0" />
                    <span>
                      {ev.day}, {ev.date}
                    </span>
                  </div>
                  <div className="flex items-center justify-center gap-2 text-xs font-semibold tracking-[0.16em] text-slate-600 uppercase dark:text-slate-300">
                    <Clock className="text-accentDark dark:text-accent h-4 w-4 shrink-0" />
                    <span>
                      {ev.startTime} — {ev.endTime} {config.events.timezone}
                    </span>
                  </div>
                </div>

                <div className="relative w-full">
                  <button
                    type="button"
                    aria-expanded={activeDropdown === type}
                    onClick={() =>
                      setActiveDropdown(activeDropdown === type ? null : type)
                    }
                    className="bg-primary dark:bg-accentDark flex w-full items-center justify-center gap-2.5 rounded-full py-3.5 text-xs font-bold tracking-[0.18em] text-white uppercase shadow-sm transition-all hover:opacity-95 active:scale-[0.98]"
                  >
                    <CalendarPlus className="h-4 w-4" />
                    Simpan ke Kalender
                    <ChevronDown
                      className={`h-3.5 w-3.5 transition-transform duration-300 ${
                        activeDropdown === type ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  {activeDropdown === type && (
                    <div className="frosted-glass animate-reveal absolute top-full right-0 left-0 z-50 mt-2 overflow-hidden rounded-2xl border border-slate-200/80 p-1.5 shadow-xl dark:border-white/10">
                      <button
                        type="button"
                        onClick={() => handleCalendar("google", type)}
                        className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-xs font-semibold tracking-wider text-slate-800 uppercase transition-colors hover:bg-white/80 dark:text-white dark:hover:bg-white/10"
                      >
                        <span className="bg-accentDark dark:bg-accent h-2 w-2 rounded-full" />
                        Google Calendar
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCalendar("ics", type)}
                        className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-xs font-semibold tracking-wider text-slate-800 uppercase transition-colors hover:bg-white/80 dark:text-white dark:hover:bg-white/10"
                      >
                        <span className="h-2 w-2 rounded-full bg-slate-400" />
                        Apple / Outlook (.ics)
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Venue & Map Card */}
        <div className="editorial-card relative z-10 space-y-6 rounded-3xl p-6 sm:p-9">
          <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
            <div className="flex items-start gap-4">
              <div className="bg-accentDark/10 text-accentDark dark:bg-accent/15 dark:text-accent flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl">
                <MapPin className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <span className="text-accentDark dark:text-accent text-[10px] font-bold tracking-[0.24em] uppercase">
                  Lokasi Acara
                </span>
                <h4 className="font-serif text-2xl font-semibold text-primary italic sm:text-3xl dark:text-white">
                  {config.venue.name}
                </h4>
                <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                  {config.venue.address}
                </p>
              </div>
            </div>

            <div className="flex w-full flex-col gap-2.5 sm:flex-row lg:w-auto lg:shrink-0">
              <button
                type="button"
                onClick={copyToClipboard}
                className="border-accentDark/25 hover:bg-accentDark/5 dark:border-accent/25 dark:hover:bg-accent/10 inline-flex flex-1 items-center justify-center gap-2 rounded-full border px-5 py-3 text-xs font-bold tracking-[0.14em] text-slate-700 uppercase transition-all lg:flex-none dark:text-slate-200"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <Copy className="text-accentDark dark:text-accent h-4 w-4" />
                )}
                {copied ? "Disalin" : "Salin Alamat"}
              </button>
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${config.venue.latitude},${config.venue.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-primary dark:bg-accentDark inline-flex flex-1 items-center justify-center gap-2 rounded-full px-6 py-3 text-xs font-bold tracking-[0.14em] text-white uppercase shadow-sm transition-all hover:opacity-95 lg:flex-none"
              >
                <ExternalLink className="h-4 w-4" /> Petunjuk Arah
              </a>
            </div>
          </div>

          <div className="border-accentDark/10 relative h-[300px] overflow-hidden rounded-2xl border shadow-inner sm:h-[380px] dark:border-white/10">
            <iframe
              title={`Peta Lokasi ${config.venue.name || "Acara Pernikahan"}`}
              src={mapUrl}
              width="100%"
              height="100%"
              style={{ border: 0 }}
              className="h-full w-full transition-opacity dark:opacity-90"
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        </div>
      </div>
    </section>
  );
};

export default EventDetails;
