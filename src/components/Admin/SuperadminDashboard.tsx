import {
  Camera,
  CheckCircle2,
  CreditCard,
  ExternalLink,
  Eye,
  FileText,
  Globe,
  Heart,
  KeyRound,
  Loader2,
  LogOut,
  Menu,
  MessageSquare,
  PanelLeftClose,
  PanelLeftOpen,
  RefreshCcw,
  Search,
  Send,
  Shield,
  ShieldAlert,
  Trash2,
  Users,
  X,
  XCircle,
} from "lucide-react";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { formatIdr } from "../../lib/billing";

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
  guest_quota_limit?: number;
  created_at: string;
  publicUrl: string;
  rsvpCount: number;
  guestCount: number;
  members: MemberRow[];
}

type OrderStatus = "unpaid" | "review" | "paid" | "rejected" | "cancelled";

interface BillingOrderAdminRow {
  id: number;
  wedding_id: number;
  wedding_slug: string;
  wedding_title: string;
  invoice_code: string;
  current_quota: number;
  requested_total_quota: number;
  added_guests: number;
  amount: number;
  status: OrderStatus;
  payment_method: string;
  payment_note: string;
  proof_url: string;
  sender_name?: string;
  sender_bank?: string;
  due_at?: string;
  submitted_at?: string;
  invoice_sent_at?: string;
  admin_note: string;
  created_at: string;
  verified_at?: string;
}

interface SuperadminData {
  stats: {
    totalWeddings: number;
    activeWeddings: number;
    totalUsers: number;
    totalRsvps: number;
    pendingOrders?: number;
    unpaidOrders?: number;
  };
  weddings: WeddingRow[];
  orders?: BillingOrderAdminRow[];
  platformConfig: Record<string, string>;
  currentAdmin: {
    userId: number;
    username: string;
    fullName: string;
    phone: string;
    avatarUrl?: string;
  };
}

type SuperTab = "weddings" | "billing" | "platform_wa" | "account";
type BillingFilter = "review" | "unpaid" | "paid" | "rejected" | "all";

const TAB_META: Record<SuperTab, { title: string; desc: string }> = {
  weddings: {
    title: "Pasangan & Undangan",
    desc: "Kelola seluruh tenant undangan SaaS, akses impersonate, dan status aktif.",
  },
  billing: {
    title: "Tagihan & Pembayaran",
    desc: "Periksa bukti transfer / nota bayar pasangan, setujui kuota tamu, dan atur rekening tujuan.",
  },
  platform_wa: {
    title: "WhatsApp Gateway Platform",
    desc: "Konfigurasi gateway resmi untuk pengiriman OTP pendaftaran, reset password, dan notifikasi invoicing.",
  },
  account: {
    title: "Akun & Profil Superadmin",
    desc: "Perbarui foto profil, username, nomor WhatsApp notifikasi, dan password Superadmin.",
  },
};

const ORDER_STATUS_META: Record<OrderStatus, { label: string; cls: string }> = {
  review: { label: "Perlu Diperiksa", cls: "adm-badge-accent" },
  unpaid: { label: "Belum Dibayar", cls: "adm-badge-warning" },
  paid: { label: "Lunas", cls: "adm-badge-success" },
  rejected: { label: "Ditolak", cls: "adm-badge-danger" },
  cancelled: { label: "Dibatalkan", cls: "adm-badge-secondary" },
};

function formatDateShort(iso?: string): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

