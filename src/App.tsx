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
import InstallPrompt from "./components/InstallPrompt";
import { useConfig } from "./hooks/useConfig";
import { Heart, Quote, ChevronUp } from "lucide-react";

const App: React.FC = () => {
  const { config, loading } = useConfig();

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

  if (loading || !config) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-slate-950">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-white"></div>
      </div>
    );
  }

  const footerDate = (() => {
    const d = config.events.akad.startDateTime;
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day} • ${month} • ${year}`;
  })();

  return (
    <div className="selection:bg-accent/30 selection:text-primary relative min-h-screen overflow-x-hidden">
      {!isOpened && <Envelope onOpen={handleOpenInvitation} config={config} />}

      <InstallPrompt />
      <FloatingPetals />
      <Hero config={config} />

      <main className="relative z-10 space-y-0">
        <CoupleProfile config={config} />
        <LoveStory config={config} />
        <EventDetails config={config} />
        <Gallery config={config} />
        <RSVPForm config={config} />
        <Wishes config={config} />
        <GiftInfo config={config} />
      </main>

      <MusicPlayer url={config.music.url} />
      <Navbar theme={theme} toggleTheme={toggleTheme} />

      <footer className="dark:bg-darkSurface relative flex h-screen w-full flex-col items-center justify-center overflow-hidden bg-white px-6 transition-colors duration-1000">
        <div className="pointer-events-none absolute inset-0 z-0 flex items-center justify-center opacity-10 dark:opacity-[0.05]">
          <Heart className="animate-pulse-soft h-[85vw] w-[85vw] stroke-[0.3]" />
        </div>

        <div className="relative z-10 container mx-auto flex max-w-4xl flex-col items-center gap-12 md:gap-24">
          <button
            onClick={scrollToTop}
            className="group flex flex-col items-center gap-4 transition-transform duration-500 hover:scale-105"
          >
            <div className="border-accent/40 text-accentDark dark:text-accent group-hover:bg-accent/10 flex h-12 w-12 items-center justify-center rounded-full border shadow-2xl transition-colors md:h-16 md:w-16">
              <ChevronUp className="h-6 w-6 animate-bounce md:h-8 md:w-8" />
            </div>
            <span className="tracking-luxury text-[10px] font-bold uppercase opacity-40 transition-opacity group-hover:opacity-100">
              Sampai Jumpa di Hari Bahagia Kami
            </span>
          </button>

          <div className="space-y-8 text-center md:space-y-12">
            <Heart className="text-accent/60 mx-auto h-8 w-8 animate-pulse fill-current md:h-12 md:w-12" />
            <h2 className="font-serif text-6xl leading-[0.85] tracking-tighter text-slate-900 italic drop-shadow-xl sm:text-8xl md:text-[12rem] dark:text-white">
              {config.couple.bride.name}{" "}
              <span className="text-accent/30">&</span>{" "}
              {config.couple.groom.name}
            </h2>
            <div className="flex items-center justify-center gap-4 md:gap-6">
              <div className="bg-accent/30 h-[1px] w-10 md:w-20"></div>
              <p className="text-accentDark dark:text-accent text-[12px] font-black tracking-[0.4em] uppercase italic md:text-[20px]">
                {footerDate}
              </p>
              <div className="bg-accent/30 h-[1px] w-10 md:w-20"></div>
            </div>
          </div>

          <div className="space-y-12 text-center md:space-y-16">
            <div className="group relative inline-block px-4">
              <Quote className="text-accentDark absolute -top-10 -left-2 h-12 w-12 rotate-180 opacity-[0.06] transition-transform duration-1000 md:-top-16 md:-left-12 md:h-24 md:w-24 dark:opacity-[0.12]" />
              <div className="space-y-6">
                <p className="mx-auto max-w-2xl font-serif text-lg leading-relaxed text-balance text-slate-500 italic md:text-3xl dark:text-slate-400">
                  "{config.text.closing.text}"
                </p>
                <p className="font-serif text-xl font-bold text-slate-800 dark:text-white">
                  {config.text.closing.salam}
                </p>
              </div>
            </div>

            <div className="flex flex-col items-center gap-6 border-t border-slate-100 pt-16 md:gap-10 md:pt-28 dark:border-white/5">
              <p className="tracking-luxury text-[9px] font-black uppercase md:text-[13px]">
                {config.text.closing.signature}
              </p>
              <p className="font-serif text-lg italic">
                {config.couple.bride.name} & {config.couple.groom.name}
              </p>
              <p className="mt-2 text-[10px]">{config.text.closing.family}</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
