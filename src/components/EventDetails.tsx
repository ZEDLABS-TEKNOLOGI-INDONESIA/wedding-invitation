import React, { useState } from "react";
import {
  Calendar,
  Clock,
  MapPin,
  ExternalLink,
  CalendarPlus,
  Copy,
  Check,
  ChevronDown,
  Sparkles,
  Heart,
} from "lucide-react";
import { WEDDING_CONFIG } from "../constants";
import { generateGoogleCalendarUrl, downloadICS } from "../utils/calendarUtils";
const EventDetails: React.FC = () => {
  const [copied, setCopied] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<
    "akad" | "resepsi" | null
  >(null);
  const copyToClipboard = () => {
    navigator.clipboard.writeText(WEDDING_CONFIG.venue.address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  const mapUrl = `https://maps.google.com/maps?q=${WEDDING_CONFIG.venue.latitude},${WEDDING_CONFIG.venue.longitude}&t=&z=15&ie=UTF8&iwloc=&output=embed`;
  const handleCalendar = (
    type: "google" | "ics",
    eventType: "akad" | "resepsi"
  ) => {
    const event = {
      title: `${WEDDING_CONFIG.events[eventType].title} ${WEDDING_CONFIG.couple.bride.name} & ${WEDDING_CONFIG.couple.groom.name}`,
      description: `Menghadiri ${WEDDING_CONFIG.events[eventType].title} pernikahan ${WEDDING_CONFIG.couple.bride.name} & ${WEDDING_CONFIG.couple.groom.name}.`,
      location: WEDDING_CONFIG.venue.address,
      startTime: WEDDING_CONFIG.events[eventType].startDateTime,
      endTime: WEDDING_CONFIG.events[eventType].endDateTime,
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
      className="bg-secondary/30 dark:bg-darkBg px-4 py-20 transition-colors duration-1000 md:px-6 md:py-40"
    >
      <div className="container mx-auto max-w-6xl">
        <div className="mb-16 space-y-4 text-center md:mb-24 md:space-y-6">
          <div className="flex items-center justify-center gap-4">
            <div className="bg-accentDark/20 dark:bg-accent/20 h-[1px] w-8 md:w-12"></div>
            <Sparkles className="text-accentDark dark:text-accent h-5 w-5 animate-pulse md:h-6 md:w-6" />
            <div className="bg-accentDark/20 dark:bg-accent/20 h-[1px] w-8 md:w-12"></div>
          </div>
          <h2 className="font-serif text-4xl tracking-tight text-slate-900 italic md:text-9xl dark:text-white">
            The Celebration
          </h2>
          <p className="mx-auto max-w-xl px-4 text-base font-light text-balance text-slate-500 italic md:text-2xl dark:text-slate-400">
            Merupakan kehormatan bagi kami jika Anda berkenan hadir.
          </p>
        </div>
        <div className="mb-16 grid gap-6 md:mb-20 md:grid-cols-2 md:gap-14">
          {["akad", "resepsi"].map((type) => {
            const ev = WEDDING_CONFIG.events[type as "akad" | "resepsi"];
            return (
              <div
                key={type}
                className="editorial-card dark:bg-darkSurface group relative flex flex-col items-center space-y-8 overflow-visible rounded-[2.5rem] bg-white p-8 text-center md:space-y-12 md:rounded-[4rem] md:p-20"
              >
                <div className="bg-accentDark/10 dark:bg-accent/10 text-accentDark dark:text-accent animate-float absolute -top-4 -right-4 z-10 flex h-12 w-12 items-center justify-center rounded-full border border-white/20 backdrop-blur-md md:-top-6 md:-right-6 md:h-16 md:w-16 dark:border-white/5">
                  {type === "akad" ? (
                    <Heart className="h-5 w-5 fill-current md:h-7 md:w-7" />
                  ) : (
                    <Sparkles className="h-5 w-5 md:h-7 md:w-7" />
                  )}
                </div>
                <div className="space-y-2 md:space-y-4">
                  <span className="tracking-luxury text-accentDark dark:text-accent text-[9px] font-bold uppercase md:text-[10px]">
                    Our Sacred Day
                  </span>
                  <h3 className="font-serif text-3xl leading-tight text-slate-900 italic md:text-7xl dark:text-white">
                    {ev.title}
                  </h3>
                </div>
                <div className="w-full space-y-6 border-y border-slate-100 py-8 md:space-y-8 md:py-10 dark:border-white/5">
                  <div className="flex flex-col items-center justify-center gap-3 font-serif text-xl text-slate-700 italic md:text-3xl dark:text-slate-100">
                    <div className="flex items-center gap-3 md:gap-4">
                      <Calendar className="text-accentDark dark:text-accent h-5 w-5 md:h-6 md:w-6" />
                      <span>
                        {ev.day}, {ev.date}
                      </span>
                    </div>
                  </div>
                  <div className="tracking-editorial flex items-center justify-center gap-3 text-[11px] font-bold text-slate-400 uppercase md:gap-4 md:text-[12px] dark:text-slate-500">
                    <Clock className="text-accentDark dark:text-accent h-4 w-4 md:h-5 md:w-5" />
                    <span>
                      {ev.startTime} — {ev.endTime} WIB
                    </span>
                  </div>
                </div>
                <div className="relative w-full">
                  <button
                    onClick={() =>
                      setActiveDropdown(
                        activeDropdown === type ? null : (type as any)
                      )
                    }
                    className="bg-primary dark:bg-accentDark tracking-editorial flex w-full items-center justify-center gap-3 rounded-2xl py-4 text-[10px] font-bold text-white uppercase transition-all hover:shadow-2xl active:scale-95 md:gap-5 md:rounded-3xl md:py-6 md:text-[11px]"
                  >
                    <CalendarPlus className="h-4 w-4 md:h-5 md:w-5" />
                    Save The Date
                    <ChevronDown
                      className={`h-3 w-3 transition-transform duration-500 md:h-4 md:w-4 ${
                        activeDropdown === type ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                  {activeDropdown === type && (
                    <div className="frosted-glass animate-reveal absolute top-full right-0 left-0 z-[50] mt-3 overflow-hidden rounded-[1.5rem] border border-slate-200 p-2 shadow-2xl md:mt-4 md:rounded-[2rem] md:p-3 dark:border-white/10">
                      <button
                        onClick={() => handleCalendar("google", type as any)}
                        className="flex w-full items-center gap-4 rounded-xl px-6 py-4 text-left text-slate-800 transition-colors hover:bg-slate-50 md:gap-5 md:rounded-2xl md:px-8 md:py-6 dark:text-white dark:hover:bg-white/5"
                      >
                        <div className="bg-accentDark dark:bg-accent h-2 w-2 animate-pulse rounded-full md:h-3 md:w-3"></div>
                        <span className="tracking-luxury text-[10px] font-bold uppercase md:text-[11px]">
                          Google Calendar
                        </span>
                      </button>
                      <button
                        onClick={() => handleCalendar("ics", type as any)}
                        className="flex w-full items-center gap-4 rounded-xl px-6 py-4 text-left text-slate-800 transition-colors hover:bg-slate-50 md:gap-5 md:rounded-2xl md:px-8 md:py-6 dark:text-white dark:hover:bg-white/5"
                      >
                        <div className="h-2 w-2 rounded-full bg-slate-300 md:h-3 md:w-3 dark:bg-slate-600"></div>
                        <span className="tracking-luxury text-[10px] font-bold uppercase md:text-[11px]">
                          Apple / Outlook
                        </span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <div className="editorial-card space-y-12 rounded-[2.5rem] p-8 md:space-y-16 md:rounded-[4rem] md:p-20">
          <div className="flex flex-col justify-between gap-8 md:gap-12 lg:flex-row lg:items-center">
            <div className="space-y-6">
              <div className="flex items-start gap-5 md:items-center md:gap-8">
                <div className="text-accentDark dark:text-accent flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-2xl border border-slate-100 bg-slate-50 shadow-lg md:h-20 md:w-20 md:rounded-3xl dark:border-white/10 dark:bg-white/5">
                  <MapPin className="h-8 w-8 md:h-10 md:w-10" />
                </div>
                <div className="space-y-1 md:space-y-2">
                  <h4 className="font-serif text-3xl leading-tight tracking-tight text-slate-900 italic md:text-6xl dark:text-white">
                    {WEDDING_CONFIG.venue.name}
                  </h4>
                  <p className="text-base leading-snug font-light text-slate-500 italic md:text-2xl dark:text-slate-400">
                    {WEDDING_CONFIG.venue.address}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex w-full flex-col gap-3 sm:flex-row md:gap-5 lg:w-auto">
              <button
                onClick={copyToClipboard}
                className="tracking-editorial flex w-full items-center justify-center gap-3 rounded-xl border border-slate-200 px-6 py-4 text-[10px] font-bold text-slate-700 uppercase transition-all hover:bg-slate-50 sm:w-1/2 md:gap-4 md:rounded-[2rem] md:px-10 md:py-5 md:text-[11px] lg:w-auto dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-green-500 md:h-5 md:w-5" />
                ) : (
                  <Copy className="text-accentDark dark:text-accent h-4 w-4 md:h-5 md:w-5" />
                )}
                {copied ? "Address Copied" : "Copy Address"}
              </button>
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${WEDDING_CONFIG.venue.latitude},${WEDDING_CONFIG.venue.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-primary dark:text-primary tracking-editorial flex w-full items-center justify-center gap-3 rounded-xl px-6 py-4 text-[10px] font-bold text-white uppercase transition-all hover:shadow-2xl sm:w-1/2 md:gap-4 md:rounded-[2rem] md:px-12 md:py-5 md:text-[11px] lg:w-auto dark:bg-white"
              >
                <ExternalLink className="h-4 w-4 md:h-5 md:w-5" /> Open In Maps
              </a>
            </div>
          </div>
          <div className="relative h-[350px] overflow-hidden rounded-[1.5rem] border border-slate-100 shadow-2xl md:h-[600px] md:rounded-[3.5rem] dark:border-white/10">
            <iframe
              src={mapUrl}
              width="100%"
              height="100%"
              style={{ border: 0 }}
              className="contrast-125 grayscale-[0.3] transition-all hover:grayscale-0 dark:opacity-80"
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            ></iframe>
            <div className="dark:border-darkSurface/5 pointer-events-none absolute inset-0 border-[6px] border-white/5 md:border-[12px]"></div>
          </div>
        </div>
      </div>
    </section>
  );
};
export default EventDetails;
