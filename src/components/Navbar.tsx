import React, { useEffect, useRef, useState } from "react";
import {
  BookHeart,
  Calendar,
  Check,
  Gift,
  Home,
  Image as ImageIcon,
  MessageCircle,
  Moon,
  Palette,
  RotateCcw,
  Send,
  Sun,
  User,
} from "lucide-react";
import {
  PUBLIC_THEMES,
  type PublicThemeId,
} from "../utils/publicThemes";

interface NavbarProps {
  theme: "light" | "dark";
  toggleTheme: () => void;
  colorTheme: PublicThemeId;
  defaultColorTheme: PublicThemeId;
  allowGuestThemeSwitch: boolean;
  onSelectColorTheme: (theme: PublicThemeId) => void;
  onResetColorTheme: () => void;
}

const NAV_ITEMS = [
  { icon: Home, label: "Beranda", href: "#hero", sectionId: "hero" },
  { icon: User, label: "Mempelai", href: "#couple", sectionId: "couple" },
  { icon: BookHeart, label: "Kisah", href: "#story", sectionId: "story" },
  { icon: Calendar, label: "Acara", href: "#event", sectionId: "event" },
  { icon: ImageIcon, label: "Galeri", href: "#gallery", sectionId: "gallery" },
  { icon: Send, label: "RSVP", href: "#rsvp", sectionId: "rsvp" },
  {
    icon: MessageCircle,
    label: "Ucapan",
    href: "#wishes",
    sectionId: "wishes",
  },
  { icon: Gift, label: "Kado", href: "#gift", sectionId: "gift" },
];

