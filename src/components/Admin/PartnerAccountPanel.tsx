import {
  Copy,
  ExternalLink,
  HeartHandshake,
  KeyRound,
  Loader2,
  Trash2,
  UserPlus,
  Users,
} from "lucide-react";
import React, { useCallback, useEffect, useState } from "react";

interface MemberInfo {
  id: number;
  username: string;
  role: string;
  fullName: string;
  phone: string;
  status: string;
}

interface PartnerPayload {
  currentUser: {
    userId: number;
    username: string;
    role: string;
    fullName: string;
    phone: string;
  };
  wedding: {
    id: number;
    slug: string;
    title: string;
    isDemo: boolean;
    publicUrl: string;
  };
  owner: MemberInfo | null;
  partner: MemberInfo | null;
  canManagePartner: boolean;
}

interface PartnerAccountPanelProps {
  onNotify: (toast: { type: "success" | "error"; message: string }) => void;
}

const PartnerAccountPanel: React.FC<PartnerAccountPanelProps> = ({
  onNotify,
}) => {
  const [info, setInfo] = useState<PartnerPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const [newPartner, setNewPartner] = useState({
    username: "",
    password: "",
    fullName: "",
    phone: "",
  });

  const [editPartner, setEditPartner] = useState({
    fullName: "",
    phone: "",
    newPassword: "",
  });

  const [myForm, setMyForm] = useState({
    fullName: "",
    phone: "",
    currentPassword: "",
    newPassword: "",
  });

  const loadInfo = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/couple/partner", {
        credentials: "include",
      });
      if (!res.ok) return;
      const data = (await res.json()) as PartnerPayload;
      setInfo(data);
      setMyForm((p) => ({
        ...p,
        fullName: data.currentUser.fullName || "",
        phone: data.currentUser.phone || "",
      }));
      if (data.partner) {
        setEditPartner({
          fullName: data.partner.fullName || "",
          phone: data.partner.phone || "",
          newPassword: "",
        });
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadInfo();
  }, [loadInfo]);

  const handleCreatePartner = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy("create-partner");
    try {
      const res = await fetch("/api/couple/partner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(newPartner),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        onNotify({
          type: "error",
          message: data.error || "Gagal mendaftarkan akun pasangan.",
        });
        return;
      }
      setNewPartner({ username: "", password: "", fullName: "", phone: "" });
      onNotify({
        type: "success",
        message: `Akun pasangan "${data.partner?.username}" berhasil dibuat! Pasangan Anda kini dapat login dengan username & password masing-masing.`,
      });
      await loadInfo();
    } finally {
      setBusy(null);
    }
  };

  const handleUpdatePartner = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy("update-partner");
    try {
      const res = await fetch("/api/couple/partner", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          action: "update_partner",
          ...editPartner,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        onNotify({
          type: "error",
          message: data.error || "Gagal memperbarui akun pasangan.",
        });
        return;
      }
      setEditPartner((p) => ({ ...p, newPassword: "" }));
      onNotify({ type: "success", message: "Akun pasangan berhasil diperbarui." });
      await loadInfo();
    } finally {
      setBusy(null);
    }
  };

  const handleDeletePartner = async () => {
    if (
      !window.confirm(
        "Hapus akun pasangan? Pasangan Anda tidak akan bisa login lagi sampai didaftarkan ulang."
      )
    ) {
      return;
    }
    setBusy("delete-partner");
    try {
      const res = await fetch("/api/couple/partner", {
        method: "DELETE",
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        onNotify({
          type: "error",
          message: data.error || "Gagal menghapus akun pasangan.",
        });
        return;
      }
      onNotify({ type: "success", message: "Akun pasangan berhasil dihapus." });
      await loadInfo();
    } finally {
      setBusy(null);
    }
  };

  const handleUpdateMyAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy("update-me");
    try {
      const res = await fetch("/api/couple/partner", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          action: "change_my_password",
          ...myForm,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        onNotify({
          type: "error",
          message: data.error || "Gagal memperbarui akun Anda.",
        });
        return;
      }
      setMyForm((p) => ({ ...p, currentPassword: "", newPassword: "" }));
      onNotify({ type: "success", message: "Profil & password Anda diperbarui." });
      await loadInfo();
    } finally {
      setBusy(null);
    }
  };

  if (loading || !info) {
    return (
      <div className="adm-card flex items-center justify-center gap-2 p-8 text-xs text-(--adm-text-secondary)">
        <Loader2 className="h-4 w-4 animate-spin" />
        Memuat informasi akun pasangan...
      </div>
    );
  }

  const fullPublicUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}${info.wedding.publicUrl}`
      : info.wedding.publicUrl;

  return (
    <div className="space-y-5">
      {/* Alamat Undangan Publik Pasangan */}
      <div className="adm-card flex flex-wrap items-center justify-between gap-3 p-4">
        <div>
          <div className="text-xs font-semibold text-(--adm-text-primary)">
            Tautan Undangan Publik Anda
          </div>
          <div className="mt-1 font-mono text-xs text-(--adm-accent)">
            {fullPublicUrl}
          </div>
          <p className="mt-0.5 text-[11px] text-(--adm-text-secondary)">
            Tautan ini khusus untuk undangan Anda — data tamu, RSVP, dan ucapan terpisah sepenuhnya dari pasangan lain.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              void navigator.clipboard.writeText(fullPublicUrl);
              onNotify({
                type: "success",
                message: "Tautan undangan disalin ke clipboard.",
              });
            }}
            className="adm-btn adm-btn-secondary adm-btn-sm"
          >
            <Copy className="h-3.5 w-3.5" />
            Salin Link
          </button>
          <a
            href={info.wedding.publicUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="adm-btn adm-btn-primary adm-btn-sm"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Buka Undangan
          </a>
        </div>
      </div>

      {/* Manajemen 1 Akun Pasangan */}
      <div className="adm-card space-y-4 p-5">
        <div className="flex items-center gap-2">
          <HeartHandshake className="h-4 w-4 text-(--adm-accent)" />
          <div>
            <h3 className="text-sm font-semibold text-(--adm-text-primary)">
              Akun Pasangan (Maksimal 1 Akun Pendamping)
            </h3>
            <p className="text-xs text-(--adm-text-secondary)">
              Daftarkan 1 akun untuk calon suami/istri Anda agar dapat login terpisah dengan username &amp; password masing-masing.
            </p>
          </div>
        </div>

        {info.partner ? (
          <div className="space-y-4 rounded-lg border border-(--adm-border) bg-(--adm-bg-primary) p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <Users className="h-4 w-4 text-(--adm-accent)" />
                  <span>{info.partner.fullName}</span>
                  <span className="adm-badge adm-badge-success">
                    @{info.partner.username}
                  </span>
                </div>
                <div className="mt-0.5 text-xs text-(--adm-text-secondary)">
                  WhatsApp OTP Reset: {info.partner.phone || "Belum diisi"}
                </div>
              </div>
              {info.canManagePartner && (
                <button
                  type="button"
                  disabled={busy !== null}
                  onClick={() => void handleDeletePartner()}
                  className="adm-btn adm-btn-danger adm-btn-sm"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Hapus Akun Pasangan
                </button>
              )}
            </div>

            {info.canManagePartner && (
              <form
                onSubmit={handleUpdatePartner}
                className="grid gap-3 border-t border-(--adm-border) pt-3 sm:grid-cols-3"
              >
                <div>
                  <label className="adm-label">Nama Lengkap Pasangan</label>
                  <input
                    type="text"
                    required
                    value={editPartner.fullName}
                    onChange={(e) =>
                      setEditPartner((p) => ({ ...p, fullName: e.target.value }))
                    }
                    className="adm-input bg-(--adm-bg-secondary)"
                  />
                </div>
                <div>
                  <label className="adm-label">Nomor WA Pasangan</label>
                  <input
                    type="tel"
                    value={editPartner.phone}
                    onChange={(e) =>
                      setEditPartner((p) => ({ ...p, phone: e.target.value }))
                    }
                    placeholder="081234567890"
                    className="adm-input bg-(--adm-bg-secondary)"
                  />
                </div>
                <div>
                  <label className="adm-label">Reset Password (opsional)</label>
                  <input
                    type="password"
                    minLength={6}
                    value={editPartner.newPassword}
                    onChange={(e) =>
                      setEditPartner((p) => ({
                        ...p,
                        newPassword: e.target.value,
                      }))
                    }
                    placeholder="Isi jika ingin mengganti"
                    className="adm-input bg-(--adm-bg-secondary)"
                  />
                </div>
                <div className="sm:col-span-3">
                  <button
                    type="submit"
                    disabled={busy !== null}
                    className="adm-btn adm-btn-secondary adm-btn-sm"
                  >
                    Simpan Perubahan Pasangan
                  </button>
                </div>
              </form>
            )}
          </div>
        ) : info.canManagePartner ? (
          <form
            onSubmit={handleCreatePartner}
            className="grid gap-3 rounded-lg border border-dashed border-(--adm-border) bg-(--adm-bg-primary) p-4 sm:grid-cols-2"
          >
            <div>
              <label className="adm-label">Username Pasangan *</label>
              <input
                type="text"
                required
                value={newPartner.username}
                onChange={(e) =>
                  setNewPartner((p) => ({ ...p, username: e.target.value }))
                }
                placeholder="contoh: ikbal"
                className="adm-input bg-(--adm-bg-secondary)"
              />
            </div>
            <div>
              <label className="adm-label">Password Pasangan (min. 6) *</label>
              <input
                type="password"
                required
                minLength={6}
                value={newPartner.password}
                onChange={(e) =>
                  setNewPartner((p) => ({ ...p, password: e.target.value }))
                }
                placeholder="••••••••"
                className="adm-input bg-(--adm-bg-secondary)"
              />
            </div>
            <div>
              <label className="adm-label">Nama Lengkap Pasangan *</label>
              <input
                type="text"
                required
                value={newPartner.fullName}
                onChange={(e) =>
                  setNewPartner((p) => ({ ...p, fullName: e.target.value }))
                }
                placeholder="Nama calon suami/istri"
                className="adm-input bg-(--adm-bg-secondary)"
              />
            </div>
            <div>
              <label className="adm-label">Nomor WhatsApp Pasangan (untuk Reset Password)</label>
              <input
                type="tel"
                value={newPartner.phone}
                onChange={(e) =>
                  setNewPartner((p) => ({ ...p, phone: e.target.value }))
                }
                placeholder="081234567890"
                className="adm-input bg-(--adm-bg-secondary)"
              />
            </div>
            <div className="sm:col-span-2">
              <button
                type="submit"
                disabled={busy !== null}
                className="adm-btn adm-btn-primary adm-btn-sm"
              >
                <UserPlus className="h-3.5 w-3.5" />
                Daftarkan 1 Akun Pasangan
              </button>
            </div>
          </form>
        ) : (
          <p className="text-xs text-(--adm-text-secondary)">
            Anda masuk sebagai akun pasangan. Pengelolaan pendaftaran pasangan hanya tersedia untuk pemilik akun utama.
          </p>
        )}
      </div>

      {/* Profil & Ganti Password Saya */}
      <form onSubmit={handleUpdateMyAccount} className="adm-card space-y-4 p-5">
        <div className="flex items-center gap-2">
          <KeyRound className="h-4 w-4 text-(--adm-accent)" />
          <div>
            <h3 className="text-sm font-semibold text-(--adm-text-primary)">
              Akun Saya (@{info.currentUser.username})
            </h3>
            <p className="text-xs text-(--adm-text-secondary)">
              Perbarui nama, nomor WhatsApp (untuk fitur Lupa Password OTP), atau ganti password login Anda.
            </p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="adm-label">Nama Lengkap</label>
            <input
              type="text"
              required
              value={myForm.fullName}
              onChange={(e) =>
                setMyForm((p) => ({ ...p, fullName: e.target.value }))
              }
              className="adm-input"
            />
          </div>
          <div>
            <label className="adm-label">Nomor WhatsApp (OTP Reset)</label>
            <input
              type="tel"
              value={myForm.phone}
              onChange={(e) =>
                setMyForm((p) => ({ ...p, phone: e.target.value }))
              }
              placeholder="081234567890"
              className="adm-input"
            />
          </div>
          <div>
            <label className="adm-label">Password Saat Ini (jika ganti password)</label>
            <input
              type="password"
              value={myForm.currentPassword}
              onChange={(e) =>
                setMyForm((p) => ({ ...p, currentPassword: e.target.value }))
              }
              className="adm-input"
            />
          </div>
          <div>
            <label className="adm-label">Password Baru (opsional)</label>
            <input
              type="password"
              minLength={6}
              value={myForm.newPassword}
              onChange={(e) =>
                setMyForm((p) => ({ ...p, newPassword: e.target.value }))
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
          Simpan Profil &amp; Password
        </button>
      </form>
    </div>
  );
};

export default PartnerAccountPanel;
