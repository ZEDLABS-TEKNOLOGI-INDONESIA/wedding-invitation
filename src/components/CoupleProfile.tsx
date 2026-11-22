import { SiInstagram } from "@icons-pack/react-simple-icons";
import React from "react";
import type { AppConfig } from "../types";
import {
  BotanicalWatermark,
  PortraitFloralFrame,
  SectionDivider,
} from "./WeddingOrnaments";

const CoupleProfile: React.FC<{ config: AppConfig }> = ({ config }) => {
  const { bride, groom } = config.couple;

  const renderPerson = (
    person: typeof groom,
    roleLabel: string,
    mirrorFrame: boolean
  ) => (
    <div className="group flex flex-col items-center space-y-7 text-center">
      {/* Romantic Heirloom Oval Portrait with Botanical Floral Wreath */}
      <div className="relative my-3">
        {/* Soft radial aura */}
        <div
          aria-hidden="true"
          className="bg-accent/15 dark:bg-accent/10 pointer-events-none absolute -inset-6 rounded-full blur-2xl transition-opacity duration-700 group-hover:opacity-100"
        />

        {/* Custom Romantic Floral Oval Frame */}
        <PortraitFloralFrame
          mirror={mirrorFrame}
          className="z-10 transition-transform duration-700 group-hover:scale-[1.02]"
        />

        {/* Oval Photo Mask */}
        <div className="border-accentDark/20 dark:border-accent/25 bg-accentDark/5 dark:bg-darkSurface/80 relative z-0 flex h-72 w-56 items-center justify-center overflow-hidden rounded-[50%] border-2 shadow-[0_22px_52px_-18px_rgba(15,23,42,0.28)] sm:h-80 sm:w-64 md:h-[22rem] md:w-[17.5rem]">
          <img
            src={person.image}
            className="h-full w-full object-cover transition-transform duration-1000 ease-out group-hover:scale-105"
            alt={person.fullName || person.name}
          />
        </div>
      </div>

      <div className="max-w-sm space-y-3 pt-1">
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
              className="border-accentDark/25 text-accentDark hover:bg-accentDark dark:border-accent/30 dark:text-accent dark:hover:bg-accent inline-flex items-center gap-2 rounded-full border bg-white/80 px-4 py-2 text-[11px] font-semibold tracking-wider transition-all hover:text-white dark:bg-white/5 dark:hover:text-slate-950"
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
      <BotanicalWatermark side="left" variant={config.appearance.ornament} />
      <BotanicalWatermark side="right" variant={config.appearance.ornament} />
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

        <div className="relative grid items-start gap-14 md:grid-cols-[1fr_auto_1fr] md:items-center md:gap-8">
          {renderPerson(groom, "Mempelai Pria", false)}

          {/* Romantic Double-Ring Ampersand Medallion */}
          <div className="flex items-center justify-center py-2">
            <div className="border-accentDark/30 dark:border-accent/35 relative flex h-16 w-16 items-center justify-center rounded-full border bg-white/80 shadow-sm backdrop-blur-md md:h-20 md:w-20 dark:bg-darkSurface/80">
              <span className="border-accentDark/15 dark:border-accent/20 pointer-events-none absolute -inset-2 rounded-full border border-dashed" />
              <span className="font-script text-accentDark dark:text-accent text-4xl md:text-5xl">
                &amp;
              </span>
            </div>
          </div>

          {renderPerson(bride, "Mempelai Wanita", true)}
        </div>
      </div>
    </section>
  );
};

export default CoupleProfile;
