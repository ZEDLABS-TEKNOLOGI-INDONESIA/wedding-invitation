import {
  AlertTriangle,
  CheckCircle2,
  Info,
  X,
  XCircle,
} from "lucide-react";
import React, { useEffect } from "react";

export interface ToastState {
  type: "success" | "error" | "info";
  message: string;
}

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

  const styles =
    toast.type === "success"
      ? "border-green-200 bg-green-50 text-green-800 dark:border-green-900/50 dark:bg-green-950/90 dark:text-green-200"
      : toast.type === "error"
        ? "border-red-200 bg-red-50 text-red-800 dark:border-red-900/50 dark:bg-red-950/90 dark:text-red-200"
        : "border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-900/50 dark:bg-blue-950/90 dark:text-blue-200";

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed right-4 bottom-6 z-[200] max-w-md md:right-6"
    >
      <div
        className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-medium shadow-2xl backdrop-blur-md ${styles}`}
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
          className="rounded p-1 opacity-70 hover:opacity-100"
        >
          <X className="h-4 w-4" />
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
      className="fixed inset-0 z-[150] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-700 dark:bg-slate-800">
        <div className="flex items-start gap-4">
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
              dialog.destructive !== false
                ? "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"
                : "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
            }`}
          >
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div className="space-y-1.5">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              {dialog.title}
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              {dialog.message}
            </p>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={() => {
              dialog.onConfirm();
              onClose();
            }}
            className={`rounded-xl px-5 py-2 text-xs font-bold text-white shadow-sm ${
              dialog.destructive !== false
                ? "bg-red-600 hover:bg-red-700"
                : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            {dialog.confirmLabel || "Lanjutkan"}
          </button>
        </div>
      </div>
    </div>
  );
};
