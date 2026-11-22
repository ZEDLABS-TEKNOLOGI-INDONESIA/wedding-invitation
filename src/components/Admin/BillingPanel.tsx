import {
  AlertTriangle,
  Calculator,
  CheckCircle2,
  Clock,
  Copy,
  CreditCard,
  ExternalLink,
  FileText,
  Loader2,
  Receipt,
  Upload,
  XCircle,
} from "lucide-react";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  FREE_GUEST_QUOTA,
  MIN_PAYMENT_AMOUNT,
  PRICE_PER_GUEST,
  calculateGuestQuotaPrice,
  formatIdr,
} from "../../lib/billing";

type OrderStatus = "unpaid" | "review" | "paid" | "rejected" | "cancelled";

interface BillingOrder {
  id: number;
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
  verified_at: string;
}

interface BillingData {
  quotaLimit: number;
  usedGuests: number;
  remaining: number;
  pricing: {
    freeQuota: number;
    pricePerGuest: number;
    minPayment: number;
  };
  paymentInfo: {
    bankName: string;
    bankAccount: string;
    bankHolder: string;
    bankAccounts?: Array<{ bank: string; number: string; holder: string }>;
    whatsappConfirm: string;
  };
  orders: BillingOrder[];
}

interface BillingPanelProps {
  onNotify: (toast: { type: "success" | "error"; message: string }) => void;
  initialTargetGuests?: number | null;
  quotaNotice?: string | null;
}

const STATUS_BADGE: Record<OrderStatus, { label: string; cls: string }> = {
  unpaid: { label: "Belum Dibayar", cls: "adm-badge-warning" },
  review: { label: "Menunggu Verifikasi", cls: "adm-badge-accent" },
  paid: { label: "Lunas", cls: "adm-badge-success" },
  rejected: { label: "Bukti Ditolak", cls: "adm-badge-danger" },
  cancelled: { label: "Dibatalkan", cls: "adm-badge-secondary" },
};

function formatDateId(iso?: string): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

