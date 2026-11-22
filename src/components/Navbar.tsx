import React, { useEffect, useState } from "react";
import {
  BookHeart,
  Calendar,
  Gift,
  Home,
  Image as ImageIcon,
  MessageCircle,
  Moon,
  Send,
  Sun,
  User,
} from "lucide-react";

interface NavbarProps {
  theme: "light" | "dark";
  toggleTheme: () => void;
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

const Navbar: React.FC<NavbarProps> = ({ theme, toggleTheme }) => {
  const [activeSection, setActiveSection] = useState<string>("hero");

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

  const tooltipClass =
    "pointer-events-none absolute -top-12 left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded-lg bg-slate-900 px-3 py-1.5 text-[11px] font-bold tracking-widest text-white uppercase opacity-0 shadow-xl transition-all group-hover:opacity-100 md:block dark:bg-accent dark:text-slate-900";

  return (
    <nav
      aria-label="Navigasi utama undangan"
      className="pointer-events-none fixed bottom-4 left-1/2 z-[100] w-[96%] max-w-xl -translate-x-1/2 px-1 transition-all duration-500 md:bottom-8 md:w-fit md:max-w-none"
    >
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
