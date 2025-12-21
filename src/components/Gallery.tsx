import React, { useState, useEffect } from "react";
import {
  X,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Sparkles,
  Image as ImageIcon,
} from "lucide-react";
import { GALLERY_IMAGES } from "../constants";
const Gallery: React.FC = () => {
  const [selectedImg, setSelectedImg] = useState<number | null>(null);
  const [isClosing, setIsClosing] = useState(false);
  const openLightbox = (index: number) => {
    setSelectedImg(index);
    setIsClosing(false);
    document.body.style.overflow = "hidden";
  };
  const closeLightbox = () => {
    setIsClosing(true);
    setTimeout(() => {
      setSelectedImg(null);
      setIsClosing(false);
      document.body.style.overflow = "unset";
    }, 400);
  };
  const navigate = (direction: "prev" | "next", e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (selectedImg === null) return;
    if (direction === "prev") {
      setSelectedImg(
        selectedImg === 0 ? GALLERY_IMAGES.length - 1 : selectedImg - 1
      );
    } else {
      setSelectedImg(
        selectedImg === GALLERY_IMAGES.length - 1 ? 0 : selectedImg + 1
      );
    }
  };
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (selectedImg === null) return;
      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowLeft") navigate("prev");
      if (e.key === "ArrowRight") navigate("next");
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedImg]);
  return (
    <section
      id="gallery"
      className="py-24 md:py-48 bg-white dark:bg-darkBg transition-colors duration-1000"
    >
      <div className="container mx-auto px-6 max-w-7xl">
        <div className="text-center mb-20 md:mb-32 space-y-4 md:space-y-8">
          <div className="flex items-center justify-center gap-4 opacity-30">
            <div className="h-[1px] w-8 md:w-16 bg-accentDark dark:bg-accent"></div>
            <ImageIcon className="w-5 h-5 md:w-8 md:h-8" />
            <div className="h-[1px] w-8 md:w-16 bg-accentDark dark:bg-accent"></div>
          </div>
          <h2 className="text-5xl md:text-9xl font-serif italic text-slate-900 dark:text-white tracking-tight">
            Our Gallery
          </h2>
          <p className="text-slate-400 dark:text-slate-500 tracking-luxury text-[10px] md:text-[13px] uppercase font-black italic text-balance">
            Momen-momen indah yang terpatri abadi dalam perjalanan cinta kami
          </p>
        </div>
        <div className="columns-1 sm:columns-2 lg:columns-3 gap-6 md:gap-10 space-y-6 md:space-y-10">
          {GALLERY_IMAGES.map((src, index) => (
            <div
              key={index}
              className="relative group overflow-hidden rounded-[2rem] md:rounded-[3.5rem] cursor-pointer shadow-xl hover:shadow-accent/20 transition-all duration-700 hover:-translate-y-3 border border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-darkSurface"
              onClick={() => openLightbox(index)}
            >
              <img
                src={src}
                alt={`Wedding Moment ${index + 1}`}
                className="w-full h-auto transform group-hover:scale-105 transition-transform duration-[1.5s] ease-out object-cover grayscale-[0.2] group-hover:grayscale-0"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-primary/10 dark:bg-darkBg/40 opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex items-center justify-center backdrop-blur-[1px]">
                <div className="w-14 h-14 md:w-20 md:h-20 bg-white/10 backdrop-blur-2xl rounded-full flex items-center justify-center scale-75 group-hover:scale-100 transition-transform duration-500 border border-white/30">
                  <Maximize2 className="text-white w-6 h-6 md:w-8 md:h-8" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      {selectedImg !== null && (
        <div
          className={`fixed inset-0 z-[1000] flex items-center justify-center transition-all duration-500 overflow-hidden ${
            isClosing ? "opacity-0" : "opacity-100"
          }`}
        >
          <div
            className="absolute inset-0 bg-darkBg/95 backdrop-blur-3xl transition-opacity duration-700"
            onClick={closeLightbox}
          ></div>
          <div className="relative z-[1010] w-full h-full flex items-center justify-center pointer-events-none">
            <div className="relative flex items-center justify-center max-w-[95vw] max-h-[75vh] md:max-h-[85vh]">
              <img
                src={GALLERY_IMAGES[selectedImg]}
                alt="Lightbox Fullscreen"
                className={`max-w-full max-h-full object-contain rounded-[1.5rem] md:rounded-[4rem] shadow-[0_60px_120px_rgba(0,0,0,0.9)] border border-white/10 transition-all duration-700 pointer-events-auto ${
                  isClosing
                    ? "scale-90 blur-xl translate-y-20"
                    : "scale-100 blur-0 animate-reveal"
                }`}
              />
              <div className="fixed left-4 md:left-12 top-1/2 -translate-y-1/2 pointer-events-auto z-[1020]">
                <button
                  onClick={(e) => navigate("prev", e)}
                  className="w-12 h-12 md:w-24 md:h-24 bg-white/5 hover:bg-white/15 backdrop-blur-2xl border border-white/10 rounded-full flex items-center justify-center text-white/40 hover:text-white transition-all hover:scale-110 active:scale-90 group"
                >
                  <ChevronLeft className="w-6 h-6 md:w-12 md:h-12 transition-transform group-hover:-translate-x-1" />
                </button>
              </div>
              <div className="fixed right-4 md:right-12 top-1/2 -translate-y-1/2 pointer-events-auto z-[1020]">
                <button
                  onClick={(e) => navigate("next", e)}
                  className="w-12 h-12 md:w-24 md:h-24 bg-white/5 hover:bg-white/15 backdrop-blur-2xl border border-white/10 rounded-full flex items-center justify-center text-white/40 hover:text-white transition-all hover:scale-110 active:scale-90 group"
                >
                  <ChevronRight className="w-6 h-6 md:w-12 md:h-12 transition-transform group-hover:translate-x-1" />
                </button>
              </div>
            </div>
          </div>
          <div className="absolute top-6 md:top-12 right-6 md:right-12 z-[1030]">
            <button
              onClick={closeLightbox}
              className="w-12 h-12 md:w-20 md:h-20 rounded-full bg-white/5 hover:bg-white/20 flex items-center justify-center text-white/60 hover:text-white transition-all hover:rotate-90 border border-white/10 active:scale-95"
            >
              <X className="w-6 h-6 md:w-10 md:h-10" />
            </button>
          </div>
          <div className="absolute bottom-8 md:bottom-16 left-0 right-0 z-[1030] flex flex-col items-center pointer-events-none">
            <div className="frosted-glass px-8 py-4 md:px-14 md:py-6 rounded-full border border-white/10 shadow-2xl flex items-center gap-6 md:gap-10 animate-reveal [animation-delay:400ms]">
              <div className="flex items-center gap-4">
                <div className="h-[1px] w-6 md:w-12 bg-white/20"></div>
                <p className="font-serif italic text-base md:text-4xl text-white tracking-[0.2em] md:tracking-[0.4em] uppercase">
                  Moment{" "}
                  <span className="font-sans font-black text-accent">
                    {selectedImg + 1}
                  </span>{" "}
                  / {GALLERY_IMAGES.length}
                </p>
                <div className="h-[1px] w-6 md:w-12 bg-white/20"></div>
              </div>
              <Sparkles className="w-4 h-4 md:w-6 md:h-6 text-accent/50 animate-pulse hidden md:block" />
            </div>
            <div className="mt-4 md:mt-8 flex items-center gap-2 opacity-30">
              <span className="text-[7px] md:text-[10px] text-white uppercase tracking-luxury font-bold italic">
                The Wedding of Fey & Yaya
              </span>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
export default Gallery;
