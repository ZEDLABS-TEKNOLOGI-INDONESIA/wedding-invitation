import React, { useState, useEffect } from "react";
import {
  Send,
  CheckCircle2,
  Users,
  Clock,
  RefreshCcw,
  Minus,
  Plus,
} from "lucide-react";
import { dbService } from "../services/dbService";
import { AttendanceStatus, type RSVP, type AppConfig } from "../types";
import { BotanicalWatermark, SectionDivider } from "./WeddingOrnaments";

const RSVPForm: React.FC<{ config: AppConfig }> = ({ config }) => {
  const [formData, setFormData] = useState({
    guest_name: "",
    phone: "",
    attendance: AttendanceStatus.HADIR,
    guest_count: 1,
    message: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isNameLocked, setIsNameLocked] = useState(false);
  const [rsvps, setRsvps] = useState<RSVP[]>([]);

  const maxGuests = config.rsvp.maxGuests;

  const loadRSVPs = async () => {
    const data = await dbService.getRSVPs();
    setRsvps(data);
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const to = params.get("to");
    if (to) {
      setFormData((prev) => ({ ...prev, guest_name: to }));
      setIsNameLocked(true);
    }
    loadRSVPs();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = formData.guest_name.trim();
    if (!trimmedName) {
      setErrorMsg("Nama tamu wajib diisi.");
      return;
    }
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      await dbService.saveRSVP({
        ...formData,
        guest_name: trimmedName,
        guest_count:
          formData.attendance === AttendanceStatus.HADIR
            ? formData.guest_count
            : 0,
      });
      setSubmitted(true);
      await loadRSVPs();
    } catch (err) {
      console.error(err);
      setErrorMsg(
        err instanceof Error
          ? err.message
          : "Gagal menyimpan RSVP. Silakan coba lagi."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGuestCount = (operation: "inc" | "dec") => {
    setFormData((prev) => {
      const current = prev.guest_count;
      let next = current;
      if (operation === "inc" && current < maxGuests) next = current + 1;
      if (operation === "dec" && current > 1) next = current - 1;
      return { ...prev, guest_count: next };
    });
  };

  const stats = {
    hadir: rsvps
      .filter((r) => r.attendance === AttendanceStatus.HADIR)
      .reduce((total, r) => total + (r.guest_count || 1), 0),
    ragu: rsvps.filter((r) => r.attendance === AttendanceStatus.RAGU).length,
    tidak: rsvps.filter((r) => r.attendance === AttendanceStatus.TIDAK_HADIR)
      .length,
  };

  const getStatusBadge = (status: AttendanceStatus) => {
    switch (status) {
      case AttendanceStatus.HADIR:
        return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
      case AttendanceStatus.TIDAK_HADIR:
        return "bg-rose-500/10 text-rose-700 dark:text-rose-300";
      default:
        return "bg-amber-500/10 text-amber-700 dark:text-amber-300";
    }
  };

  const fieldClass =
    "w-full rounded-xl border border-accentDark/15 bg-white/80 px-4 py-3 text-sm text-slate-900 transition-all outline-none placeholder:text-slate-400 focus:border-accentDark focus:bg-white focus:ring-2 focus:ring-accent/30 dark:border-white/15 dark:bg-white/5 dark:text-white dark:placeholder:text-slate-400 dark:focus:border-accent dark:focus:bg-white/10";

  return (
    <section
      id="rsvp"
      className="relative overflow-x-clip py-20 transition-colors duration-700 md:py-28"
    >
      <BotanicalWatermark side="right" variant={config.appearance.ornament} />
      <div className="container mx-auto max-w-6xl px-5 md:px-6">
        <div className="mb-14 space-y-3 text-center md:mb-18">
          <span className="text-accentDark dark:text-accent text-[11px] font-semibold tracking-[0.3em] uppercase">
            Konfirmasi Kehadiran
          </span>
          <h2 className="font-serif text-4xl font-medium tracking-tight text-primary italic sm:text-5xl md:text-6xl dark:text-white">
            Reservasi Kehadiran
          </h2>
          <SectionDivider className="py-1" />
          <p className="mx-auto max-w-lg text-sm font-light text-slate-600 italic sm:text-base dark:text-slate-300">
            Dengan segala kerendahan hati, mohon kiranya Bapak/Ibu/Saudara/i
            berkenan mengonfirmasi kehadiran
          </p>
        </div>

        <div className="grid items-stretch gap-6 md:gap-8 lg:grid-cols-12">
          {/* Form Card */}
          <div className="lg:col-span-5">
            <div className="editorial-card flex h-full flex-col justify-center rounded-3xl p-6 sm:p-8">
              {submitted ? (
                <div className="animate-reveal space-y-5 py-6 text-center">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="h-8 w-8" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-script text-4xl text-primary dark:text-white">
                      Terima Kasih
                    </h3>
                    <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                      Terima kasih atas konfirmasi Bapak/Ibu/Saudara/i. Data
                      kehadiran telah kami catat dengan baik.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSubmitted(false)}
                    className="border-accentDark/20 inline-flex items-center gap-2 rounded-full border bg-white/80 px-5 py-2.5 text-xs font-semibold tracking-wider uppercase transition-colors hover:bg-white dark:border-white/15 dark:bg-white/5 dark:hover:bg-white/10"
                  >
                    <RefreshCcw className="h-3.5 w-3.5" />
                    Ubah Konfirmasi
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="border-accentDark/12 flex items-center gap-3.5 border-b pb-4 dark:border-white/10">
                    <div className="bg-accentDark/10 text-accentDark dark:bg-accent/15 dark:text-accent flex h-11 w-11 items-center justify-center rounded-2xl">
                      <Users className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-serif text-2xl font-medium text-primary italic dark:text-white">
                        Formulir RSVP
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Lengkapi data kehadiran Anda
                      </p>
                    </div>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label
                          htmlFor="rsvp-guest-name"
                          className="text-[11px] font-bold tracking-[0.16em] text-slate-600 uppercase dark:text-slate-300"
                        >
                          Nama Tamu <span className="text-rose-500">*</span>
                        </label>
                        {isNameLocked && (
                          <button
                            type="button"
                            onClick={() => setIsNameLocked(false)}
                            className="text-accentDark dark:text-accent text-[11px] font-semibold underline underline-offset-2"
                          >
                            Ubah Nama
                          </button>
                        )}
                      </div>
                      <input
                        id="rsvp-guest-name"
                        required
                        type="text"
                        autoComplete="name"
                        maxLength={100}
                        disabled={isNameLocked}
                        className={`${fieldClass} ${
                          isNameLocked ? "cursor-not-allowed opacity-65" : ""
                        }`}
                        placeholder="Ketik nama lengkap Anda"
                        value={formData.guest_name}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            guest_name: e.target.value,
                          })
                        }
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label
                        htmlFor="rsvp-phone"
                        className="block text-[11px] font-bold tracking-[0.16em] text-slate-600 uppercase dark:text-slate-300"
                      >
                        No. WhatsApp / HP (Opsional)
                      </label>
                      <input
                        id="rsvp-phone"
                        type="tel"
                        inputMode="tel"
                        autoComplete="tel"
                        maxLength={30}
                        className={fieldClass}
                        placeholder="Contoh: 081234567890"
                        value={formData.phone}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            phone: e.target.value,
                          })
                        }
                      />
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Isi jika ingin menerima konfirmasi &amp; pengingat via
                        WhatsApp.
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label
                          htmlFor="rsvp-message"
                          className="block text-[11px] font-bold tracking-[0.16em] text-slate-600 uppercase dark:text-slate-300"
                        >
                          Pesan Singkat (Opsional)
                        </label>
                        <span className="text-[10px] text-slate-400">
                          {formData.message.length}/500
                        </span>
                      </div>
                      <textarea
                        id="rsvp-message"
                        maxLength={500}
                        className={`${fieldClass} resize-none`}
                        placeholder="Tulis catatan singkat untuk mempelai..."
                        rows={2}
                        value={formData.message}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            message: e.target.value,
                          })
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <p className="text-[11px] font-bold tracking-[0.16em] text-slate-600 uppercase dark:text-slate-300">
                        Status Kehadiran
                      </p>
                      <div className="grid grid-cols-1 gap-2">
                        {[
                          {
                            status: AttendanceStatus.HADIR,
                            label: "InsyaAllah, Berkenan Hadir",
                          },
                          {
                            status: AttendanceStatus.TIDAK_HADIR,
                            label: "Mohon Maaf, Belum Dapat Hadir",
                          },
                          {
                            status: AttendanceStatus.RAGU,
                            label: "Masih Belum Dapat Memastikan",
                          },
                        ].map(({ status, label }) => (
                          <button
                            key={status}
                            type="button"
                            onClick={() =>
                              setFormData({ ...formData, attendance: status })
                            }
                            className={`flex items-center justify-between rounded-xl border px-4 py-3 text-xs font-semibold tracking-wider uppercase transition-all ${
                              formData.attendance === status
                                ? "bg-primary border-primary dark:bg-accentDark dark:border-accentDark text-white shadow-sm"
                                : "border-accentDark/15 text-slate-600 hover:bg-white/80 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5"
                            }`}
                          >
                            {label}
                            {formData.attendance === status && (
                              <CheckCircle2 className="h-4 w-4" />
                            )}
                          </button>
                        ))}
                      </div>
                    </div>

                    {formData.attendance === AttendanceStatus.HADIR && (
                      <div className="animate-reveal space-y-2.5 pt-1">
                        <p className="text-[11px] font-bold tracking-[0.16em] text-slate-600 uppercase dark:text-slate-300">
                          Jumlah Tamu (Maks. {maxGuests} Orang)
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {[1, 2, 3, 4]
                            .filter((n) => n <= maxGuests)
                            .map((preset) => (
                              <button
                                key={preset}
                                type="button"
                                onClick={() =>
                                  setFormData((prev) => ({
                                    ...prev,
                                    guest_count: preset,
                                  }))
                                }
                                className={`rounded-full border px-3 py-1 text-xs font-semibold transition-all ${
                                  formData.guest_count === preset
                                    ? "bg-primary border-primary dark:bg-accentDark dark:border-accentDark text-white"
                                    : "border-accentDark/20 text-slate-600 hover:bg-white/80 dark:border-white/15 dark:text-slate-300"
                                }`}
                              >
                                {preset} Orang
                              </button>
                            ))}
                        </div>
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            aria-label="Kurangi jumlah tamu"
                            onClick={() => handleGuestCount("dec")}
                            className="border-accentDark/20 flex h-9 w-9 items-center justify-center rounded-full border transition-colors hover:bg-white disabled:opacity-30 dark:border-white/15 dark:hover:bg-white/10"
                            disabled={formData.guest_count <= 1}
                          >
                            <Minus className="h-4 w-4" />
                          </button>
                          <div className="border-accentDark/15 flex-1 rounded-xl border bg-white/70 py-2 text-center font-serif text-lg font-medium italic dark:border-white/10 dark:bg-white/5">
                            {formData.guest_count} Orang
                          </div>
                          <button
                            type="button"
                            aria-label="Tambah jumlah tamu"
                            onClick={() => handleGuestCount("inc")}
                            className="border-accentDark/20 flex h-9 w-9 items-center justify-center rounded-full border transition-colors hover:bg-white disabled:opacity-30 dark:border-white/15 dark:hover:bg-white/10"
                            disabled={formData.guest_count >= maxGuests}
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    )}

                    {errorMsg && (
                      <div
                        role="alert"
                        className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs font-medium text-rose-600 dark:border-rose-900/40 dark:bg-rose-900/20 dark:text-rose-300"
                      >
                        {errorMsg}
                      </div>
                    )}

                    <button
                      disabled={isSubmitting}
                      type="submit"
                      className="bg-primary dark:bg-accentDark group mt-2 flex w-full items-center justify-center gap-2.5 rounded-full py-3.5 text-xs font-bold tracking-[0.2em] text-white uppercase shadow-sm transition-all hover:opacity-95 active:scale-[0.98] disabled:opacity-50"
                    >
                      {isSubmitting ? "Mengirim..." : "Kirim Konfirmasi"}
                      <Send className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                    </button>
                  </form>
                </div>
              )}
            </div>
          </div>

          {/* Stats & Guest List */}
          <div className="flex flex-col gap-5 lg:col-span-7">
            <div className="grid grid-cols-3 gap-3 sm:gap-4">
              {[
                {
                  label: "Hadir",
                  count: stats.hadir,
                  color: "text-emerald-600 dark:text-emerald-400",
                },
                {
                  label: "Ragu",
                  count: stats.ragu,
                  color: "text-amber-600 dark:text-amber-400",
                },
                {
                  label: "Tidak Hadir",
                  count: stats.tidak,
                  color: "text-rose-600 dark:text-rose-400",
                },
              ].map((item, idx) => (
                <div
                  key={idx}
                  className="editorial-card flex flex-col items-center justify-center rounded-2xl p-4 text-center sm:rounded-3xl sm:p-6"
                >
                  <span
                    className={`font-serif text-3xl font-bold tabular-nums sm:text-4xl ${item.color}`}
                  >
                    {item.count}
                  </span>
                  <span className="mt-1 text-[10px] font-bold tracking-[0.18em] text-slate-500 uppercase sm:text-[11px] dark:text-slate-400">
                    {item.label}
                  </span>
                </div>
              ))}
            </div>

            <div className="editorial-card flex flex-1 flex-col rounded-3xl p-6 sm:p-8">
              <div className="border-accentDark/12 mb-5 flex items-center justify-between border-b pb-4 dark:border-white/10">
                <h3 className="font-serif text-2xl font-medium text-primary italic dark:text-white">
                  Daftar Konfirmasi
                </h3>
                <div className="flex items-center gap-1.5 text-[11px] font-medium tracking-wider text-slate-400 uppercase">
                  <Clock className="h-3.5 w-3.5" />
                  <span>Terbaru</span>
                </div>
              </div>

              <div className="custom-scrollbar -mr-2 h-96 flex-grow overflow-y-auto pr-2 md:h-[420px]">
                {rsvps.length === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center text-slate-400">
                    <Users className="mb-2 h-8 w-8 opacity-40" />
                    <span className="text-xs tracking-widest uppercase">
                      Belum ada konfirmasi
                    </span>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {rsvps.map((rsvp) => (
                      <div
                        key={rsvp.id}
                        className="border-accentDark/10 rounded-2xl border bg-white/75 p-4 transition-colors dark:border-white/10 dark:bg-white/5"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex min-w-0 items-center gap-2.5">
                            <div className="bg-accentDark/12 text-accentDark dark:bg-accent/15 dark:text-accent flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold">
                              {rsvp.guest_name.charAt(0).toUpperCase()}
                            </div>
                            <span className="truncate font-serif text-base font-medium text-slate-800 italic dark:text-slate-100">
                              {rsvp.guest_name}
                            </span>
                          </div>
                          <span
                            className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-bold tracking-wider uppercase ${getStatusBadge(
                              rsvp.attendance
                            )}`}
                          >
                            {rsvp.attendance.replace("_", " ")}
                          </span>
                        </div>
                        {rsvp.attendance === AttendanceStatus.HADIR && (
                          <div className="mt-2.5 flex items-center gap-1.5 border-t border-slate-100 pt-2 text-[11px] text-slate-500 dark:border-white/5 dark:text-slate-400">
                            <Users className="h-3.5 w-3.5" />
                            <span>Hadir bersama {rsvp.guest_count} orang</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default RSVPForm;
