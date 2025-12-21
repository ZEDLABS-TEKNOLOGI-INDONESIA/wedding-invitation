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
      className="py-24 md:py-48 bg-secondary/30 dark:bg-darkBg transition-colors duration-1000"
    >
      <div className="container mx-auto px-6 max-w-7xl">
        <div
          id="wishes-header"
          className="text-center mb-20 md:mb-32 space-y-6 md:space-y-10"
        >
          <div className="flex items-center justify-center gap-4 opacity-40">
            <div className="h-[1px] w-12 md:w-24 bg-accentDark dark:bg-accent"></div>
            <Sparkles className="w-6 h-6 md:w-10 md:h-10 text-accentDark dark:text-accent animate-pulse" />
            <div className="h-[1px] w-12 md:w-24 bg-accentDark dark:bg-accent"></div>
          </div>
          <h2 className="text-5xl md:text-[10rem] font-serif italic text-slate-900 dark:text-white tracking-tighter leading-none">
            Prayers & Wishes
          </h2>
          <p className="text-slate-400 dark:text-slate-500 tracking-luxury text-[10px] md:text-[14px] uppercase font-black italic text-balance">
            Untaian doa dan harapan tulus dari orang-orang tersayang
          </p>
        </div>
        <div className="grid lg:grid-cols-12 gap-10 md:gap-24 items-start">
          <div className="lg:col-span-4 lg:sticky lg:top-32">
            <div className="frosted-glass p-8 md:p-14 rounded-[2.5rem] md:rounded-[4rem] shadow-2xl relative overflow-hidden group border border-slate-200/50 dark:border-white/5">
              <div className="absolute -top-20 -right-20 w-64 h-64 bg-accent/5 rounded-full blur-3xl group-hover:scale-125 transition-transform duration-[3s]"></div>
              <div className="relative z-10 space-y-10 md:space-y-16">
                <div className="space-y-4">
                  <span className="text-[10px] md:text-[12px] font-black uppercase tracking-luxury text-accentDark dark:text-accent">
                    Guest Book
                  </span>
                  <h3 className="text-3xl md:text-5xl font-serif italic text-slate-900 dark:text-white">
                    Kirim Ucapan
                  </h3>
                </div>
                <form
                  onSubmit={handleSubmit}
                  className="space-y-8 md:space-y-14"
                >
                  <div className="space-y-8 md:space-y-12">
                    <div className="relative group/input">
                      <input
                        required
                        type="text"
                        disabled={isNameLocked}
                        className={`w-full bg-transparent border-b-2 border-slate-100 dark:border-white/5 py-3 md:py-6 focus:border-accentDark dark:focus:border-accent outline-none transition-all text-lg md:text-2xl font-serif italic text-slate-900 dark:text-white placeholder:text-slate-200 dark:placeholder:text-slate-800 ${
                          isNameLocked ? "opacity-60 cursor-not-allowed" : ""
                        }`}
                        placeholder="Nama Lengkap"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                      />
                      <label className="absolute -top-4 left-0 text-[8px] md:text-[10px] uppercase tracking-widest text-slate-400 font-black">
                        Your Name {isNameLocked && "(Locked)"}
                      </label>
                    </div>
                    <div className="relative group/input">
                      <textarea
                        required
                        className="w-full bg-transparent border-b-2 border-slate-100 dark:border-white/5 py-3 md:py-6 focus:border-accentDark dark:focus:border-accent outline-none transition-all text-lg md:text-2xl font-serif italic h-32 md:h-52 resize-none text-slate-900 dark:text-white leading-relaxed placeholder:text-slate-200 dark:placeholder:text-slate-800"
                        placeholder="Tuliskan/Perbarui harapan terbaik Anda..."
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                      />
                      <label className="absolute -top-4 left-0 text-[8px] md:text-[10px] uppercase tracking-widest text-slate-400 font-black">
                        Your Message
                      </label>
                    </div>
                  </div>
                  <button
                    disabled={isSending || postSuccess}
                    type="submit"
                    className={`w-full py-3.5 md:py-6 text-white rounded-xl md:rounded-3xl font-bold uppercase tracking-luxury text-[9px] md:text-[11px] hover:shadow-xl transition-all duration-700 flex items-center justify-center gap-3 disabled:opacity-50 active:scale-95 group/btn shadow-sm ${
                      postSuccess
                        ? "bg-green-500 cursor-default"
                        : "bg-primary dark:bg-accentDark"
                    }`}
                  >
                    {isSending ? (
                      "Sending..."
                    ) : postSuccess ? (
                      <>
                        Success <Check className="w-3.5 h-3.5 md:w-5 md:h-5" />
                      </>
                    ) : isNameLocked ? (
                      "Update Message"
                    ) : (
                      "Send Message"
                    )}
                    {!isSending && !postSuccess && (
                      <Send className="w-3.5 h-3.5 md:w-5 md:h-5 group-hover/btn:translate-x-1 group-hover/btn:-translate-y-1 transition-transform" />
                    )}
                  </button>
                </form>
              </div>
            </div>
          </div>
          <div className="lg:col-span-8 space-y-12 md:space-y-20">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 md:gap-10">
              {currentWishes.map((wish) => (
                <div
                  key={wish.id}
                  className="editorial-card p-8 md:p-14 rounded-[2.5rem] md:rounded-[4rem] group hover:-translate-y-2 transition-all duration-700 flex flex-col shadow-xl hover:shadow-2xl border border-slate-50 dark:border-white/5 bg-white dark:bg-darkSurface animate-reveal"
                >
                  <div className="space-y-6 md:space-y-10 flex-grow">
                    <div className="flex justify-between items-start">
                      <div className="w-12 h-12 md:w-16 md:h-16 bg-slate-50 dark:bg-white/5 rounded-2xl md:rounded-3xl flex items-center justify-center text-accentDark/20 dark:text-accent/20 border border-slate-100 dark:border-white/10">
                        <Quote className="w-6 h-6 md:w-8 md:h-8" />
                      </div>
                      <Heart className="w-4 h-4 md:w-6 md:h-6 text-accent/10 dark:text-accent/20 group-hover:scale-125 transition-transform duration-700" />
                    </div>
                    <p className="text-slate-700 dark:text-slate-200 text-lg md:text-3xl font-serif italic leading-[1.4] text-balance">
                      "{wish.message}"
                    </p>
                  </div>
                  <div className="mt-8 md:mt-16 flex items-center gap-4 md:gap-6 border-t border-slate-50 dark:border-white/5 pt-6 md:pt-10">
                    <div className="w-12 h-12 md:w-16 md:h-16 rounded-2xl md:rounded-3xl bg-gradient-to-br from-slate-50 to-slate-100 dark:from-white/5 dark:to-white/10 flex items-center justify-center text-[12px] md:text-[18px] font-black text-accentDark dark:text-accent border border-slate-100 dark:border-white/10 shadow-inner">
                      {wish.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-[10px] md:text-[14px] font-black uppercase tracking-widest text-slate-900 dark:text-slate-100 truncate">
                        {wish.name}
                      </span>
                      <span className="text-[8px] md:text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-widest font-bold mt-1">
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
                    className="w-12 h-12 md:w-20 md:h-20 rounded-full border border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-400 hover:border-accentDark hover:text-accentDark hover:bg-white dark:hover:bg-white/5 transition-all disabled:opacity-10 shadow-lg active:scale-90"
                  >
                    <ChevronLeft className="w-6 h-6 md:w-10 md:h-10" />
                  </button>
                  <div className="flex gap-2 md:gap-4 px-4 py-2 bg-white/50 dark:bg-white/5 rounded-full backdrop-blur-xl border border-white/20 dark:border-white/10 shadow-inner">
                    {getPageNumbers().map((pageNum) => (
                      <button
                        key={pageNum}
                        onClick={() => paginate(pageNum)}
                        className={`w-10 h-10 md:w-16 md:h-16 rounded-full font-serif text-lg md:text-3xl transition-all duration-700 ${
                          currentPage === pageNum
                            ? "bg-primary dark:bg-accentDark text-white scale-110 shadow-2xl z-10"
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
                    className="w-12 h-12 md:w-20 md:h-20 rounded-full border border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-400 hover:border-accentDark hover:text-accentDark hover:bg-white dark:hover:bg-white/5 transition-all disabled:opacity-10 shadow-lg active:scale-90"
                  >
                    <ChevronRight className="w-6 h-6 md:w-10 md:h-10" />
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
