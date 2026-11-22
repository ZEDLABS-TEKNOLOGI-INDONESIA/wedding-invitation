import { CheckCircle2, Info, X, XCircle } from "lucide-react";
import React, { useEffect } from "react";

export interface ToastState {
  type: "success" | "error" | "info";
  message: string;
}

/**
 * Toast mengikuti whatsapp-service (Toast.astro):
 * Posisi fixed top-4 right-4, border warna status tajam, background secondary/95 + backdrop-blur.
 */
export const ToastBanner: React.FC<{
  toast: ToastState | null;
  onClose: () => void;
}> = ({ toast, onClose }) => {
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(onClose, 4000);
    return () => window.clearTimeout(timer);
  }, [toast, onClose]);

  if (!toast) return null;

  const toneClass =
    toast.type === "success"
      ? "border-(--adm-green) text-(--adm-green)"
      : toast.type === "error"
        ? "border-(--adm-red) text-(--adm-red)"
        : "border-(--adm-accent) text-(--adm-accent)";

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed top-4 right-4 left-4 z-[200] flex flex-col items-stretch gap-2 sm:left-auto sm:max-w-sm sm:items-end"
    >
      <div
        className={`flex w-full items-center gap-2.5 rounded-md border bg-(--adm-bg-secondary)/95 px-4 py-2.5 text-[13px] font-medium break-words shadow-lg backdrop-blur-md sm:w-auto ${toneClass}`}
      >
        {toast.type === "success" ? (
          <CheckCircle2 className="h-4 w-4 shrink-0" />
        ) : toast.type === "error" ? (
          <XCircle className="h-4 w-4 shrink-0" />
        ) : (
          <Info className="h-4 w-4 shrink-0" />
        )}
        <span className="flex-1">{toast.message}</span>
        <button
          type="button"
          aria-label="Tutup notifikasi"
          onClick={onClose}
          className="rounded p-0.5 opacity-70 hover:opacity-100"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
};

export interface ConfirmDialogState {
  title: string;
  message: string;
  confirmLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
}

/**
 * ConfirmModal mengikuti whatsapp-service (ConfirmDialog.astro):
 * Modal radius 12px, padding 20px, tombol Batal outline merah tajam + Konfirmasi fill merah/biru.
 */
export const ConfirmModal: React.FC<{
  dialog: ConfirmDialogState | null;
  onClose: () => void;
}> = ({ dialog, onClose }) => {
  useEffect(() => {
    if (!dialog) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [dialog, onClose]);

  if (!dialog) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={dialog.title}
      className="adm-modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="adm-modal p-5">
        <h2 className="mb-2 text-base font-semibold text-(--adm-text-primary)">
          {dialog.title}
        </h2>
        <p className="mb-5 text-[13.5px] leading-relaxed whitespace-pre-line text-(--adm-text-secondary)">
          {dialog.message}
        </p>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="adm-btn adm-btn-outline-danger"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={() => {
              dialog.onConfirm();
              onClose();
            }}
            className={`adm-btn ${
              dialog.destructive !== false
                ? "adm-btn-danger"
                : "adm-btn-primary"
            }`}
          >
            {dialog.confirmLabel || "Konfirmasi"}
          </button>
        </div>
      </div>
    </div>
  );
};
