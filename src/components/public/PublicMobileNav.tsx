import { Menu, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export interface PublicNavItem {
  href: string;
  label: string;
  aktifDi?: string[];
}

interface Props {
  nav: PublicNavItem[];
  currentPath: string;
  isLoggedIn: boolean;
  dashboardHref: string;
}

export default function PublicMobileNav({
  nav,
  currentPath,
  isLoggedIn,
  dashboardHref,
}: Props) {
  const [terbuka, setTerbuka] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!terbuka) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setTerbuka(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [terbuka]);

  return (
    <div className="lg:hidden">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setTerbuka((v) => !v)}
        aria-label={terbuka ? "Tutup menu navigasi" : "Buka menu navigasi"}
        aria-expanded={terbuka}
        aria-controls="public-mobile-menu"
        className="-mr-2 flex min-h-[44px] min-w-[44px] cursor-pointer items-center justify-center rounded-md text-(--adm-text-primary) hover:bg-(--adm-bg-overlay)"
      >
        {terbuka ? (
          <X className="h-5 w-5" aria-hidden="true" />
        ) : (
          <Menu className="h-5 w-5" aria-hidden="true" />
        )}
      </button>

      {terbuka && (
        <nav
          id="public-mobile-menu"
          aria-label="Navigasi seluler"
          className="fixed inset-x-0 top-16 z-50 space-y-1 border-b border-(--adm-border) bg-(--adm-bg-secondary) px-4 py-3 shadow-(--adm-shadow-pop)"
        >
          {nav.map((item) => {
            const aktif = item.aktifDi
              ? item.aktifDi.includes(currentPath)
              : currentPath === item.href;
            return (
              <a
                key={item.href}
                href={item.href}
                aria-current={aktif ? "page" : undefined}
                onClick={() => setTerbuka(false)}
                className={`flex min-h-[44px] items-center rounded-md px-3 text-sm transition-colors ${
                  aktif
                    ? "bg-(--adm-accent-soft) font-semibold text-(--adm-accent)"
                    : "text-(--adm-text-secondary) hover:bg-(--adm-bg-overlay) hover:text-(--adm-text-primary)"
                }`}
              >
                {item.label}
              </a>
            );
          })}
          {isLoggedIn ? (
            <div className="border-t border-(--adm-border) pt-2 sm:hidden">
              <a
                href={dashboardHref}
                className="adm-btn adm-btn-primary adm-btn-block"
                onClick={() => setTerbuka(false)}
              >
                Dashboard
              </a>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2 border-t border-(--adm-border) pt-2 sm:hidden">
              <a
                href="/masuk"
                className="adm-btn adm-btn-secondary"
                onClick={() => setTerbuka(false)}
              >
                Masuk
              </a>
              <a
                href="/daftar"
                className="adm-btn adm-btn-primary"
                onClick={() => setTerbuka(false)}
              >
                Daftar
              </a>
            </div>
          )}
        </nav>
      )}
    </div>
  );
}
