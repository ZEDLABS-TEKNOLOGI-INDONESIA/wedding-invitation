import {
  CheckCircle2,
  ExternalLink,
  Heart,
  KeyRound,
  Loader2,
  LogOut,
  MessageSquare,
  RefreshCcw,
  Shield,
  ShieldAlert,
  Trash2,
  Users,
  XCircle,
} from "lucide-react";
import React, { useCallback, useEffect, useState } from "react";

interface MemberRow {
  id: number;
  username: string;
  role: string;
  full_name: string;
  phone: string;
  status: string;
}

interface WeddingRow {
  id: number;
  slug: string;
  title: string;
  status: "active" | "suspended";
  is_demo: number;
  created_at: string;
  publicUrl: string;
  rsvpCount: number;
  guestCount: number;
  members: MemberRow[];
}

interface SuperadminData {
  stats: {
    totalWeddings: number;
    activeWeddings: number;
    totalUsers: number;
    totalRsvps: number;
  };
  weddings: WeddingRow[];
  platformConfig: Record<string, string>;
  currentAdmin: {
    userId: number;
    username: string;
    fullName: string;
    phone: string;
  };
}

const SuperadminDashboard: React.FC = () => {
  const [data, setData] = useState<SuperadminData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"weddings" | "platform_wa" | "account">(
    "weddings"
  );
  const [toast, setToast] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  // Platform WA form
  const [waForm, setWaForm] = useState({
    PLATFORM_NAME: "Wedding SaaS",
    WA_BASE_URL: "https://whatsapp.zedlabs.id",
    WA_API_KEY: "",
    WA_API_SECRET: "",
  });

  // Superadmin account form
  const [accForm, setAccForm] = useState({
    username: "",
    fullName: "",
    phone: "",
    currentPassword: "",
    newPassword: "",
  });

  const notify = (type: "success" | "error", message: string) => {
    setToast({ type, message });
    window.setTimeout(() => {
      setToast((prev) => (prev?.message === message ? null : prev));
    }, 6000);
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/superadmin", { credentials: "include" });
      if (res.status === 401 || res.status === 403) {
        window.location.href = "/masuk";
        return;
      }
      const json = (await res.json()) as SuperadminData;
      setData(json);
      setWaForm({
        PLATFORM_NAME: json.platformConfig.PLATFORM_NAME || "Wedding SaaS",
        WA_BASE_URL:
          json.platformConfig.WA_BASE_URL || "https://whatsapp.zedlabs.id",
        WA_API_KEY: json.platformConfig.WA_API_KEY || "",
        WA_API_SECRET: json.platformConfig.WA_API_SECRET || "",
      });
      setAccForm((prev) => ({
        ...prev,
        username: json.currentAdmin.username || "",
        fullName: json.currentAdmin.fullName || "",
        phone: json.currentAdmin.phone || "",
      }));
    } catch {
      notify("error", "Gagal memuat data Superadmin.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const callAction = async (
    key: string,
    payload: Record<string, unknown>,
    successMsg?: string
  ) => {
    setBusy(key);
    try {
      const res = await fetch("/api/superadmin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        notify("error", json.error || "Permintaan gagal diproses.");
        return null;
      }
      if (successMsg) notify("success", successMsg);
      return json;
    } catch {
      notify("error", "Gagal terhubung ke server.");
      return null;
    } finally {
      setBusy(null);
    }
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    window.location.href = "/masuk";
  };

  return (
    <div className="admin-shell min-h-dvh bg-(--adm-bg-secondary) text-(--adm-text-primary)">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-(--adm-border) bg-(--adm-bg-secondary)/95 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-(--adm-accent-soft) text-(--adm-accent)">
              <Shield className="h-4 w-4" />
            </span>
            <div>
              <div className="text-sm font-semibold text-(--adm-text-primary)">
                Superadmin Platform
              </div>
              <div className="text-[11px] text-(--adm-text-secondary)">
                {data?.currentAdmin.username || "superadmin"} · Kelola SaaS Undangan
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a href="/" className="adm-btn adm-btn-secondary adm-btn-sm">
              Beranda
            </a>
            <a href="/demo" target="_blank" className="adm-btn adm-btn-secondary adm-btn-sm">
              Demo Publik
            </a>
            <button
              type="button"
              onClick={() => void handleLogout()}
              className="adm-btn adm-btn-danger adm-btn-sm"
            >
              <LogOut className="h-3.5 w-3.5" />
              Keluar
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-5 px-4 py-6">
        {toast && (
          <div
            className={`flex items-center gap-2.5 rounded-lg border px-4 py-3 text-xs font-medium ${
              toast.type === "success"
                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                : "border-red-500/40 bg-red-500/10 text-red-200"
            }`}
          >
            {toast.type === "success" ? (
              <CheckCircle2 className="h-4 w-4 shrink-0" />
            ) : (
              <XCircle className="h-4 w-4 shrink-0" />
            )}
            <span>{toast.message}</span>
          </div>
        )}

        {/* Stats */}
        {data && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="adm-card p-4">
              <div className="text-xs text-(--adm-text-secondary)">Total Undangan</div>
              <div className="mt-1 text-2xl font-bold">{data.stats.totalWeddings}</div>
            </div>
            <div className="adm-card p-4">
              <div className="text-xs text-(--adm-text-secondary)">Undangan Aktif</div>
              <div className="mt-1 text-2xl font-bold text-(--adm-green)">
                {data.stats.activeWeddings}
              </div>
            </div>
            <div className="adm-card p-4">
              <div className="text-xs text-(--adm-text-secondary)">Akun Pasangan</div>
              <div className="mt-1 text-2xl font-bold text-(--adm-accent)">
                {data.stats.totalUsers}
              </div>
            </div>
            <div className="adm-card p-4">
              <div className="text-xs text-(--adm-text-secondary)">Total RSVP</div>
              <div className="mt-1 text-2xl font-bold">{data.stats.totalRsvps}</div>
            </div>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setTab("weddings")}
            className={`adm-btn adm-btn-sm ${tab === "weddings" ? "adm-btn-primary" : "adm-btn-secondary"}`}
          >
            <Users className="h-3.5 w-3.5" />
            Daftar Pasangan &amp; Undangan
          </button>
          <button
            type="button"
            onClick={() => setTab("platform_wa")}
            className={`adm-btn adm-btn-sm ${tab === "platform_wa" ? "adm-btn-primary" : "adm-btn-secondary"}`}
          >
            <MessageSquare className="h-3.5 w-3.5" />
            WhatsApp Gateway OTP Platform
          </button>
          <button
            type="button"
            onClick={() => setTab("account")}
            className={`adm-btn adm-btn-sm ${tab === "account" ? "adm-btn-primary" : "adm-btn-secondary"}`}
          >
            <KeyRound className="h-3.5 w-3.5" />
            Akun Superadmin
          </button>
        </div>

        {loading && !data ? (
          <div className="adm-card flex items-center justify-center gap-2 p-10 text-xs text-(--adm-text-secondary)">
            <Loader2 className="h-4 w-4 animate-spin" />
            Memuat data platform...
          </div>
        ) : tab === "weddings" && data ? (
          <div className="adm-card overflow-hidden">
            <div className="flex items-center justify-between border-b border-(--adm-border) px-4 py-3">
              <div>
                <h2 className="text-sm font-semibold">Tenant Undangan Pasangan</h2>
                <p className="text-xs text-(--adm-text-secondary)">
                  Setiap pasangan memiliki ruang data &amp; URL publik terisolasi penuh.
                </p>
              </div>
              <button
                type="button"
                onClick={() => void loadData()}
                className="adm-btn adm-btn-secondary adm-btn-sm"
              >
                <RefreshCcw className="h-3.5 w-3.5" />
                Muat Ulang
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-(--adm-border) bg-(--adm-bg-primary) text-[11px] text-(--adm-text-secondary) uppercase">
                  <tr>
                    <th className="px-4 py-3">Undangan &amp; URL</th>
                    <th className="px-4 py-3">Akun Pasangan</th>
                    <th className="px-4 py-3">Tamu / RSVP</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-(--adm-border)">
                  {data.weddings.map((w) => (
                    <tr key={w.id} className="hover:bg-(--adm-bg-primary)/40">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 font-semibold text-(--adm-text-primary)">
                          <Heart className="h-3.5 w-3.5 text-(--adm-accent)" />
                          <span>{w.title}</span>
                          {w.is_demo === 1 && (
                            <span className="adm-badge adm-badge-accent">Demo</span>
                          )}
                        </div>
                        <a
                          href={w.publicUrl}
                          target="_blank"
                          className="mt-0.5 inline-flex items-center gap-1 font-mono text-[11px] text-(--adm-accent) hover:underline"
                        >
                          {w.publicUrl}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </td>
                      <td className="px-4 py-3">
                        {w.members.length === 0 ? (
                          <span className="text-(--adm-text-secondary)">
                            Dikelola Superadmin
                          </span>
                        ) : (
                          <div className="space-y-1">
                            {w.members.map((m) => (
                              <div key={m.id} className="flex items-center gap-1.5">
                                <span className="font-mono font-semibold text-(--adm-text-primary)">
                                  {m.username}
                                </span>
                                <span className="adm-badge">
                                  {m.role === "couple_owner" ? "Utama" : "Pasangan"}
                                </span>
                                {m.phone && (
                                  <span className="text-[11px] text-(--adm-text-secondary)">
                                    ({m.phone})
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 tabular-nums">
                        <div>{w.guestCount} tamu</div>
                        <div className="text-(--adm-text-secondary)">
                          {w.rsvpCount} RSVP
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`adm-badge ${
                            w.status === "active"
                              ? "adm-badge-success"
                              : "adm-badge-danger"
                          }`}
                        >
                          {w.status === "active" ? "Aktif" : "Nonaktif"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            disabled={busy !== null}
                            onClick={async () => {
                              const res = await callAction(`imp-${w.id}`, {
                                action: "impersonate",
                                weddingId: w.id,
                              });
                              if (res?.redirectTo) {
                                window.location.href = res.redirectTo;
                              }
                            }}
                            className="adm-btn adm-btn-secondary adm-btn-sm"
                          >
                            Kelola Panel
                          </button>
                          {w.is_demo === 0 && (
                            <>
                              <button
                                type="button"
                                disabled={busy !== null}
                                onClick={async () => {
                                  const res = await callAction(
                                    `tog-${w.id}`,
                                    { action: "toggle_wedding_status", weddingId: w.id },
                                    "Status undangan diperbarui."
                                  );
                                  if (res) await loadData();
                                }}
                                className="adm-btn adm-btn-secondary adm-btn-sm"
                              >
                                <ShieldAlert className="h-3.5 w-3.5" />
                                {w.status === "active" ? "Nonaktifkan" : "Aktifkan"}
                              </button>
                              <button
                                type="button"
                                disabled={busy !== null}
                                onClick={async () => {
                                  if (
                                    !window.confirm(
                                      `Hapus permanen undangan "${w.title}" beserta seluruh akun, tamu, RSVP, dan planner-nya?`
                                    )
                                  ) {
                                    return;
                                  }
                                  const res = await callAction(
                                    `del-${w.id}`,
                                    { action: "delete_wedding", weddingId: w.id },
                                    "Undangan berhasil dihapus permanen."
                                  );
                                  if (res) await loadData();
                                }}
                                className="adm-btn-aksi aksi-hapus"
                                title="Hapus Permanen"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : tab === "platform_wa" ? (
          <div className="adm-card space-y-4 p-5">
            <div>
              <h2 className="text-sm font-semibold">
                WhatsApp Gateway Platform (OTP Pendaftaran &amp; Reset Password)
              </h2>
              <p className="mt-1 text-xs text-(--adm-text-secondary)">
                Kredensial ini digunakan platform untuk mengirim kode OTP 6 digit saat user baru mendaftar mandiri atau mereset password.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="adm-label">Nama Platform</label>
                <input
                  type="text"
                  value={waForm.PLATFORM_NAME}
                  onChange={(e) =>
                    setWaForm((p) => ({ ...p, PLATFORM_NAME: e.target.value }))
                  }
                  className="adm-input"
                />
              </div>
              <div>
                <label className="adm-label">URL WhatsApp Gateway</label>
                <input
                  type="url"
                  value={waForm.WA_BASE_URL}
                  onChange={(e) =>
                    setWaForm((p) => ({ ...p, WA_BASE_URL: e.target.value }))
                  }
                  placeholder="https://whatsapp.zedlabs.id"
                  className="adm-input"
                />
              </div>
              <div>
                <label className="adm-label">API Key (key_id)</label>
                <input
                  type="text"
                  value={waForm.WA_API_KEY}
                  onChange={(e) =>
                    setWaForm((p) => ({ ...p, WA_API_KEY: e.target.value }))
                  }
                  className="adm-input font-mono text-xs"
                />
              </div>
              <div>
                <label className="adm-label">HMAC Secret</label>
                <input
                  type="password"
                  value={waForm.WA_API_SECRET}
                  onChange={(e) =>
                    setWaForm((p) => ({ ...p, WA_API_SECRET: e.target.value }))
                  }
                  className="adm-input font-mono text-xs"
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-2 pt-2">
              <button
                type="button"
                disabled={busy !== null}
                onClick={() =>
                  void callAction(
                    "save-wa",
                    { action: "save_platform_wa", ...waForm },
                    "Konfigurasi WhatsApp Platform berhasil disimpan."
                  )
                }
                className="adm-btn adm-btn-primary adm-btn-sm"
              >
                Simpan Konfigurasi
              </button>
              <button
                type="button"
                disabled={busy !== null}
                onClick={async () => {
                  const res = await callAction("ping-wa", {
                    action: "test_platform_wa",
                    ...waForm,
                  });
                  if (res) {
                    notify(
                      "success",
                      `Terhubung! Instansi: ${res.instansi_id} · Sesi ready: ${res.jumlah_sesi_ready}`
                    );
                  }
                }}
                className="adm-btn adm-btn-secondary adm-btn-sm"
              >
                Uji Koneksi (Ping)
              </button>
              <button
                type="button"
                disabled={busy !== null}
                onClick={() =>
                  void callAction(
                    "sync-otp",
                    { action: "sync_otp_template", ...waForm },
                    "Template OTP (wedding_auth_otp) berhasil disinkronkan ke Gateway!"
                  )
                }
                className="adm-btn adm-btn-edit adm-btn-sm"
              >
                Sinkron Template OTP
              </button>
            </div>
          </div>
        ) : (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const res = await callAction(
                "save-acc",
                { action: "update_superadmin_account", ...accForm },
                "Akun Superadmin berhasil diperbarui."
              );
              if (res) {
                setAccForm((p) => ({
                  ...p,
                  currentPassword: "",
                  newPassword: "",
                }));
                await loadData();
              }
            }}
            className="adm-card max-w-xl space-y-4 p-5"
          >
            <div>
              <h2 className="text-sm font-semibold">Kredensial Superadmin</h2>
              <p className="mt-1 text-xs text-(--adm-text-secondary)">
                Atur username, nomor WhatsApp (untuk reset password OTP), dan password Superadmin.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="adm-label">Username Superadmin</label>
                <input
                  type="text"
                  required
                  value={accForm.username}
                  onChange={(e) =>
                    setAccForm((p) => ({ ...p, username: e.target.value }))
                  }
                  className="adm-input"
                />
              </div>
              <div>
                <label className="adm-label">Nomor WhatsApp (OTP Reset)</label>
                <input
                  type="tel"
                  value={accForm.phone}
                  onChange={(e) =>
                    setAccForm((p) => ({ ...p, phone: e.target.value }))
                  }
                  placeholder="081234567890"
                  className="adm-input"
                />
              </div>
            </div>

            <div>
              <label className="adm-label">Nama Tampilan</label>
              <input
                type="text"
                value={accForm.fullName}
                onChange={(e) =>
                  setAccForm((p) => ({ ...p, fullName: e.target.value }))
                }
                className="adm-input"
              />
            </div>

            <div className="grid gap-3 border-t border-(--adm-border) pt-3 sm:grid-cols-2">
              <div>
                <label className="adm-label">Password Saat Ini (jika ganti password)</label>
                <input
                  type="password"
                  value={accForm.currentPassword}
                  onChange={(e) =>
                    setAccForm((p) => ({ ...p, currentPassword: e.target.value }))
                  }
                  className="adm-input"
                />
              </div>
              <div>
                <label className="adm-label">Password Baru (opsional)</label>
                <input
                  type="password"
                  minLength={6}
                  value={accForm.newPassword}
                  onChange={(e) =>
                    setAccForm((p) => ({ ...p, newPassword: e.target.value }))
                  }
                  placeholder="Minimal 6 karakter"
                  className="adm-input"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={busy !== null}
              className="adm-btn adm-btn-primary adm-btn-sm"
            >
              Simpan Perubahan Akun
            </button>
          </form>
        )}
      </main>
    </div>
  );
};

export default SuperadminDashboard;
