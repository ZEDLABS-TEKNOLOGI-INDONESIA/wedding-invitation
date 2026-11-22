import React from "react";
import { Heart } from "lucide-react";
import type { AppConfig } from "../types";
import { BotanicalWatermark, SectionDivider } from "./WeddingOrnaments";

const LoveStory: React.FC<{ config: AppConfig }> = ({ config }) => {
  if (!config.loveStory || config.loveStory.length === 0) return null;

  return (
    <section
      id="story"
      className="wedding-section-glow relative overflow-x-clip py-20 transition-colors duration-700 md:py-28"
    >
      <BotanicalWatermark side="right" variant={config.appearance.ornament} />
      <div className="relative z-10 container mx-auto max-w-5xl px-5 md:px-6">
        <div className="mb-14 space-y-3 text-center md:mb-20">
          <span className="text-accentDark dark:text-accent text-[11px] font-semibold tracking-[0.3em] uppercase">
            Perjalanan Cinta
          </span>
          <h2 className="font-serif text-4xl font-medium tracking-tight text-primary italic sm:text-5xl md:text-6xl dark:text-white">
            Kisah Kami
          </h2>
          <SectionDivider className="py-1" />
          <p className="mx-auto max-w-lg text-sm font-light text-slate-500 italic sm:text-base dark:text-slate-400">
            Setiap langkah kecil yang mempertemukan dua hati menuju satu tujuan
          </p>
        </div>

        <div className="relative">
          {/* Vertical timeline rail (left on mobile, center on md+) */}
          <div className="from-transparent via-accentDark/30 to-transparent dark:via-accent/30 absolute top-0 bottom-0 left-4 w-[1px] bg-gradient-to-b md:left-1/2 md:-translate-x-1/2" />

          <div className="space-y-8 md:space-y-12">
            {config.loveStory.map((story, index) => {
              const isEven = index % 2 === 0;
              return (
                <div
                  key={index}
                  className={`relative flex flex-col pl-11 md:flex-row md:items-center md:pl-0 ${
                    isEven ? "md:flex-row-reverse" : ""
                  }`}
                >
                  {/* Node dot */}
                  <div className="border-accentDark/50 dark:border-accent/60 absolute top-7 left-4 z-10 flex h-5 w-5 -translate-x-1/2 items-center justify-center rounded-full border-2 bg-white shadow-xs md:top-1/2 md:left-1/2 md:-translate-y-1/2 dark:bg-darkBg">
                    <div className="bg-accentDark dark:bg-accent h-2 w-2 rounded-full" />
                  </div>

                  {/* Card */}
                  <div className="w-full md:w-[46%]">
                    <div
                      className={`editorial-card rounded-3xl p-6 sm:p-8 ${
                        isEven ? "md:text-right" : "md:text-left"
                      }`}
                    >
                      <div
                        className={`mb-3 flex items-center gap-2 ${
                          isEven ? "md:justify-end" : "justify-start"
                        }`}
                      >
                        <span className="bg-accentDark/10 text-accentDark dark:bg-accent/15 dark:text-accent inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold tracking-[0.2em] uppercase">
                          <Heart className="h-3 w-3" />
                          {story.date}
                        </span>
                      </div>
                      <h3 className="mb-2.5 font-serif text-2xl font-semibold tracking-tight text-primary italic sm:text-3xl dark:text-white">
                        {story.title}
                      </h3>
                      <p className="text-sm leading-relaxed text-slate-600 sm:text-base dark:text-slate-300">
                        {story.desc}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};

export default LoveStory;
