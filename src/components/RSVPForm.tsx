import React, { useState, useEffect } from "react";
import {
  Send,
  CheckCircle2,
  Heart,
  Users,
  UserCheck,
  UserX,
  HelpCircle,
  Clock,
  RefreshCcw,
} from "lucide-react";
import { dbService } from "../services/dbService";
import { AttendanceStatus, type RSVP } from "../types";
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
  const stats = {
    hadir: rsvps.filter((r) => r.attendance === AttendanceStatus.HADIR).length,
    ragu: rsvps.filter((r) => r.attendance === AttendanceStatus.RAGU).length,
    tidak: rsvps.filter((r) => r.attendance === AttendanceStatus.TIDAK_HADIR)
      .length,
  };
  const getStatusColor = (status: AttendanceStatus) => {
    switch (status) {
      case AttendanceStatus.HADIR:
        return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800";
      case AttendanceStatus.TIDAK_HADIR:
        return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800";
      default:
        return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700";
    }
  };
  const getStatusIcon = (status: AttendanceStatus) => {
    switch (status) {
      case AttendanceStatus.HADIR:
        return <UserCheck className="w-3 h-3 md:w-4 md:h-4" />;
      case AttendanceStatus.TIDAK_HADIR:
        return <UserX className="w-3 h-3 md:w-4 md:h-4" />;
      default:
        return <HelpCircle className="w-3 h-3 md:w-4 md:h-4" />;
    }
  };
  return (
    <section
      id="rsvp"
      className="py-16 md:py-40 bg-white dark:bg-darkBg transition-colors duration-1000"
    >
      <div className="container mx-auto px-4 md:px-6 max-w-7xl">
        <div className="text-center mb-12 md:mb-24 space-y-3">
          <Heart className="w-5 h-5 text-accentDark dark:text-accent/30 mx-auto mb-2 animate-pulse" />
          <h2 className="text-4xl md:text-8xl font-serif italic text-slate-900 dark:text-white tracking-tight">
            Reservasi
          </h2>
          <p className="text-slate-400 dark:text-slate-500 tracking-luxury text-[9px] md:text-[10px] uppercase font-bold">
            Mohon konfirmasi kehadiran Anda
          </p>
        </div>
        <div className="grid lg:grid-cols-12 gap-8 md:gap-14 items-stretch">
          <div className="lg:col-span-5 space-y-6">
            <div className="editorial-card h-full p-6 md:p-14 rounded-[1.5rem] md:rounded-[3.5rem] relative overflow-hidden group shadow-lg flex flex-col justify-center">
              {submitted ? (
                <div className="text-center space-y-6 animate-reveal">
                  <div className="w-20 h-20 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto text-green-600 dark:text-green-400">
                    <CheckCircle2 className="w-10 h-10" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-2xl md:text-4xl font-serif italic text-slate-900 dark:text-white">
                      Terima Kasih!
                    </h3>
                    <p className="text-slate-500 dark:text-slate-400 text-sm md:text-base leading-relaxed">
                      Konfirmasi kehadiran Anda telah berhasil kami simpan.
                    </p>
                  </div>
                  <button
                    onClick={() => setSubmitted(false)}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-slate-100 dark:bg-white/5 rounded-full text-[10px] uppercase font-bold tracking-widest hover:bg-slate-200 dark:hover:bg-white/10 transition-colors"
                  >
                    <RefreshCcw className="w-3 h-3" />
                    Edit Kembali
                  </button>
                </div>
              ) : (
                <>
                  <div className="absolute top-0 right-0 w-32 h-32 bg-accentDark/5 dark:bg-accent/5 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform duration-1000 pointer-events-none"></div>
                  <div className="relative z-10 space-y-8 md:space-y-12">
                    <div className="flex items-center gap-4 border-b border-slate-50 dark:border-white/5 pb-4 md:pb-10">
                      <div className="w-10 h-10 md:w-16 md:h-16 rounded-xl md:rounded-2xl bg-slate-50 dark:bg-white/5 flex items-center justify-center text-accentDark dark:text-accent border border-slate-100 dark:border-white/10">
                        <Users className="w-5 h-5 md:w-8 md:h-8" />
                      </div>
                      <div>
                        <h3 className="text-lg md:text-2xl font-serif italic text-slate-900 dark:text-white leading-none">
                          Konfirmasi
                        </h3>
                        <p className="text-[8px] md:text-[9px] uppercase tracking-editorial text-slate-400 mt-1.5 font-bold">
                          Lengkapi data Anda
                        </p>
                      </div>
                    </div>
                    <form
                      onSubmit={handleSubmit}
                      className="space-y-6 md:space-y-10"
                    >
                      <div className="space-y-6 md:space-y-8">
                        <div className="relative group/input">
                          <input
                            required
                            type="text"
                            disabled={isNameLocked}
                            className={`w-full bg-transparent border-b border-slate-200 dark:border-white/10 py-2 md:py-5 focus:border-accentDark dark:focus:border-accent outline-none transition-all text-base md:text-xl font-serif italic text-slate-900 dark:text-white placeholder:text-slate-200 ${
                              isNameLocked
                                ? "opacity-60 cursor-not-allowed text-slate-500"
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
                          <label className="absolute -top-3.5 left-0 text-[7px] md:text-[9px] uppercase tracking-editorial text-slate-400 font-bold group-focus-within/input:text-accentDark transition-colors">
                            Nama {isNameLocked && "(Locked)"}
                          </label>
                        </div>
                        <div className="relative group/input">
                          <input
                            type="text"
                            className="w-full bg-transparent border-b border-slate-200 dark:border-white/10 py-2 md:py-5 focus:border-accentDark dark:focus:border-accent outline-none transition-all text-base md:text-xl font-serif italic text-slate-900 dark:text-white placeholder:text-slate-200"
                            placeholder="WhatsApp / Phone"
                            value={formData.phone}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                phone: e.target.value,
                              })
                            }
                          />
                          <label className="absolute -top-3.5 left-0 text-[7px] md:text-[9px] uppercase tracking-editorial text-slate-400 font-bold group-focus-within/input:text-accentDark transition-colors">
                            Kontak
                          </label>
                        </div>
                      </div>
                      <div className="space-y-3 md:space-y-6">
                        <p className="text-[8px] md:text-[9px] uppercase tracking-editorial text-slate-400 font-bold mb-1">
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
                              className={`px-5 py-3.5 md:py-5 rounded-lg md:rounded-2xl border transition-all text-[9px] md:text-[11px] font-bold uppercase tracking-editorial flex items-center justify-between group ${
                                formData.attendance === status
                                  ? "bg-primary dark:bg-white text-white dark:text-primary border-primary dark:border-white shadow-md"
                                  : "border-slate-100 dark:border-white/5 text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5"
                              }`}
                            >
                              {status.replace("_", " ")}
                              {formData.attendance === status && (
                                <CheckCircle2 className="w-3.5 h-3.5 md:w-5 md:h-5" />
                              )}
                            </button>
                          ))}
                        </div>
                      </div>
                      <button
                        disabled={isSubmitting}
                        type="submit"
                        className="w-full py-3.5 md:py-6 bg-primary dark:bg-accentDark text-white rounded-xl md:rounded-3xl font-bold uppercase tracking-luxury text-[9px] md:text-[11px] hover:shadow-xl transition-all duration-700 flex items-center justify-center gap-3 disabled:opacity-50 active:scale-95 group shadow-sm"
                      >
                        {isSubmitting
                          ? "Sending..."
                          : isNameLocked
                          ? "Update RSVP"
                          : "Send RSVP"}
                        <Send className="w-3.5 h-3.5 md:w-5 md:h-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                      </button>
                    </form>
                  </div>
                </>
              )}
            </div>
          </div>
          <div className="lg:col-span-7 space-y-6">
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
                  className="editorial-card p-4 md:p-8 rounded-[1.5rem] md:rounded-[2.5rem] flex flex-col items-center justify-center text-center space-y-2 border border-slate-100 dark:border-white/5"
                >
                  <span
                    className={`text-2xl md:text-5xl font-serif font-bold ${item.color}`}
                  >
                    {item.count}
                  </span>
                  <span className="text-[9px] md:text-[10px] uppercase tracking-widest font-bold opacity-60">
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
            <div className="editorial-card p-6 md:p-14 rounded-[2rem] md:rounded-[4rem] min-h-[400px] max-h-[600px] flex flex-col relative overflow-hidden group shadow-lg border border-slate-100 dark:border-white/5">
              <div className="absolute inset-0 bg-gradient-to-br from-accent/5 via-transparent to-transparent opacity-50"></div>
              <div className="relative z-10 flex flex-col h-full">
                <div className="mb-8 flex items-center justify-between">
                  <h3 className="text-xl md:text-3xl font-serif italic text-slate-900 dark:text-white">
                    Daftar Tamu
                  </h3>
                  <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest opacity-50">
                    <Clock className="w-3 h-3" />
                    <span>Terbaru</span>
                  </div>
                </div>
                <div className="flex-grow overflow-y-auto pr-2 space-y-3 md:space-y-4 custom-scrollbar">
                  {rsvps.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-40 opacity-40">
                      <Users className="w-8 h-8 mb-2" />
                      <span className="text-xs uppercase tracking-widest">
                        Belum ada data
                      </span>
                    </div>
                  ) : (
                    rsvps.map((rsvp) => (
                      <div
                        key={rsvp.id}
                        className="flex items-center justify-between p-3 md:p-5 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 transition-all hover:bg-white dark:hover:bg-white/10 hover:shadow-md animate-reveal"
                      >
                        <div className="flex items-center gap-3 md:gap-5">
                          <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-[10px] md:text-xs font-bold text-slate-500 dark:text-slate-300">
                            {rsvp.guest_name.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex flex-col">
                            <span className="text-sm md:text-lg font-serif italic text-slate-800 dark:text-slate-200">
                              {rsvp.guest_name}
                            </span>
                            <span className="text-[8px] md:text-[9px] uppercase tracking-widest opacity-40">
                              {new Date(rsvp.created_at).toLocaleDateString(
                                "id-ID",
                                { day: "numeric", month: "short" }
                              )}
                            </span>
                          </div>
                        </div>
                        <div
                          className={`flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 rounded-full border ${getStatusColor(
                            rsvp.attendance
                          )}`}
                        >
                          {getStatusIcon(rsvp.attendance)}
                          <span className="text-[8px] md:text-[9px] font-bold uppercase tracking-widest hidden sm:inline-block">
                            {rsvp.attendance.replace("_", " ")}
                          </span>
                        </div>
                      </div>
                    ))
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
