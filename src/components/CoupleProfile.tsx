import React from "react";
import { Instagram, Heart } from "lucide-react";
import { WEDDING_CONFIG } from "../constants";
const CoupleProfile: React.FC = () => {
  const { bride, groom } = WEDDING_CONFIG.couple;
  return (
    <section
      id="couple"
      className="py-24 md:py-40 bg-white dark:bg-darkBg relative transition-colors duration-1000"
    >
      <div className="container mx-auto px-6 max-w-6xl relative z-10">
        <div className="text-center mb-24 md:mb-32 space-y-6">
          <Heart className="w-6 h-6 text-accentDark/30 dark:text-accent/20 mx-auto mb-6 animate-pulse" />
          <h2 className="text-4xl md:text-7xl font-serif italic text-slate-900 dark:text-white tracking-tight">
            Pasangan Berbahagia
          </h2>
          <div className="w-20 h-[1px] bg-accent/30 mx-auto"></div>
          <p className="max-w-2xl mx-auto text-slate-500 dark:text-slate-400 font-light leading-relaxed italic text-lg md:text-xl text-balance">
            "Membangun istana di dunia, melangkah bersama menuju surga-Nya. Atas
            izin Allah SWT, kami mengikat janji suci."
          </p>
        </div>
        <div className="grid md:grid-cols-2 gap-20 md:gap-24 items-start">
          <div className="flex flex-col items-center md:items-end text-center md:text-right space-y-10 group">
            <div className="relative">
              <div className="absolute -inset-4 md:-inset-6 border border-accent/20 dark:border-accent/10 rounded-full scale-105 group-hover:scale-100 transition-transform duration-1000"></div>
              <img
                src={groom.image}
                className="relative w-56 h-56 md:w-[24rem] md:h-[24rem] rounded-full object-cover transition-all duration-1000 shadow-2xl border-4 border-slate-50 dark:border-darkSurface group-hover:brightness-110"
                alt={groom.name}
              />
            </div>
            <div className="space-y-6">
              <h3 className="text-3xl md:text-6xl font-serif font-medium text-slate-900 dark:text-white tracking-tight">
                {groom.fullName}
              </h3>
              <p className="text-slate-500 dark:text-slate-400 tracking-widest text-[10px] md:text-[12px] uppercase font-medium max-w-xs md:max-w-sm ml-auto text-balance">
                {groom.parents}
              </p>
              <a
                href={`https://instagram.com/${groom.instagram}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-3 px-6 py-2 rounded-full bg-slate-50 dark:bg-white/5 text-slate-400 dark:text-accent/50 hover:text-accentDark dark:hover:text-white transition-all border border-slate-100 dark:border-white/5"
              >
                <Instagram className="w-3 h-3" />
                <span className="text-[9px] font-bold tracking-widest uppercase">
                  @{groom.instagram}
                </span>
              </a>
            </div>
          </div>
          <div className="flex flex-col items-center md:items-start text-center md:text-left space-y-10 group">
            <div className="relative">
              <div className="absolute -inset-4 md:-inset-6 border border-accent/20 dark:border-accent/10 rounded-full scale-105 group-hover:scale-100 transition-transform duration-1000"></div>
              <img
                src={bride.image}
                className="relative w-56 h-56 md:w-[24rem] md:h-[24rem] rounded-full object-cover transition-all duration-1000 shadow-2xl border-4 border-slate-50 dark:border-darkSurface group-hover:brightness-110"
                alt={bride.name}
              />
            </div>
            <div className="space-y-6">
              <h3 className="text-3xl md:text-6xl font-serif font-medium text-slate-900 dark:text-white tracking-tight">
                {bride.fullName}
              </h3>
              <p className="text-slate-500 dark:text-slate-400 tracking-widest text-[10px] md:text-[12px] uppercase font-medium max-w-xs md:max-w-sm text-balance">
                {bride.parents}
              </p>
              <a
                href={`https://instagram.com/${bride.instagram}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-3 px-6 py-2 rounded-full bg-slate-50 dark:bg-white/5 text-slate-400 dark:text-accent/50 hover:text-accentDark dark:hover:text-white transition-all border border-slate-100 dark:border-white/5"
              >
                <Instagram className="w-3 h-3" />
                <span className="text-[9px] font-bold tracking-widest uppercase">
                  @{bride.instagram}
                </span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
export default CoupleProfile;