const SuperadminDashboard: React.FC = () => {
  const [data, setData] = useState<SuperadminData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<SuperTab>("weddings");
  const [billingFilter, setBillingFilter] = useState<BillingFilter>("review");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [menuQuery, setMenuQuery] = useState("");
  const searchMenuRef = useRef<HTMLInputElement | null>(null);

  const [toast, setToast] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  // Proof review modal state
  const [reviewOrder, setReviewOrder] = useState<BillingOrderAdminRow | null>(
    null
  );
  const [rejectReason, setRejectReason] = useState("");

  // Platform WA & Payment form
  const [waForm, setWaForm] = useState({
    PLATFORM_NAME: "Wedding Platform",
    WA_BASE_URL: "https://whatsapp.zedlabs.id",
    WA_API_KEY: "",
    WA_API_SECRET: "",
    PAYMENT_BANK_NAME: "Bank BCA",
    PAYMENT_BANK_ACCOUNT: "",
    PAYMENT_BANK_HOLDER: "ZEDLABS Teknologi Indonesia",
    PAYMENT_WHATSAPP_CONFIRM: "",
  });

  const [bankSlots, setBankSlots] = useState<
    Array<{ bank: string; number: string; holder: string }>
  >([
    { bank: "", number: "", holder: "" },
    { bank: "", number: "", holder: "" },
    { bank: "", number: "", holder: "" },
  ]);

  // Superadmin account form
  const [accForm, setAccForm] = useState({
    username: "",
    fullName: "",
    phone: "",
    avatarUrl: "",
    currentPassword: "",
    newPassword: "",
  });
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const notify = (type: "success" | "error", message: string) => {
    setToast({ type, message });
    window.setTimeout(() => {
      setToast((prev) => (prev?.message === message ? null : prev));
    }, 6000);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (
        e.key === "/" &&
        document.activeElement?.tagName !== "INPUT" &&
        document.activeElement?.tagName !== "TEXTAREA"
      ) {
        e.preventDefault();
        searchMenuRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

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
        PLATFORM_NAME: json.platformConfig.PLATFORM_NAME || "Wedding Platform",
        WA_BASE_URL:
          json.platformConfig.WA_BASE_URL || "https://whatsapp.zedlabs.id",
        WA_API_KEY: json.platformConfig.WA_API_KEY || "",
        WA_API_SECRET: json.platformConfig.WA_API_SECRET || "",
        PAYMENT_BANK_NAME: json.platformConfig.PAYMENT_BANK_NAME || "Bank BCA",
        PAYMENT_BANK_ACCOUNT: json.platformConfig.PAYMENT_BANK_ACCOUNT || "",
        PAYMENT_BANK_HOLDER:
          json.platformConfig.PAYMENT_BANK_HOLDER ||
          "ZEDLABS Teknologi Indonesia",
        PAYMENT_WHATSAPP_CONFIRM:
          json.platformConfig.PAYMENT_WHATSAPP_CONFIRM || "",
      });
      let parsedBanks: Array<{ bank: string; number: string; holder: string }> =
        [];
      if (json.platformConfig.PAYMENT_BANK_ACCOUNTS) {
        try {
          const arr = JSON.parse(json.platformConfig.PAYMENT_BANK_ACCOUNTS);
          if (Array.isArray(arr)) parsedBanks = arr;
        } catch {
          parsedBanks = [];
        }
      }
      if (
        parsedBanks.length === 0 &&
        json.platformConfig.PAYMENT_BANK_ACCOUNT
      ) {
        parsedBanks = [
          {
            bank: json.platformConfig.PAYMENT_BANK_NAME || "Bank BCA",
            number: json.platformConfig.PAYMENT_BANK_ACCOUNT,
            holder:
              json.platformConfig.PAYMENT_BANK_HOLDER ||
              "ZEDLABS Teknologi Indonesia",
          },
        ];
      }
      setBankSlots(
        [0, 1, 2].map((i) => ({
          bank: parsedBanks[i]?.bank || "",
          number: parsedBanks[i]?.number || "",
          holder: parsedBanks[i]?.holder || "",
        }))
      );
      setAccForm((prev) => ({
        ...prev,
        username: json.currentAdmin.username || "",
        fullName: json.currentAdmin.fullName || "",
        phone: json.currentAdmin.phone || "",
        avatarUrl: json.currentAdmin.avatarUrl || "",
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

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      notify("error", "File foto profil harus berupa gambar (JPG, PNG, WebP).");
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      notify("error", "Ukuran foto profil maksimal 3 MB.");
      return;
    }
    setUploadingAvatar(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        credentials: "include",
        body: fd,
      });
      const uploadData = await uploadRes.json().catch(() => ({}));
      if (!uploadRes.ok || !uploadData.url) {
        notify("error", uploadData.error || "Gagal mengunggah foto profil.");
        return;
      }
      const nextUrl = String(uploadData.url);
      const saved = await callAction(
        "save-avatar",
        {
          action: "update_superadmin_account",
          username: accForm.username,
          fullName: accForm.fullName,
          phone: accForm.phone,
          avatarUrl: nextUrl,
        },
        "Foto profil Superadmin berhasil diperbarui."
      );
      if (saved) {
        setAccForm((p) => ({ ...p, avatarUrl: nextUrl }));
        await loadData();
      }
    } catch {
      notify("error", "Gagal mengunggah foto profil.");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleAvatarRemove = async () => {
    const saved = await callAction(
      "remove-avatar",
      {
        action: "update_superadmin_account",
        username: accForm.username,
        fullName: accForm.fullName,
        phone: accForm.phone,
        avatarUrl: "",
      },
      "Foto profil Superadmin dihapus."
    );
    if (saved) {
      setAccForm((p) => ({ ...p, avatarUrl: "" }));
      await loadData();
    }
  };

  const navGroups = useMemo<
    Array<{
      judul: string;
      items: Array<{
        id: SuperTab;
        label: string;
        icon: React.ComponentType<{ className?: string }>;
        badge?: number;
        badgeTone?: "amber";
        keywords: string;
      }>;
    }>
  >(
    () => [
      {
        judul: "MANAJEMEN SAAS",
        items: [
          {
            id: "weddings" as SuperTab,
            label: "Pasangan & Undangan",
            icon: Users,
            badge: data?.stats.totalWeddings,
            keywords: "tenant pasangan undangan slug user",
          },
          {
            id: "billing" as SuperTab,
            label: "Tagihan & Pembayaran",
            icon: CreditCard,
            badge: data?.stats.pendingOrders || undefined,
            badgeTone: "amber" as const,
            keywords: "invoice tagihan pembayaran bukti transfer rekening kuota",
          },
        ],
      },
      {
        judul: "INTEGRASI & AKUN",
        items: [
          {
            id: "platform_wa" as SuperTab,
            label: "WhatsApp Platform",
            icon: MessageSquare,
            keywords: "wa whatsapp gateway otp template api key",
          },
          {
            id: "account" as SuperTab,
            label: "Akun Superadmin",
            icon: KeyRound,
            keywords: "profil avatar password username akun superadmin",
          },
        ],
      },
    ],
    [data?.stats.pendingOrders, data?.stats.totalWeddings]
  );

  const q = menuQuery.trim().toLowerCase();
  const filteredGroups = navGroups
    .map((g) => ({
      ...g,
      items: g.items.filter(
        (item) =>
          !q ||
          item.label.toLowerCase().includes(q) ||
          item.keywords.includes(q)
      ),
    }))
    .filter((g) => g.items.length > 0);

  const filteredOrders = useMemo(() => {
    const all = data?.orders ?? [];
    if (billingFilter === "all") return all;
    return all.filter((o) => o.status === billingFilter);
  }, [data?.orders, billingFilter]);

  const orderCounts = useMemo(() => {
    const all = data?.orders ?? [];
    return {
      review: all.filter((o) => o.status === "review").length,
      unpaid: all.filter((o) => o.status === "unpaid").length,
      paid: all.filter((o) => o.status === "paid").length,
      rejected: all.filter((o) => o.status === "rejected").length,
      all: all.length,
    };
  }, [data?.orders]);

  const activeMeta = TAB_META[tab];
  const currentYear = new Date().getFullYear();

  return (
    <div className="admin-shell flex min-h-dvh bg-(--adm-bg-secondary) text-(--adm-text-primary)">
      {/* Mobile Sidebar Backdrop */}
      {mobileMenuOpen && (
        <div
          onClick={() => setMobileMenuOpen(false)}
          className="fixed inset-0 z-40 bg-(--adm-backdrop) md:hidden"
        />
      )}

      {/* Collapsible Sidebar (matching AdminDashboard & whatsapp-service) */}
      <aside
        className={`fixed inset-y-0 top-0 left-0 z-50 flex h-dvh shrink-0 flex-col border-r border-(--adm-border) bg-(--adm-bg-secondary) transition-all duration-200 md:sticky md:z-auto ${
          mobileMenuOpen
            ? "translate-x-0"
            : "-translate-x-full md:translate-x-0"
        } ${sidebarCollapsed ? "w-[260px] md:w-[64px]" : "w-[260px] md:w-[232px]"}`}
      >
        {/* Brand */}
        <div
          className={`flex h-14 shrink-0 items-center border-b border-(--adm-border) ${
            sidebarCollapsed
              ? "justify-between px-4 md:justify-center md:px-0"
              : "justify-between px-4"
          }`}
        >
          <button
            type="button"
            onClick={() => {
              setTab("weddings");
              setMobileMenuOpen(false);
            }}
            className="flex min-w-0 items-center gap-2.5 text-left"
            title="Superadmin Platform"
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-(--adm-border) bg-(--adm-accent-soft) text-(--adm-accent)">
              <Shield className="h-3.5 w-3.5" />
            </span>
            <span className={`min-w-0 ${sidebarCollapsed ? "md:hidden" : ""}`}>
              <span className="block truncate text-[13px] font-bold text-(--adm-text-primary)">
                Superadmin
              </span>
              <span className="block truncate text-[11px] text-(--adm-text-secondary)">
                Panel Pengelola SaaS
              </span>
            </span>
          </button>

          <button
            type="button"
            aria-label="Tutup menu"
            onClick={() => setMobileMenuOpen(false)}
            className="flex h-7 w-7 items-center justify-center rounded-md text-(--adm-text-secondary) hover:bg-(--adm-bg-overlay) md:hidden"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Search Menu */}
        <div
          className={`shrink-0 px-3 pt-2.5 pb-1 ${
            sidebarCollapsed ? "md:hidden" : ""
          }`}
        >
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-(--adm-text-muted)" />
            <input
              ref={searchMenuRef}
              type="search"
              value={menuQuery}
              onChange={(e) => setMenuQuery(e.target.value)}
              placeholder="Cari menu..."
              className="adm-input min-h-[28px] py-1 pr-7 pl-8 text-xs"
            />
            {!menuQuery && (
              <kbd className="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 rounded border border-(--adm-border) px-1 text-[10px] text-(--adm-text-muted)">
                /
              </kbd>
            )}
          </div>
        </div>

        {/* Nav Items */}
        <nav
          aria-label="Menu utama superadmin"
          className="custom-scrollbar flex-1 overflow-x-hidden overflow-y-auto py-2"
        >
          {filteredGroups.length === 0 ? (
            <p className="px-4 py-3 text-xs text-(--adm-text-secondary)">
              Menu tidak ditemukan.
            </p>
          ) : (
            filteredGroups.map((group, gIdx) => (
              <div
                key={group.judul}
                className={
                  gIdx > 0
                    ? `mt-2 ${sidebarCollapsed ? "md:border-t md:border-(--adm-border) md:pt-2" : ""}`
                    : ""
                }
              >
                <p
                  className={`px-4 pt-2 pb-1 text-[10.5px] font-semibold tracking-wider text-(--adm-text-muted) uppercase ${
                    sidebarCollapsed ? "md:hidden" : ""
                  }`}
                >
                  {group.judul}
                </p>
                <ul className="flex flex-col gap-0.5">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const active = tab === item.id;
                    return (
                      <li key={item.id}>
                        <button
                          type="button"
                          title={item.label}
                          onClick={() => {
                            setTab(item.id);
                            setMobileMenuOpen(false);
                          }}
                          className={`adm-sidebar-item ${active ? "is-active" : ""} ${
                            sidebarCollapsed ? "md:justify-center md:px-0" : ""
                          }`}
                        >
                          <Icon className="h-[17px] w-[17px] shrink-0" />
                          <span
                            className={`truncate ${
                              sidebarCollapsed ? "md:hidden" : ""
                            }`}
                          >
                            {item.label}
                          </span>
                          {typeof item.badge === "number" && item.badge > 0 && (
                            <span
                              className={`ml-auto rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums ${
                                item.badgeTone === "amber"
                                  ? "bg-amber-500 text-slate-950"
                                  : "bg-(--adm-bg-tertiary) text-(--adm-text-secondary)"
                              } ${sidebarCollapsed ? "md:hidden" : ""}`}
                            >
                              {item.badge}
                            </span>
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))
          )}

          {/* Quick Links */}
          <div
            className={`mt-2 ${sidebarCollapsed ? "md:border-t md:border-(--adm-border) md:pt-2" : ""}`}
          >
            <p
              className={`px-4 pt-2 pb-1 text-[10.5px] font-semibold tracking-wider text-(--adm-text-muted) uppercase ${
                sidebarCollapsed ? "md:hidden" : ""
              }`}
            >
              Tautan Cepat
            </p>
            <ul className="flex flex-col gap-0.5">
              <li>
                <a
                  href="/"
                  title="Beranda Publik"
                  className={`adm-sidebar-item ${
                    sidebarCollapsed ? "md:justify-center md:px-0" : ""
                  }`}
                >
                  <Globe className="h-[17px] w-[17px] shrink-0" />
                  <span
                    className={`truncate ${
                      sidebarCollapsed ? "md:hidden" : ""
                    }`}
                  >
                    Beranda Publik
                  </span>
                </a>
              </li>
              <li>
                <a
                  href="/demo"
                  target="_blank"
                  rel="noreferrer"
                  title="Demo Undangan Publik"
                  className={`adm-sidebar-item ${
                    sidebarCollapsed ? "md:justify-center md:px-0" : ""
                  }`}
                >
                  <ExternalLink className="h-[17px] w-[17px] shrink-0" />
                  <span
                    className={`truncate ${
                      sidebarCollapsed ? "md:hidden" : ""
                    }`}
                  >
                    Demo Publik
                  </span>
                </a>
              </li>
            </ul>
          </div>
        </nav>

        {/* Sidebar Footer Logout */}
        <div className="shrink-0 border-t border-(--adm-border) p-2">
          <button
            type="button"
            onClick={() => void handleLogout()}
            title="Keluar"
            className={`adm-sidebar-item text-red-400 hover:bg-red-500/10 hover:text-red-300 ${
              sidebarCollapsed ? "md:justify-center md:px-0" : ""
            }`}
          >
            <LogOut className="h-[17px] w-[17px] shrink-0" />
            <span className={sidebarCollapsed ? "md:hidden" : ""}>Keluar</span>
          </button>
        </div>
      </aside>

      {/* Main Column */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Topbar Header */}
        <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between gap-3 border-b border-(--adm-border) bg-(--adm-bg-secondary)/95 px-4 backdrop-blur-md md:px-6">
          <div className="flex min-w-0 items-center gap-2.5">
            <button
              type="button"
              aria-label="Buka menu"
              onClick={() => setMobileMenuOpen(true)}
              className="flex h-8 w-8 items-center justify-center rounded-md border border-(--adm-border) text-(--adm-text-secondary) hover:bg-(--adm-bg-overlay) md:hidden"
            >
              <Menu className="h-4 w-4" />
            </button>
            <button
              type="button"
              aria-label={sidebarCollapsed ? "Perluas sidebar" : "Ciutkan sidebar"}
              onClick={() => setSidebarCollapsed((c) => !c)}
              className="hidden h-8 w-8 items-center justify-center rounded-md border border-(--adm-border) text-(--adm-text-secondary) hover:bg-(--adm-bg-overlay) md:flex"
            >
              {sidebarCollapsed ? (
                <PanelLeftOpen className="h-4 w-4" />
              ) : (
                <PanelLeftClose className="h-4 w-4" />
              )}
            </button>
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-(--adm-text-primary)">
                {activeMeta.title}
              </div>
              <div className="hidden truncate text-[11px] text-(--adm-text-secondary) sm:block">
                {activeMeta.desc}
              </div>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => setTab("account")}
              className="flex items-center gap-2 rounded-full border border-(--adm-border) bg-(--adm-bg-primary) py-1 pr-3 pl-1.5 text-xs hover:border-(--adm-accent)"
              title="Buka Profil & Akun Superadmin"
            >
              {data?.currentAdmin.avatarUrl ? (
                <img
                  src={data.currentAdmin.avatarUrl}
                  alt={data.currentAdmin.fullName || data.currentAdmin.username}
                  className="h-6 w-6 rounded-full object-cover"
                />
              ) : (
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-(--adm-accent-soft) text-(--adm-accent)">
                  <Shield className="h-3.5 w-3.5" />
                </span>
              )}
              <span className="hidden max-w-[120px] truncate font-medium sm:inline">
                {data?.currentAdmin.fullName ||
                  data?.currentAdmin.username ||
                  "Superadmin"}
              </span>
            </button>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 px-4 py-5 md:px-6 md:py-6">
          <div className="mx-auto max-w-6xl space-y-5">
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
                  <div className="text-xs text-(--adm-text-secondary)">
                    Total Undangan
                  </div>
                  <div className="mt-1 text-2xl font-bold">
                    {data.stats.totalWeddings}
                  </div>
                </div>
                <div className="adm-card p-4">
                  <div className="text-xs text-(--adm-text-secondary)">
                    Undangan Aktif
                  </div>
                  <div className="mt-1 text-2xl font-bold text-(--adm-green)">
                    {data.stats.activeWeddings}
                  </div>
                </div>
                <div className="adm-card p-4">
                  <div className="text-xs text-(--adm-text-secondary)">
                    Perlu Diperiksa
                  </div>
                  <div className="mt-1 text-2xl font-bold text-amber-400">
                    {data.stats.pendingOrders ?? 0}
                  </div>
                </div>
                <div className="adm-card p-4">
                  <div className="text-xs text-(--adm-text-secondary)">
                    Total RSVP
                  </div>
                  <div className="mt-1 text-2xl font-bold">
                    {data.stats.totalRsvps}
                  </div>
                </div>
              </div>
            )}

            {loading && !data ? (
              <div className="adm-card flex items-center justify-center gap-2 p-10 text-xs text-(--adm-text-secondary)">
                <Loader2 className="h-4 w-4 animate-spin" />
                Memuat data platform...
              </div>
            ) : tab === "weddings" && data ? (
              <div className="adm-card overflow-hidden">
                <div className="flex items-center justify-between border-b border-(--adm-border) px-4 py-3">
                  <div>
                    <h2 className="text-sm font-semibold">
                      Tenant Undangan Pasangan
                    </h2>
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
                        <th className="px-4 py-3">Tamu / Kuota / RSVP</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-(--adm-border)">
                      {data.weddings.map((w) => (
                        <tr
                          key={w.id}
                          className="hover:bg-(--adm-bg-primary)/40"
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2 font-semibold text-(--adm-text-primary)">
                              <Heart className="h-3.5 w-3.5 text-(--adm-accent)" />
                              <span>{w.title}</span>
                              {w.is_demo === 1 && (
                                <span className="adm-badge adm-badge-accent">
                                  Demo
                                </span>
                              )}
                            </div>
                            <a
                              href={w.publicUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="mt-0.5 inline-flex items-center gap-1 font-mono text-[11px] text-(--adm-accent) hover:underline"
                            >
                              {w.publicUrl}
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          </td>
                          <td className="px-4 py-3">
                            {w.members.length === 0 ? (
                              <span className="text-(--adm-text-secondary)">
                                —
                              </span>
                            ) : (
                              <div className="space-y-1">
                                {w.members.map((m) => (
                                  <div
                                    key={m.id}
                                    className="flex items-center gap-1.5"
                                  >
                                    <span className="font-mono font-medium">
                                      @{m.username}
                                    </span>
                                    <span className="text-(--adm-text-secondary)">
                                      ({m.phone || "tanpa WA"})
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3 font-mono">
                            {w.guestCount} / {w.guest_quota_limit ?? 200} tamu ·{" "}
                            {w.rsvpCount} RSVP
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`adm-badge ${
                                w.status === "active"
                                  ? "adm-badge-success"
                                  : "adm-badge-danger"
                              }`}
                            >
                              {w.status === "active" ? "Aktif" : "Ditangguhkan"}
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
                                Kelola
                              </button>
                              {w.is_demo !== 1 && (
                                <>
                                  <button
                                    type="button"
                                    disabled={busy !== null}
                                    onClick={async () => {
                                      const res = await callAction(
                                        `tog-${w.id}`,
                                        {
                                          action: "toggle_wedding_status",
                                          weddingId: w.id,
                                        },
                                        "Status undangan diperbarui."
                                      );
                                      if (res) await loadData();
                                    }}
                                    className="adm-btn adm-btn-edit adm-btn-sm"
                                  >
                                    <ShieldAlert className="h-3.5 w-3.5" />
                                    {w.status === "active"
                                      ? "Tangguhkan"
                                      : "Aktifkan"}
                                  </button>
                                  <button
                                    type="button"
                                    disabled={busy !== null}
                                    onClick={async () => {
                                      if (
                                        !window.confirm(
                                          `Hapus permanen undangan "${w.title}" beserta seluruh data tamu & akun pasangannya?`
                                        )
                                      ) {
                                        return;
                                      }
                                      const res = await callAction(
                                        `del-${w.id}`,
                                        {
                                          action: "delete_wedding",
                                          weddingId: w.id,
                                        },
                                        "Undangan berhasil dihapus."
                                      );
                                      if (res) await loadData();
                                    }}
                                    className="adm-btn adm-btn-danger adm-btn-sm"
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
            ) : tab === "billing" && data ? (
              <div className="space-y-5">
                {/* Filter status seperti whatsapp-service/superadmin/tagihan */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap gap-1.5">
                    {(
                      [
                        ["review", `Perlu diperiksa (${orderCounts.review})`],
                        ["unpaid", `Belum dibayar (${orderCounts.unpaid})`],
                        ["paid", `Lunas (${orderCounts.paid})`],
                        ["rejected", `Ditolak (${orderCounts.rejected})`],
                        ["all", `Semua (${orderCounts.all})`],
                      ] as Array<[BillingFilter, string]>
                    ).map(([val, label]) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setBillingFilter(val)}
                        className={`adm-btn adm-btn-sm ${
                          billingFilter === val
                            ? "adm-btn-primary"
                            : "adm-btn-secondary"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
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

                {/* Daftar Tagihan */}
                <div className="adm-card overflow-hidden">
                  {filteredOrders.length === 0 ? (
                    <div className="p-8 text-center text-xs text-(--adm-text-secondary)">
                      {billingFilter === "review"
                        ? "Tidak ada bukti pembayaran yang menunggu pemeriksaan."
                        : "Belum ada tagihan pada filter ini."}
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="border-b border-(--adm-border) bg-(--adm-bg-primary) text-[11px] text-(--adm-text-secondary) uppercase">
                          <tr>
                            <th className="px-4 py-3">Tagihan</th>
                            <th className="px-4 py-3">Pasangan / Undangan</th>
                            <th className="px-4 py-3">Jumlah</th>
                            <th className="px-4 py-3">Status</th>
                            <th className="px-4 py-3">Pengirim</th>
                            <th className="px-4 py-3 text-right">Aksi</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-(--adm-border)">
                          {filteredOrders.map((o) => {
                            const st =
                              ORDER_STATUS_META[o.status] ||
                              ORDER_STATUS_META.unpaid;
                            return (
                              <tr key={o.id}>
                                <td className="px-4 py-3">
                                  <div className="font-mono font-semibold">
                                    {o.invoice_code}
                                  </div>
                                  <div className="text-[11px] text-(--adm-text-secondary)">
                                    +{o.added_guests.toLocaleString("id-ID")} →{" "}
                                    {o.requested_total_quota.toLocaleString(
                                      "id-ID"
                                    )}{" "}
                                    tamu · {formatDateShort(o.created_at)}
                                  </div>
                                </td>
                                <td className="px-4 py-3">
                                  <div className="font-medium">
                                    {o.wedding_title}
                                  </div>
                                  <div className="font-mono text-[11px] text-(--adm-text-secondary)">
                                    /u/{o.wedding_slug}
                                  </div>
                                </td>
                                <td className="px-4 py-3 font-mono font-semibold">
                                  {formatIdr(o.amount)}
                                </td>
                                <td className="px-4 py-3">
                                  <span className={`adm-badge ${st.cls}`}>
                                    {st.label}
                                  </span>
                                  {o.invoice_sent_at && (
                                    <div className="mt-1 text-[10.5px] text-emerald-400">
                                      WA terkirim{" "}
                                      {formatDateShort(o.invoice_sent_at)}
                                    </div>
                                  )}
                                  {o.admin_note && o.status === "rejected" && (
                                    <div className="mt-1 max-w-[200px] text-[11px] text-red-300">
                                      {o.admin_note}
                                    </div>
                                  )}
                                </td>
                                <td className="px-4 py-3">
                                  {o.sender_name || o.payment_note ? (
                                    <>
                                      <div className="font-medium">
                                        {o.sender_name || o.payment_note}
                                      </div>
                                      {o.sender_bank && (
                                        <div className="text-[11px] text-(--adm-text-secondary)">
                                          {o.sender_bank}
                                        </div>
                                      )}
                                    </>
                                  ) : (
                                    <span className="text-(--adm-text-secondary)">
                                      —
                                    </span>
                                  )}
                                </td>
                                <td className="px-4 py-3 text-right whitespace-nowrap">
                                  <div className="inline-flex flex-wrap justify-end gap-1.5">
                                    {o.proof_url && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setReviewOrder(o);
                                          setRejectReason("");
                                        }}
                                        className="adm-btn adm-btn-secondary adm-btn-sm"
                                      >
                                        <Eye className="h-3.5 w-3.5" />
                                        Review Bukti
                                      </button>
                                    )}
                                    <a
                                      href={`/api/billing/invoice?id=${o.id}`}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="adm-btn adm-btn-secondary adm-btn-sm"
                                    >
                                      <FileText className="h-3.5 w-3.5" />
                                      Invoice
                                    </a>
                                    {o.status !== "cancelled" && (
                                      <button
                                        type="button"
                                        disabled={busy !== null}
                                        onClick={async () => {
                                          const res = await callAction(
                                            `res-${o.id}`,
                                            {
                                              action: "resend_invoice",
                                              orderId: o.id,
                                            },
                                            `Notifikasi WhatsApp invoice ${o.invoice_code} dikirim ulang ke pengguna.`
                                          );
                                          if (res) await loadData();
                                        }}
                                        className="adm-btn adm-btn-secondary adm-btn-sm"
                                        title="Kirim ulang notifikasi invoice via WhatsApp"
                                      >
                                        <Send className="h-3.5 w-3.5" />
                                        Kirim WA
                                      </button>
                                    )}
                                    {(o.status === "review" ||
                                      o.status === "unpaid" ||
                                      o.status === "rejected") && (
                                      <button
                                        type="button"
                                        disabled={busy !== null}
                                        onClick={async () => {
                                          if (
                                            !window.confirm(
                                              `Setujui tagihan ${o.invoice_code} (${o.wedding_title}) sebesar ${formatIdr(o.amount)}? Kuota tamu akan langsung aktif dan notifikasi WA dikirim.`
                                            )
                                          ) {
                                            return;
                                          }
                                          const res = await callAction(
                                            `app-${o.id}`,
                                            {
                                              action: "approve_order",
                                              orderId: o.id,
                                            },
                                            `Tagihan ${o.invoice_code} lunas & notifikasi WA terkirim!`
                                          );
                                          if (res) await loadData();
                                        }}
                                        className="adm-btn adm-btn-edit adm-btn-sm"
                                      >
                                        Setujui
                                      </button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Pengaturan Rekening Tujuan Permanen di Database */}
                <div className="adm-card space-y-4 p-5">
                  <div>
                    <h2 className="text-sm font-semibold">
                      Pengaturan Rekening Tujuan &amp; WhatsApp Notifikasi Pembayaran
                    </h2>
                    <p className="mt-1 text-xs text-(--adm-text-secondary)">
                      Disimpan permanen di database (maksimal 3 rekening). Nomor WhatsApp di bawah juga menerima notifikasi otomatis setiap kali pengguna membuat tagihan atau mengunggah bukti bayar.
                    </p>
                  </div>

                  <div className="space-y-3">
                    {bankSlots.map((slot, idx) => (
                      <div
                        key={idx}
                        className="grid gap-3 rounded-lg border border-(--adm-border) bg-(--adm-bg-primary) p-3 sm:grid-cols-3"
                      >
                        <div>
                          <label className="adm-label">
                            Bank / E-Wallet #{idx + 1}
                          </label>
                          <input
                            type="text"
                            value={slot.bank}
                            onChange={(e) =>
                              setBankSlots((prev) =>
                                prev.map((s, i) =>
                                  i === idx ? { ...s, bank: e.target.value } : s
                                )
                              )
                            }
                            placeholder="Contoh: Bank BCA / BRI / Mandiri"
                            className="adm-input"
                          />
                        </div>
                        <div>
                          <label className="adm-label">Nomor Rekening</label>
                          <input
                            type="text"
                            value={slot.number}
                            onChange={(e) =>
                              setBankSlots((prev) =>
                                prev.map((s, i) =>
                                  i === idx
                                    ? { ...s, number: e.target.value }
                                    : s
                                )
                              )
                            }
                            placeholder="1234567890"
                            className="adm-input font-mono"
                          />
                        </div>
                        <div>
                          <label className="adm-label">Atas Nama</label>
                          <input
                            type="text"
                            value={slot.holder}
                            onChange={(e) =>
                              setBankSlots((prev) =>
                                prev.map((s, i) =>
                                  i === idx
                                    ? { ...s, holder: e.target.value }
                                    : s
                                )
                              )
                            }
                            placeholder="ZEDLABS Teknologi Indonesia"
                            className="adm-input"
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="max-w-md">
                    <label className="adm-label">
                      Nomor WhatsApp Admin Penerima Notifikasi &amp; Konfirmasi Pembayaran
                    </label>
                    <input
                      type="text"
                      value={waForm.PAYMENT_WHATSAPP_CONFIRM}
                      onChange={(e) =>
                        setWaForm((p) => ({
                          ...p,
                          PAYMENT_WHATSAPP_CONFIRM: e.target.value,
                        }))
                      }
                      placeholder="081234567890 (pisahkan koma jika lebih dari satu)"
                      className="adm-input"
                    />
                  </div>

                  <button
                    type="button"
                    disabled={busy !== null}
                    onClick={async () => {
                      const cleanBanks = bankSlots
                        .map((s) => ({
                          bank: s.bank.trim(),
                          number: s.number.trim(),
                          holder: s.holder.trim(),
                        }))
                        .filter((s) => s.bank && s.number);
                      const first = cleanBanks[0];
                      const res = await callAction(
                        "save-pay",
                        {
                          action: "save_platform_wa",
                          PAYMENT_BANK_ACCOUNTS: JSON.stringify(cleanBanks),
                          PAYMENT_BANK_NAME: first?.bank || "",
                          PAYMENT_BANK_ACCOUNT: first?.number || "",
                          PAYMENT_BANK_HOLDER: first?.holder || "",
                          PAYMENT_WHATSAPP_CONFIRM:
                            waForm.PAYMENT_WHATSAPP_CONFIRM,
                        },
                        "Rekening pembayaran & kontak WhatsApp berhasil disimpan permanen di database."
                      );
                      if (res) await loadData();
                    }}
                    className="adm-btn adm-btn-primary adm-btn-sm"
                  >
                    Simpan Pengaturan Pembayaran
                  </button>
                </div>
              </div>
            ) : tab === "platform_wa" ? (
              <div className="adm-card space-y-4 p-5">
                <div>
                  <h2 className="text-sm font-semibold">
                    WhatsApp Gateway Platform (OTP &amp; Invoicing Pembayaran)
                  </h2>
                  <p className="mt-1 text-xs text-(--adm-text-secondary)">
                    Digunakan platform untuk mengirim kode OTP pendaftaran/reset password serta notifikasi invoicing pembayaran ke pengguna dan Superadmin.
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="adm-label">Nama Platform</label>
                    <input
                      type="text"
                      value={waForm.PLATFORM_NAME}
                      onChange={(e) =>
                        setWaForm((p) => ({
                          ...p,
                          PLATFORM_NAME: e.target.value,
                        }))
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
                        setWaForm((p) => ({
                          ...p,
                          WA_BASE_URL: e.target.value,
                        }))
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
                        setWaForm((p) => ({
                          ...p,
                          WA_API_SECRET: e.target.value,
                        }))
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
                        "5 Template Platform (OTP + 4 Invoicing) berhasil disinkronkan ke Gateway!"
                      )
                    }
                    className="adm-btn adm-btn-edit adm-btn-sm"
                  >
                    Sinkron 5 Template Platform (OTP &amp; Invoicing)
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
                  <h2 className="text-sm font-semibold">
                    Kredensial &amp; Profil Superadmin
                  </h2>
                  <p className="mt-1 text-xs text-(--adm-text-secondary)">
                    Atur foto profil, username, nomor WhatsApp (untuk OTP &amp; notifikasi pembayaran), dan password Superadmin.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-4 rounded-lg border border-(--adm-border) bg-(--adm-bg-primary) p-3.5">
                  {accForm.avatarUrl ? (
                    <img
                      src={accForm.avatarUrl}
                      alt={accForm.fullName || accForm.username || "Superadmin"}
                      className="h-14 w-14 rounded-full border border-(--adm-border) object-cover"
                    />
                  ) : (
                    <div className="flex h-14 w-14 items-center justify-center rounded-full border border-(--adm-border) bg-(--adm-accent-soft) text-(--adm-accent)">
                      <Shield className="h-6 w-6" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-semibold text-(--adm-text-primary)">
                      Foto Profil / Avatar
                    </div>
                    <p className="mt-0.5 text-[11px] text-(--adm-text-secondary)">
                      Format JPG, PNG, atau WebP maksimal 3 MB.
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <label className="adm-btn adm-btn-secondary adm-btn-sm cursor-pointer">
                        {uploadingAvatar ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Camera className="h-3.5 w-3.5" />
                        )}
                        {uploadingAvatar ? "Mengunggah..." : "Unggah Foto"}
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp,image/gif"
                          disabled={uploadingAvatar || busy !== null}
                          onChange={(e) => void handleAvatarUpload(e)}
                          className="hidden"
                        />
                      </label>
                      {accForm.avatarUrl && (
                        <button
                          type="button"
                          disabled={uploadingAvatar || busy !== null}
                          onClick={() => void handleAvatarRemove()}
                          className="adm-btn adm-btn-danger adm-btn-sm"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Hapus Foto
                        </button>
                      )}
                    </div>
                  </div>
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
                    <label className="adm-label">
                      Nomor WhatsApp (OTP &amp; Notif Bayar)
                    </label>
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
                    <label className="adm-label">
                      Password Saat Ini (jika ganti password)
                    </label>
                    <input
                      type="password"
                      value={accForm.currentPassword}
                      onChange={(e) =>
                        setAccForm((p) => ({
                          ...p,
                          currentPassword: e.target.value,
                        }))
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
                        setAccForm((p) => ({
                          ...p,
                          newPassword: e.target.value,
                        }))
                      }
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
          </div>
        </main>

        {/* Compact Footer */}
        <footer className="flex min-h-[44px] shrink-0 flex-col items-center justify-center gap-0.5 border-t border-(--adm-border) bg-(--adm-bg-secondary) px-4 py-2 text-center text-[11px] text-(--adm-text-secondary) sm:flex-row sm:justify-between sm:py-1.5 sm:text-left md:px-6">
          <span>
            &copy; 2018 - {currentYear}{" "}
            <strong className="font-semibold uppercase">
              ZEDLABS Teknologi Indonesia
            </strong>
          </span>
          <span>Superadmin Panel SaaS Undangan</span>
        </footer>
      </div>

      {/* Modal Review Bukti Transfer (seperti whatsapp-service/superadmin/tagihan) */}
      {reviewOrder && (
        <div
          role="dialog"
          aria-modal="true"
          className="adm-modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) setReviewOrder(null);
          }}
        >
          <div className="adm-modal max-w-2xl">
            <div className="adm-modal-header">
              <div>
                <h3 className="adm-modal-title">
                  Review Bukti {reviewOrder.invoice_code}
                </h3>
                <p className="text-xs text-(--adm-text-secondary)">
                  {reviewOrder.wedding_title} ·{" "}
                  <strong>{formatIdr(reviewOrder.amount)}</strong> (+
                  {reviewOrder.added_guests.toLocaleString("id-ID")} tamu)
                </p>
              </div>
              <button
                type="button"
                aria-label="Tutup"
                onClick={() => setReviewOrder(null)}
                className="adm-btn adm-btn-ghost adm-btn-sm px-1.5"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="adm-modal-body space-y-4">
              <div className="flex flex-wrap justify-between gap-2 rounded-lg border border-(--adm-border) bg-(--adm-bg-primary) p-3 text-xs">
                <div>
                  <span className="text-(--adm-text-secondary)">Pengirim: </span>
                  <strong>
                    {reviewOrder.sender_name || reviewOrder.payment_note || "-"}
                  </strong>
                  {reviewOrder.sender_bank && ` (${reviewOrder.sender_bank})`}
                </div>
                <span
                  className={`adm-badge ${ORDER_STATUS_META[reviewOrder.status].cls}`}
                >
                  {ORDER_STATUS_META[reviewOrder.status].label}
                </span>
              </div>

              {reviewOrder.proof_url && (
                <a
                  href={reviewOrder.proof_url}
                  target="_blank"
                  rel="noreferrer"
                  className="block overflow-hidden rounded-lg border border-(--adm-border) bg-(--adm-bg-primary)"
                >
                  <img
                    src={reviewOrder.proof_url}
                    alt={`Bukti transfer ${reviewOrder.invoice_code}`}
                    className="max-h-[55vh] w-full object-contain"
                  />
                </a>
              )}

              {(reviewOrder.status === "review" ||
                reviewOrder.status === "unpaid") && (
                <div>
                  <label htmlFor="reject-reason" className="adm-label">
                    Alasan Penolakan (wajib diisi jika menolak, dikirim via WhatsApp ke pengguna)
                  </label>
                  <textarea
                    id="reject-reason"
                    rows={2}
                    maxLength={500}
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="Contoh: Nominal transfer belum sesuai atau foto bukti kurang jelas."
                    className="adm-input"
                  />
                </div>
              )}
            </div>

            <div className="adm-modal-footer">
              <button
                type="button"
                onClick={() => setReviewOrder(null)}
                className="adm-btn adm-btn-secondary"
              >
                Tutup
              </button>
              {reviewOrder.status === "review" && (
                <button
                  type="button"
                  disabled={busy !== null}
                  onClick={async () => {
                    if (!rejectReason.trim()) {
                      notify(
                        "error",
                        "Isi alasan penolakan terlebih dahulu."
                      );
                      return;
                    }
                    const res = await callAction(
                      `rej-modal-${reviewOrder.id}`,
                      {
                        action: "reject_order",
                        orderId: reviewOrder.id,
                        adminNote: rejectReason.trim(),
                      },
                      `Bukti ${reviewOrder.invoice_code} ditolak & pengguna dikabari via WhatsApp.`
                    );
                    if (res) {
                      setReviewOrder(null);
                      await loadData();
                    }
                  }}
                  className="adm-btn adm-btn-danger"
                >
                  Tolak Bukti
                </button>
              )}
              {(reviewOrder.status === "review" ||
                reviewOrder.status === "unpaid" ||
                reviewOrder.status === "rejected") && (
                <button
                  type="button"
                  disabled={busy !== null}
                  onClick={async () => {
                    const res = await callAction(
                      `app-modal-${reviewOrder.id}`,
                      {
                        action: "approve_order",
                        orderId: reviewOrder.id,
                      },
                      `Tagihan ${reviewOrder.invoice_code} disetujui! Kuota aktif & invoice WA dikirim.`
                    );
                    if (res) {
                      setReviewOrder(null);
                      await loadData();
                    }
                  }}
                  className="adm-btn adm-btn-primary"
                >
                  Setujui &amp; Aktifkan Kuota
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuperadminDashboard;
