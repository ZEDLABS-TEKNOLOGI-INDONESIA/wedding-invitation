import { Download, X } from "lucide-react";
import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

export default function PwaInstallToast() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone);
    if (isStandalone) return;

    try {
      if (sessionStorage.getItem("wm-pwa-dismissed") === "1") return;
    } catch {
      // ignore
    }

    let timer: number | null = null;
    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      timer = window.setTimeout(() => setVisible(true), 4000);
    };
    const onInstalled = () => {
      setDeferredPrompt(null);
      setVisible(false);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
      if (timer) window.clearTimeout(timer);
    };
  }, []);

  const install = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setVisible(false);
  };

  const dismiss = () => {
    setVisible(false);
    try {
      sessionStorage.setItem("wm-pwa-dismissed", "1");
    } catch {
      // ignore
    }
  };

  if (!visible) return null;

  return (
    <div
      role="region"
      aria-label="Pasang aplikasi Wedding Management"
      className="fixed right-4 bottom-4 left-4 z-50 sm:left-auto sm:w-88"
    >
      <div className="flex items-start gap-3 rounded-xl border border-(--adm-border) bg-(--adm-bg-secondary) p-3.5 shadow-(--adm-shadow-pop)">
        <img
          src="/favicon.svg"
          alt=""
          width="36"
          height="36"
          className="mt-0.5 h-9 w-9 shrink-0 rounded-lg"
        />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-(--adm-text-primary)">
            Pasang Wedding Management
          </p>
          <p className="mt-0.5 text-[11.5px] leading-snug text-(--adm-text-secondary)">
            Akses cepat panel pasangan &amp; scanner QR Check-In langsung dari layar utama.
          </p>
          <div className="mt-2.5 flex items-center gap-2">
            <button
              type="button"
              onClick={() => void install()}
              className="adm-btn adm-btn-primary adm-btn-sm"
            >
              <Download className="h-3.5 w-3.5" aria-hidden="true" />
              Pasang
            </button>
            <button
              type="button"
              onClick={dismiss}
              className="adm-btn adm-btn-ghost adm-btn-sm"
            >
              Nanti
            </button>
          </div>
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Tutup tawaran pasang aplikasi"
          className="inline-flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded text-(--adm-text-muted) hover:bg-(--adm-bg-overlay) hover:text-(--adm-text-primary)"
        >
          <X className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
