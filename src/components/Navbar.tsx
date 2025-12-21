import React, { useState, useEffect, useRef } from "react";
import {
  Calendar,
  Image as ImageIcon,
  MessageCircle,
  Send,
  User,
  Home,
  Moon,
  Sun,
} from "lucide-react";
interface NavbarProps {
  theme: "light" | "dark";
  toggleTheme: () => void;
}
const Navbar: React.FC<NavbarProps> = ({ theme, toggleTheme }) => {
  const [isVisible, setIsVisible] = useState(true);
  const timeoutRef = useRef<number | null>(null);
  const resetTimer = () => {
    setIsVisible(true);
    if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    timeoutRef.current = window.setTimeout(() => {
      if (window.scrollY > 100) {
        setIsVisible(false);
      }
    }, 3000);
  };
  useEffect(() => {
    const events = ["mousemove", "scroll", "touchstart", "keydown"];
    events.forEach((event) => window.addEventListener(event, resetTimer));
    resetTimer();
    return () => {
      events.forEach((event) => window.removeEventListener(event, resetTimer));
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    };
  }, []);
  const handleAction = () => {
    window.dispatchEvent(new CustomEvent("play-wedding-music"));
    resetTimer();
  };
  const navItems = [
    { icon: Home, label: "Home", href: "#" },
    { icon: User, label: "Couple", href: "#couple" },
    { icon: Calendar, label: "Events", href: "#event" },
    { icon: ImageIcon, label: "Gallery", href: "#gallery" },
    { icon: Send, label: "RSVP", href: "#rsvp" },
    { icon: MessageCircle, label: "Wishes", href: "#wishes" },
  ];
  const itemBaseClass =
    "p-3 md:p-4 rounded-full text-slate-600 dark:text-slate-300 hover:text-accent dark:hover:text-accent hover:bg-white/80 dark:hover:bg-white/10 transition-all group relative flex items-center justify-center";
  const tooltipClass =
    "absolute -top-12 left-1/2 -translate-x-1/2 bg-slate-900 dark:bg-accent text-white dark:text-slate-900 text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all whitespace-nowrap hidden md:block shadow-xl pointer-events-none";
  return (
    <nav
      className={`fixed bottom-4 md:bottom-8 left-1/2 -translate-x-1/2 z-[100] w-[95%] md:w-fit px-2 transition-all duration-700 ease-in-out pointer-events-none ${
        isVisible ? "translate-y-0 opacity-100" : "translate-y-24 opacity-0"
      }`}
    >
      <div className="bg-white/60 dark:bg-darkSurface/60 backdrop-blur-2xl border border-white/40 dark:border-white/10 rounded-full shadow-[0_20px_50px_rgba(0,0,0,0.2)] flex items-center justify-between md:justify-center gap-1 p-1.5 md:p-2 pointer-events-auto transition-colors duration-1000">
        {navItems.map((item) => (
          <a
            key={item.label}
            href={item.href}
            className={itemBaseClass}
            title={item.label}
            onClick={handleAction}
          >
            <item.icon className="w-5 h-5 md:w-6 md:h-6" />
            <span className={tooltipClass}>{item.label}</span>
          </a>
        ))}
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleTheme();
            handleAction();
          }}
          className={itemBaseClass}
          aria-label="Toggle theme"
        >
          {theme === "light" ? (
            <Moon className="w-5 h-5 md:w-6 md:h-6" />
          ) : (
            <Sun className="w-5 h-5 md:w-6 md:h-6" />
          )}
          <span className={tooltipClass}>
            {theme === "light" ? "Dark Mode" : "Light Mode"}
          </span>
        </button>
      </div>
    </nav>
  );
};
export default Navbar;
