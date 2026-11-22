import { SiInstagram } from "@icons-pack/react-simple-icons";
import React from "react";
import type { AppConfig } from "../types";
import { BotanicalWatermark, SectionDivider } from "./WeddingOrnaments";

const CoupleProfile: React.FC<{ config: AppConfig }> = ({ config }) => {
  const { bride, groom } = config.couple;

  const renderPerson = (
    person: typeof groom,
    roleLabel: string
  ) => (
    <div className="group flex flex-col items-center space-y-6 text-center">
      {/* Luxury Arched Portrait Frame */}
      <div className="relative">
        <div className="border-accentDark/25 dark:border-accent/25 absolute -inset-3 rounded-t-full rounded-b-3xl border transition-transform duration-700 group-hover:scale-[1.02]" />
        <div className="border-accentDark/15 dark:border-accent/15 relative overflow-hidden rounded-t-full rounded-b-3xl border-4 border-white shadow-[0_20px_50px_-15px_rgba(15,23,42,0.22)] dark:border-darkSurface">
          <img
            src={person.image}
            className="h-72 w-56 object-cover transition-transform duration-1000 ease-out group-hover:scale-105 sm:h-80 sm:w-64 md:h-96 md:w-72"
            alt={person.fullName || person.name}
          />
        </div>
      </div>

      <div className="max-w-sm space-y-3">
        <span className="text-accentDark dark:text-accent text-[11px] font-semibold tracking-[0.26em] uppercase">
          {roleLabel}
        </span>
        <h3 className="font-script text-4xl leading-snug text-primary sm:text-5xl dark:text-white">
          {person.fullName}
        </h3>
        <p className="text-xs leading-relaxed font-medium text-balance text-slate-600 sm:text-sm dark:text-slate-300">
          {person.parents}
        </p>
        {person.instagram.trim() && (
          <div className="pt-1">
            <a
              href={`https://instagram.com/${person.instagram.replace(/^@/, "")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="border-accentDark/20 text-accentDark hover:bg-accentDark dark:border-accent/25 dark:text-accent dark:hover:bg-accent inline-flex items-center gap-2 rounded-full border bg-white/80 px-4 py-2 text-[11px] font-semibold tracking-wider transition-all hover:text-white dark:bg-white/5 dark:hover:text-slate-950"
            >
              <SiInstagram className="h-3.5 w-3.5" color="currentColor" />
              <span>@{person.instagram.replace(/^@/, "")}</span>
            </a>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <section
      id="couple"
      className="relative overflow-x-clip py-20 transition-colors duration-700 md:py-28"
    >
      <BotanicalWatermark side="left" />
      <BotanicalWatermark side="right" />
      <div className="relative z-10 container mx-auto max-w-5xl px-5 md:px-6">
        <div className="mb-16 space-y-4 text-center md:mb-20">
          <span className="text-accentDark dark:text-accent font-serif text-lg italic sm:text-xl">
            {config.text.opening.salam}
          </span>
          <h2 className="font-serif text-4xl font-medium tracking-tight text-primary italic sm:text-5xl md:text-6xl dark:text-white">
            Mempelai Berbahagia
          </h2>
          <SectionDivider className="py-1" />
          <p className="mx-auto max-w-2xl font-serif text-base leading-relaxed text-balance text-slate-600 italic sm:text-lg dark:text-slate-300">
            {config.text.quote.ar_rum}
          </p>
          <p className="text-accentDark dark:text-accent text-[11px] font-bold tracking-[0.25em] uppercase">
            — {config.text.quote.source} —
          </p>
        </div>

        <div className="relative grid items-start gap-12 md:grid-cols-[1fr_auto_1fr] md:items-center md:gap-8">
          {renderPerson(groom, "Mempelai Pria")}

          {/* Elegant Center Ampersand Medallion */}
          <div className="flex items-center justify-center py-2">
            <div className="border-accentDark/25 dark:border-accent/30 flex h-16 w-16 items-center justify-center rounded-full border bg-white/80 shadow-sm backdrop-blur-sm md:h-20 md:w-20 dark:bg-darkSurface/80">
              <span className="font-script text-accentDark dark:text-accent text-4xl md:text-5xl">
                &amp;
              </span>
            </div>
          </div>

          {renderPerson(bride, "Mempelai Wanita")}
        </div>
      </div>
    </section>
  );
};

export default CoupleProfile;
