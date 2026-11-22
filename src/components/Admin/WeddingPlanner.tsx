import FileSaver from "file-saver";
import {
  BookHeart,
  BookOpen,
  Check,
  CheckCircle2,
  CheckSquare,
  ChevronDown,
  Download,
  ExternalLink,
  FileCheck2,
  Gift,
  Loader2,
  MessageCircle,
  PiggyBank,
  Plus,
  Search,
  Sparkles,
  Square,
  Trash2,
  Wallet,
} from "lucide-react";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { buildCsvBlob } from "../../utils/csvImport";
import {
  BUDGET_CATEGORIES,
  FIQH_GUIDES,
  JOURNAL_MOODS,
  JOURNAL_PROMPTS,
  PLANNER_SUBMENUS,
  TODO_CATEGORIES,
  TODO_PHASES,
  computeBudgetSummary,
  computeSavingsSummary,
  computeTodoSummary,
  formatRupiah,
  type PlannerBudgetItem,
  type PlannerEssential,
  type PlannerJournalEntry,
  type PlannerSaving,
  type PlannerSectionId,
  type PlannerTodo,
} from "../../utils/plannerData";
import {
  ConfirmModal,
  ToastBanner,
  type ConfirmDialogState,
  type ToastState,
} from "./AdminFeedback";

interface WeddingPlannerProps {
  activeSection?: PlannerSectionId;
  onSectionChange?: (section: PlannerSectionId) => void;
}

const PAYMENT_STATUS_META: Record<
  PlannerBudgetItem["payment_status"],
  { label: string; badgeClass: string }
> = {
  belum: { label: "Belum Bayar", badgeClass: "adm-badge" },
  dp: { label: "DP", badgeClass: "adm-badge adm-badge-warning" },
  cicilan: { label: "Cicilan", badgeClass: "adm-badge adm-badge-accent" },
  lunas: { label: "Lunas", badgeClass: "adm-badge adm-badge-success" },
};

const ESSENTIAL_STATUS_NEXT: Record<
  PlannerEssential["status"],
  PlannerEssential["status"]
> = {
  rencana: "dibeli",
  dibeli: "siap",
  siap: "rencana",
};

const ESSENTIAL_STATUS_META: Record<
  PlannerEssential["status"],
  { label: string; badgeClass: string }
> = {
  rencana: { label: "Rencana", badgeClass: "adm-badge" },
  dibeli: { label: "Sudah Dibeli", badgeClass: "adm-badge adm-badge-accent" },
  siap: { label: "Siap / Dihias", badgeClass: "adm-badge adm-badge-success" },
};

const SECTION_ICONS: Record<PlannerSectionId, React.ComponentType<{ className?: string }>> = {
  todo: CheckSquare,
  budget: Wallet,
  savings: PiggyBank,
  essentials: Gift,
  journal: BookHeart,
  fiqh: BookOpen,
};

function toWaHref(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("0")) return `https://wa.me/62${digits.slice(1)}`;
  return `https://wa.me/${digits}`;
}

