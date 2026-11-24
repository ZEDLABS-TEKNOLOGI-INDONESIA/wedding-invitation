import React, { useEffect, useState } from "react";
import { Download, Smartphone, X } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

const InstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone);
    if (isStandalone) return;

    const isDismissed = sessionStorage.getItem("pwa-prompt-dismissed");
    if (isDismissed) return;

    let showTimer: number | null = null;
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      showTimer = window.setTimeout(() => setShowPrompt(true), 3000);
    };

    const onInstalled = () => {
      setDeferredPrompt(null);
      setShowPrompt(false);
    };

    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", onInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", onInstalled);
      if (showTimer) window.clearTimeout(showTimer);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    sessionStorage.setItem("pwa-prompt-dismissed", "true");
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed right-4 bottom-24 left-4 z-[900] flex justify-center md:right-8 md:bottom-8 md:left-auto md:w-96">
      <div className="frosted-glass animate-reveal relative w-full overflow-hidden rounded-3xl border border-white/20 p-6 shadow-2xl dark:border-white/10 dark:bg-slate-900/80">
        <div className="bg-accent/10 absolute -top-10 -right-10 h-32 w-32 rounded-full blur-2xl"></div>

        <button
          type="button"
          aria-label="Tutup banner pasang aplikasi"
          onClick={handleDismiss}
          className="absolute top-4 right-4 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="relative z-10 flex gap-5">
          <div className="bg-accentDark/10 flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl dark:bg-white/10">
            <Smartphone className="text-accentDark dark:text-accent h-7 w-7 animate-pulse" />
          </div>

          <div className="space-y-2">
            <h3 className="font-serif text-xl font-bold text-slate-900 italic dark:text-white">
              Pasang Aplikasi
            </h3>
            <p className="text-xs leading-relaxed font-medium text-slate-600 dark:text-slate-400">
              Pasang undangan ini di layar utama HP Anda untuk akses lebih cepat
              dan pengalaman yang lebih lancar.
            </p>
          </div>
        </div>

        <div className="relative z-10 mt-6 flex gap-3">
          <button
            type="button"
            onClick={handleDismiss}
            className="flex-1 rounded-xl border border-slate-200 py-3 text-xs font-bold tracking-widest text-slate-600 uppercase transition-colors hover:bg-slate-50 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5"
          >
            Nanti Saja
          </button>
          <button
            type="button"
            onClick={() => void handleInstallClick()}
            className="bg-primary dark:bg-accentDark flex-1 rounded-xl py-3 text-xs font-bold tracking-widest text-white uppercase shadow-lg transition-transform active:scale-95"
          >
            <span className="flex items-center justify-center gap-2">
              <Download className="h-4 w-4" />
              Pasang
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default InstallPrompt;
