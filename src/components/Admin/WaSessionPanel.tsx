import {
  AlertTriangle,
  CheckCircle2,
  Copy,
  KeyRound,
  Loader2,
  LogOut,
  QrCode,
  RefreshCcw,
  Smartphone,
  Sparkles,
  Trash2,
  X,
  XCircle,
} from "lucide-react";
import React, { useCallback, useEffect, useRef, useState } from "react";

interface WaSessionRow {
  id: string;
  nomor?: string;
  nama?: string;
  status: string;
  metode_auth?: string;
  label_warmup?: string;
}

interface WaSessionPanelProps {
  baseUrl: string;
  apiKey: string;
  apiSecret: string;
  defaultLabel: string;
  onCredentialsProvisioned: (keyId: string, secret: string) => void;
  onNotify: (toast: { type: "success" | "error"; message: string }) => void;
}

const SESSION_BADGE: Record<string, { label: string; className: string }> = {
  ready: { label: "Terhubung", className: "adm-badge adm-badge-success" },
  connecting: {
    label: "Menghubungkan",
    className: "adm-badge adm-badge-accent",
  },
  qr_pending: {
    label: "Menunggu Pindai QR",
    className: "adm-badge adm-badge-warning",
  },
  pairing_pending: {
    label: "Menunggu Pairing",
    className: "adm-badge adm-badge-warning",
  },
  logged_out: { label: "Terputus", className: "adm-badge adm-badge-danger" },
  disconnected: { label: "Terputus", className: "adm-badge adm-badge-danger" },
  failed: {
    label: "Kedaluwarsa / Gagal",
    className: "adm-badge adm-badge-danger",
  },
};

