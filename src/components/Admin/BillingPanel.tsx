import {
  Calculator,
  CheckCircle2,
  Clock,
  CreditCard,
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

interface BillingOrder {
  id: number;
  invoice_code: string;
  current_quota: number;
  requested_total_quota: number;
  added_guests: number;
  amount: number;
  status: "pending" | "paid" | "rejected";
  payment_method: string;
  payment_note: string;
  proof_url: string;
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
    whatsappConfirm: string;
  };
  orders: BillingOrder[];
}

interface BillingPanelProps {
  onNotify: (toast: { type: "success" | "error"; message: string }) => void;
}

const BillingPanel: React.FC<BillingPanelProps> = ({ onNotify }) => {
  const [data, setData] = useState<BillingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [targetGuests, setTargetGuests] = useState<number>(450);
  const [paymentNote, setPaymentNote] = useState("");
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
      setTargetGuests((prev) =>
        prev <= json.quotaLimit ? json.quotaLimit + 250 : prev
      );
    } finally {
      setLoading(false);
    }
  }, []);

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

  const handleUploadProof = async (file: File) => {
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
      onNotify({ type: "success", message: "Bukti transfer berhasil diunggah." });
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
          targetTotalGuests: targetGuests,
          paymentMethod: data?.paymentInfo.bankName || "Transfer Bank / QRIS",
          paymentNote,
          proofUrl,
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
      setPaymentNote("");
      setProofUrl("");
      onNotify({
        type: "success",
        message: `Tagihan ${json.order?.invoice_code} (${formatIdr(quote.amount)}) berhasil dibuat. Menunggu verifikasi Superadmin.`,
      });
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

  return (
    <div className="space-y-5">
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
          <span>Tarif tambahan: Rp200 / tamu (min. Rp50.000)</span>
        </div>
      </div>

      {/* Kalkulator & Form Pengajuan Pembayaran */}
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
                setTargetGuests(Math.max(0, parseInt(e.target.value || "0", 10)))
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
                      targetGuests === p ? "adm-btn-primary" : "adm-btn-secondary"
                    }`}
                  >
                    {p.toLocaleString("id-ID")} tamu ({formatIdr(q.amount)})
                  </button>
                );
              })}
            </div>
          </div>

          {/* Ringkasan Perhitungan */}
          <div className="space-y-1.5 rounded-lg border border-(--adm-border) bg-(--adm-bg-primary) p-3.5 text-xs">
            <div className="flex justify-between">
              <span className="text-(--adm-text-secondary)">Kuota aktif saat ini</span>
              <span className="font-mono">{data.quotaLimit.toLocaleString("id-ID")} tamu</span>
            </div>
            <div className="flex justify-between">
              <span className="text-(--adm-text-secondary)">Kuota tambahan diberikan</span>
              <span className="font-mono text-(--adm-green)">
                +{quote.grantedAddedGuests.toLocaleString("id-ID")} tamu
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-(--adm-text-secondary)">Total kuota setelah aktif</span>
              <span className="font-mono font-semibold">
                {quote.resultingQuota.toLocaleString("id-ID")} tamu
              </span>
            </div>
            <div className="flex justify-between border-t border-(--adm-border) pt-2 text-sm font-bold">
              <span>Total Pembayaran</span>
              <span className="font-mono text-(--adm-accent)">
                {formatIdr(quote.amount)}
              </span>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="adm-label">Catatan Transfer (Nama Pengirim / Bank)</label>
              <input
                type="text"
                value={paymentNote}
                onChange={(e) => setPaymentNote(e.target.value)}
                placeholder="Contoh: Transfer BCA a.n. Yahya Zulfikri"
                className="adm-input"
              />
            </div>

            <div>
              <label className="adm-label">Bukti Transfer (Opsional — Gambar)</label>
              <div className="flex flex-wrap items-center gap-2">
                <label className="adm-btn adm-btn-secondary adm-btn-sm cursor-pointer">
                  <Upload className="h-3.5 w-3.5" />
                  {uploadingProof ? "Mengunggah..." : "Unggah Bukti"}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={uploadingProof}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) void handleUploadProof(f);
                    }}
                  />
                </label>
                {proofUrl && (
                  <a
                    href={proofUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-(--adm-accent) underline"
                  >
                    Lihat bukti terunggah
                  </a>
                )}
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting || !quote.needsPayment}
            className="adm-btn adm-btn-primary w-full"
          >
            <CreditCard className="h-4 w-4" />
            {submitting
              ? "Membuat Tagihan..."
              : `Ajukan Pembayaran (${formatIdr(quote.amount)})`}
          </button>
        </form>

        {/* Informasi Rekening Pembayaran */}
        <div className="adm-card space-y-4 p-5 lg:col-span-5">
          <div className="flex items-center gap-2">
            <Receipt className="h-4 w-4 text-(--adm-accent)" />
            <h3 className="text-sm font-semibold">Instruksi Transfer</h3>
          </div>

          <div className="space-y-2 rounded-lg border border-(--adm-border) bg-(--adm-bg-primary) p-4 text-xs">
            <div className="text-(--adm-text-secondary)">Bank / Metode</div>
            <div className="text-sm font-semibold text-(--adm-text-primary)">
              {data.paymentInfo.bankName}
            </div>
            <div className="pt-1 text-(--adm-text-secondary)">Nomor Rekening</div>
            <div className="font-mono text-base font-bold text-(--adm-accent)">
              {data.paymentInfo.bankAccount || "Hubungi pengelola platform"}
            </div>
            <div className="pt-1 text-(--adm-text-secondary)">Atas Nama</div>
            <div className="font-medium text-(--adm-text-primary)">
              {data.paymentInfo.bankHolder}
            </div>
          </div>

          <ol className="list-decimal space-y-1.5 pl-4 text-xs text-(--adm-text-secondary)">
            <li>Pilih total kuota tamu sesuai kebutuhan impor Anda.</li>
            <li>Transfer sesuai nominal tagihan ke rekening di atas.</li>
            <li>Unggah bukti transfer &amp; klik <strong>Ajukan Pembayaran</strong>.</li>
            <li>Setelah diverifikasi Superadmin, kuota tamu otomatis bertambah.</li>
          </ol>

          {data.paymentInfo.whatsappConfirm && (
            <a
              href={`https://wa.me/${data.paymentInfo.whatsappConfirm.replace(/\D/g, "")}`}
              target="_blank"
              rel="noreferrer"
              className="adm-btn adm-btn-secondary adm-btn-sm w-full"
            >
              Konfirmasi via WhatsApp Pengelola
            </a>
          )}
        </div>
      </div>

      {/* Riwayat Tagihan */}
      <div className="adm-card overflow-hidden">
        <div className="border-b border-(--adm-border) px-5 py-3">
          <h3 className="text-sm font-semibold">Riwayat Tagihan Kuota</h3>
        </div>
        {data.orders.length === 0 ? (
          <p className="p-5 text-xs text-(--adm-text-secondary)">
            Belum ada riwayat tagihan penambahan kuota tamu.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-(--adm-border) bg-(--adm-bg-primary) text-[11px] text-(--adm-text-secondary) uppercase">
                <tr>
                  <th className="px-4 py-2.5">Invoice</th>
                  <th className="px-4 py-2.5">Penambahan Kuota</th>
                  <th className="px-4 py-2.5">Nominal</th>
                  <th className="px-4 py-2.5">Status</th>
                  <th className="px-4 py-2.5">Catatan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-(--adm-border)">
                {data.orders.map((o) => (
                  <tr key={o.id}>
                    <td className="px-4 py-2.5 font-mono font-semibold">
                      {o.invoice_code}
                    </td>
                    <td className="px-4 py-2.5">
                      +{o.added_guests.toLocaleString("id-ID")} tamu →{" "}
                      <strong>
                        {o.requested_total_quota.toLocaleString("id-ID")}
                      </strong>
                    </td>
                    <td className="px-4 py-2.5 font-mono font-semibold">
                      {formatIdr(o.amount)}
                    </td>
                    <td className="px-4 py-2.5">
                      {o.status === "paid" ? (
                        <span className="adm-badge adm-badge-success inline-flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" /> Lunas
                        </span>
                      ) : o.status === "rejected" ? (
                        <span className="adm-badge adm-badge-danger inline-flex items-center gap-1">
                          <XCircle className="h-3 w-3" /> Ditolak
                        </span>
                      ) : (
                        <span className="adm-badge adm-badge-warning inline-flex items-center gap-1">
                          <Clock className="h-3 w-3" /> Menunggu Verifikasi
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-(--adm-text-secondary)">
                      {o.admin_note || o.payment_note || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default BillingPanel;
