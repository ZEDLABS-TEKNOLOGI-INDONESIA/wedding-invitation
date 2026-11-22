import React, { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
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
    }, 250);
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

  const lightboxModal =
    selectedImg !== null && typeof document !== "undefined"
      ? createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Pratinjau foto galeri"
            onClick={closeLightbox}
            className={`bg-darkBg/95 fixed inset-0 z-[2500] flex flex-col justify-between p-4 backdrop-blur-2xl transition-opacity duration-250 sm:p-6 md:p-8 ${
              isClosing ? "opacity-0" : "opacity-100"
            }`}
          >
            {/* Top Bar: Counter & Close Button */}
            <div
              onClick={(e) => e.stopPropagation()}
              className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4"
            >
              <div className="rounded-full border border-white/15 bg-white/10 px-4 py-1.5 text-xs font-medium tracking-[0.2em] text-white/90 uppercase backdrop-blur-md">
                Momen{" "}
                <span className="text-accent font-bold">{selectedImg + 1}</span>{" "}
                / {images.length}
              </div>

              <button
                type="button"
                aria-label="Tutup pratinjau galeri"
                onClick={closeLightbox}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white/85 backdrop-blur-md transition-all hover:bg-white/20 hover:text-white active:scale-95"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Center Stage: Prev + Image + Next */}
            <div className="relative mx-auto my-4 flex min-h-0 w-full max-w-6xl flex-1 items-center justify-center gap-3 md:gap-6">
              {images.length > 1 && (
                <button
                  type="button"
                  aria-label="Foto sebelumnya"
                  onClick={(e) => navigate("prev", e)}
                  className="absolute left-0 z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/15 bg-black/50 text-white/85 backdrop-blur-md transition-all hover:bg-white/20 hover:text-white active:scale-95 md:static md:h-12 md:w-12 md:bg-white/10"
                >
                  <ChevronLeft className="h-5 w-5 md:h-6 md:w-6" />
                </button>
              )}

              <div
                onClick={(e) => e.stopPropagation()}
                className="flex max-h-full min-w-0 flex-1 items-center justify-center"
              >
                <img
                  src={images[selectedImg]}
                  alt={`Momen Pernikahan ${selectedImg + 1}`}
                  className="max-h-[68vh] max-w-full rounded-2xl border border-white/15 object-contain shadow-[0_24px_80px_rgba(0,0,0,0.65)] sm:max-h-[72vh]"
                />
              </div>

              {images.length > 1 && (
                <button
                  type="button"
                  aria-label="Foto berikutnya"
                  onClick={(e) => navigate("next", e)}
                  className="absolute right-0 z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/15 bg-black/50 text-white/85 backdrop-blur-md transition-all hover:bg-white/20 hover:text-white active:scale-95 md:static md:h-12 md:w-12 md:bg-white/10"
                >
                  <ChevronRight className="h-5 w-5 md:h-6 md:w-6" />
                </button>
              )}
            </div>

            {/* Bottom Thumbnail Strip */}
            {images.length > 1 ? (
              <div
                onClick={(e) => e.stopPropagation()}
                className="mx-auto flex max-w-full items-center gap-2 overflow-x-auto rounded-2xl border border-white/10 bg-white/5 px-3 py-2 backdrop-blur-md"
              >
                {images.map((thumb, idx) => (
                  <button
                    key={idx}
                    type="button"
                    aria-label={`Pilih foto ${idx + 1}`}
                    onClick={() => setSelectedImg(idx)}
                    className={`h-12 w-12 shrink-0 overflow-hidden rounded-lg border-2 transition-all sm:h-14 sm:w-14 ${
                      idx === selectedImg
                        ? "border-accent scale-105 opacity-100 shadow-md"
                        : "border-transparent opacity-50 hover:opacity-85"
                    }`}
                  >
                    <img
                      src={thumb}
                      alt={`Thumbnail ${idx + 1}`}
                      className="h-full w-full object-cover"
                    />
                  </button>
                ))}
              </div>
            ) : (
              <div className="h-4" />
            )}
          </div>,
          document.body
        )
      : null;

  return (
    <section
      id="gallery"
      className="wedding-section-glow py-20 transition-colors duration-700 md:py-28"
    >
      <div className="container mx-auto max-w-6xl px-5 md:px-6">
        <div className="mb-14 space-y-3 text-center md:mb-18">
          <span className="text-accentDark dark:text-accent text-[11px] font-semibold tracking-[0.3em] uppercase">
            Potret Kenangan
          </span>
          <h2 className="font-serif text-4xl font-medium tracking-tight text-primary italic sm:text-5xl md:text-6xl dark:text-white">
            Galeri Momen
          </h2>
          <SectionDivider className="py-1" />
          <p className="mx-auto max-w-lg text-sm font-light text-slate-500 italic sm:text-base dark:text-slate-400">
            Momen-momen indah yang terpatri penuh syukur dalam perjalanan kami
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

      {lightboxModal}
    </section>
  );
};

export default Gallery;