const BillingPanel: React.FC<BillingPanelProps> = ({
  onNotify,
  initialTargetGuests,
  quotaNotice,
}) => {
  const [data, setData] = useState<BillingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [targetGuests, setTargetGuests] = useState<number>(
    initialTargetGuests && initialTargetGuests > FREE_GUEST_QUOTA
      ? initialTargetGuests
      : 450
  );
  const [senderName, setSenderName] = useState("");
  const [senderBank, setSenderBank] = useState("");
  const [proofUrl, setProofUrl] = useState("");
  const [uploadingProof, setUploadingProof] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const loadBilling = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/billing", { credentials: "include" });
      if (!res.ok) return;
      const json = (await res.json()) as BillingData;
      setData(json);
      setTargetGuests((prev) => {
        if (initialTargetGuests && initialTargetGuests > json.quotaLimit) {
          return initialTargetGuests;
        }
        return prev <= json.quotaLimit ? json.quotaLimit + 250 : prev;
      });
    } finally {
      setLoading(false);
    }
  }, [initialTargetGuests]);

  useEffect(() => {
    void loadBilling();
  }, [loadBilling]);

  const quote = useMemo(
    () =>
      calculateGuestQuotaPrice(
        targetGuests,
        data?.quotaLimit ?? FREE_GUEST_QUOTA
      ),
    [targetGuests, data?.quotaLimit]
  );

  const openOrder = useMemo(
    () =>
      data?.orders.find((o) =>
        ["unpaid", "review", "rejected"].includes(o.status)
      ) ?? null,
    [data?.orders]
  );

  const historyOrders = useMemo(
    () => (data?.orders ?? []).filter((o) => o.id !== openOrder?.id),
    [data?.orders, openOrder?.id]
  );

  const handleCopyAccount = async (num: string) => {
    try {
      await navigator.clipboard.writeText(num);
      onNotify({ type: "success", message: "Nomor rekening disalin." });
    } catch {
      onNotify({ type: "error", message: "Gagal menyalin nomor rekening." });
    }
  };

  const handleUploadProof = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      onNotify({
        type: "error",
        message: "Bukti bayar harus berupa gambar (JPG, PNG, atau WebP).",
      });
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      onNotify({
        type: "error",
        message: "Ukuran file bukti bayar maksimal 3 MB.",
      });
      return;
    }
    setUploadingProof(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", {
        method: "POST",
        credentials: "include",
        body: fd,
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.url) {
        onNotify({
          type: "error",
          message: json.error || "Gagal mengunggah bukti transfer.",
        });
        return;
      }
      setProofUrl(json.url);
      onNotify({
        type: "success",
        message:
          "Bukti transfer berhasil diunggah. Klik Kirim Bukti untuk verifikasi.",
      });
    } finally {
      setUploadingProof(false);
    }
  };

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quote.needsPayment) {
      onNotify({
        type: "error",
        message: "Target kuota harus lebih besar dari kuota aktif saat ini.",
      });
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/billing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          action: "create_order",
          targetTotalGuests: targetGuests,
          paymentMethod: data?.paymentInfo.bankName || "Transfer Bank",
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        onNotify({
          type: "error",
          message: json.error || "Gagal membuat tagihan penambahan kuota.",
        });
        return;
      }
      onNotify({
        type: "success",
        message: `Tagihan ${json.order?.invoice_code} (${formatIdr(quote.amount)}) berhasil diterbitkan. Silakan transfer & unggah bukti pembayaran.`,
      });
      await loadBilling();
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitProof = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!openOrder) return;
    if (!senderName.trim() || !senderBank.trim()) {
      onNotify({
        type: "error",
        message: "Nama pemilik rekening dan bank pengirim wajib diisi.",
      });
      return;
    }
    if (!proofUrl) {
      onNotify({
        type: "error",
        message:
          "Wajib mengunggah foto bukti transfer / nota bayar terlebih dahulu.",
      });
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/billing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          action: "submit_proof",
          orderId: openOrder.id,
          senderName: senderName.trim(),
          senderBank: senderBank.trim(),
          proofUrl,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        onNotify({
          type: "error",
          message: json.error || "Gagal mengirim bukti pembayaran.",
        });
        return;
      }
      setSenderName("");
      setSenderBank("");
      setProofUrl("");
      onNotify({
        type: "success",
        message:
          "Bukti pembayaran berhasil dikirim. Superadmin telah dinotifikasi via WhatsApp untuk memeriksa pembayaran Anda.",
      });
      await loadBilling();
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelOrder = async (orderId: number) => {
    setSubmitting(true);
    try {
      const res = await fetch("/api/billing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action: "cancel_order", orderId }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        onNotify({
          type: "error",
          message: json.error || "Gagal membatalkan tagihan.",
        });
        return;
      }
      setProofUrl("");
      onNotify({ type: "success", message: "Tagihan dibatalkan." });
      await loadBilling();
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !data) {
    return (
      <div className="adm-card flex items-center justify-center gap-2 p-8 text-xs text-(--adm-text-secondary)">
        <Loader2 className="h-4 w-4 animate-spin" />
        Memuat informasi kuota &amp; tagihan...
      </div>
    );
  }

  const usagePct = Math.min(
    100,
    Math.round((data.usedGuests / Math.max(1, data.quotaLimit)) * 100)
  );

  const presets = [
    data.quotaLimit + 250,
    data.quotaLimit + 500,
    data.quotaLimit + 1000,
    data.quotaLimit + 2000,
  ];

  const banks = data.paymentInfo.bankAccounts ?? [];

  return (
    <div className="space-y-5">
      {quotaNotice && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-xs text-amber-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
          <div>
            <div className="font-semibold">
              Impor / Input Tamu Ditolak | Kuota Terlampaui
            </div>
            <p className="mt-0.5 opacity-90">{quotaNotice}</p>
          </div>
        </div>
      )}

      {/* Status Kuota Saat Ini */}
      <div className="adm-card space-y-3 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-(--adm-text-primary)">
              Kuota Tamu &amp; Kontak Undangan
            </h3>
            <p className="text-xs text-(--adm-text-secondary)">
              Gratis hingga {FREE_GUEST_QUOTA} tamu. Penambahan di atas batas
              dihitung {formatIdr(PRICE_PER_GUEST)}/tamu (minimal{" "}
              {formatIdr(MIN_PAYMENT_AMOUNT)} untuk +250 tamu).
            </p>
          </div>
          <span
            className={`adm-badge ${
              usagePct >= 90
                ? "adm-badge-danger"
                : usagePct >= 75
                  ? "adm-badge-warning"
                  : "adm-badge-success"
            }`}
          >
            {data.usedGuests} / {data.quotaLimit} Tamu ({usagePct}%)
          </span>
        </div>

        <div className="h-2.5 w-full overflow-hidden rounded-full bg-(--adm-bg-primary)">
          <div
            className={`h-full rounded-full transition-all ${
              usagePct >= 90
                ? "bg-red-500"
                : usagePct >= 75
                  ? "bg-amber-500"
                  : "bg-(--adm-accent)"
            }`}
            style={{ width: `${usagePct}%` }}
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-(--adm-text-secondary)">
          <span>
            Sisa kuota impor/tambah tamu:{" "}
            <strong className="text-(--adm-text-primary)">
              {data.remaining} tamu
            </strong>
          </span>
          <span>Notifikasi invoice otomatis dikirim via WhatsApp</span>
        </div>
      </div>

      {/* Tagihan Aktif (mirip whatsapp-service/instansi/langganan) */}
      {openOrder ? (
        <div className="adm-card space-y-5 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-(--adm-border) pb-3">
            <div>
              <div className="flex items-center gap-2">
                <Receipt className="h-4 w-4 text-(--adm-accent)" />
                <h3 className="text-sm font-semibold">
                  Tagihan{" "}
                  <span className="font-mono">{openOrder.invoice_code}</span>
                </h3>
              </div>
              <p className="mt-0.5 text-xs text-(--adm-text-secondary)">
                Penambahan +{openOrder.added_guests.toLocaleString("id-ID")}{" "}
                tamu → Total kuota{" "}
                <strong>
                  {openOrder.requested_total_quota.toLocaleString("id-ID")} tamu
                </strong>
              </p>
            </div>
            <div className="flex items-center gap-2">
              <a
                href={`/api/billing/invoice?id=${openOrder.id}`}
                target="_blank"
                rel="noreferrer"
                className="adm-btn adm-btn-secondary adm-btn-sm"
              >
                <FileText className="h-3.5 w-3.5" />
                Cetak Invoice
              </a>
              <span
                className={`adm-badge ${STATUS_BADGE[openOrder.status].cls}`}
              >
                {STATUS_BADGE[openOrder.status].label}
              </span>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Kiri: Nominal & Rekening Tujuan */}
            <div className="space-y-4">
              <div>
                <div className="text-xs text-(--adm-text-secondary)">
                  Jumlah yang harus dibayar
                </div>
                <div className="mt-0.5 font-mono text-2xl font-bold text-(--adm-text-primary)">
                  {formatIdr(openOrder.amount)}
                </div>
                {openOrder.due_at && (
                  <div className="mt-1 text-[11px] text-(--adm-text-secondary)">
                    Jatuh tempo: {formatDateId(openOrder.due_at)}
                  </div>
                )}
              </div>

              {banks.length > 0 ? (
                <div className="space-y-2">
                  <div className="text-xs font-semibold text-(--adm-text-secondary)">
                    Transfer ke salah satu rekening tujuan:
                  </div>
                  {banks.map((acc, idx) => (
                    <div
                      key={`${acc.bank}-${acc.number}-${idx}`}
                      className="flex items-center justify-between gap-3 rounded-lg border border-(--adm-border) bg-(--adm-bg-primary) px-3.5 py-2.5 text-xs"
                    >
                      <div className="min-w-0">
                        <div className="text-[11px] text-(--adm-text-secondary)">
                          {acc.bank}
                        </div>
                        <div className="font-mono text-sm font-semibold text-(--adm-text-primary)">
                          {acc.number}
                        </div>
                        {acc.holder && (
                          <div className="text-[11px] text-(--adm-text-secondary)">
                            a.n. {acc.holder}
                          </div>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => void handleCopyAccount(acc.number)}
                        className="adm-btn adm-btn-secondary adm-btn-sm shrink-0"
                      >
                        <Copy className="h-3.5 w-3.5" />
                        Salin
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200">
                  Rekening tujuan belum diatur oleh pengelola.
                  {data.paymentInfo.whatsappConfirm &&
                    ` Hubungi WhatsApp ${data.paymentInfo.whatsappConfirm} untuk instruksi transfer.`}
                </div>
              )}

              {data.paymentInfo.whatsappConfirm && banks.length > 0 && (
                <p className="text-[11px] text-(--adm-text-secondary)">
                  Kendala pembayaran? Hubungi WhatsApp{" "}
                  <strong className="text-(--adm-text-primary)">
                    {data.paymentInfo.whatsappConfirm}
                  </strong>
                  .
                </p>
              )}
            </div>

            {/* Kanan: Konfirmasi & Upload Bukti Wajib */}
            <div className="space-y-3">
              {openOrder.status === "rejected" && (
                <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-3.5 text-xs text-red-200">
                  <div className="flex items-center gap-1.5 font-semibold">
                    <XCircle className="h-4 w-4 shrink-0" />
                    Bukti Pembayaran Ditolak
                  </div>
                  <p className="mt-1">
                    {openOrder.admin_note ||
                      "Periksa kembali bukti transfer Anda."}{" "}
                    Silakan unggah ulang bukti transfer yang benar.
                  </p>
                </div>
              )}

              {openOrder.status === "review" ? (
                <div className="space-y-3">
                  <div className="rounded-lg border border-blue-500/40 bg-blue-500/10 p-4 text-xs text-blue-200">
                    <div className="flex items-center gap-1.5 font-semibold">
                      <Clock className="h-4 w-4 shrink-0" />
                      Bukti Pembayaran Sedang Diperiksa Superadmin
                    </div>
                    <p className="mt-1.5 leading-relaxed">
                      Dikirim{" "}
                      {formatDateId(
                        openOrder.submitted_at || openOrder.created_at
                      )}{" "}
                      atas nama{" "}
                      <strong>
                        {openOrder.sender_name || openOrder.payment_note || "-"}
                      </strong>
                      {openOrder.sender_bank
                        ? ` (${openOrder.sender_bank})`
                        : ""}
                      . Anda akan langsung mendapat notifikasi WhatsApp setelah
                      pembayaran diverifikasi.
                    </p>
                  </div>
                  {openOrder.proof_url && (
                    <a
                      href={openOrder.proof_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-(--adm-accent) underline"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Lihat bukti transfer yang terkirim
                    </a>
                  )}
                </div>
              ) : (
                <form onSubmit={handleSubmitProof} className="space-y-3">
                  <div className="text-xs font-semibold text-(--adm-text-primary)">
                    Konfirmasi Pembayaran (Wajib Unggah Bukti / Nota Bayar)
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="adm-label">
                        Nama Pemilik Rekening{" "}
                        <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        maxLength={100}
                        value={senderName}
                        onChange={(e) => setSenderName(e.target.value)}
                        placeholder="Contoh: Yahya Zulfikri"
                        className="adm-input"
                      />
                    </div>
                    <div>
                      <label className="adm-label">
                        Bank / E-Wallet Pengirim{" "}
                        <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        maxLength={60}
                        value={senderBank}
                        onChange={(e) => setSenderBank(e.target.value)}
                        placeholder="Contoh: BCA / Mandiri / DANA"
                        className="adm-input"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="adm-label">
                      Bukti Transfer / Nota Bayar{" "}
                      <span className="text-red-400">*</span>
                    </label>
                    <div className="flex flex-wrap items-center gap-2.5">
                      <label className="adm-btn adm-btn-secondary adm-btn-sm cursor-pointer">
                        {uploadingProof ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Upload className="h-3.5 w-3.5" />
                        )}
                        {uploadingProof
                          ? "Mengunggah..."
                          : proofUrl
                            ? "Ganti Foto Bukti"
                            : "Pilih Foto Bukti / Nota"}
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          className="hidden"
                          disabled={uploadingProof}
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            e.target.value = "";
                            if (f) void handleUploadProof(f);
                          }}
                        />
                      </label>
                      {proofUrl ? (
                        <a
                          href={proofUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-medium text-emerald-400 underline"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Bukti siap dikirim (Lihat)
                        </a>
                      ) : (
                        <span className="text-[11px] text-(--adm-text-secondary)">
                          Wajib gambar JPG, PNG, atau WebP maks. 3 MB.
                        </span>
                      )}
                    </div>
                    {proofUrl && (
                      <div className="mt-2">
                        <img
                          src={proofUrl}
                          alt="Pratinjau bukti transfer"
                          className="max-h-40 rounded-lg border border-(--adm-border) object-contain"
                        />
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2 pt-1">
                    <button
                      type="submit"
                      disabled={submitting || uploadingProof || !proofUrl}
                      className="adm-btn adm-btn-primary"
                    >
                      {submitting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Upload className="h-4 w-4" />
                      )}
                      Kirim Bukti Pembayaran
                    </button>
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() => void handleCancelOrder(openOrder.id)}
                      className="adm-btn adm-btn-danger"
                    >
                      Batalkan Tagihan
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Buat Tagihan Baru jika tidak ada tagihan aktif */
        <div className="grid gap-5 lg:grid-cols-12">
          <form
            onSubmit={handleCreateOrder}
            className="adm-card space-y-4 p-5 lg:col-span-7"
          >
            <div className="flex items-center gap-2">
              <Calculator className="h-4 w-4 text-(--adm-accent)" />
              <h3 className="text-sm font-semibold">
                Tambah Kuota Tamu / Kontak
              </h3>
            </div>

            <div className="space-y-2">
              <label htmlFor="target-guests" className="adm-label">
                Target Total Kuota Tamu yang Dibutuhkan
              </label>
              <input
                id="target-guests"
                type="number"
                min={data.quotaLimit + 1}
                max={50000}
                step={1}
                value={targetGuests}
                onChange={(e) =>
                  setTargetGuests(
                    Math.max(0, parseInt(e.target.value || "0", 10))
                  )
                }
                className="adm-input font-mono text-base font-semibold"
              />
              <div className="flex flex-wrap gap-1.5 pt-1">
                {presets.map((p) => {
                  const q = calculateGuestQuotaPrice(p, data.quotaLimit);
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setTargetGuests(p)}
                      className={`adm-btn adm-btn-sm ${
                        targetGuests === p
                          ? "adm-btn-primary"
                          : "adm-btn-secondary"
                      }`}
                    >
                      {p.toLocaleString("id-ID")} tamu ({formatIdr(q.amount)})
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-1.5 rounded-lg border border-(--adm-border) bg-(--adm-bg-primary) p-3.5 text-xs">
              <div className="flex justify-between">
                <span className="text-(--adm-text-secondary)">
                  Kuota aktif saat ini
                </span>
                <span className="font-mono">
                  {data.quotaLimit.toLocaleString("id-ID")} tamu
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-(--adm-text-secondary)">
                  Kuota tambahan diberikan
                </span>
                <span className="font-mono text-(--adm-green)">
                  +{quote.grantedAddedGuests.toLocaleString("id-ID")} tamu
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-(--adm-text-secondary)">
                  Total kuota setelah aktif
                </span>
                <span className="font-mono font-semibold">
                  {quote.resultingQuota.toLocaleString("id-ID")} tamu
                </span>
              </div>
              <div className="flex justify-between border-t border-(--adm-border) pt-2 text-sm font-bold">
                <span>Total Tagihan</span>
                <span className="font-mono text-(--adm-accent)">
                  {formatIdr(quote.amount)}
                </span>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting || !quote.needsPayment}
              className="adm-btn adm-btn-primary w-full"
            >
              <CreditCard className="h-4 w-4" />
              {submitting
                ? "Menerbitkan Invoice..."
                : `Buat Tagihan (${formatIdr(quote.amount)})`}
            </button>
          </form>

          {/* Ringkasan Alur Invoicing */}
          <div className="adm-card space-y-3 p-5 lg:col-span-5">
            <div className="flex items-center gap-2">
              <Receipt className="h-4 w-4 text-(--adm-accent)" />
              <h3 className="text-sm font-semibold">
                Alur Pembayaran &amp; Verifikasi
              </h3>
            </div>
            <ol className="list-decimal space-y-2 pl-4 text-xs text-(--adm-text-secondary)">
              <li>
                Pilih target kuota tamu lalu klik{" "}
                <strong className="text-(--adm-text-primary)">
                  Buat Tagihan
                </strong>
                . Invoice otomatis dikirim ke WhatsApp Anda.
              </li>
              <li>
                Transfer sesuai nominal tagihan ke salah satu rekening resmi
                yang tertera.
              </li>
              <li>
                <strong className="text-(--adm-text-primary)">
                  Wajib unggah bukti transfer / nota bayar
                </strong>{" "}
                beserta nama &amp; bank pengirim.
              </li>
              <li>
                Superadmin menerima notifikasi WhatsApp, mereview bukti bayar,
                dan menyetujui tagihan. Kuota langsung aktif &amp; invoice lunas
                dikirim via WhatsApp.
              </li>
            </ol>
          </div>
        </div>
      )}

      {/* Riwayat Tagihan */}
      <div className="adm-card overflow-hidden">
        <div className="border-b border-(--adm-border) px-4 py-3">
          <h3 className="text-sm font-semibold">
            Riwayat Tagihan &amp; Invoice
          </h3>
        </div>
        {historyOrders.length === 0 ? (
          <div className="p-6 text-center text-xs text-(--adm-text-secondary)">
            Belum ada riwayat tagihan sebelumnya.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-(--adm-border) bg-(--adm-bg-primary) text-[11px] text-(--adm-text-secondary) uppercase">
                <tr>
                  <th className="px-4 py-2.5">Invoice</th>
                  <th className="px-4 py-2.5">Kuota</th>
                  <th className="px-4 py-2.5">Nominal</th>
                  <th className="px-4 py-2.5">Status</th>
                  <th className="px-4 py-2.5">Tanggal</th>
                  <th className="px-4 py-2.5 text-right">Dokumen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-(--adm-border)">
                {historyOrders.map((o) => {
                  const st = STATUS_BADGE[o.status] || STATUS_BADGE.unpaid;
                  return (
                    <tr key={o.id}>
                      <td className="px-4 py-2.5 font-mono font-semibold">
                        {o.invoice_code}
                      </td>
                      <td className="px-4 py-2.5">
                        +{o.added_guests.toLocaleString("id-ID")} →{" "}
                        {o.requested_total_quota.toLocaleString("id-ID")} tamu
                      </td>
                      <td className="px-4 py-2.5 font-mono font-semibold">
                        {formatIdr(o.amount)}
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={`adm-badge ${st.cls}`}>
                          {st.label}
                        </span>
                        {o.admin_note && (
                          <div className="mt-0.5 text-[11px] text-(--adm-text-secondary)">
                            {o.admin_note}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-(--adm-text-secondary)">
                        {formatDateId(o.created_at)}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <a
                          href={`/api/billing/invoice?id=${o.id}`}
                          target="_blank"
                          rel="noreferrer"
                          className="adm-btn adm-btn-secondary adm-btn-sm"
                        >
                          <FileText className="h-3.5 w-3.5" />
                          Invoice
                        </a>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default BillingPanel;
