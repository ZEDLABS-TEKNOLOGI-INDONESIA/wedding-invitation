import React, { useEffect, useState } from "react";
import Hero from "./components/Hero";
import CoupleProfile from "./components/CoupleProfile";
import EventDetails from "./components/EventDetails";
import Gallery from "./components/Gallery";
import LoveStory from "./components/LoveStory";
import RSVPForm from "./components/RSVPForm";
import Wishes from "./components/Wishes";
import GiftInfo from "./components/GiftInfo";
import MusicPlayer from "./components/MusicPlayer";
import Navbar from "./components/Navbar";
import FloatingPetals from "./components/FloatingPetals";
import Envelope from "./components/Envelope";
import { Heart, Quote, ChevronUp } from "lucide-react";
import { dbService } from "./services/dbService";
import { WEDDING_CONFIG } from "./constants";

const App: React.FC = () => {
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("theme") as "light" | "dark";
      if (saved) return saved;
      return window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
    }
    return "light";
  });

  const [isOpened, setIsOpened] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    localStorage.setItem("theme", theme);
  }, [theme]);

  useEffect(() => {
    dbService.initializeDemo();

    if (!isOpened) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    const observerOptions = {
      threshold: 0.1,
      rootMargin: "0px 0px -100px 0px",
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("reveal-active");
          entry.target.classList.remove("opacity-0");
        }
      });
    }, observerOptions);

    if (isOpened) {
      document.querySelectorAll("section").forEach((section) => {
        section.classList.add(
          "opacity-0",
          "transition-all",
          "duration-[1.5s]",
          "ease-out"
        );
        observer.observe(section);
      });
    }

    return () => observer.disconnect();
  }, [isOpened]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  };

  const handleOpenInvitation = () => {
    setIsOpened(true);
    window.dispatchEvent(new CustomEvent("play-wedding-music"));
    window.scrollTo({ top: 0, behavior: "instant" });
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Helper untuk format tanggal footer (contoh: 11 • 10 • 2025)
  // Mengambil dari konfigurasi ISO string agar akurat
  const footerDate = (() => {
    const d = WEDDING_CONFIG.events.akad.startDateTime;
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day} • ${month} • ${year}`;
  })();

  return (
    <div className="min-h-screen relative selection:bg-accent/30 selection:text-primary overflow-x-hidden">
      {!isOpened && <Envelope onOpen={handleOpenInvitation} />}

      <FloatingPetals />

      <Hero />

      <main className="space-y-0 relative z-10">
        <CoupleProfile />
        <LoveStory />
        <EventDetails />
        <Gallery />
        <RSVPForm />
        <Wishes />
        <GiftInfo />
      </main>

      <MusicPlayer />
      <Navbar theme={theme} toggleTheme={toggleTheme} />

      {/* Footer */}
      <footer className="relative h-screen w-full flex flex-col items-center justify-center overflow-hidden bg-white dark:bg-darkSurface transition-colors duration-1000 px-6">
        <div className="absolute inset-0 z-0 opacity-10 dark:opacity-[0.05] flex items-center justify-center pointer-events-none">
          <Heart className="w-[85vw] h-[85vw] stroke-[0.3] animate-pulse-soft" />
        </div>

        <div className="container mx-auto max-w-4xl relative z-10 flex flex-col items-center gap-12 md:gap-24">
          <button
            onClick={scrollToTop}
            className="group flex flex-col items-center gap-4 hover:scale-105 transition-transform duration-500"
          >
            <div className="w-12 h-12 md:w-16 md:h-16 rounded-full border border-accent/40 flex items-center justify-center text-accentDark dark:text-accent group-hover:bg-accent/10 transition-colors shadow-2xl">
              <ChevronUp className="w-6 h-6 md:w-8 md:h-8 animate-bounce" />
            </div>
            <span className="text-[10px] uppercase tracking-luxury font-bold opacity-40 group-hover:opacity-100 transition-opacity">
              Sampai Jumpa di Hari Bahagia Kami
            </span>
          </button>

          <div className="text-center space-y-8 md:space-y-12">
            <Heart className="w-8 h-8 md:w-12 md:h-12 text-accent/60 fill-current mx-auto animate-pulse" />
            <h2 className="text-6xl sm:text-8xl md:text-[12rem] font-serif italic text-slate-900 dark:text-white leading-[0.85] tracking-tighter drop-shadow-xl">
              {WEDDING_CONFIG.couple.bride.name}{" "}
              <span className="text-accent/30">&</span>{" "}
              {WEDDING_CONFIG.couple.groom.name}
            </h2>
            <div className="flex items-center justify-center gap-4 md:gap-6">
              <div className="h-[1px] w-10 md:w-20 bg-accent/30"></div>
              {/* DATE SEKARANG DINAMIS */}
              <p className="text-[12px] md:text-[20px] uppercase tracking-[0.4em] font-black text-accentDark dark:text-accent italic">
                {footerDate}
              </p>
              <div className="h-[1px] w-10 md:w-20 bg-accent/30"></div>
            </div>
          </div>

          <div className="space-y-12 md:space-y-16 text-center">
            <div className="relative inline-block group px-4">
              <Quote className="absolute -top-10 -left-2 md:-top-16 md:-left-12 w-12 h-12 md:w-24 md:h-24 opacity-[0.06] dark:opacity-[0.12] text-accentDark rotate-180 transition-transform duration-1000" />
              <p className="text-lg md:text-3xl font-serif italic text-slate-500 dark:text-slate-400 leading-relaxed max-w-2xl mx-auto text-balance">
                "Terima kasih atas doa dan restu tulus Anda. Kehadiran Anda
                adalah kado terindah bagi awal babak baru kehidupan kami."
              </p>
            </div>

            <div className="pt-16 md:pt-28 border-t border-slate-100 dark:border-white/5 flex flex-col items-center gap-6 md:gap-10">
              <div className="flex items-center gap-3 opacity-50 transition-opacity hover:opacity-100">
                <p className="text-[9px] md:text-[13px] uppercase tracking-luxury font-black italic">
                  Dibuat dengan penuh cinta untuk hari spesial kami
                </p>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
