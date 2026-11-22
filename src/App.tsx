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
import { Heart, ChevronUp } from "lucide-react";
import {
  BotanicalWatermark,
  HeartFrameWatermark,
  SectionDivider,
} from "./components/WeddingOrnaments";
import {
  normalizePublicTheme,
  type PublicThemeId,
} from "./utils/publicThemes";

interface AppProps {
  initialRawConfig?: Record<string, string>;
  weddingSlug?: string;
}

const App: React.FC<AppProps> = ({ initialRawConfig, weddingSlug = "demo" }) => {
  const { config, loading } = useConfig(initialRawConfig, weddingSlug);

  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [themeInitialized, setThemeInitialized] = useState(false);
  const [colorTheme, setColorTheme] = useState<PublicThemeId>(
    normalizePublicTheme(initialRawConfig?.PUBLIC_THEME)
  );
  const [colorThemeInitialized, setColorThemeInitialized] = useState(false);

  const [isOpened, setIsOpened] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("theme") as "light" | "dark" | null;
    const defaultMode = config?.appearance?.defaultMode ?? "system";
    if (saved === "light" || saved === "dark") {
      setTheme(saved);
    } else if (defaultMode === "light" || defaultMode === "dark") {
      setTheme(defaultMode);
    } else if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
      setTheme("dark");
    }
    setThemeInitialized(true);
  }, [config?.appearance?.defaultMode]);

  useEffect(() => {
    const defaultPalette = config?.appearance?.theme ?? "ocean";
    const allowSwitch = config?.appearance?.allowGuestThemeSwitch ?? true;
    if (allowSwitch) {
      const savedPalette = localStorage.getItem("wedding_public_theme");
      if (savedPalette) {
        setColorTheme(normalizePublicTheme(savedPalette));
      } else {
        setColorTheme(defaultPalette);
      }
    } else {
      setColorTheme(defaultPalette);
    }
    setColorThemeInitialized(true);
  }, [config?.appearance?.theme, config?.appearance?.allowGuestThemeSwitch]);

  useEffect(() => {
    if (!themeInitialized) return;
    const root = document.documentElement;
    root.setAttribute("data-theme", theme);
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    localStorage.setItem("theme", theme);
  }, [theme, themeInitialized]);

  useEffect(() => {
    if (!colorThemeInitialized) return;
    document.documentElement.setAttribute("data-wedding-theme", colorTheme);
  }, [colorTheme, colorThemeInitialized]);

  useEffect(() => {
    if (!isOpened) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    const observerOptions = {
      threshold: 0.04,
      rootMargin: "0px 0px -24px 0px",
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("wedding-revealed");
          observer.unobserve(entry.target);
        }
      });
    }, observerOptions);

    if (isOpened) {
      document.querySelectorAll("main section").forEach((section) => {
        section.classList.add("wedding-reveal");
        const rect = section.getBoundingClientRect();
        if (rect.top < window.innerHeight * 0.95) {
          section.classList.add("wedding-revealed");
        } else {
          observer.observe(section);
        }
      });
    }

    return () => {
      observer.disconnect();
      document.body.style.overflow = "";
    };
  }, [isOpened]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  };

  const handleSelectColorTheme = (nextTheme: PublicThemeId) => {
    setColorTheme(nextTheme);
    try {
      localStorage.setItem("wedding_public_theme", nextTheme);
    } catch {
      /* ignore storage errors */
    }
  };

  const handleResetColorTheme = () => {
    const fallback = config?.appearance?.theme ?? "ocean";
    setColorTheme(fallback);
    try {
      localStorage.removeItem("wedding_public_theme");
    } catch {
      /* ignore storage errors */
    }
  };

  const handleOpenInvitation = () => {
    setIsOpened(true);
    window.dispatchEvent(new CustomEvent("play-wedding-music"));
    window.dispatchEvent(new CustomEvent("wedding-opened"));
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
    if (Number.isNaN(d.getTime())) return config.events.akad.date;
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day} • ${month} • ${year}`;
  })();

  return (
    <div className="wedding-canvas selection:bg-accent/30 selection:text-primary relative min-h-screen overflow-x-hidden transition-colors duration-700">
      {!isOpened && <Envelope onOpen={handleOpenInvitation} config={config} />}

      <InstallPrompt />
      <FloatingPetals variant={config.appearance.animation} />
      <Hero config={config} />

      <main className="relative z-10 space-y-0">
        <CoupleProfile config={config} />
        <LoveStory config={config} />
        <EventDetails config={config} />
        <Gallery config={config} />
        <RSVPForm config={config} weddingSlug={weddingSlug} />
        <Wishes config={config} weddingSlug={weddingSlug} />
        <GiftInfo config={config} />
      </main>

      <MusicPlayer url={config.music.url} visible={isOpened} />
      <Navbar
        theme={theme}
        toggleTheme={toggleTheme}
        colorTheme={colorTheme}
        defaultColorTheme={config.appearance.theme}
        allowGuestThemeSwitch={config.appearance.allowGuestThemeSwitch}
        onSelectColorTheme={handleSelectColorTheme}
        onResetColorTheme={handleResetColorTheme}
      />

      <footer className="wedding-section-glow relative flex min-h-[100dvh] w-full flex-col items-center justify-center overflow-x-clip px-5 pt-20 pb-28 transition-colors duration-700 md:pt-24 md:pb-32">
        <HeartFrameWatermark />
        <BotanicalWatermark side="left" variant={config.appearance.ornament} />
        <BotanicalWatermark side="right" variant={config.appearance.ornament} />
        <div className="relative z-10 container mx-auto flex max-w-3xl flex-col items-center gap-10 text-center">
          <div className="space-y-4">
            <Heart className="text-accentDark/60 dark:text-accent/60 mx-auto h-6 w-6 animate-pulse" />
            <p className="mx-auto max-w-xl font-serif text-lg leading-relaxed text-balance text-slate-600 italic sm:text-xl dark:text-slate-300">
              &ldquo;{config.text.closing.text}&rdquo;
            </p>
            <p className="font-serif text-lg font-semibold text-primary sm:text-xl dark:text-white">
              {config.text.closing.salam}
            </p>
          </div>

          <SectionDivider />

          <div className="space-y-3">
            <p className="text-[11px] font-semibold tracking-[0.26em] text-slate-500 uppercase dark:text-slate-400">
              {config.text.closing.signature}
            </p>
            <h2 className="font-script text-5xl leading-tight text-primary sm:text-6xl md:text-7xl dark:text-white">
              {config.couple.bride.name}{" "}
              <span className="text-accentDark dark:text-accent">&amp;</span>{" "}
              {config.couple.groom.name}
            </h2>
            <p className="text-accentDark dark:text-accent text-xs font-bold tracking-[0.3em] uppercase">
              {footerDate}
            </p>
            {config.text.closing.family && (
              <p className="pt-2 text-xs text-slate-500 dark:text-slate-400">
                {config.text.closing.family}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={scrollToTop}
            aria-label="Kembali ke atas"
            className="group text-accentDark dark:text-accent mt-2 flex flex-col items-center gap-2.5 transition-all duration-500 focus:outline-none"
          >
            <div className="border-accentDark/30 group-hover:border-accentDark group-hover:bg-accentDark dark:border-accent/35 dark:group-hover:border-accent dark:group-hover:bg-accent relative flex h-11 w-11 items-center justify-center rounded-full border bg-white/70 shadow-sm backdrop-blur-md transition-all duration-500 group-hover:-translate-y-0.5 group-hover:text-white dark:bg-white/5 dark:group-hover:text-slate-950">
              <span className="border-accentDark/15 group-hover:border-accentDark/35 dark:border-accent/15 dark:group-hover:border-accent/40 pointer-events-none absolute -inset-1.5 rounded-full border transition-all duration-500 group-hover:scale-110" />
              <ChevronUp className="h-4 w-4 transition-transform duration-500 group-hover:-translate-y-0.5" />
            </div>
            <span className="from-accentDark/50 dark:from-accent/50 h-5 w-[1px] bg-gradient-to-b to-transparent transition-all duration-500 group-hover:h-6" />
            <span className="flex items-center gap-2.5 text-[10px] font-semibold tracking-[0.3em] uppercase opacity-80 transition-opacity duration-500 group-hover:opacity-100">
              <span className="bg-accentDark/35 dark:bg-accent/35 h-[1px] w-4" />
              Kembali ke Atas
              <span className="bg-accentDark/35 dark:bg-accent/35 h-[1px] w-4" />
            </span>
          </button>
        </div>
      </footer>
    </div>
  );
};

export default App;
