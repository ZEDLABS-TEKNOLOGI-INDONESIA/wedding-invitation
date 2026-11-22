import React, { useState, useEffect, useRef, useCallback } from "react";
import { X, ChevronLeft, ChevronRight, Maximize2 } from "lucide-react";
import type { AppConfig } from "../types";
import { SectionDivider } from "./WeddingOrnaments";

const Gallery: React.FC<{ config: AppConfig }> = ({ config }) => {
  const images = config.galleryImages;
  const [selectedImg, setSelectedImg] = useState<number | null>(null);
  const [isClosing, setIsClosing] = useState(false);
  const closeTimerRef = useRef<number | null>(null);

  const openLightbox = (index: number) => {
    if (closeTimerRef.current) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    setSelectedImg(index);
    setIsClosing(false);
    document.body.style.overflow = "hidden";
  };

  const closeLightbox = useCallback(() => {
    if (closeTimerRef.current) {
      window.clearTimeout(closeTimerRef.current);
    }
    setIsClosing(true);
    closeTimerRef.current = window.setTimeout(() => {
      setSelectedImg(null);
      setIsClosing(false);
      document.body.style.overflow = "";
      closeTimerRef.current = null;
    }, 300);
  }, []);

  const navigate = useCallback(
    (direction: "prev" | "next", e?: React.MouseEvent) => {
      e?.stopPropagation();
      setSelectedImg((prev) => {
        if (prev === null || images.length === 0) return null;
        if (direction === "prev") {
          return prev === 0 ? images.length - 1 : prev - 1;
        }
        return prev === images.length - 1 ? 0 : prev + 1;
      });
    },
    [images.length]
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (selectedImg === null) return;
      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowLeft") navigate("prev");
      if (e.key === "ArrowRight") navigate("next");
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedImg, closeLightbox, navigate]);

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) {
        window.clearTimeout(closeTimerRef.current);
      }
      document.body.style.overflow = "";
    };
  }, []);

  if (images.length === 0) return null;

  return (
    <section
      id="gallery"
      className="wedding-section-glow py-20 transition-colors duration-700 md:py-28"
    >
      <div className="container mx-auto max-w-6xl px-5 md:px-6">
        <div className="mb-14 space-y-3 text-center md:mb-18">
          <span className="text-accentDark dark:text-accent text-[11px] font-semibold tracking-[0.3em] uppercase">
            Potret Bahagia
          </span>
          <h2 className="font-serif text-4xl font-medium tracking-tight text-primary italic sm:text-5xl md:text-6xl dark:text-white">
            Galeri Momen
          </h2>
          <SectionDivider className="py-1" />
          <p className="mx-auto max-w-lg text-sm font-light text-slate-500 italic sm:text-base dark:text-slate-400">
            Momen-momen indah yang terpatri abadi dalam perjalanan cinta kami
          </p>
        </div>

        <div className="columns-1 gap-4 space-y-4 sm:columns-2 md:gap-6 md:space-y-6 lg:columns-3">
          {images.map((src, index) => (
            <button
              key={index}
              type="button"
              aria-label={`Lihat foto momen ${index + 1}`}
              className="group border-accentDark/10 dark:bg-darkBg focus:ring-accent relative block w-full break-inside-avoid cursor-pointer overflow-hidden rounded-2xl border bg-slate-50 text-left shadow-sm transition-all duration-500 hover:-translate-y-1 hover:shadow-xl focus:ring-2 focus:outline-none md:rounded-3xl dark:border-white/10"
              onClick={() => openLightbox(index)}
            >
              <img
                src={src}
                alt={`Momen Pernikahan ${index + 1}`}
                className="h-auto w-full object-cover transition-transform duration-1000 ease-out group-hover:scale-105"
                loading="lazy"
              />
              <div className="bg-darkBg/35 absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                <div className="flex h-12 w-12 scale-90 items-center justify-center rounded-full border border-white/40 bg-white/15 backdrop-blur-md transition-transform duration-300 group-hover:scale-100">
                  <Maximize2 className="h-5 w-5 text-white" />
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Lightbox */}
      {selectedImg !== null && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Pratinjau foto galeri"
          className={`fixed inset-0 z-[1000] flex items-center justify-center overflow-hidden p-4 transition-opacity duration-300 ${
            isClosing ? "opacity-0" : "opacity-100"
          }`}
        >
          <div
            className="bg-darkBg/92 absolute inset-0 backdrop-blur-xl"
            onClick={closeLightbox}
          />

          <button
            type="button"
            aria-label="Tutup pratinjau galeri"
            onClick={closeLightbox}
            className="absolute top-4 right-4 z-[1030] flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white/80 backdrop-blur-md transition-all hover:bg-white/20 hover:text-white md:top-8 md:right-8"
          >
            <X className="h-5 w-5" />
          </button>

          <button
            type="button"
            aria-label="Foto sebelumnya"
            onClick={(e) => navigate("prev", e)}
            className="fixed top-1/2 left-3 z-[1020] flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white/80 backdrop-blur-md transition-all hover:bg-white/20 hover:text-white md:left-8 md:h-12 md:w-12"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>

          <div className="relative z-[1010] flex max-h-[82vh] max-w-[90vw] items-center justify-center">
            <img
              src={images[selectedImg]}
              alt={`Momen Pernikahan ${selectedImg + 1}`}
              className="max-h-[82vh] max-w-full rounded-2xl border border-white/15 object-contain shadow-2xl"
            />
          </div>

          <button
            type="button"
            aria-label="Foto berikutnya"
            onClick={(e) => navigate("next", e)}
            className="fixed top-1/2 right-3 z-[1020] flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white/80 backdrop-blur-md transition-all hover:bg-white/20 hover:text-white md:right-8 md:h-12 md:w-12"
          >
            <ChevronRight className="h-6 w-6" />
          </button>

          <div className="pointer-events-none absolute right-0 bottom-6 left-0 z-[1030] flex justify-center">
            <div className="rounded-full border border-white/15 bg-black/50 px-5 py-2 text-xs font-medium tracking-[0.2em] text-white/90 uppercase backdrop-blur-md">
              Momen{" "}
              <span className="text-accent font-bold">{selectedImg + 1}</span> /{" "}
              {images.length}
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default Gallery;