const Navbar: React.FC<NavbarProps> = ({
  theme,
  toggleTheme,
  colorTheme,
  defaultColorTheme,
  allowGuestThemeSwitch,
  onSelectColorTheme,
  onResetColorTheme,
}) => {
  const [activeSection, setActiveSection] = useState<string>("hero");
  const [paletteOpen, setPaletteOpen] = useState(false);
  const navRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const sections = NAV_ITEMS.map((item) =>
      document.getElementById(item.sectionId)
    ).filter((el): el is HTMLElement => el !== null);

    if (sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      { rootMargin: "-40% 0px -50% 0px", threshold: 0 }
    );

    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!paletteOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setPaletteOpen(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPaletteOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKey);
    };
  }, [paletteOpen]);

  const tooltipClass =
    "pointer-events-none absolute -top-12 left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded-lg bg-slate-900 px-3 py-1.5 text-[11px] font-bold tracking-widest text-white uppercase opacity-0 shadow-xl transition-all group-hover:opacity-100 md:block dark:bg-accent dark:text-slate-900";

  return (
    <nav
      ref={navRef}
      aria-label="Navigasi utama undangan"
      className="pointer-events-none fixed bottom-4 left-1/2 z-[100] w-[96%] max-w-xl -translate-x-1/2 px-1 transition-all duration-500 md:bottom-8 md:w-fit md:max-w-none"
    >
      {/* Popover Pemilih Tema Warna Publik */}
      {allowGuestThemeSwitch && paletteOpen && (
        <div
          role="dialog"
          aria-label="Pilih tema warna undangan"
          className="frosted-glass animate-reveal pointer-events-auto absolute right-1 bottom-full mb-3 w-64 rounded-2xl border border-white/40 p-3 shadow-2xl md:right-0 dark:border-white/10"
        >
          <div className="mb-2 flex items-center justify-between px-1">
            <span className="text-[11px] font-bold tracking-widest text-slate-600 uppercase dark:text-slate-300">
              Nuansa Warna
            </span>
            {colorTheme !== defaultColorTheme && (
              <button
                type="button"
                onClick={onResetColorTheme}
                className="text-accentDark dark:text-accent inline-flex items-center gap-1 text-[10px] font-semibold hover:underline"
              >
                <RotateCcw className="h-3 w-3" /> Reset
              </button>
            )}
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {PUBLIC_THEMES.map((item) => {
              const active = colorTheme === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelectColorTheme(item.id)}
                  className={`flex items-center gap-2 rounded-xl border px-2.5 py-2 text-left transition-all ${
                    active
                      ? "border-accentDark dark:border-accent bg-white/90 shadow-xs dark:bg-white/10"
                      : "border-transparent bg-white/40 hover:bg-white/80 dark:bg-white/5 dark:hover:bg-white/10"
                  }`}
                >
                  <span
                    className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-black/10 shadow-xs"
                    style={{
                      background: `linear-gradient(135deg, ${item.colors.accentDark} 0%, ${item.colors.accent} 100%)`,
                    }}
                  >
                    {active && <Check className="h-3 w-3 text-white" />}
                  </span>
                  <span className="truncate text-[11px] font-semibold text-slate-800 dark:text-slate-100">
                    {item.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="dark:bg-darkSurface/75 pointer-events-auto flex items-center justify-between gap-0.5 overflow-x-auto rounded-full border border-white/40 bg-white/75 p-1.5 shadow-[0_20px_50px_rgba(0,0,0,0.2)] backdrop-blur-2xl transition-colors duration-500 md:justify-center md:gap-1 md:p-2 dark:border-white/10">
        {NAV_ITEMS.map((item) => {
          const isActive = activeSection === item.sectionId;
          return (
            <a
              key={item.label}
              href={item.href}
              aria-label={item.label}
              aria-current={isActive ? "location" : undefined}
              title={item.label}
              className={`group relative flex shrink-0 items-center justify-center rounded-full p-2.5 transition-all md:p-3.5 ${
                isActive
                  ? "bg-primary dark:bg-accent text-white shadow-md dark:text-slate-950"
                  : "hover:text-accentDark dark:hover:text-accent text-slate-600 hover:bg-white/80 dark:text-slate-300 dark:hover:bg-white/10"
              }`}
            >
              <item.icon className="h-4 w-4 md:h-5 md:w-5" />
              <span className={tooltipClass}>{item.label}</span>
            </a>
          );
        })}

        {allowGuestThemeSwitch && (
          <button
            type="button"
            onClick={() => setPaletteOpen((prev) => !prev)}
            aria-expanded={paletteOpen}
            aria-label="Ubah tema warna undangan"
            title="Tema Warna"
            className={`group relative flex shrink-0 items-center justify-center rounded-full p-2.5 transition-all md:p-3.5 ${
              paletteOpen
                ? "bg-primary dark:bg-accent text-white shadow-md dark:text-slate-950"
                : "hover:text-accentDark dark:hover:text-accent text-slate-600 hover:bg-white/80 dark:text-slate-300 dark:hover:bg-white/10"
            }`}
          >
            <Palette className="h-4 w-4 md:h-5 md:w-5" />
            <span className={tooltipClass}>Tema Warna</span>
          </button>
        )}

        <button
          type="button"
          onClick={toggleTheme}
          className="group hover:text-accentDark dark:hover:text-accent relative flex shrink-0 items-center justify-center rounded-full p-2.5 text-slate-600 transition-all hover:bg-white/80 md:p-3.5 dark:text-slate-300 dark:hover:bg-white/10"
          aria-label={
            theme === "light" ? "Aktifkan mode gelap" : "Aktifkan mode terang"
          }
          title={theme === "light" ? "Mode Gelap" : "Mode Terang"}
        >
          {theme === "light" ? (
            <Moon className="h-4 w-4 md:h-5 md:w-5" />
          ) : (
            <Sun className="h-4 w-4 md:h-5 md:w-5" />
          )}
          <span className={tooltipClass}>
            {theme === "light" ? "Mode Gelap" : "Mode Terang"}
          </span>
        </button>
      </div>
    </nav>
  );
};

export default Navbar;
