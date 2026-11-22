import React, { useState, useEffect, useMemo, useRef } from "react";
import { dbService } from "../services/dbService";
import type { Wish, AppConfig } from "../types";
import { QUICK_WISH_TEMPLATES } from "../utils/formHelpers";
import {
  Quote,
  Heart,
  Send,
  ChevronLeft,
  ChevronRight,
  Check,
} from "lucide-react";
import { SectionDivider } from "./WeddingOrnaments";

const Wishes: React.FC<{ config: AppConfig }> = ({ config: _config }) => {
  const [wishes, setWishes] = useState<Wish[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const wishesPerPage = 6;
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isNameLocked, setIsNameLocked] = useState(false);
  const [postSuccess, setPostSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const successTimerRef = useRef<number | null>(null);

  useEffect(() => {
    loadWishes();
    const params = new URLSearchParams(window.location.search);
    const to = params.get("to");
    if (to) {
      setName(to);
      setIsNameLocked(true);
    }

    const mediaQuery = window.matchMedia("(max-width: 767px)");
    setIsMobile(mediaQuery.matches);
    const handleMediaChange = (e: MediaQueryListEvent) =>
      setIsMobile(e.matches);
    mediaQuery.addEventListener("change", handleMediaChange);

    return () => {
      mediaQuery.removeEventListener("change", handleMediaChange);
      if (successTimerRef.current) {
        window.clearTimeout(successTimerRef.current);
      }
    };
  }, []);

  const loadWishes = async () => {
    const data = await dbService.getWishes();
    setWishes(data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    const trimmedMessage = message.trim();
    if (!trimmedName || !trimmedMessage) {
      setErrorMsg("Nama dan ucapan wajib diisi.");
      return;
    }
    setIsSending(true);
    setErrorMsg(null);
    try {
      await dbService.saveWish({ name: trimmedName, message: trimmedMessage });
      setMessage("");
      if (!isNameLocked) setName("");
      await loadWishes();
      setCurrentPage(1);
      setPostSuccess(true);
      if (successTimerRef.current) {
        window.clearTimeout(successTimerRef.current);
      }
      successTimerRef.current = window.setTimeout(
        () => setPostSuccess(false),
        3000
      );
    } catch (err) {
      console.error(err);
      setErrorMsg(
        err instanceof Error
          ? err.message
          : "Gagal mengirim ucapan. Silakan coba lagi."
      );
    } finally {
      setIsSending(false);
    }
  };

  const totalPages = Math.ceil(wishes.length / wishesPerPage);
  const currentWishes = useMemo(() => {
    const start = (currentPage - 1) * wishesPerPage;
    return wishes.slice(start, start + wishesPerPage);
  }, [wishes, currentPage]);

  const paginate = (pageNumber: number) => {
    setCurrentPage(pageNumber);
    document
      .getElementById("wishes-header")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const getPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = isMobile ? 3 : 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    if (endPage - startPage < maxVisiblePages - 1) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    for (let i = startPage; i <= endPage; i++) pages.push(i);
    return pages;
  };

  const fieldClass =
    "w-full rounded-xl border border-accentDark/15 bg-white/80 px-4 py-3 text-sm text-slate-900 transition-all outline-none placeholder:text-slate-400 focus:border-accentDark focus:bg-white focus:ring-2 focus:ring-accent/30 dark:border-white/15 dark:bg-white/5 dark:text-white dark:placeholder:text-slate-400 dark:focus:border-accent dark:focus:bg-white/10";

  return (
    <section
      id="wishes"
      className="wedding-section-glow py-20 transition-colors duration-700 md:py-28"
    >
      <div className="container mx-auto max-w-6xl px-5 md:px-6">
        <div
          id="wishes-header"
          className="mb-14 space-y-3 text-center md:mb-18"
        >
          <span className="text-accentDark dark:text-accent text-[11px] font-semibold tracking-[0.3em] uppercase">
            Buku Tamu Digital
          </span>
          <h2 className="font-serif text-4xl font-medium tracking-tight text-primary italic sm:text-5xl md:text-6xl dark:text-white">
            Ucapan &amp; Doa
          </h2>
          <SectionDivider className="py-1" />
          <p className="mx-auto max-w-lg text-sm font-light text-slate-500 italic sm:text-base dark:text-slate-400">
            Untaian doa dan harapan tulus dari orang-orang tersayang
          </p>
        </div>

        <div className="grid items-start gap-6 md:gap-8 lg:grid-cols-12">
          {/* Form Column */}
          <div className="lg:sticky lg:top-24 lg:col-span-4">
            <div className="editorial-card rounded-3xl p-6 sm:p-8">
              <div className="space-y-5">
                <div className="space-y-1">
                  <span className="text-accentDark dark:text-accent text-[10px] font-bold tracking-[0.24em] uppercase">
                    Tulis Harapan
                  </span>
                  <h3 className="font-serif text-2xl font-medium text-primary italic sm:text-3xl dark:text-white">
                    Kirim Ucapan
                  </h3>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label
                        htmlFor="wish-name"
                        className="text-[11px] font-bold tracking-[0.16em] text-slate-600 uppercase dark:text-slate-300"
                      >
                        Nama Anda <span className="text-rose-500">*</span>
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
                      id="wish-name"
                      required
                      type="text"
                      autoComplete="name"
                      maxLength={100}
                      disabled={isNameLocked}
                      className={`${fieldClass} ${
                        isNameLocked ? "cursor-not-allowed opacity-65" : ""
                      }`}
                      placeholder="Ketik nama lengkap Anda"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label
                        htmlFor="wish-message"
                        className="block text-[11px] font-bold tracking-[0.16em] text-slate-600 uppercase dark:text-slate-300"
                      >
                        Ucapan &amp; Doa <span className="text-rose-500">*</span>
                      </label>
                      <span className="text-[10px] text-slate-400">
                        {message.length}/1000
                      </span>
                    </div>
                    <textarea
                      id="wish-message"
                      required
                      maxLength={1000}
                      className={`${fieldClass} h-28 resize-none leading-relaxed`}
                      placeholder="Tuliskan doa terbaik Anda atau pilih contoh di bawah..."
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                    />
                    <div className="space-y-1.5">
                      <p className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
                        Pilih Doa Cepat:
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {QUICK_WISH_TEMPLATES.map((tpl, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setMessage(tpl)}
                            className="border-accentDark/15 hover:border-accentDark hover:text-accentDark dark:border-white/10 dark:hover:border-accent dark:hover:text-accent rounded-full border bg-white/70 px-3 py-1 text-[11px] font-medium text-slate-600 transition-colors dark:bg-white/5 dark:text-slate-300"
                          >
                            {idx === 0
                              ? "Doa Samawa"
                              : idx === 1
                                ? "Selamat Menikah"
                                : idx === 2
                                  ? "Menua Bersama"
                                  : "Turut Berbahagia"}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {errorMsg && (
                    <div
                      role="alert"
                      className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs font-medium text-rose-600 dark:border-rose-900/40 dark:bg-rose-900/20 dark:text-rose-300"
                    >
                      {errorMsg}
                    </div>
                  )}

                  <button
                    disabled={isSending || postSuccess}
                    type="submit"
                    className={`group/btn flex w-full items-center justify-center gap-2.5 rounded-full py-3.5 text-xs font-bold tracking-[0.2em] text-white uppercase shadow-sm transition-all active:scale-[0.98] disabled:opacity-60 ${
                      postSuccess
                        ? "cursor-default bg-emerald-600"
                        : "bg-primary dark:bg-accentDark hover:opacity-95"
                    }`}
                  >
                    {isSending ? (
                      "Mengirim..."
                    ) : postSuccess ? (
                      <>
                        Terkirim <Check className="h-4 w-4" />
                      </>
                    ) : (
                      <>
                        Kirim Ucapan
                        <Send className="h-4 w-4 transition-transform group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5" />
                      </>
                    )}
                  </button>
                </form>
              </div>
            </div>
          </div>

          {/* Wishes Grid */}
          <div className="space-y-8 lg:col-span-8">
            {currentWishes.length === 0 ? (
              <div className="editorial-card flex flex-col items-center justify-center rounded-3xl p-12 text-center">
                <Heart className="text-accentDark/35 dark:text-accent/35 mb-3 h-9 w-9" />
                <p className="font-serif text-2xl text-slate-700 italic dark:text-slate-200">
                  Belum ada ucapan
                </p>
                <p className="mt-1 text-xs tracking-wider text-slate-400 uppercase">
                  Jadilah yang pertama mengirimkan doa terbaik
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-5">
                {currentWishes.map((wish) => (
                  <div
                    key={wish.id}
                    className="editorial-card group animate-reveal flex flex-col justify-between rounded-3xl p-6 transition-all hover:-translate-y-0.5"
                  >
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="bg-accentDark/10 text-accentDark dark:bg-accent/15 dark:text-accent flex h-9 w-9 items-center justify-center rounded-xl">
                          <Quote className="h-4 w-4" />
                        </div>
                        <Heart className="text-accentDark/20 dark:text-accent/25 h-4 w-4 transition-transform duration-500 group-hover:scale-125" />
                      </div>
                      <p className="font-serif text-lg leading-relaxed text-slate-700 italic sm:text-xl dark:text-slate-200">
                        &ldquo;{wish.message}&rdquo;
                      </p>
                    </div>

                    <div className="border-accentDark/10 mt-5 flex items-center gap-3 border-t pt-4 dark:border-white/10">
                      <div className="bg-accentDark/12 text-accentDark dark:bg-accent/15 dark:text-accent flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold">
                        {wish.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex min-w-0 flex-col">
                        <span className="truncate text-xs font-bold tracking-wider text-slate-900 uppercase dark:text-slate-100">
                          {wish.name}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {new Date(wish.created_at).toLocaleDateString(
                            "id-ID",
                            {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            }
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2">
                <button
                  type="button"
                  aria-label="Halaman sebelumnya"
                  onClick={() => paginate(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="border-accentDark/20 hover:border-accentDark hover:text-accentDark flex h-10 w-10 items-center justify-center rounded-full border text-slate-500 transition-all disabled:opacity-25 dark:border-white/15 dark:hover:text-white"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <div className="border-accentDark/15 flex items-center gap-1 rounded-full border bg-white/70 px-2 py-1 backdrop-blur-md dark:border-white/10 dark:bg-white/5">
                  {getPageNumbers().map((pageNum) => (
                    <button
                      type="button"
                      key={pageNum}
                      aria-label={`Halaman ${pageNum}`}
                      aria-current={
                        currentPage === pageNum ? "page" : undefined
                      }
                      onClick={() => paginate(pageNum)}
                      className={`h-8 w-8 rounded-full text-xs font-semibold transition-all ${
                        currentPage === pageNum
                          ? "bg-primary dark:bg-accentDark text-white shadow-sm"
                          : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                      }`}
                    >
                      {pageNum}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  aria-label="Halaman berikutnya"
                  onClick={() =>
                    paginate(Math.min(totalPages, currentPage + 1))
                  }
                  disabled={currentPage === totalPages}
                  className="border-accentDark/20 hover:border-accentDark hover:text-accentDark flex h-10 w-10 items-center justify-center rounded-full border text-slate-500 transition-all disabled:opacity-25 dark:border-white/15 dark:hover:text-white"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default Wishes;
