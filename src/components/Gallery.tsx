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
      className="dark:bg-darkBg bg-white py-24 transition-colors duration-1000 md:py-48"
    >
      <div className="container mx-auto max-w-7xl px-6">
        <div className="mb-20 space-y-4 text-center md:mb-32 md:space-y-8">
          <div className="flex items-center justify-center gap-4 opacity-30">
            <div className="bg-accentDark dark:bg-accent h-[1px] w-8 md:w-16"></div>
            <ImageIcon className="h-5 w-5 md:h-8 md:w-8" />
            <div className="bg-accentDark dark:bg-accent h-[1px] w-8 md:w-16"></div>
          </div>
          <h2 className="font-serif text-5xl tracking-tight text-slate-900 italic md:text-9xl dark:text-white">
            Our Gallery
          </h2>
          <p className="tracking-luxury text-[10px] font-black text-balance text-slate-400 uppercase italic md:text-[13px] dark:text-slate-500">
            Momen-momen indah yang terpatri abadi dalam perjalanan cinta kami
          </p>
        </div>
        <div className="columns-1 gap-6 space-y-6 sm:columns-2 md:gap-10 md:space-y-10 lg:columns-3">
          {GALLERY_IMAGES.map((src, index) => (
            <div
              key={index}
              className="group hover:shadow-accent/20 dark:bg-darkSurface relative cursor-pointer overflow-hidden rounded-[2rem] border border-slate-100 bg-slate-50 shadow-xl transition-all duration-700 hover:-translate-y-3 md:rounded-[3.5rem] dark:border-white/5"
              onClick={() => openLightbox(index)}
            >
              <img
                src={src}
                alt={`Wedding Moment ${index + 1}`}
                className="h-auto w-full transform object-cover grayscale-[0.2] transition-transform duration-[1.5s] ease-out group-hover:scale-105 group-hover:grayscale-0"
                loading="lazy"
              />
              <div className="bg-primary/10 dark:bg-darkBg/40 absolute inset-0 flex items-center justify-center opacity-0 backdrop-blur-[1px] transition-opacity duration-500 group-hover:opacity-100">
                <div className="flex h-14 w-14 scale-75 items-center justify-center rounded-full border border-white/30 bg-white/10 backdrop-blur-2xl transition-transform duration-500 group-hover:scale-100 md:h-20 md:w-20">
                  <Maximize2 className="h-6 w-6 text-white md:h-8 md:w-8" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      {selectedImg !== null && (
        <div
          className={`fixed inset-0 z-[1000] flex items-center justify-center overflow-hidden transition-all duration-500 ${
            isClosing ? "opacity-0" : "opacity-100"
          }`}
        >
          <div
            className="bg-darkBg/95 absolute inset-0 backdrop-blur-3xl transition-opacity duration-700"
            onClick={closeLightbox}
          ></div>
          <div className="pointer-events-none relative z-[1010] flex h-full w-full items-center justify-center">
            <div className="relative flex max-h-[75vh] max-w-[95vw] items-center justify-center md:max-h-[85vh]">
              <img
                src={GALLERY_IMAGES[selectedImg]}
                alt="Lightbox Fullscreen"
                className={`pointer-events-auto max-h-full max-w-full rounded-[1.5rem] border border-white/10 object-contain shadow-[0_60px_120px_rgba(0,0,0,0.9)] transition-all duration-700 md:rounded-[4rem] ${
                  isClosing
                    ? "translate-y-20 scale-90 blur-xl"
                    : "blur-0 animate-reveal scale-100"
                }`}
              />
              <div className="pointer-events-auto fixed top-1/2 left-4 z-[1020] -translate-y-1/2 md:left-12">
                <button
                  onClick={(e) => navigate("prev", e)}
                  className="group flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/40 backdrop-blur-2xl transition-all hover:scale-110 hover:bg-white/15 hover:text-white active:scale-90 md:h-24 md:w-24"
                >
                  <ChevronLeft className="h-6 w-6 transition-transform group-hover:-translate-x-1 md:h-12 md:w-12" />
                </button>
              </div>
              <div className="pointer-events-auto fixed top-1/2 right-4 z-[1020] -translate-y-1/2 md:right-12">
                <button
                  onClick={(e) => navigate("next", e)}
                  className="group flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/40 backdrop-blur-2xl transition-all hover:scale-110 hover:bg-white/15 hover:text-white active:scale-90 md:h-24 md:w-24"
                >
                  <ChevronRight className="h-6 w-6 transition-transform group-hover:translate-x-1 md:h-12 md:w-12" />
                </button>
              </div>
            </div>
          </div>
          <div className="absolute top-6 right-6 z-[1030] md:top-12 md:right-12">
            <button
              onClick={closeLightbox}
              className="flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/60 transition-all hover:rotate-90 hover:bg-white/20 hover:text-white active:scale-95 md:h-20 md:w-20"
            >
              <X className="h-6 w-6 md:h-10 md:w-10" />
            </button>
          </div>
          <div className="pointer-events-none absolute right-0 bottom-8 left-0 z-[1030] flex flex-col items-center md:bottom-16">
            <div className="frosted-glass animate-reveal flex items-center gap-6 rounded-full border border-white/10 px-8 py-4 shadow-2xl [animation-delay:400ms] md:gap-10 md:px-14 md:py-6">
              <div className="flex items-center gap-4">
                <div className="h-[1px] w-6 bg-white/20 md:w-12"></div>
                <p className="font-serif text-base tracking-[0.2em] text-white uppercase italic md:text-4xl md:tracking-[0.4em]">
                  Moment{" "}
                  <span className="text-accent font-sans font-black">
                    {selectedImg + 1}
                  </span>{" "}
                  / {GALLERY_IMAGES.length}
                </p>
                <div className="h-[1px] w-6 bg-white/20 md:w-12"></div>
              </div>
              <Sparkles className="text-accent/50 hidden h-4 w-4 animate-pulse md:block md:h-6 md:w-6" />
            </div>
            <div className="mt-4 flex items-center gap-2 opacity-30 md:mt-8">
              <span className="tracking-luxury text-[7px] font-bold text-white uppercase italic md:text-[10px]">
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