const WeddingPlanner: React.FC<WeddingPlannerProps> = ({
  activeSection,
  onSectionChange,
}) => {
  const [internalSection, setInternalSection] =
    useState<PlannerSectionId>("todo");
  const currentSection = activeSection ?? internalSection;
  const selectSection = (next: PlannerSectionId) => {
    setInternalSection(next);
    onSectionChange?.(next);
  };

  const [loading, setLoading] = useState(true);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [todos, setTodos] = useState<PlannerTodo[]>([]);
  const [budget, setBudget] = useState<PlannerBudgetItem[]>([]);
  const [savings, setSavings] = useState<PlannerSaving[]>([]);
  const [essentials, setEssentials] = useState<PlannerEssential[]>([]);
  const [journal, setJournal] = useState<PlannerJournalEntry[]>([]);
  const [savingsTarget, setSavingsTarget] = useState<number>(50_000_000);
  const [targetInput, setTargetInput] = useState<string>("50000000");
  const [weddingDateIso, setWeddingDateIso] = useState<string>("");
  const [toast, setToast] = useState<ToastState | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState | null>(
    null
  );

  // Filters & drafts
  const [todoPhaseFilter, setTodoPhaseFilter] = useState<string>("all");
  const [todoDraft, setTodoDraft] = useState({
    title: "",
    phase: "H-3 Bulan",
    category: "Umum",
    due_date: "",
    pic: "Bersama",
    notes: "",
  });

  const [budgetCategoryFilter, setBudgetCategoryFilter] =
    useState<string>("all");
  const [editingBudgetId, setEditingBudgetId] = useState<number | null>(null);
  const [budgetDraft, setBudgetDraft] = useState({
    name: "",
    category: "Venue & Gedung",
    estimated_cost: "",
    actual_cost: "",
    paid_amount: "",
    payment_status: "belum" as PlannerBudgetItem["payment_status"],
    vendor_phone: "",
    due_date: "",
    notes: "",
  });

  const [savingDraft, setSavingDraft] = useState({
    entry_date: new Date().toISOString().slice(0, 10),
    contributor: "Bersama",
    entry_type: "setor" as "setor" | "tarik",
    amount: "",
    note: "",
  });

  const [essentialTab, setEssentialTab] = useState<"gifts" | "kua">("gifts");
  const [essentialDraft, setEssentialDraft] = useState({
    kind: "seserahan" as "mahar" | "seserahan" | "kua",
    title: "",
    price: "",
    owner: "Calon Suami",
    notes: "",
  });

  const [journalDraft, setJournalDraft] = useState({
    entry_date: new Date().toISOString().slice(0, 10),
    author: "Bersama",
    mood: "bersyukur" as PlannerJournalEntry["mood"],
    title: "",
    content: "",
  });

  const [fiqhSearch, setFiqhSearch] = useState("");
  const [openFiqhId, setOpenFiqhId] = useState<string>(FIQH_GUIDES[0].id);

  const loadAll = useCallback(async () => {
    try {
      const res = await fetch("/api/planner?resource=all", {
        credentials: "include",
      });
      if (!res.ok) return;
      const data = await res.json();
      setTodos(Array.isArray(data.todos) ? data.todos : []);
      setBudget(Array.isArray(data.budget) ? data.budget : []);
      setSavings(Array.isArray(data.savings) ? data.savings : []);
      setEssentials(Array.isArray(data.essentials) ? data.essentials : []);
      setJournal(Array.isArray(data.journal) ? data.journal : []);
      const tgt = Number(data.savingsTarget || 50_000_000);
      setSavingsTarget(tgt);
      setTargetInput(String(tgt));
      setWeddingDateIso(String(data.weddingDateIso || ""));
    } catch {
      setToast({
        type: "error",
        message: "Gagal memuat data manajemen pernikahan.",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const todoSummary = useMemo(() => computeTodoSummary(todos), [todos]);
  const budgetSummary = useMemo(() => computeBudgetSummary(budget), [budget]);
  const savingsSummary = useMemo(
    () => computeSavingsSummary(savings, savingsTarget, weddingDateIso),
    [savings, savingsTarget, weddingDateIso]
  );

  const giftEssentials = useMemo(
    () => essentials.filter((e) => e.kind === "mahar" || e.kind === "seserahan"),
    [essentials]
  );
  const kuaEssentials = useMemo(
    () => essentials.filter((e) => e.kind === "kua"),
    [essentials]
  );
  const totalGiftValue = useMemo(
    () => giftEssentials.reduce((s, e) => s + (Number(e.price) || 0), 0),
    [giftEssentials]
  );
  const kuaDoneCount = useMemo(
    () =>
      kuaEssentials.filter((e) => e.done_groom === 1 && e.done_bride === 1)
        .length,
    [kuaEssentials]
  );

  const filteredTodos = useMemo(
    () =>
      todos.filter(
        (t) => todoPhaseFilter === "all" || t.phase === todoPhaseFilter
      ),
    [todos, todoPhaseFilter]
  );

  const filteredBudget = useMemo(
    () =>
      budget.filter(
        (b) =>
          budgetCategoryFilter === "all" || b.category === budgetCategoryFilter
      ),
    [budget, budgetCategoryFilter]
  );

  const filteredFiqh = useMemo(() => {
    const q = fiqhSearch.trim().toLowerCase();
    if (!q) return FIQH_GUIDES;
    return FIQH_GUIDES.filter(
      (g) =>
        g.title.toLowerCase().includes(q) ||
        g.category.toLowerCase().includes(q) ||
        g.summary.toLowerCase().includes(q) ||
        g.points.some((p) => p.toLowerCase().includes(q))
    );
  }, [fiqhSearch]);

  const handleSeed = async (resource: "todos" | "budget" | "essentials") => {
    setBusyAction(`seed-${resource}`);
    try {
      const res = await fetch("/api/planner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action: "seed", resource }),
      });
      const payload = await res.json().catch(() => ({}));
      if (res.ok) {
        setToast({
          type: "success",
          message: `${payload.count || 0} item templat persiapan berhasil dimuat.`,
        });
        await loadAll();
      } else {
        setToast({
          type: "error",
          message: payload?.error || "Gagal memuat templat.",
        });
      }
    } finally {
      setBusyAction(null);
    }
  };

  const handleDelete = (
    resource: "todos" | "budget" | "savings" | "essentials" | "journal",
    id: number,
    label: string
  ) => {
    setConfirmDialog({
      title: "Hapus Catatan",
      message: `Yakin ingin menghapus "${label}"?`,
      confirmLabel: "Hapus",
      destructive: true,
      onConfirm: async () => {
        const res = await fetch("/api/planner", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ resource, id }),
        });
        if (res.ok) {
          await loadAll();
          setToast({ type: "success", message: "Catatan berhasil dihapus." });
        }
      },
    });
  };

  // --- TODO handlers ---
  const handleAddTodo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!todoDraft.title.trim()) return;
    setBusyAction("add-todo");
    try {
      const res = await fetch("/api/planner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ resource: "todos", ...todoDraft }),
      });
      if (res.ok) {
        setTodoDraft({
          title: "",
          phase: todoDraft.phase,
          category: todoDraft.category,
          due_date: "",
          pic: "Bersama",
          notes: "",
        });
        await loadAll();
        setToast({ type: "success", message: "Tugas persiapan ditambahkan." });
      }
    } finally {
      setBusyAction(null);
    }
  };

  const handleToggleTodo = async (todo: PlannerTodo) => {
    const nextDone = todo.done === 1 ? 0 : 1;
    setTodos((prev) =>
      prev.map((t) => (t.id === todo.id ? { ...t, done: nextDone } : t))
    );
    await fetch("/api/planner", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        resource: "todos",
        id: todo.id,
        toggleDone: nextDone === 1,
      }),
    });
  };

  // --- BUDGET handlers ---
  const resetBudgetDraft = () => {
    setEditingBudgetId(null);
    setBudgetDraft({
      name: "",
      category: "Venue & Gedung",
      estimated_cost: "",
      actual_cost: "",
      paid_amount: "",
      payment_status: "belum",
      vendor_phone: "",
      due_date: "",
      notes: "",
    });
  };

  const handleSaveBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!budgetDraft.name.trim()) return;
    setBusyAction("save-budget");
    try {
      const method = editingBudgetId ? "PUT" : "POST";
      const res = await fetch("/api/planner", {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          resource: "budget",
          id: editingBudgetId ?? undefined,
          ...budgetDraft,
          estimated_cost: Number(budgetDraft.estimated_cost) || 0,
          actual_cost: Number(budgetDraft.actual_cost) || 0,
          paid_amount: Number(budgetDraft.paid_amount) || 0,
        }),
      });
      if (res.ok) {
        resetBudgetDraft();
        await loadAll();
        setToast({
          type: "success",
          message: editingBudgetId
            ? "Pos anggaran diperbarui."
            : "Pos anggaran ditambahkan.",
        });
      }
    } finally {
      setBusyAction(null);
    }
  };

  const handleExportBudgetCsv = () => {
    const headers = [
      "Nama Pos / Vendor",
      "Kategori",
      "Estimasi (Rp)",
      "Harga Deal (Rp)",
      "Sudah Dibayar (Rp)",
      "Status",
      "Kontak WA",
      "Tenggat",
      "Catatan",
    ];
    const rows = budget.map((b) => [
      b.name,
      b.category,
      b.estimated_cost,
      b.actual_cost,
      b.paid_amount,
      PAYMENT_STATUS_META[b.payment_status]?.label || b.payment_status,
      b.vendor_phone,
      b.due_date,
      b.notes,
    ]);
    const blob = buildCsvBlob(headers, rows);
    const saveAsFunc =
      (FileSaver as unknown as { saveAs?: typeof FileSaver }).saveAs ||
      FileSaver;
    saveAsFunc(
      blob,
      `anggaran_pernikahan_${new Date().toISOString().slice(0, 10)}.csv`
    );
  };

  // --- SAVINGS handlers ---
  const handleSaveTarget = async (newTarget: number) => {
    setBusyAction("save-target");
    try {
      const res = await fetch("/api/planner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action: "set_target", target: newTarget }),
      });
      if (res.ok) {
        setSavingsTarget(newTarget);
        setTargetInput(String(newTarget));
        setToast({
          type: "success",
          message: `Target tabungan diperbarui menjadi ${formatRupiah(newTarget)}.`,
        });
      }
    } finally {
      setBusyAction(null);
    }
  };

  const handleAddSaving = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Number(savingDraft.amount);
    if (!amt || amt <= 0) return;
    setBusyAction("add-saving");
    try {
      const res = await fetch("/api/planner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          resource: "savings",
          ...savingDraft,
          amount: amt,
        }),
      });
      if (res.ok) {
        setSavingDraft({
          ...savingDraft,
          amount: "",
          note: "",
        });
        await loadAll();
        setToast({
          type: "success",
          message:
            savingDraft.entry_type === "setor"
              ? "Setoran tabungan berhasil dicatat."
              : "Penarikan dana berhasil dicatat.",
        });
      }
    } finally {
      setBusyAction(null);
    }
  };

  // --- ESSENTIALS handlers ---
  const handleAddEssential = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!essentialDraft.title.trim()) return;
    setBusyAction("add-essential");
    try {
      const res = await fetch("/api/planner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          resource: "essentials",
          ...essentialDraft,
          kind: essentialTab === "kua" ? "kua" : essentialDraft.kind,
          price: Number(essentialDraft.price) || 0,
        }),
      });
      if (res.ok) {
        setEssentialDraft({
          ...essentialDraft,
          title: "",
          price: "",
          notes: "",
        });
        await loadAll();
        setToast({ type: "success", message: "Item berhasil ditambahkan." });
      }
    } finally {
      setBusyAction(null);
    }
  };

  const handleCycleEssentialStatus = async (item: PlannerEssential) => {
    const nextStatus = ESSENTIAL_STATUS_NEXT[item.status] || "rencana";
    setEssentials((prev) =>
      prev.map((e) => (e.id === item.id ? { ...e, status: nextStatus } : e))
    );
    await fetch("/api/planner", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        resource: "essentials",
        id: item.id,
        patchStatus: nextStatus,
      }),
    });
  };

  const handleToggleKuaCheck = async (
    item: PlannerEssential,
    side: "groom" | "bride"
  ) => {
    const nextVal =
      side === "groom" ? (item.done_groom === 1 ? 0 : 1) : item.done_bride === 1 ? 0 : 1;
    setEssentials((prev) =>
      prev.map((e) =>
        e.id === item.id
          ? side === "groom"
            ? { ...e, done_groom: nextVal }
            : { ...e, done_bride: nextVal }
          : e
      )
    );
    await fetch("/api/planner", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        resource: "essentials",
        id: item.id,
        patchToggle: side,
        value: nextVal === 1,
      }),
    });
  };

  // --- JOURNAL handlers ---
  const handleAddJournal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!journalDraft.title.trim() || !journalDraft.content.trim()) return;
    setBusyAction("add-journal");
    try {
      const res = await fetch("/api/planner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ resource: "journal", ...journalDraft }),
      });
      if (res.ok) {
        setJournalDraft({
          ...journalDraft,
          title: "",
          content: "",
        });
        await loadAll();
        setToast({
          type: "success",
          message: "Catatan jurnal menuju halal tersimpan.",
        });
      }
    } finally {
      setBusyAction(null);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[240px] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-(--adm-accent)" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <ToastBanner toast={toast} onClose={() => setToast(null)} />
      <ConfirmModal
        dialog={confirmDialog}
        onClose={() => setConfirmDialog(null)}
      />

      {/* Sticky Sub-Menu Bar (ikon simetris 6 kolom di smartphone, pil lengkap di desktop) */}
      <div
        data-tour="planner-nav"
        className="sticky top-[62px] z-20 rounded-lg border border-(--adm-border) bg-(--adm-bg-secondary)/95 p-2 shadow-xs backdrop-blur-md sm:p-2.5"
      >
        <div className="grid grid-cols-6 gap-1 sm:flex sm:flex-wrap sm:gap-1.5">
          {PLANNER_SUBMENUS.map((item) => {
            const Icon = SECTION_ICONS[item.id];
            const active = currentSection === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => selectSection(item.id)}
                title={item.label}
                aria-label={item.label}
                className={`inline-flex h-8 items-center justify-center gap-1.5 rounded-md border px-2 text-[11px] font-medium whitespace-nowrap transition-colors sm:h-auto sm:px-2.5 sm:py-1.5 ${
                  active
                    ? "border-(--adm-accent) bg-(--adm-accent-soft) text-(--adm-accent)"
                    : "border-(--adm-border) bg-(--adm-bg-primary) text-(--adm-text-secondary) hover:border-(--adm-accent) hover:text-(--adm-accent)"
                }`}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" />
                <span className="hidden sm:inline">{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ==================== 1. TO-DO & PERSIAPAN ==================== */}
      {currentSection === "todo" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <div className="adm-card p-3.5">
              <span className="text-xs text-(--adm-text-secondary)">
                Progres Persiapan
              </span>
              <div className="mt-1 text-xl font-semibold text-(--adm-accent) tabular-nums">
                {todoSummary.percent}%
              </div>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-(--adm-bg-tertiary)">
                <div
                  className="h-full bg-(--adm-accent) transition-all duration-300"
                  style={{ width: `${todoSummary.percent}%` }}
                />
              </div>
            </div>
            <div className="adm-card p-3.5">
              <span className="text-xs text-(--adm-text-secondary)">
                Tugas Selesai
              </span>
              <div className="mt-1 text-xl font-semibold text-(--adm-green) tabular-nums">
                {todoSummary.completed} / {todoSummary.total}
              </div>
              <span className="adm-hint">
                {todoSummary.pending} belum selesai
              </span>
            </div>
            <div className="adm-card p-3.5">
              <span className="text-xs text-(--adm-text-secondary)">
                Dana Tabungan
              </span>
              <div className="mt-1 truncate text-base font-semibold text-(--adm-text-primary) tabular-nums sm:text-lg">
                {formatRupiah(savingsSummary.balance)}
              </div>
              <span className="adm-hint">
                {savingsSummary.percent}% dari target
              </span>
            </div>
            <div className="adm-card p-3.5">
              <span className="text-xs text-(--adm-text-secondary)">
                Tagihan Vendor
              </span>
              <div className="mt-1 truncate text-base font-semibold text-(--adm-text-primary) tabular-nums sm:text-lg">
                {formatRupiah(budgetSummary.remaining)}
              </div>
              <span className="adm-hint">
                Terbayar {budgetSummary.paidPercent}%
              </span>
            </div>
          </div>

          <form
            onSubmit={handleAddTodo}
            className="adm-card space-y-3 p-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="adm-card-title">Tambah Tugas Persiapan</h3>
              <button
                type="button"
                disabled={busyAction === "seed-todos"}
                onClick={() => void handleSeed("todos")}
                className="adm-btn adm-btn-outline-primary adm-btn-sm"
              >
                {busyAction === "seed-todos" ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5" />
                )}
                <span>
                  Muat Templat<span className="hidden sm:inline"> Persiapan</span>
                </span>
              </button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-12">
              <div className="sm:col-span-2 lg:col-span-5">
                <label htmlFor="todo-title" className="adm-label">
                  Nama Tugas *
                </label>
                <input
                  id="todo-title"
                  type="text"
                  required
                  value={todoDraft.title}
                  onChange={(e) =>
                    setTodoDraft({ ...todoDraft, title: e.target.value })
                  }
                  placeholder="Contoh: Urus pengantar N1, N2, N4 ke Kelurahan"
                  className="adm-input"
                />
              </div>
              <div className="lg:col-span-2">
                <label htmlFor="todo-phase" className="adm-label">
                  Fase Waktu
                </label>
                <select
                  id="todo-phase"
                  value={todoDraft.phase}
                  onChange={(e) =>
                    setTodoDraft({ ...todoDraft, phase: e.target.value })
                  }
                  className="adm-input"
                >
                  {TODO_PHASES.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>
              <div className="lg:col-span-3">
                <label htmlFor="todo-category" className="adm-label">
                  Kategori
                </label>
                <select
                  id="todo-category"
                  value={todoDraft.category}
                  onChange={(e) =>
                    setTodoDraft({ ...todoDraft, category: e.target.value })
                  }
                  className="adm-input"
                >
                  {TODO_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div className="lg:col-span-2">
                <label htmlFor="todo-pic" className="adm-label">
                  PIC
                </label>
                <input
                  id="todo-pic"
                  type="text"
                  value={todoDraft.pic}
                  onChange={(e) =>
                    setTodoDraft({ ...todoDraft, pic: e.target.value })
                  }
                  placeholder="Bersama"
                  className="adm-input"
                />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-12">
              <div className="sm:col-span-3">
                <label htmlFor="todo-due" className="adm-label">
                  Tenggat (Opsional)
                </label>
                <input
                  id="todo-due"
                  type="date"
                  value={todoDraft.due_date}
                  onChange={(e) =>
                    setTodoDraft({ ...todoDraft, due_date: e.target.value })
                  }
                  className="adm-input"
                />
              </div>
              <div className="sm:col-span-6">
                <label htmlFor="todo-notes" className="adm-label">
                  Catatan
                </label>
                <input
                  id="todo-notes"
                  type="text"
                  value={todoDraft.notes}
                  onChange={(e) =>
                    setTodoDraft({ ...todoDraft, notes: e.target.value })
                  }
                  placeholder="Rincian atau pengingat singkat..."
                  className="adm-input"
                />
              </div>
              <div className="flex items-end sm:col-span-3">
                <button
                  type="submit"
                  disabled={busyAction === "add-todo" || !todoDraft.title.trim()}
                  className="adm-btn adm-btn-primary w-full"
                >
                  <Plus className="h-3.5 w-3.5" /> Tambah Tugas
                </button>
              </div>
            </div>
          </form>

          {/* Filter Fase */}
          <div className="flex flex-wrap items-center gap-1.5">
            {["all", ...TODO_PHASES].map((phase) => (
              <button
                key={phase}
                type="button"
                onClick={() => setTodoPhaseFilter(phase)}
                className={`rounded-md border px-2.5 py-1 text-[11px] font-medium transition-colors ${
                  todoPhaseFilter === phase
                    ? "border-(--adm-accent) bg-(--adm-accent-soft) text-(--adm-accent)"
                    : "border-(--adm-border) bg-(--adm-bg-secondary) text-(--adm-text-secondary) hover:text-(--adm-text-primary)"
                }`}
              >
                {phase === "all" ? `Semua (${todos.length})` : phase}
              </button>
            ))}
          </div>

          <div className="adm-card divide-y divide-(--adm-border)">
            {filteredTodos.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-xs text-(--adm-text-secondary)">
                  Belum ada daftar tugas persiapan pada fase ini. Klik{" "}
                  <strong>Muat Templat Persiapan</strong> di atas untuk
                  mengisi daftar tugas standar KUA &amp; Nusantara secara otomatis.
                </p>
              </div>
            ) : (
              filteredTodos.map((t) => (
                <div
                  key={t.id}
                  className="flex items-start justify-between gap-3 p-3.5 hover:bg-(--adm-bg-overlay)"
                >
                  <button
                    type="button"
                    onClick={() => void handleToggleTodo(t)}
                    className="mt-0.5 shrink-0 text-(--adm-accent)"
                    aria-label={
                      t.done === 1 ? "Tandai belum selesai" : "Tandai selesai"
                    }
                  >
                    {t.done === 1 ? (
                      <CheckCircle2 className="h-5 w-5 text-(--adm-green)" />
                    ) : (
                      <Square className="h-5 w-5 text-(--adm-text-muted)" />
                    )}
                  </button>
                  <div className="min-w-0 flex-1">
                    <div
                      className={`text-[13px] font-medium ${
                        t.done === 1
                          ? "text-(--adm-text-muted) line-through"
                          : "text-(--adm-text-primary)"
                      }`}
                    >
                      {t.title}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px]">
                      <span className="adm-badge adm-badge-accent">
                        {t.phase}
                      </span>
                      <span className="adm-badge">{t.category}</span>
                      {t.pic && (
                        <span className="text-(--adm-text-secondary)">
                          PIC: {t.pic}
                        </span>
                      )}
                      {t.due_date && (
                        <span className="text-(--adm-text-muted)">
                          · Tenggat: {t.due_date}
                        </span>
                      )}
                    </div>
                    {t.notes && (
                      <p className="adm-hint mt-1 leading-relaxed">{t.notes}</p>
                    )}
                  </div>
                  <button
                    type="button"
                    aria-label={`Hapus ${t.title}`}
                    onClick={() => handleDelete("todos", t.id, t.title)}
                    className="adm-btn-aksi aksi-hapus shrink-0"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ==================== 2. ANGGARAN & VENDOR ==================== */}
      {currentSection === "budget" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <div className="adm-card p-3.5">
              <span className="text-xs text-(--adm-text-secondary)">
                Total Estimasi
              </span>
              <div className="mt-1 truncate text-base font-semibold text-(--adm-text-primary) tabular-nums sm:text-lg">
                {formatRupiah(budgetSummary.totalEstimated)}
              </div>
            </div>
            <div className="adm-card p-3.5">
              <span className="text-xs text-(--adm-text-secondary)">
                Total Harga Deal
              </span>
              <div className="mt-1 truncate text-base font-semibold text-(--adm-accent) tabular-nums sm:text-lg">
                {formatRupiah(budgetSummary.totalActual)}
              </div>
            </div>
            <div className="adm-card p-3.5">
              <span className="text-xs text-(--adm-text-secondary)">
                Sudah Dibayar
              </span>
              <div className="mt-1 truncate text-base font-semibold text-(--adm-green) tabular-nums sm:text-lg">
                {formatRupiah(budgetSummary.totalPaid)}
              </div>
            </div>
            <div className="adm-card p-3.5">
              <span className="text-xs text-(--adm-text-secondary)">
                Sisa Tagihan
              </span>
              <div className="mt-1 truncate text-base font-semibold text-(--adm-red) tabular-nums sm:text-lg">
                {formatRupiah(budgetSummary.remaining)}
              </div>
            </div>
          </div>

          <form onSubmit={handleSaveBudget} className="adm-card space-y-3 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="adm-card-title">
                {editingBudgetId
                  ? "Sunting Pos Anggaran / Vendor"
                  : "Tambah Pos Anggaran / Vendor"}
              </h3>
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  disabled={busyAction === "seed-budget"}
                  onClick={() => void handleSeed("budget")}
                  className="adm-btn adm-btn-outline-primary adm-btn-sm"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>
                    Templat<span className="hidden sm:inline"> Anggaran</span>
                  </span>
                </button>
                {budget.length > 0 && (
                  <button
                    type="button"
                    onClick={handleExportBudgetCsv}
                    className="adm-btn adm-btn-secondary adm-btn-sm"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>Ekspor CSV</span>
                  </button>
                )}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-12">
              <div className="lg:col-span-4">
                <label htmlFor="budget-name" className="adm-label">
                  Nama Pos / Vendor *
                </label>
                <input
                  id="budget-name"
                  type="text"
                  required
                  value={budgetDraft.name}
                  onChange={(e) =>
                    setBudgetDraft({ ...budgetDraft, name: e.target.value })
                  }
                  placeholder="Contoh: Katering Berkah Nusantara"
                  className="adm-input"
                />
              </div>
              <div className="lg:col-span-3">
                <label htmlFor="budget-cat" className="adm-label">
                  Kategori
                </label>
                <select
                  id="budget-cat"
                  value={budgetDraft.category}
                  onChange={(e) =>
                    setBudgetDraft({ ...budgetDraft, category: e.target.value })
                  }
                  className="adm-input"
                >
                  {BUDGET_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div className="lg:col-span-2">
                <label htmlFor="budget-est" className="adm-label">
                  Estimasi (Rp)
                </label>
                <input
                  id="budget-est"
                  type="number"
                  min={0}
                  step={50000}
                  value={budgetDraft.estimated_cost}
                  onChange={(e) =>
                    setBudgetDraft({
                      ...budgetDraft,
                      estimated_cost: e.target.value,
                    })
                  }
                  placeholder="10000000"
                  className="adm-input"
                />
              </div>
              <div className="lg:col-span-3">
                <label htmlFor="budget-act" className="adm-label">
                  Harga Deal / Aktual (Rp)
                </label>
                <input
                  id="budget-act"
                  type="number"
                  min={0}
                  step={50000}
                  value={budgetDraft.actual_cost}
                  onChange={(e) =>
                    setBudgetDraft({
                      ...budgetDraft,
                      actual_cost: e.target.value,
                    })
                  }
                  placeholder="Kosongkan jika belum deal"
                  className="adm-input"
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-12">
              <div className="lg:col-span-3">
                <label htmlFor="budget-paid" className="adm-label">
                  Sudah Dibayar (Rp)
                </label>
                <input
                  id="budget-paid"
                  type="number"
                  min={0}
                  step={50000}
                  value={budgetDraft.paid_amount}
                  onChange={(e) =>
                    setBudgetDraft({
                      ...budgetDraft,
                      paid_amount: e.target.value,
                    })
                  }
                  placeholder="0"
                  className="adm-input"
                />
              </div>
              <div className="lg:col-span-2">
                <label htmlFor="budget-status" className="adm-label">
                  Status Bayar
                </label>
                <select
                  id="budget-status"
                  value={budgetDraft.payment_status}
                  onChange={(e) =>
                    setBudgetDraft({
                      ...budgetDraft,
                      payment_status: e.target
                        .value as PlannerBudgetItem["payment_status"],
                    })
                  }
                  className="adm-input"
                >
                  <option value="belum">Belum Bayar</option>
                  <option value="dp">DP</option>
                  <option value="cicilan">Cicilan</option>
                  <option value="lunas">Lunas</option>
                </select>
              </div>
              <div className="lg:col-span-3">
                <label htmlFor="budget-phone" className="adm-label">
                  No. WA Vendor
                </label>
                <input
                  id="budget-phone"
                  type="tel"
                  value={budgetDraft.vendor_phone}
                  onChange={(e) =>
                    setBudgetDraft({
                      ...budgetDraft,
                      vendor_phone: e.target.value,
                    })
                  }
                  placeholder="081234567890"
                  className="adm-input"
                />
              </div>
              <div className="lg:col-span-2">
                <label htmlFor="budget-due" className="adm-label">
                  Tenggat Bayar
                </label>
                <input
                  id="budget-due"
                  type="date"
                  value={budgetDraft.due_date}
                  onChange={(e) =>
                    setBudgetDraft({ ...budgetDraft, due_date: e.target.value })
                  }
                  className="adm-input"
                />
              </div>
              <div className="flex items-end gap-1.5 lg:col-span-2">
                <button
                  type="submit"
                  disabled={
                    busyAction === "save-budget" || !budgetDraft.name.trim()
                  }
                  className="adm-btn adm-btn-primary flex-1"
                >
                  <Check className="h-3.5 w-3.5" />
                  {editingBudgetId ? "Simpan" : "Tambah"}
                </button>
                {editingBudgetId && (
                  <button
                    type="button"
                    onClick={resetBudgetDraft}
                    className="adm-btn adm-btn-secondary px-2.5"
                  >
                    Batal
                  </button>
                )}
              </div>
            </div>
          </form>

          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {["all", ...BUDGET_CATEGORIES].map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setBudgetCategoryFilter(cat)}
                className={`shrink-0 rounded-md border px-2.5 py-1 text-[11px] font-medium transition-colors ${
                  budgetCategoryFilter === cat
                    ? "border-(--adm-accent) bg-(--adm-accent-soft) text-(--adm-accent)"
                    : "border-(--adm-border) bg-(--adm-bg-secondary) text-(--adm-text-secondary)"
                }`}
              >
                {cat === "all" ? `Semua (${budget.length})` : cat}
              </button>
            ))}
          </div>

          <div className="adm-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[12.5px]">
                <thead className="border-b border-(--adm-border) bg-(--adm-bg-primary) text-[11.5px] font-semibold text-(--adm-text-secondary)">
                  <tr>
                    <th className="px-3.5 py-2.5">Pos / Vendor</th>
                    <th className="px-3.5 py-2.5">Estimasi / Deal</th>
                    <th className="px-3.5 py-2.5">Terbayar / Sisa</th>
                    <th className="px-3.5 py-2.5">Status</th>
                    <th className="px-3.5 py-2.5 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-(--adm-border)">
                  {filteredBudget.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-4 py-8 text-center text-xs text-(--adm-text-secondary)"
                      >
                        Belum ada pos anggaran. Klik{" "}
                        <strong>Templat Anggaran</strong> untuk memulai cepat.
                      </td>
                    </tr>
                  ) : (
                    filteredBudget.map((b) => {
                      const effectiveCost =
                        b.actual_cost > 0 ? b.actual_cost : b.estimated_cost;
                      const sisa = Math.max(0, effectiveCost - b.paid_amount);
                      const statusMeta =
                        PAYMENT_STATUS_META[b.payment_status] ||
                        PAYMENT_STATUS_META.belum;
                      const waHref = toWaHref(b.vendor_phone);
                      return (
                        <tr
                          key={b.id}
                          className="hover:bg-(--adm-bg-overlay)"
                        >
                          <td className="px-3.5 py-2.5">
                            <div className="font-semibold text-(--adm-text-primary)">
                              {b.name}
                            </div>
                            <div className="text-[11px] text-(--adm-text-secondary)">
                              {b.category}
                              {b.due_date ? ` · Tenggat ${b.due_date}` : ""}
                            </div>
                            {b.notes && (
                              <div className="adm-hint mt-0.5">{b.notes}</div>
                            )}
                          </td>
                          <td className="px-3.5 py-2.5 whitespace-nowrap tabular-nums">
                            <div className="font-medium text-(--adm-text-primary)">
                              {formatRupiah(effectiveCost)}
                            </div>
                            {b.actual_cost > 0 &&
                              b.actual_cost !== b.estimated_cost && (
                                <div className="text-[11px] text-(--adm-text-muted)">
                                  Est: {formatRupiah(b.estimated_cost)}
                                </div>
                              )}
                          </td>
                          <td className="px-3.5 py-2.5 whitespace-nowrap tabular-nums">
                            <div className="text-(--adm-green)">
                              {formatRupiah(b.paid_amount)}
                            </div>
                            <div className="text-[11px] text-(--adm-text-muted)">
                              Sisa: {formatRupiah(sisa)}
                            </div>
                          </td>
                          <td className="px-3.5 py-2.5 whitespace-nowrap">
                            <span className={statusMeta.badgeClass}>
                              {statusMeta.label}
                            </span>
                          </td>
                          <td className="px-3.5 py-2.5 text-right">
                            <div className="inline-flex items-center gap-1">
                              {waHref && (
                                <a
                                  href={waHref}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  title="Chat WhatsApp Vendor"
                                  aria-label={`Chat WA ${b.name}`}
                                  className="adm-btn-aksi aksi-ubah"
                                >
                                  <MessageCircle className="h-3.5 w-3.5" />
                                </a>
                              )}
                              <button
                                type="button"
                                title="Sunting pos"
                                onClick={() => {
                                  setEditingBudgetId(b.id);
                                  setBudgetDraft({
                                    name: b.name,
                                    category: b.category,
                                    estimated_cost: String(b.estimated_cost),
                                    actual_cost: String(b.actual_cost),
                                    paid_amount: String(b.paid_amount),
                                    payment_status: b.payment_status,
                                    vendor_phone: b.vendor_phone,
                                    due_date: b.due_date,
                                    notes: b.notes,
                                  });
                                }}
                                className="adm-btn-aksi aksi-netral"
                              >
                                <FileCheck2 className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                aria-label={`Hapus ${b.name}`}
                                onClick={() =>
                                  handleDelete("budget", b.id, b.name)
                                }
                                className="adm-btn-aksi aksi-hapus"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ==================== 3. TABUNGAN MENUJU HALAL ==================== */}
      {currentSection === "savings" && (
        <div className="space-y-4">
          <div className="adm-card space-y-4 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <span className="text-xs font-medium text-(--adm-text-secondary)">
                  Saldo Dompet Nikah Terkumpul
                </span>
                <div className="mt-1 text-2xl font-bold text-(--adm-green) tabular-nums sm:text-3xl">
                  {formatRupiah(savingsSummary.balance)}
                </div>
                <p className="adm-hint mt-0.5">
                  Target: <strong>{formatRupiah(savingsSummary.target)}</strong>{" "}
                  ({savingsSummary.percent}%) · Sisa kebutuhan:{" "}
                  <strong>{formatRupiah(savingsSummary.remaining)}</strong>
                  {savingsSummary.monthsLeft > 0 &&
                    savingsSummary.remaining > 0 && (
                      <>
                        {" "}
                        · Estimasi nabung:{" "}
                        <strong className="text-(--adm-accent)">
                          {formatRupiah(savingsSummary.monthlyNeeded)}/bulan
                        </strong>{" "}
                        ({savingsSummary.monthsLeft} bulan lagi)
                      </>
                    )}
                </p>
              </div>
              <div className="flex flex-wrap items-end gap-2">
                <div>
                  <label htmlFor="savings-target" className="adm-label">
                    Target Dana (Rp)
                  </label>
                  <input
                    id="savings-target"
                    type="number"
                    min={0}
                    step={500000}
                    value={targetInput}
                    onChange={(e) => setTargetInput(e.target.value)}
                    className="adm-input adm-input-sm w-40"
                  />
                </div>
                <button
                  type="button"
                  disabled={busyAction === "save-target"}
                  onClick={() =>
                    void handleSaveTarget(Number(targetInput) || 0)
                  }
                  className="adm-btn adm-btn-primary adm-btn-sm"
                >
                  Simpan Target
                </button>
                {budgetSummary.totalActual > 0 && (
                  <button
                    type="button"
                    onClick={() =>
                      void handleSaveTarget(budgetSummary.totalActual)
                    }
                    className="adm-btn adm-btn-secondary adm-btn-sm"
                  >
                    Ikuti Anggaran
                  </button>
                )}
              </div>
            </div>

            <div className="h-2.5 w-full overflow-hidden rounded-full bg-(--adm-bg-tertiary)">
              <div
                className="h-full rounded-full bg-(--adm-green) transition-all duration-500"
                style={{ width: `${savingsSummary.percent}%` }}
              />
            </div>

            {Object.keys(savingsSummary.byContributor).length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {Object.entries(savingsSummary.byContributor).map(
                  ([who, amt]) => (
                    <span key={who} className="adm-badge adm-badge-accent">
                      {who}: {formatRupiah(amt)}
                    </span>
                  )
                )}
              </div>
            )}
          </div>

          <form onSubmit={handleAddSaving} className="adm-card space-y-3 p-4">
            <h3 className="adm-card-title">Catat Setoran / Penarikan Dana</h3>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-12">
              <div className="lg:col-span-2">
                <label htmlFor="sav-date" className="adm-label">
                  Tanggal
                </label>
                <input
                  id="sav-date"
                  type="date"
                  value={savingDraft.entry_date}
                  onChange={(e) =>
                    setSavingDraft({
                      ...savingDraft,
                      entry_date: e.target.value,
                    })
                  }
                  className="adm-input"
                />
              </div>
              <div className="lg:col-span-2">
                <label htmlFor="sav-type" className="adm-label">
                  Jenis
                </label>
                <select
                  id="sav-type"
                  value={savingDraft.entry_type}
                  onChange={(e) =>
                    setSavingDraft({
                      ...savingDraft,
                      entry_type: e.target.value as "setor" | "tarik",
                    })
                  }
                  className="adm-input"
                >
                  <option value="setor">Setor (+)</option>
                  <option value="tarik">Tarik (-)</option>
                </select>
              </div>
              <div className="lg:col-span-2">
                <label htmlFor="sav-who" className="adm-label">
                  Sumber
                </label>
                <select
                  id="sav-who"
                  value={savingDraft.contributor}
                  onChange={(e) =>
                    setSavingDraft({
                      ...savingDraft,
                      contributor: e.target.value,
                    })
                  }
                  className="adm-input"
                >
                  <option value="Bersama">Bersama</option>
                  <option value="Calon Suami">Calon Suami</option>
                  <option value="Calon Istri">Calon Istri</option>
                  <option value="Keluarga">Keluarga</option>
                </select>
              </div>
              <div className="lg:col-span-3">
                <label htmlFor="sav-amt" className="adm-label">
                  Nominal (Rp) *
                </label>
                <input
                  id="sav-amt"
                  type="number"
                  required
                  min={1000}
                  step={50000}
                  value={savingDraft.amount}
                  onChange={(e) =>
                    setSavingDraft({ ...savingDraft, amount: e.target.value })
                  }
                  placeholder="2000000"
                  className="adm-input"
                />
              </div>
              <div className="lg:col-span-3">
                <label htmlFor="sav-note" className="adm-label">
                  Keterangan
                </label>
                <input
                  id="sav-note"
                  type="text"
                  value={savingDraft.note}
                  onChange={(e) =>
                    setSavingDraft({ ...savingDraft, note: e.target.value })
                  }
                  placeholder="Tabungan gaji bulan ini"
                  className="adm-input"
                />
              </div>
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={busyAction === "add-saving" || !savingDraft.amount}
                className="adm-btn adm-btn-primary w-full sm:w-auto"
              >
                <Plus className="h-3.5 w-3.5" /> Catat Transaksi
              </button>
            </div>
          </form>

          <div className="adm-card divide-y divide-(--adm-border)">
            {savings.length === 0 ? (
              <p className="p-8 text-center text-xs text-(--adm-text-secondary)">
                Belum ada riwayat tabungan. Mulai catat setoran pertama Anda di
                atas.
              </p>
            ) : (
              savings.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between gap-3 p-3.5"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`font-semibold tabular-nums ${
                          s.entry_type === "tarik"
                            ? "text-(--adm-red)"
                            : "text-(--adm-green)"
                        }`}
                      >
                        {s.entry_type === "tarik" ? "-" : "+"}
                        {formatRupiah(s.amount)}
                      </span>
                      <span className="adm-badge">{s.contributor}</span>
                      <span className="text-[11px] text-(--adm-text-muted)">
                        {s.entry_date}
                      </span>
                    </div>
                    {s.note && <p className="adm-hint mt-0.5">{s.note}</p>}
                  </div>
                  <button
                    type="button"
                    aria-label="Hapus catatan tabungan"
                    onClick={() =>
                      handleDelete(
                        "savings",
                        s.id,
                        `${s.contributor} ${formatRupiah(s.amount)}`
                      )
                    }
                    className="adm-btn-aksi aksi-hapus shrink-0"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ==================== 4. MAHAR, SESERAHAN & BERKAS KUA ==================== */}
      {currentSection === "essentials" && (
        <div className="space-y-4">
          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
            <div className="adm-seg grid w-full grid-cols-2 sm:inline-flex sm:w-auto">
              <button
                type="button"
                onClick={() => setEssentialTab("gifts")}
                className={`adm-seg-btn justify-center ${essentialTab === "gifts" ? "is-active" : ""}`}
              >
                Mahar &amp; Seserahan ({giftEssentials.length})
              </button>
              <button
                type="button"
                onClick={() => setEssentialTab("kua")}
                className={`adm-seg-btn justify-center ${essentialTab === "kua" ? "is-active" : ""}`}
              >
                Berkas KUA ({kuaDoneCount}/{kuaEssentials.length})
              </button>
            </div>
            <button
              type="button"
              disabled={busyAction === "seed-essentials"}
              onClick={() => void handleSeed("essentials")}
              className="adm-btn adm-btn-outline-primary adm-btn-sm w-full justify-center sm:w-auto"
            >
              <Sparkles className="h-3.5 w-3.5" /> Muat Templat Mahar, Seserahan
              &amp; KUA
            </button>
          </div>

          <form
            onSubmit={handleAddEssential}
            className="adm-card grid gap-3 p-4 sm:grid-cols-12"
          >
            {essentialTab === "gifts" && (
              <div className="sm:col-span-2">
                <label htmlFor="ess-kind" className="adm-label">
                  Jenis
                </label>
                <select
                  id="ess-kind"
                  value={essentialDraft.kind}
                  onChange={(e) =>
                    setEssentialDraft({
                      ...essentialDraft,
                      kind: e.target.value as "mahar" | "seserahan",
                    })
                  }
                  className="adm-input"
                >
                  <option value="mahar">Mahar</option>
                  <option value="seserahan">Seserahan</option>
                </select>
              </div>
            )}
            <div
              className={
                essentialTab === "gifts" ? "sm:col-span-4" : "sm:col-span-6"
              }
            >
              <label htmlFor="ess-title" className="adm-label">
                {essentialTab === "kua"
                  ? "Nama Dokumen KUA *"
                  : "Nama Item Mahar / Seserahan *"}
              </label>
              <input
                id="ess-title"
                type="text"
                required
                value={essentialDraft.title}
                onChange={(e) =>
                  setEssentialDraft({
                    ...essentialDraft,
                    title: e.target.value,
                  })
                }
                placeholder={
                  essentialTab === "kua"
                    ? "Contoh: Surat Rekomendasi Numpang Nikah"
                    : "Contoh: Logam Mulia 10 Gram"
                }
                className="adm-input"
              />
            </div>
            <div className="sm:col-span-3">
              <label htmlFor="ess-price" className="adm-label">
                Perkiraan Harga (Rp)
              </label>
              <input
                id="ess-price"
                type="number"
                min={0}
                step={25000}
                value={essentialDraft.price}
                onChange={(e) =>
                  setEssentialDraft({
                    ...essentialDraft,
                    price: e.target.value,
                  })
                }
                placeholder="0"
                className="adm-input"
              />
            </div>
            <div className="flex items-end sm:col-span-3">
              <button
                type="submit"
                disabled={
                  busyAction === "add-essential" || !essentialDraft.title.trim()
                }
                className="adm-btn adm-btn-primary w-full"
              >
                <Plus className="h-3.5 w-3.5" /> Tambah
              </button>
            </div>
          </form>

          {essentialTab === "gifts" ? (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-xs text-(--adm-text-secondary)">
                <span>Total Nilai Mahar &amp; Seserahan:</span>
                <strong className="text-sm text-(--adm-text-primary) tabular-nums">
                  {formatRupiah(totalGiftValue)}
                </strong>
              </div>
              <div className="adm-card divide-y divide-(--adm-border)">
                {giftEssentials.length === 0 ? (
                  <p className="p-8 text-center text-xs text-(--adm-text-secondary)">
                    Belum ada daftar mahar atau seserahan.
                  </p>
                ) : (
                  giftEssentials.map((item) => {
                    const meta =
                      ESSENTIAL_STATUS_META[item.status] ||
                      ESSENTIAL_STATUS_META.rencana;
                    return (
                      <div
                        key={item.id}
                        className="flex flex-wrap items-center justify-between gap-2 p-3.5"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span
                              className={`adm-badge ${
                                item.kind === "mahar"
                                  ? "adm-badge-warning"
                                  : "adm-badge-accent"
                              }`}
                            >
                              {item.kind === "mahar" ? "Mahar" : "Seserahan"}
                            </span>
                            <span className="font-medium text-(--adm-text-primary)">
                              {item.title}
                            </span>
                          </div>
                          {item.notes && (
                            <p className="adm-hint mt-0.5">{item.notes}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-(--adm-text-primary) tabular-nums">
                            {formatRupiah(item.price)}
                          </span>
                          <button
                            type="button"
                            onClick={() => void handleCycleEssentialStatus(item)}
                            title="Klik untuk ubah status"
                            className={`${meta.badgeClass} cursor-pointer`}
                          >
                            {meta.label}
                          </button>
                          <button
                            type="button"
                            aria-label={`Hapus ${item.title}`}
                            onClick={() =>
                              handleDelete("essentials", item.id, item.title)
                            }
                            className="adm-btn-aksi aksi-hapus"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          ) : (
            <div className="adm-card divide-y divide-(--adm-border)">
              {kuaEssentials.length === 0 ? (
                <p className="p-8 text-center text-xs text-(--adm-text-secondary)">
                  Belum ada daftar berkas KUA. Klik tombol muat templat di atas.
                </p>
              ) : (
                kuaEssentials.map((item) => (
                  <div
                    key={item.id}
                    className="flex flex-col gap-2 p-3.5 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-(--adm-text-primary)">
                        {item.title}
                      </div>
                      {item.notes && (
                        <p className="adm-hint mt-0.5">{item.notes}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-(--adm-border) bg-(--adm-bg-primary) px-2.5 py-1 text-xs">
                        <input
                          type="checkbox"
                          checked={item.done_groom === 1}
                          onChange={() =>
                            void handleToggleKuaCheck(item, "groom")
                          }
                          className="h-3.5 w-3.5 accent-(--adm-accent)"
                        />
                        Pria
                      </label>
                      <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-(--adm-border) bg-(--adm-bg-primary) px-2.5 py-1 text-xs">
                        <input
                          type="checkbox"
                          checked={item.done_bride === 1}
                          onChange={() =>
                            void handleToggleKuaCheck(item, "bride")
                          }
                          className="h-3.5 w-3.5 accent-(--adm-accent)"
                        />
                        Wanita
                      </label>
                      <button
                        type="button"
                        aria-label={`Hapus ${item.title}`}
                        onClick={() =>
                          handleDelete("essentials", item.id, item.title)
                        }
                        className="adm-btn-aksi aksi-hapus"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {/* ==================== 5. JURNAL MENIKAH ==================== */}
      {currentSection === "journal" && (
        <div className="space-y-4">
          {/* Prompt Refleksi Pranikah */}
          <div className="adm-card space-y-2.5 p-4">
            <h3 className="adm-card-title flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-(--adm-accent)" />
              Pemantik Refleksi Pranikah (Klik untuk Mulai Menulis)
            </h3>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {JOURNAL_PROMPTS.map((p) => (
                <button
                  key={p.title}
                  type="button"
                  onClick={() =>
                    setJournalDraft((prev) => ({
                      ...prev,
                      title: p.title,
                      mood: p.mood,
                      content: prev.content ? prev.content : `${p.prompt}\n\n`,
                    }))
                  }
                  className="rounded-lg border border-(--adm-border) bg-(--adm-bg-primary) p-3 text-left transition-colors hover:border-(--adm-accent)"
                >
                  <div className="text-xs font-semibold text-(--adm-text-primary)">
                    {p.title}
                  </div>
                  <p className="adm-hint mt-1 line-clamp-2 leading-relaxed">
                    {p.prompt}
                  </p>
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleAddJournal} className="adm-card space-y-3 p-4">
            <h3 className="adm-card-title">Tulis Catatan Jurnal</h3>
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <label htmlFor="jrn-date" className="adm-label">
                  Tanggal
                </label>
                <input
                  id="jrn-date"
                  type="date"
                  value={journalDraft.entry_date}
                  onChange={(e) =>
                    setJournalDraft({
                      ...journalDraft,
                      entry_date: e.target.value,
                    })
                  }
                  className="adm-input"
                />
              </div>
              <div>
                <label htmlFor="jrn-author" className="adm-label">
                  Ditulis Oleh
                </label>
                <select
                  id="jrn-author"
                  value={journalDraft.author}
                  onChange={(e) =>
                    setJournalDraft({ ...journalDraft, author: e.target.value })
                  }
                  className="adm-input"
                >
                  <option value="Bersama">Bersama</option>
                  <option value="Calon Suami">Calon Suami</option>
                  <option value="Calon Istri">Calon Istri</option>
                </select>
              </div>
              <div>
                <label htmlFor="jrn-mood" className="adm-label">
                  Suasana Hati
                </label>
                <select
                  id="jrn-mood"
                  value={journalDraft.mood}
                  onChange={(e) =>
                    setJournalDraft({
                      ...journalDraft,
                      mood: e.target.value as PlannerJournalEntry["mood"],
                    })
                  }
                  className="adm-input"
                >
                  {JOURNAL_MOODS.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label htmlFor="jrn-title" className="adm-label">
                Judul Catatan *
              </label>
              <input
                id="jrn-title"
                type="text"
                required
                value={journalDraft.title}
                onChange={(e) =>
                  setJournalDraft({ ...journalDraft, title: e.target.value })
                }
                placeholder="Contoh: Visi Keluarga Sakinah Kami"
                className="adm-input"
              />
            </div>
            <div>
              <label htmlFor="jrn-content" className="adm-label">
                Isi Refleksi / Catatan *
              </label>
              <textarea
                id="jrn-content"
                rows={4}
                required
                value={journalDraft.content}
                onChange={(e) =>
                  setJournalDraft({ ...journalDraft, content: e.target.value })
                }
                placeholder="Tuliskan kesepakatan, harapan, dan doa terbaik untuk perjalanan pernikahan Anda..."
                className="adm-input h-auto py-2"
              />
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={
                  busyAction === "add-journal" ||
                  !journalDraft.title.trim() ||
                  !journalDraft.content.trim()
                }
                className="adm-btn adm-btn-primary w-full sm:w-auto"
              >
                <Plus className="h-3.5 w-3.5" /> Simpan Catatan Jurnal
              </button>
            </div>
          </form>

          <div className="space-y-3">
            {journal.length === 0 ? (
              <div className="adm-card p-8 text-center text-xs text-(--adm-text-secondary)">
                Belum ada catatan jurnal. Pilih salah satu pemantik refleksi di
                atas untuk memulai.
              </div>
            ) : (
              journal.map((entry) => (
                <article key={entry.id} className="adm-card space-y-2 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="text-sm font-semibold text-(--adm-text-primary)">
                        {entry.title}
                      </h4>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px]">
                        <span className="adm-badge adm-badge-accent">
                          {entry.author}
                        </span>
                        <span className="adm-badge capitalize">
                          {entry.mood}
                        </span>
                        <span className="text-(--adm-text-muted)">
                          {entry.entry_date}
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      aria-label={`Hapus jurnal ${entry.title}`}
                      onClick={() =>
                        handleDelete("journal", entry.id, entry.title)
                      }
                      className="adm-btn-aksi aksi-hapus shrink-0"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <p className="text-[13px] leading-relaxed whitespace-pre-line text-(--adm-text-secondary)">
                    {entry.content}
                  </p>
                </article>
              ))
            )}
          </div>
        </div>
      )}

      {/* ==================== 6. TUNTUNAN FIKIH PERNIKAHAN ==================== */}
      {currentSection === "fiqh" && (
        <div className="space-y-4">
          <div className="adm-card flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="adm-card-title flex items-center gap-1.5">
                <BookOpen className="h-4 w-4 text-(--adm-accent)" />
                Tuntunan Fikih Munakahat &amp; Adab Pernikahan
              </h3>
              <p className="adm-card-desc">
                Ringkasan rukun nikah, lafaz ijab kabul, mahar, doa sunnah, dan
                alur resmi KUA di Indonesia.
              </p>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-(--adm-text-muted)" />
              <input
                type="text"
                value={fiqhSearch}
                onChange={(e) => setFiqhSearch(e.target.value)}
                placeholder="Cari materi (mahar, wali, doa)..."
                className="adm-input adm-input-sm pl-8"
              />
            </div>
          </div>

          <div className="space-y-2.5">
            {filteredFiqh.map((guide) => {
              const isOpen = openFiqhId === guide.id;
              return (
                <div key={guide.id} className="adm-card overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setOpenFiqhId(isOpen ? "" : guide.id)}
                    className="flex w-full items-center justify-between gap-3 p-4 text-left hover:bg-(--adm-bg-overlay)"
                  >
                    <div className="min-w-0">
                      <span className="adm-badge adm-badge-accent mb-1">
                        {guide.category}
                      </span>
                      <h4 className="text-sm font-semibold text-(--adm-text-primary)">
                        {guide.title}
                      </h4>
                      <p className="adm-hint mt-0.5 line-clamp-2">
                        {guide.summary}
                      </p>
                    </div>
                    <ChevronDown
                      className={`h-4 w-4 shrink-0 text-(--adm-text-muted) transition-transform duration-200 ${
                        isOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  {isOpen && (
                    <div className="space-y-3 border-t border-(--adm-border) bg-(--adm-bg-primary)/60 p-4">
                      {guide.arabic && (
                        <div className="rounded-lg border border-(--adm-border) bg-(--adm-bg-secondary) p-3.5 text-right">
                          <p
                            dir="rtl"
                            className="font-serif text-lg leading-loose text-(--adm-text-primary) sm:text-xl"
                          >
                            {guide.arabic}
                          </p>
                          {guide.transliteration && (
                            <p className="mt-2 text-left text-xs font-medium text-(--adm-accent) italic">
                              {guide.transliteration}
                            </p>
                          )}
                          {guide.translation && (
                            <p className="mt-1 text-left text-xs leading-relaxed text-(--adm-text-secondary)">
                              &ldquo;{guide.translation}&rdquo;
                            </p>
                          )}
                        </div>
                      )}

                      <ul className="space-y-2 text-[13px] leading-relaxed text-(--adm-text-primary)">
                        {guide.points.map((pt, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-(--adm-accent)" />
                            <span>{pt}</span>
                          </li>
                        ))}
                      </ul>

                      <div className="flex items-center justify-between border-t border-(--adm-border) pt-2 text-[11px] text-(--adm-text-muted)">
                        <span>Rujukan: {guide.reference}</span>
                        <ExternalLink className="h-3 w-3 opacity-60" />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default WeddingPlanner;