const WaSessionPanel: React.FC<WaSessionPanelProps> = ({
  baseUrl,
  apiKey,
  apiSecret,
  defaultLabel,
  onCredentialsProvisioned,
  onNotify,
}) => {
  const [sessions, setSessions] = useState<WaSessionRow[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [linkMode, setLinkMode] = useState<"qr" | "pairing">("qr");
  const [sessionName, setSessionName] = useState(
    defaultLabel || "Nomor Undangan Utama"
  );
  const [pairingPhone, setPairingPhone] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const [activeQrSesiId, setActiveQrSesiId] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [qrStatusText, setQrStatusText] = useState<string>("");
  const [qrOutcome, setQrOutcome] = useState<"idle" | "success" | "failed">(
    "idle"
  );
  const [pairingCode, setPairingCode] = useState<string>("");
  const [panelAlert, setPanelAlert] = useState<{
    type: "warning" | "error";
    title: string;
    message: string;
  } | null>(null);
  const pollTimerRef = useRef<number | null>(null);

  const isConfigured = Boolean(
    baseUrl.trim() && apiKey.trim() && apiSecret.trim()
  );

  const formatBrowserFetchError = (err: unknown, fallback: string): string => {
    if (err instanceof Error) {
      const m = err.message.toLowerCase();
      if (
        m.includes("failed to fetch") ||
        m.includes("networkerror") ||
        m.includes("load failed")
      ) {
        return "Gagal menjangkau server aplikasi atau permintaan diblokir jaringan/CORS. Periksa koneksi internet dan pastikan server aktif.";
      }
      if (err.message.trim()) return err.message.trim();
    }
    return fallback;
  };

  const loadSessions = useCallback(async () => {
    setLoadingList(true);
    try {
      const res = await fetch("/api/whatsapp/sessions", {
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && Array.isArray(data.sessions)) {
        setSessions(data.sessions);
        setPanelAlert(null);
      } else if (!res.ok) {
        const msg =
          data?.error ||
          `Gagal memuat daftar sesi WhatsApp (HTTP ${res.status}).`;
        setPanelAlert({
          type: res.status === 403 || res.status === 401 ? "warning" : "error",
          title:
            res.status === 403
              ? "Pembatasan Akses / Domain Gateway"
              : res.status === 401
                ? "Kredensial API Key Tidak Valid"
                : "Gagal Terhubung ke WhatsApp Gateway",
          message: msg,
        });
      }
    } catch (err) {
      setPanelAlert({
        type: "error",
        title: "Koneksi ke Server Bermasalah",
        message: formatBrowserFetchError(
          err,
          "Gagal memuat daftar nomor WhatsApp dari server."
        ),
      });
    } finally {
      setLoadingList(false);
    }
  }, []);

  useEffect(() => {
    if (isConfigured) {
      void loadSessions();
    }
  }, [isConfigured, loadSessions]);

  const stopPolling = useCallback(() => {
    if (pollTimerRef.current) {
      window.clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  useEffect(() => () => stopPolling(), [stopPolling]);

  const startPollingSesi = useCallback(
    (sesiId: string) => {
      stopPolling();
      setActiveQrSesiId(sesiId);

      const pollOnce = async () => {
        try {
          const res = await fetch(
            `/api/whatsapp/sessions?sesi_id=${encodeURIComponent(sesiId)}`,
            { credentials: "include" }
          );
          const data = await res.json().catch(() => ({}));
          if (!res.ok) return;

          if (data.qrDataUrl) {
            setQrDataUrl(data.qrDataUrl);
            setQrOutcome("idle");
            setQrStatusText("Pindai QR ini dari WhatsApp → Perangkat Tertaut");
          } else if (data.sesi_status === "ready") {
            setQrOutcome("success");
            setQrStatusText("Nomor WhatsApp berhasil terhubung!");
            setQrDataUrl("");
            setPairingCode("");
            setActiveQrSesiId(null);
            stopPolling();
            onNotify({
              type: "success",
              message:
                "Nomor WhatsApp berhasil ditautkan dan siap mengirim pesan!",
            });
            await loadSessions();
          } else if (data.proses_berjalan === false) {
            setQrOutcome("failed");
            setQrDataUrl("");
            setPairingCode("");
            const reason =
              typeof data.alasan_gagal === "string" && data.alasan_gagal.trim()
                ? data.alasan_gagal.trim()
                : "Waktu pindai QR habis atau penautan dibatalkan. Klik tombol di atas untuk membuat QR / Kode Pairing baru.";
            setQrStatusText(reason);
            onNotify({
              type: "error",
              message: reason,
            });
            setActiveQrSesiId(null);
            stopPolling();
            await loadSessions();
          }
        } catch {
          // abaikan galat sementara polling
        }
      };

      void pollOnce();
      pollTimerRef.current = window.setInterval(() => {
        void pollOnce();
      }, 2500);
    },
    [loadSessions, onNotify, stopPolling]
  );

  const handleAutoRegister = async () => {
    if (!baseUrl.trim()) {
      onNotify({
        type: "error",
        message: "Isi URL WhatsApp Gateway terlebih dahulu.",
      });
      return;
    }
    setBusy("register");
    setPanelAlert(null);
    try {
      const res = await fetch("/api/whatsapp/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          action: "auto_register",
          baseUrl: baseUrl.trim(),
          nama: sessionName.trim() || defaultLabel,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.key_id && data.secret) {
        onCredentialsProvisioned(data.key_id, data.secret);
        setPanelAlert(null);
        onNotify({
          type: "success",
          message: `Akun otomatis terdaftar (${data.nama_akun})${data.templates_synced ? " & 5 template tersinkron" : ""}. Sekarang Anda dapat langsung menautkan nomor WhatsApp!`,
        });
        await loadSessions();
      } else {
        const msg = data?.error || "Gagal mendaftarkan akun/instansi otomatis.";
        setPanelAlert({
          type: res.status === 403 ? "warning" : "error",
          title:
            res.status === 403
              ? "Pendaftaran Dibatasi oleh Domain / CORS Gateway"
              : "Gagal Membuat Akun / Instansi Otomatis",
          message: msg,
        });
        onNotify({
          type: "error",
          message: msg,
        });
      }
    } catch (err) {
      const msg = formatBrowserFetchError(
        err,
        "Gagal menghubungi server saat mendaftarkan akun otomatis."
      );
      setPanelAlert({
        type: "error",
        title: "Koneksi Gagal",
        message: msg,
      });
      onNotify({ type: "error", message: msg });
    } finally {
      setBusy(null);
    }
  };

  const handleStartQr = async () => {
    if (!baseUrl.trim()) {
      onNotify({
        type: "error",
        message: "Isi URL WhatsApp Gateway terlebih dahulu.",
      });
      return;
    }
    setBusy("qr");
    setPanelAlert(null);
    setPairingCode("");
    setQrDataUrl("");
    setQrOutcome("idle");
    setQrStatusText("Menyiapkan kode QR dari WhatsApp Gateway...");
    try {
      const res = await fetch("/api/whatsapp/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          action: "start_qr",
          baseUrl: baseUrl.trim(),
          keyId: apiKey.trim() || undefined,
          secret: apiSecret.trim() || undefined,
          nama: sessionName.trim() || "Nomor Undangan Utama",
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.sesi_id) {
        if (data.autoRegistered && data.key_id && data.secret) {
          onCredentialsProvisioned(data.key_id, data.secret);
        }
        startPollingSesi(data.sesi_id);
      } else {
        setQrStatusText("");
        const msg = data?.error || "Gagal memulai penautan QR.";
        setPanelAlert({
          type: res.status === 403 ? "warning" : "error",
          title:
            res.status === 403
              ? "Akses Dibatasi oleh WhatsApp Gateway"
              : "Gagal Membuat QR Tautan",
          message: msg,
        });
        onNotify({
          type: "error",
          message: msg,
        });
      }
    } catch (err) {
      setQrStatusText("");
      const msg = formatBrowserFetchError(
        err,
        "Gagal menghubungi server saat membuat QR tautan."
      );
      setPanelAlert({
        type: "error",
        title: "Koneksi Gagal",
        message: msg,
      });
      onNotify({ type: "error", message: msg });
    } finally {
      setBusy(null);
    }
  };

  const handleStartPairing = async () => {
    if (!baseUrl.trim() || !pairingPhone.trim()) {
      onNotify({
        type: "error",
        message: "Isi URL Gateway dan nomor WhatsApp yang akan ditautkan.",
      });
      return;
    }
    setBusy("pairing");
    setPanelAlert(null);
    setQrDataUrl("");
    setPairingCode("");
    setQrOutcome("idle");
    try {
      const res = await fetch("/api/whatsapp/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          action: "start_pairing",
          baseUrl: baseUrl.trim(),
          keyId: apiKey.trim() || undefined,
          secret: apiSecret.trim() || undefined,
          phone: pairingPhone.trim(),
          nama: sessionName.trim() || "Nomor Undangan Utama",
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.sesi_id) {
        if (data.autoRegistered && data.key_id && data.secret) {
          onCredentialsProvisioned(data.key_id, data.secret);
        }
        setPairingCode(data.kode_pairing || "");
        setQrStatusText(
          "Masukkan kode 8 digit di WhatsApp → Perangkat Tertaut → Tautkan dengan Nomor Telepon."
        );
        startPollingSesi(data.sesi_id);
      } else {
        const msg = data?.error || "Gagal meminta kode pairing.";
        setPanelAlert({
          type: res.status === 403 ? "warning" : "error",
          title:
            res.status === 403
              ? "Akses Dibatasi oleh WhatsApp Gateway"
              : "Gagal Meminta Kode Pairing",
          message: msg,
        });
        onNotify({
          type: "error",
          message: msg,
        });
      }
    } catch (err) {
      const msg = formatBrowserFetchError(
        err,
        "Gagal menghubungi server saat meminta kode pairing."
      );
      setPanelAlert({
        type: "error",
        title: "Koneksi Gagal",
        message: msg,
      });
      onNotify({ type: "error", message: msg });
    } finally {
      setBusy(null);
    }
  };

  const handleSessionAction = async (
    sesiId: string,
    action: "logout" | "delete"
  ) => {
    setBusy(`${action}-${sesiId}`);
    try {
      const res = await fetch("/api/whatsapp/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action, sesiId }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        onNotify({
          type: "success",
          message:
            action === "logout"
              ? "Nomor WhatsApp berhasil diputuskan."
              : "Sesi WhatsApp dihapus permanen.",
        });
        await loadSessions();
      } else {
        onNotify({
          type: "error",
          message: data?.error || "Gagal memproses aksi sesi.",
        });
      }
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-4 rounded-lg border border-(--adm-border) bg-(--adm-bg-primary) p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h4 className="flex items-center gap-1.5 text-[13px] font-semibold text-(--adm-text-primary)">
            <Smartphone className="h-4 w-4 text-(--adm-accent)" />
            Tautkan Nomor WhatsApp Langsung (QR / Pairing Code)
          </h4>
          <p className="adm-hint mt-0.5">
            Tautkan nomor pengirim undangan langsung dari sini | akun &amp; API
            Key otomatis didaftarkan ke WhatsApp Service tanpa perlu membuat
            instansi manual.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {!isConfigured && (
            <button
              type="button"
              disabled={busy !== null || !baseUrl.trim()}
              onClick={() => void handleAutoRegister()}
              className="adm-btn adm-btn-primary adm-btn-sm"
            >
              {busy === "register" ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Sparkles className="h-3.5 w-3.5" />
              )}
              Daftar Akun Otomatis
            </button>
          )}
          {isConfigured && (
            <button
              type="button"
              disabled={loadingList}
              onClick={() => void loadSessions()}
              className="adm-btn adm-btn-secondary adm-btn-sm"
            >
              <RefreshCcw
                className={`h-3.5 w-3.5 ${loadingList ? "animate-spin" : ""}`}
              />
              Muat Ulang
            </button>
          )}
        </div>
      </div>

      {/* Peringatan / Galat Kontekstual */}
      {panelAlert && (
        <div
          role="alert"
          className={`flex items-start justify-between gap-3 rounded-lg border px-3.5 py-2.5 text-xs ${
            panelAlert.type === "warning"
              ? "border-amber-500/40 bg-amber-500/10 text-amber-200"
              : "border-red-500/40 bg-red-500/10 text-red-200"
          }`}
        >
          <div className="flex items-start gap-2.5">
            {panelAlert.type === "warning" ? (
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
            ) : (
              <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
            )}
            <div className="space-y-0.5">
              <div className="font-semibold">{panelAlert.title}</div>
              <p className="leading-relaxed opacity-90">{panelAlert.message}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setPanelAlert(null)}
            aria-label="Tutup peringatan"
            className="rounded p-0.5 opacity-70 hover:opacity-100"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Daftar Nomor Tertaut */}
      {isConfigured && (
        <div className="space-y-2">
          <div className="text-[11px] font-semibold tracking-wide text-(--adm-text-secondary) uppercase">
            Nomor WhatsApp Tertaut ({sessions.length})
          </div>
          {sessions.length === 0 ? (
            <p className="rounded-md border border-dashed border-(--adm-border) bg-(--adm-bg-secondary) p-3 text-xs text-(--adm-text-secondary)">
              Belum ada nomor WhatsApp tertaut pada akun ini. Tautkan nomor baru
              di bawah menggunakan Scan QR atau Kode Pairing.
            </p>
          ) : (
            <div className="divide-y divide-(--adm-border) rounded-md border border-(--adm-border) bg-(--adm-bg-secondary)">
              {sessions.map((s) => {
                const badge = SESSION_BADGE[s.status] || {
                  label: s.status,
                  className: "adm-badge",
                };
                return (
                  <div
                    key={s.id}
                    className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 text-xs"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-(--adm-text-primary)">
                          {s.nama || "Sesi WhatsApp"}
                        </span>
                        <span className={badge.className}>{badge.label}</span>
                      </div>
                      <div className="mt-0.5 font-mono text-[11px] text-(--adm-text-secondary)">
                        {s.nomor || "Menunggu penautan nomor..."}
                        {s.label_warmup ? ` · ${s.label_warmup}` : ""}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {s.status === "ready" && (
                        <button
                          type="button"
                          title="Putuskan sesi"
                          disabled={busy !== null}
                          onClick={() =>
                            void handleSessionAction(s.id, "logout")
                          }
                          className="adm-btn-aksi aksi-netral"
                        >
                          <LogOut className="h-3.5 w-3.5" />
                        </button>
                      )}
                      <button
                        type="button"
                        title="Hapus sesi"
                        disabled={busy !== null}
                        onClick={() => void handleSessionAction(s.id, "delete")}
                        className="adm-btn-aksi aksi-hapus"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Form Tautkan Nomor Baru */}
      <div className="space-y-3 border-t border-(--adm-border) pt-3">
        <div className="adm-seg grid w-full grid-cols-2 sm:inline-flex sm:w-auto">
          <button
            type="button"
            onClick={() => setLinkMode("qr")}
            className={`adm-seg-btn justify-center ${linkMode === "qr" ? "is-active" : ""}`}
          >
            <QrCode className="h-3.5 w-3.5 shrink-0" /> Scan QR Code
          </button>
          <button
            type="button"
            onClick={() => setLinkMode("pairing")}
            className={`adm-seg-btn justify-center ${linkMode === "pairing" ? "is-active" : ""}`}
          >
            <KeyRound className="h-3.5 w-3.5 shrink-0" /> Kode Pairing
          </button>
        </div>

        <div className="grid gap-3 sm:grid-cols-12">
          <div
            className={
              linkMode === "pairing" ? "sm:col-span-4" : "sm:col-span-7"
            }
          >
            <label htmlFor="wa-sesi-name" className="adm-label">
              Label Perangkat / Sesi
            </label>
            <input
              id="wa-sesi-name"
              type="text"
              value={sessionName}
              onChange={(e) => setSessionName(e.target.value)}
              placeholder="Contoh: Nomor Undangan Utama"
              className="adm-input bg-(--adm-bg-secondary)"
            />
          </div>

          {linkMode === "pairing" && (
            <div className="sm:col-span-4">
              <label htmlFor="wa-pair-phone" className="adm-label">
                Nomor WhatsApp *
              </label>
              <input
                id="wa-pair-phone"
                type="tel"
                inputMode="tel"
                value={pairingPhone}
                onChange={(e) => setPairingPhone(e.target.value)}
                placeholder="081234567890"
                className="adm-input bg-(--adm-bg-secondary)"
              />
            </div>
          )}

          <div
            className={`flex items-end ${linkMode === "pairing" ? "sm:col-span-4" : "sm:col-span-5"}`}
          >
            {linkMode === "qr" ? (
              <button
                type="button"
                disabled={busy !== null || !baseUrl.trim()}
                onClick={() => void handleStartQr()}
                className="adm-btn adm-btn-edit w-full"
              >
                {busy === "qr" ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <QrCode className="h-3.5 w-3.5" />
                )}
                Buat QR Tautan
              </button>
            ) : (
              <button
                type="button"
                disabled={
                  busy !== null || !baseUrl.trim() || !pairingPhone.trim()
                }
                onClick={() => void handleStartPairing()}
                className="adm-btn adm-btn-edit w-full"
              >
                {busy === "pairing" ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <KeyRound className="h-3.5 w-3.5" />
                )}
                Minta Kode Pairing
              </button>
            )}
          </div>
        </div>

        {/* Tampilan QR Code atau Kode Pairing aktif */}
        {(qrDataUrl || pairingCode || activeQrSesiId || qrStatusText) && (
          <div className="flex flex-col items-center gap-2.5 rounded-lg border border-(--adm-border) bg-(--adm-bg-secondary) p-4 text-center">
            {qrDataUrl && (
              <img
                src={qrDataUrl}
                alt="QR Code Tautan WhatsApp"
                className="h-56 w-56 rounded-lg border border-(--adm-border) bg-white p-2 shadow-xs"
              />
            )}
            {pairingCode && (
              <div className="space-y-1.5">
                <div className="font-mono text-2xl font-bold tracking-[0.25em] text-(--adm-accent)">
                  {pairingCode}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    void navigator.clipboard.writeText(pairingCode);
                    onNotify({
                      type: "success",
                      message: "Kode pairing disalin ke clipboard.",
                    });
                  }}
                  className="adm-btn adm-btn-secondary adm-btn-sm"
                >
                  <Copy className="h-3.5 w-3.5" /> Salin Kode
                </button>
              </div>
            )}
            {!qrDataUrl && !pairingCode && activeQrSesiId && (
              <Loader2 className="h-6 w-6 animate-spin text-(--adm-accent)" />
            )}
            {qrStatusText && (
              <p
                className={`flex items-center gap-1.5 text-xs ${
                  qrOutcome === "failed"
                    ? "text-(--adm-red)"
                    : qrOutcome === "success"
                      ? "text-(--adm-green)"
                      : "text-(--adm-text-secondary)"
                }`}
              >
                {qrOutcome === "success" && (
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-(--adm-green)" />
                )}
                {qrOutcome === "failed" && (
                  <XCircle className="h-3.5 w-3.5 shrink-0 text-(--adm-red)" />
                )}
                <span>{qrStatusText}</span>
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default WaSessionPanel;
