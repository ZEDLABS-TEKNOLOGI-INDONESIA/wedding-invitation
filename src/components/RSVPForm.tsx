import React, { useState, useEffect } from "react";
import {
  Send,
  CheckCircle2,
  Heart,
  Users,
  Clock,
  RefreshCcw,
  Minus,
  Plus,
} from "lucide-react";
import { dbService } from "../services/dbService";
import { AttendanceStatus, type RSVP } from "../types";
import { MAX_GUESTS } from "../constants";

const RSVPForm: React.FC = () => {
  const [formData, setFormData] = useState({
    guest_name: "",
    phone: "",
    attendance: AttendanceStatus.HADIR,
    guest_count: 1,
    message: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [isNameLocked, setIsNameLocked] = useState(false);
  const [rsvps, setRsvps] = useState<RSVP[]>([]);

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
    if (!formData.guest_name) return;

    setIsSubmitting(true);
    try {
      await dbService.saveRSVP(formData);
      setSubmitted(true);
      await loadRSVPs();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGuestCount = (operation: "inc" | "dec") => {
    setFormData((prev) => {
      const current = prev.guest_count;
      let next = current;
      if (operation === "inc" && current < MAX_GUESTS) next = current + 1;
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

  const getStatusColor = (status: AttendanceStatus) => {
    switch (status) {
      case AttendanceStatus.HADIR:
        return "text-green-600 dark:text-green-400";
      case AttendanceStatus.TIDAK_HADIR:
        return "text-red-500 dark:text-red-400";
      default:
        return "text-slate-500 dark:text-slate-400";
    }
  };

  return (
    <section
      id="rsvp"
      className="dark:bg-darkBg bg-white py-16 transition-colors duration-1000 md:py-40"
    >
      <div className="container mx-auto max-w-7xl px-4 md:px-6">
        <div className="mb-12 space-y-3 text-center md:mb-24">
          <Heart className="text-accentDark dark:text-accent/30 mx-auto mb-2 h-5 w-5 animate-pulse" />
          <h2 className="font-serif text-4xl tracking-tight text-slate-900 italic md:text-8xl dark:text-white">
            Reservasi
          </h2>
          <p className="tracking-luxury text-[9px] font-bold text-slate-400 uppercase md:text-[10px] dark:text-slate-500">
            Mohon konfirmasi kehadiran Anda
          </p>
        </div>

        <div className="grid items-stretch gap-8 md:gap-14 lg:grid-cols-12">
          <div className="space-y-6 lg:col-span-5">
            <div className="editorial-card group relative flex h-full flex-col justify-center overflow-hidden rounded-[1.5rem] p-6 shadow-lg md:rounded-[3.5rem] md:p-14">
              {submitted ? (
                <div className="animate-reveal space-y-6 text-center">
                  <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-100 text-green-600 dark:bg-green-900/20 dark:text-green-400">
                    <CheckCircle2 className="h-10 w-10" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-serif text-2xl text-slate-900 italic md:text-4xl dark:text-white">
                      Terima Kasih!
                    </h3>
                    <p className="text-sm leading-relaxed text-slate-500 md:text-base dark:text-slate-400">
                      Konfirmasi kehadiran Anda telah berhasil kami simpan.
                    </p>
                  </div>
                  <button
                    onClick={() => setSubmitted(false)}
                    className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-6 py-3 text-[10px] font-bold tracking-widest uppercase transition-colors hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10"
                  >
                    <RefreshCcw className="h-3 w-3" />
                    Edit Kembali
                  </button>
                </div>
              ) : (
                <>
                  <div className="bg-accentDark/5 dark:bg-accent/5 pointer-events-none absolute top-0 right-0 -mt-16 -mr-16 h-32 w-32 rounded-full transition-transform duration-1000 group-hover:scale-110"></div>
                  <div className="relative z-10 space-y-8 md:space-y-12">
                    <div className="flex items-center gap-4 border-b border-slate-50 pb-4 md:pb-10 dark:border-white/5">
                      <div className="text-accentDark dark:text-accent flex h-10 w-10 items-center justify-center rounded-xl border border-slate-100 bg-slate-50 md:h-16 md:w-16 md:rounded-2xl dark:border-white/10 dark:bg-white/5">
                        <Users className="h-5 w-5 md:h-8 md:w-8" />
                      </div>
                      <div>
                        <h3 className="font-serif text-lg leading-none text-slate-900 italic md:text-2xl dark:text-white">
                          Konfirmasi
                        </h3>
                        <p className="tracking-editorial mt-1.5 text-[8px] font-bold text-slate-400 uppercase md:text-[9px]">
                          Lengkapi data Anda
                        </p>
                      </div>
                    </div>
                    <form
                      onSubmit={handleSubmit}
                      className="space-y-6 md:space-y-10"
                    >
                      <div className="space-y-6 md:space-y-8">
                        <div className="group/input relative">
                          <input
                            required
                            type="text"
                            disabled={isNameLocked}
                            className={`focus:border-accentDark dark:focus:border-accent w-full border-b border-slate-200 bg-transparent py-2 font-serif text-base text-slate-900 italic transition-all outline-none placeholder:text-slate-200 md:py-5 md:text-xl dark:border-white/10 dark:text-white ${
                              isNameLocked
                                ? "cursor-not-allowed text-slate-500 opacity-60"
                                : ""
                            }`}
                            placeholder="Nama Tamu"
                            value={formData.guest_name}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                guest_name: e.target.value,
                              })
                            }
                          />
                          <label className="tracking-editorial group-focus-within/input:text-accentDark absolute -top-3.5 left-0 text-[7px] font-bold text-slate-400 uppercase transition-colors md:text-[9px]">
                            Nama {isNameLocked && "(Locked)"}
                          </label>
                        </div>
                        <div className="group/input relative">
                          <input
                            type="text"
                            className="focus:border-accentDark dark:focus:border-accent w-full border-b border-slate-200 bg-transparent py-2 font-serif text-base text-slate-900 italic transition-all outline-none placeholder:text-slate-200 md:py-5 md:text-xl dark:border-white/10 dark:text-white"
                            placeholder="WhatsApp / Phone"
                            value={formData.phone}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                phone: e.target.value,
                              })
                            }
                          />
                          <label className="tracking-editorial group-focus-within/input:text-accentDark absolute -top-3.5 left-0 text-[7px] font-bold text-slate-400 uppercase transition-colors md:text-[9px]">
                            Kontak
                          </label>
                        </div>
                      </div>

                      <div className="space-y-3 md:space-y-6">
                        <p className="tracking-editorial mb-1 text-[8px] font-bold text-slate-400 uppercase md:text-[9px]">
                          Status Kehadiran
                        </p>
                        <div className="grid grid-cols-1 gap-2">
                          {[
                            AttendanceStatus.HADIR,
                            AttendanceStatus.TIDAK_HADIR,
                            AttendanceStatus.RAGU,
                          ].map((status) => (
                            <button
                              key={status}
                              type="button"
                              onClick={() =>
                                setFormData({ ...formData, attendance: status })
                              }
                              className={`tracking-editorial group flex items-center justify-between rounded-lg border px-5 py-3.5 text-[9px] font-bold uppercase transition-all md:rounded-2xl md:py-5 md:text-[11px] ${
                                formData.attendance === status
                                  ? "bg-primary dark:text-primary border-primary text-white shadow-md dark:border-white dark:bg-white"
                                  : "border-slate-100 text-slate-400 hover:bg-slate-50 dark:border-white/5 dark:hover:bg-white/5"
                              }`}
                            >
                              {status.replace("_", " ")}
                              {formData.attendance === status && (
                                <CheckCircle2 className="h-3.5 w-3.5 md:h-5 md:w-5" />
                              )}
                            </button>
                          ))}
                        </div>
                      </div>

                      {formData.attendance === AttendanceStatus.HADIR && (
                        <div className="animate-reveal space-y-3">
                          <p className="tracking-editorial mb-1 text-[8px] font-bold text-slate-400 uppercase md:text-[9px]">
                            Jumlah Tamu (Max {MAX_GUESTS})
                          </p>
                          <div className="flex items-center gap-4">
                            <button
                              type="button"
                              onClick={() => handleGuestCount("dec")}
                              className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 transition-colors hover:bg-slate-50 disabled:opacity-30 dark:border-white/10 dark:hover:bg-white/5"
                              disabled={formData.guest_count <= 1}
                            >
                              <Minus className="h-4 w-4" />
                            </button>
                            <div className="flex-1 border-b border-slate-100 pb-1 text-center font-serif text-xl italic md:text-2xl dark:border-white/5">
                              {formData.guest_count} Orang
                            </div>
                            <button
                              type="button"
                              onClick={() => handleGuestCount("inc")}
                              className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 transition-colors hover:bg-slate-50 disabled:opacity-30 dark:border-white/10 dark:hover:bg-white/5"
                              disabled={formData.guest_count >= MAX_GUESTS}
                            >
                              <Plus className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      )}

                      <button
                        disabled={isSubmitting}
                        type="submit"
                        className="bg-primary dark:bg-accentDark tracking-luxury group flex w-full items-center justify-center gap-3 rounded-xl py-3.5 text-[9px] font-bold text-white uppercase shadow-sm transition-all duration-700 hover:shadow-xl active:scale-95 disabled:opacity-50 md:rounded-3xl md:py-6 md:text-[11px]"
                      >
                        {isSubmitting
                          ? "Sending..."
                          : isNameLocked
                            ? "Update RSVP"
                            : "Send RSVP"}
                        <Send className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1 md:h-5 md:w-5" />
                      </button>
                    </form>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="space-y-6 lg:col-span-7">
            <div className="grid grid-cols-3 gap-3 md:gap-6">
              {[
                {
                  label: "Hadir",
                  count: stats.hadir,
                  color: "text-green-600 dark:text-green-400",
                },
                {
                  label: "Ragu",
                  count: stats.ragu,
                  color: "text-slate-500 dark:text-slate-400",
                },
                {
                  label: "Maaf",
                  count: stats.tidak,
                  color: "text-red-500 dark:text-red-400",
                },
              ].map((item, idx) => (
                <div
                  key={idx}
                  className="editorial-card flex flex-col items-center justify-center space-y-2 rounded-[1.5rem] border border-slate-100 p-4 text-center md:rounded-[2.5rem] md:p-8 dark:border-white/5"
                >
                  <span
                    className={`font-serif text-2xl font-bold md:text-5xl ${item.color}`}
                  >
                    {item.count}
                  </span>
                  <span className="text-[9px] font-bold tracking-widest uppercase opacity-60 md:text-[10px]">
                    {item.label}
                  </span>
                </div>
              ))}
            </div>

            <div className="editorial-card group relative flex flex-col overflow-hidden rounded-[2rem] border border-slate-100 p-6 shadow-lg md:rounded-[4rem] md:p-14 dark:border-white/5">
              <div className="from-accent/5 absolute inset-0 bg-gradient-to-br via-transparent to-transparent opacity-50"></div>
              <div className="relative z-10 flex h-full flex-col">
                <div className="mb-8 flex flex-shrink-0 items-center justify-between">
                  <h3 className="font-serif text-xl text-slate-900 italic md:text-3xl dark:text-white">
                    Daftar Tamu
                  </h3>
                  <div className="flex items-center gap-2 text-[10px] tracking-widest uppercase opacity-50">
                    <Clock className="h-3 w-3" />
                    <span>Terbaru</span>
                  </div>
                </div>

                <div className="custom-scrollbar -mr-2 h-96 flex-grow overflow-y-auto pr-2 md:h-[450px]">
                  {rsvps.length === 0 ? (
                    <div className="flex h-full flex-col items-center justify-center opacity-40">
                      <Users className="mb-2 h-8 w-8" />
                      <span className="text-xs tracking-widest uppercase">
                        Belum ada data
                      </span>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      {rsvps.map((rsvp) => (
                        <div
                          key={rsvp.id}
                          className="editorial-card animate-reveal space-y-4 rounded-2xl p-5"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex min-w-0 items-center gap-3">
                              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-slate-200 text-xs font-bold text-slate-500 dark:bg-slate-700 dark:text-slate-300">
                                {rsvp.guest_name.charAt(0).toUpperCase()}
                              </div>
                              <span className="truncate font-serif text-base text-slate-800 italic dark:text-slate-200">
                                {rsvp.guest_name}
                              </span>
                            </div>
                            <span
                              className={`text-xs font-bold uppercase ${getStatusColor(
                                rsvp.attendance
                              )}`}
                            >
                              {rsvp.attendance.replace("_", " ")}
                            </span>
                          </div>
                          {rsvp.attendance === AttendanceStatus.HADIR && (
                            <div className="mt-3 flex items-center gap-2 border-t border-slate-100 pt-3 text-xs text-slate-400 dark:border-white/5 dark:text-slate-500">
                              <Users className="h-4 w-4" />
                              <span>Datang ber-{rsvp.guest_count}</span>
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
      </div>
    </section>
  );
};
export default RSVPForm;
