import React, { useState, useEffect, useMemo } from "react";
import { dbService } from "../services/dbService";
import type { Wish } from "../types";
import {
  Quote,
  Heart,
  Send,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Check,
} from "lucide-react";
const Wishes: React.FC = () => {
  const [wishes, setWishes] = useState<Wish[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const wishesPerPage = 6;
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isNameLocked, setIsNameLocked] = useState(false);
  const [postSuccess, setPostSuccess] = useState(false);
  useEffect(() => {
    loadWishes();
    const params = new URLSearchParams(window.location.search);
    const to = params.get("to");
    if (to) {
      setName(to);
      setIsNameLocked(true);
    }
  }, []);
  const loadWishes = async () => {
    const data = await dbService.getWishes();
    setWishes(data);
  };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !message.trim()) return;
    setIsSending(true);
    try {
      await dbService.saveWish({ name, message });
      setMessage("");
      if (!isNameLocked) setName("");
      await loadWishes();
      setCurrentPage(1);
      setPostSuccess(true);
      setTimeout(() => setPostSuccess(false), 3000);
    } catch (err) {
      console.error(err);
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
    const header = document.getElementById("wishes-header");
    if (header) {
      header.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };
  const getPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = window.innerWidth < 768 ? 3 : 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    if (endPage - startPage < maxVisiblePages - 1) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    for (let i = startPage; i <= endPage; i++) pages.push(i);
    return pages;
  };
  return (
    <section
      id="wishes"
      className="bg-secondary/30 dark:bg-darkBg py-24 transition-colors duration-1000 md:py-48"
    >
      <div className="container mx-auto max-w-7xl px-6">
        <div
          id="wishes-header"
          className="mb-20 space-y-6 text-center md:mb-32 md:space-y-10"
        >
          <div className="flex items-center justify-center gap-4 opacity-40">
            <div className="bg-accentDark dark:bg-accent h-[1px] w-12 md:w-24"></div>
            <Sparkles className="text-accentDark dark:text-accent h-6 w-6 animate-pulse md:h-10 md:w-10" />
            <div className="bg-accentDark dark:bg-accent h-[1px] w-12 md:w-24"></div>
          </div>
          <h2 className="font-serif text-5xl leading-none tracking-tighter text-slate-900 italic md:text-[10rem] dark:text-white">
            Prayers & Wishes
          </h2>
          <p className="tracking-luxury text-[10px] font-black text-balance text-slate-400 uppercase italic md:text-[14px] dark:text-slate-500">
            Untaian doa dan harapan tulus dari orang-orang tersayang
          </p>
        </div>
        <div className="grid items-start gap-10 md:gap-24 lg:grid-cols-12">
          <div className="lg:sticky lg:top-32 lg:col-span-4">
            <div className="frosted-glass group relative overflow-hidden rounded-[2.5rem] border border-slate-200/50 p-8 shadow-2xl md:rounded-[4rem] md:p-14 dark:border-white/5">
              <div className="bg-accent/5 absolute -top-20 -right-20 h-64 w-64 rounded-full blur-3xl transition-transform duration-[3s] group-hover:scale-125"></div>
              <div className="relative z-10 space-y-10 md:space-y-16">
                <div className="space-y-4">
                  <span className="tracking-luxury text-accentDark dark:text-accent text-[10px] font-black uppercase md:text-[12px]">
                    Guest Book
                  </span>
                  <h3 className="font-serif text-3xl text-slate-900 italic md:text-5xl dark:text-white">
                    Kirim Ucapan
                  </h3>
                </div>
                <form
                  onSubmit={handleSubmit}
                  className="space-y-8 md:space-y-14"
                >
                  <div className="space-y-8 md:space-y-12">
                    <div className="group/input relative">
                      <input
                        required
                        type="text"
                        disabled={isNameLocked}
                        className={`focus:border-accentDark dark:focus:border-accent w-full border-b-2 border-slate-100 bg-transparent py-3 font-serif text-lg text-slate-900 italic transition-all outline-none placeholder:text-slate-200 md:py-6 md:text-2xl dark:border-white/5 dark:text-white dark:placeholder:text-slate-800 ${
                          isNameLocked ? "cursor-not-allowed opacity-60" : ""
                        }`}
                        placeholder="Nama Lengkap"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                      />
                      <label className="absolute -top-4 left-0 text-[8px] font-black tracking-widest text-slate-400 uppercase md:text-[10px]">
                        Your Name {isNameLocked && "(Locked)"}
                      </label>
                    </div>
                    <div className="group/input relative">
                      <textarea
                        required
                        className="focus:border-accentDark dark:focus:border-accent h-32 w-full resize-none border-b-2 border-slate-100 bg-transparent py-3 font-serif text-lg leading-relaxed text-slate-900 italic transition-all outline-none placeholder:text-slate-200 md:h-52 md:py-6 md:text-2xl dark:border-white/5 dark:text-white dark:placeholder:text-slate-800"
                        placeholder="Tuliskan/Perbarui harapan terbaik Anda..."
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                      />
                      <label className="absolute -top-4 left-0 text-[8px] font-black tracking-widest text-slate-400 uppercase md:text-[10px]">
                        Your Message
                      </label>
                    </div>
                  </div>
                  <button
                    disabled={isSending || postSuccess}
                    type="submit"
                    className={`tracking-luxury group/btn flex w-full items-center justify-center gap-3 rounded-xl py-3.5 text-[9px] font-bold text-white uppercase shadow-sm transition-all duration-700 hover:shadow-xl active:scale-95 disabled:opacity-50 md:rounded-3xl md:py-6 md:text-[11px] ${
                      postSuccess
                        ? "cursor-default bg-green-500"
                        : "bg-primary dark:bg-accentDark"
                    }`}
                  >
                    {isSending ? (
                      "Sending..."
                    ) : postSuccess ? (
                      <>
                        Success <Check className="h-3.5 w-3.5 md:h-5 md:w-5" />
                      </>
                    ) : isNameLocked ? (
                      "Update Message"
                    ) : (
                      "Send Message"
                    )}
                    {!isSending && !postSuccess && (
                      <Send className="h-3.5 w-3.5 transition-transform group-hover/btn:translate-x-1 group-hover/btn:-translate-y-1 md:h-5 md:w-5" />
                    )}
                  </button>
                </form>
              </div>
            </div>
          </div>
          <div className="space-y-12 md:space-y-20 lg:col-span-8">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:gap-10">
              {currentWishes.map((wish) => (
                <div
                  key={wish.id}
                  className="editorial-card group dark:bg-darkSurface animate-reveal flex flex-col rounded-[2.5rem] border border-slate-50 bg-white p-8 shadow-xl transition-all duration-700 hover:-translate-y-2 hover:shadow-2xl md:rounded-[4rem] md:p-14 dark:border-white/5"
                >
                  <div className="flex-grow space-y-6 md:space-y-10">
                    <div className="flex items-start justify-between">
                      <div className="text-accentDark/20 dark:text-accent/20 flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-100 bg-slate-50 md:h-16 md:w-16 md:rounded-3xl dark:border-white/10 dark:bg-white/5">
                        <Quote className="h-6 w-6 md:h-8 md:w-8" />
                      </div>
                      <Heart className="text-accent/10 dark:text-accent/20 h-4 w-4 transition-transform duration-700 group-hover:scale-125 md:h-6 md:w-6" />
                    </div>
                    <p className="font-serif text-lg leading-[1.4] text-balance text-slate-700 italic md:text-3xl dark:text-slate-200">
                      "{wish.message}"
                    </p>
                  </div>
                  <div className="mt-8 flex items-center gap-4 border-t border-slate-50 pt-6 md:mt-16 md:gap-6 md:pt-10 dark:border-white/5">
                    <div className="text-accentDark dark:text-accent flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-100 bg-gradient-to-br from-slate-50 to-slate-100 text-[12px] font-black shadow-inner md:h-16 md:w-16 md:rounded-3xl md:text-[18px] dark:border-white/10 dark:from-white/5 dark:to-white/10">
                      {wish.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex min-w-0 flex-col">
                      <span className="truncate text-[10px] font-black tracking-widest text-slate-900 uppercase md:text-[14px] dark:text-slate-100">
                        {wish.name}
                      </span>
                      <span className="mt-1 text-[8px] font-bold tracking-widest text-slate-400 uppercase md:text-[10px] dark:text-slate-500">
                        {new Date(wish.created_at).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {totalPages > 1 && (
              <div className="flex flex-col items-center gap-8 md:gap-12">
                <div className="flex items-center justify-center gap-3 md:gap-6">
                  <button
                    onClick={() => paginate(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="hover:border-accentDark hover:text-accentDark flex h-12 w-12 items-center justify-center rounded-full border border-slate-200 text-slate-400 shadow-lg transition-all hover:bg-white active:scale-90 disabled:opacity-10 md:h-20 md:w-20 dark:border-white/10 dark:hover:bg-white/5"
                  >
                    <ChevronLeft className="h-6 w-6 md:h-10 md:w-10" />
                  </button>
                  <div className="flex gap-2 rounded-full border border-white/20 bg-white/50 px-4 py-2 shadow-inner backdrop-blur-xl md:gap-4 dark:border-white/10 dark:bg-white/5">
                    {getPageNumbers().map((pageNum) => (
                      <button
                        key={pageNum}
                        onClick={() => paginate(pageNum)}
                        className={`h-10 w-10 rounded-full font-serif text-lg transition-all duration-700 md:h-16 md:w-16 md:text-3xl ${
                          currentPage === pageNum
                            ? "bg-primary dark:bg-accentDark z-10 scale-110 text-white shadow-2xl"
                            : "text-slate-400 hover:text-slate-900 dark:hover:text-white"
                        }`}
                      >
                        {pageNum}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() =>
                      paginate(Math.min(totalPages, currentPage + 1))
                    }
                    disabled={currentPage === totalPages}
                    className="hover:border-accentDark hover:text-accentDark flex h-12 w-12 items-center justify-center rounded-full border border-slate-200 text-slate-400 shadow-lg transition-all hover:bg-white active:scale-90 disabled:opacity-10 md:h-20 md:w-20 dark:border-white/10 dark:hover:bg-white/5"
                  >
                    <ChevronRight className="h-6 w-6 md:h-10 md:w-10" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
export default Wishes;
