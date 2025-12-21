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
      className="py-20 md:py-40 bg-secondary/30 dark:bg-darkBg transition-colors duration-1000 px-4 md:px-6"
    >
      <div className="container mx-auto max-w-6xl">
        <div className="text-center mb-16 md:mb-24 space-y-4 md:space-y-6">
          <div className="flex items-center justify-center gap-4">
            <div className="h-[1px] w-8 md:w-12 bg-accentDark/20 dark:bg-accent/20"></div>
            <Sparkles className="w-5 h-5 md:w-6 md:h-6 text-accentDark dark:text-accent animate-pulse" />
            <div className="h-[1px] w-8 md:w-12 bg-accentDark/20 dark:bg-accent/20"></div>
          </div>
          <h2 className="text-4xl md:text-9xl font-serif italic text-slate-900 dark:text-white tracking-tight">
            The Celebration
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-base md:text-2xl max-w-xl mx-auto italic font-light text-balance px-4">
            Merupakan kehormatan bagi kami jika Anda berkenan hadir.
          </p>
        </div>
        <div className="grid md:grid-cols-2 gap-6 md:gap-14 mb-16 md:mb-20">
          {["akad", "resepsi"].map((type) => {
            const ev = WEDDING_CONFIG.events[type as "akad" | "resepsi"];
            return (
              <div
                key={type}
                className="editorial-card relative bg-white dark:bg-darkSurface rounded-[2.5rem] md:rounded-[4rem] p-8 md:p-20 flex flex-col items-center text-center space-y-8 md:space-y-12 group overflow-visible"
              >
                <div className="absolute -top-4 -right-4 md:-top-6 md:-right-6 w-12 h-12 md:w-16 md:h-16 bg-accentDark/10 dark:bg-accent/10 rounded-full flex items-center justify-center text-accentDark dark:text-accent animate-float border border-white/20 dark:border-white/5 backdrop-blur-md z-10">
                  {type === "akad" ? (
                    <Heart className="w-5 h-5 md:w-7 md:h-7 fill-current" />
                  ) : (
                    <Sparkles className="w-5 h-5 md:w-7 md:h-7" />
                  )}
                </div>
                <div className="space-y-2 md:space-y-4">
                  <span className="text-[9px] md:text-[10px] font-bold uppercase tracking-luxury text-accentDark dark:text-accent">
                    Our Sacred Day
                  </span>
                  <h3 className="text-3xl md:text-7xl font-serif italic text-slate-900 dark:text-white leading-tight">
                    {ev.title}
                  </h3>
                </div>
                <div className="space-y-6 md:space-y-8 w-full py-8 md:py-10 border-y border-slate-100 dark:border-white/5">
                  <div className="flex flex-col items-center justify-center gap-3 text-xl md:text-3xl font-serif italic text-slate-700 dark:text-slate-100">
                    <div className="flex items-center gap-3 md:gap-4">
                      <Calendar className="w-5 h-5 md:w-6 md:h-6 text-accentDark dark:text-accent" />
                      <span>
                        {ev.day}, {ev.date}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-center gap-3 md:gap-4 text-[11px] md:text-[12px] uppercase tracking-editorial font-bold text-slate-400 dark:text-slate-500">
                    <Clock className="w-4 h-4 md:w-5 md:h-5 text-accentDark dark:text-accent" />
                    <span>
                      {ev.startTime} — {ev.endTime} WIB
                    </span>
                  </div>
                </div>
                <div className="w-full relative">
                  <button
                    onClick={() =>
                      setActiveDropdown(
                        activeDropdown === type ? null : (type as any)
                      )
                    }
                    className="w-full flex items-center justify-center gap-3 md:gap-5 bg-primary dark:bg-accentDark text-white py-4 md:py-6 rounded-2xl md:rounded-3xl hover:shadow-2xl transition-all active:scale-95 text-[10px] md:text-[11px] font-bold uppercase tracking-editorial"
                  >
                    <CalendarPlus className="w-4 h-4 md:w-5 md:h-5" />
                    Save The Date
                    <ChevronDown
                      className={`w-3 h-3 md:w-4 md:h-4 transition-transform duration-500 ${
                        activeDropdown === type ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                  {activeDropdown === type && (
                    <div className="absolute top-full left-0 right-0 mt-3 md:mt-4 frosted-glass rounded-[1.5rem] md:rounded-[2rem] shadow-2xl z-[50] overflow-hidden animate-reveal p-2 md:p-3 border border-slate-200 dark:border-white/10">
                      <button
                        onClick={() => handleCalendar("google", type as any)}
                        className="w-full text-left px-6 py-4 md:px-8 md:py-6 hover:bg-slate-50 dark:hover:bg-white/5 flex items-center gap-4 md:gap-5 rounded-xl md:rounded-2xl transition-colors text-slate-800 dark:text-white"
                      >
                        <div className="w-2 h-2 md:w-3 md:h-3 rounded-full bg-accentDark dark:bg-accent animate-pulse"></div>
                        <span className="font-bold text-[10px] md:text-[11px] uppercase tracking-luxury">
                          Google Calendar
                        </span>
                      </button>
                      <button
                        onClick={() => handleCalendar("ics", type as any)}
                        className="w-full text-left px-6 py-4 md:px-8 md:py-6 hover:bg-slate-50 dark:hover:bg-white/5 flex items-center gap-4 md:gap-5 rounded-xl md:rounded-2xl transition-colors text-slate-800 dark:text-white"
                      >
                        <div className="w-2 h-2 md:w-3 md:h-3 rounded-full bg-slate-300 dark:bg-slate-600"></div>
                        <span className="font-bold text-[10px] md:text-[11px] uppercase tracking-luxury">
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
        <div className="editorial-card rounded-[2.5rem] md:rounded-[4rem] p-8 md:p-20 space-y-12 md:space-y-16">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 md:gap-12">
            <div className="space-y-6">
              <div className="flex items-start md:items-center gap-5 md:gap-8">
                <div className="w-16 h-16 md:w-20 md:h-20 bg-slate-50 dark:bg-white/5 rounded-2xl md:rounded-3xl flex items-center justify-center text-accentDark dark:text-accent flex-shrink-0 border border-slate-100 dark:border-white/10 shadow-lg">
                  <MapPin className="w-8 h-8 md:w-10 md:h-10" />
                </div>
                <div className="space-y-1 md:space-y-2">
                  <h4 className="font-serif italic text-3xl md:text-6xl text-slate-900 dark:text-white leading-tight tracking-tight">
                    {WEDDING_CONFIG.venue.name}
                  </h4>
                  <p className="text-slate-500 dark:text-slate-400 text-base md:text-2xl font-light italic leading-snug">
                    {WEDDING_CONFIG.venue.address}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 md:gap-5 w-full lg:w-auto">
              <button
                onClick={copyToClipboard}
                className="flex items-center justify-center gap-3 md:gap-4 px-6 md:px-10 py-4 md:py-5 rounded-xl md:rounded-[2rem] border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 transition-all font-bold text-[10px] md:text-[11px] uppercase tracking-editorial w-full sm:w-1/2 lg:w-auto"
              >
                {copied ? (
                  <Check className="w-4 h-4 md:w-5 md:h-5 text-green-500" />
                ) : (
                  <Copy className="w-4 h-4 md:w-5 md:h-5 text-accentDark dark:text-accent" />
                )}
                {copied ? "Address Copied" : "Copy Address"}
              </button>
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${WEDDING_CONFIG.venue.latitude},${WEDDING_CONFIG.venue.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-3 md:gap-4 px-6 md:px-12 py-4 md:py-5 bg-primary dark:bg-white text-white dark:text-primary rounded-xl md:rounded-[2rem] hover:shadow-2xl transition-all font-bold text-[10px] md:text-[11px] uppercase tracking-editorial w-full sm:w-1/2 lg:w-auto"
              >
                <ExternalLink className="w-4 h-4 md:w-5 md:h-5" /> Open In Maps
              </a>
            </div>
          </div>
          <div className="rounded-[1.5rem] md:rounded-[3.5rem] overflow-hidden shadow-2xl border border-slate-100 dark:border-white/10 h-[350px] md:h-[600px] relative">
            <iframe
              src={mapUrl}
              width="100%"
              height="100%"
              style={{ border: 0 }}
              className="grayscale-[0.3] contrast-125 dark:opacity-80 transition-all hover:grayscale-0"
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            ></iframe>
            <div className="absolute inset-0 pointer-events-none border-[6px] md:border-[12px] border-white/5 dark:border-darkSurface/5"></div>
          </div>
        </div>
      </div>
    </section>
  );
};
export default EventDetails;
