import React from "react";
import { Instagram, Heart } from "lucide-react";
import { WEDDING_CONFIG } from "../constants";
const CoupleProfile: React.FC = () => {
  const { bride, groom } = WEDDING_CONFIG.couple;
  return (
    <section
      id="couple"
      className="dark:bg-darkBg relative bg-white py-24 transition-colors duration-1000 md:py-40"
    >
      <div className="relative z-10 container mx-auto max-w-6xl px-6">
        <div className="mb-24 space-y-6 text-center md:mb-32">
          <Heart className="text-accentDark/30 dark:text-accent/20 mx-auto mb-6 h-6 w-6 animate-pulse" />
          <h2 className="font-serif text-4xl tracking-tight text-slate-900 italic md:text-7xl dark:text-white">
            Pasangan Berbahagia
          </h2>
          <div className="bg-accent/30 mx-auto h-[1px] w-20"></div>
          <p className="mx-auto max-w-2xl text-lg leading-relaxed font-light text-balance text-slate-500 italic md:text-xl dark:text-slate-400">
            "Membangun istana di dunia, melangkah bersama menuju surga-Nya. Atas
            izin Allah SWT, kami mengikat janji suci."
          </p>
        </div>
        <div className="grid items-start gap-20 md:grid-cols-2 md:gap-24">
          <div className="group flex flex-col items-center space-y-10 text-center md:items-end md:text-right">
            <div className="relative">
              <div className="border-accent/20 dark:border-accent/10 absolute -inset-4 scale-105 rounded-full border transition-transform duration-1000 group-hover:scale-100 md:-inset-6"></div>
              <img
                src={groom.image}
                className="dark:border-darkSurface relative h-56 w-56 rounded-full border-4 border-slate-50 object-cover shadow-2xl transition-all duration-1000 group-hover:brightness-110 md:h-[24rem] md:w-[24rem]"
                alt={groom.name}
              />
            </div>
            <div className="space-y-6">
              <h3 className="font-serif text-3xl font-medium tracking-tight text-slate-900 md:text-6xl dark:text-white">
                {groom.fullName}
              </h3>
              <p className="ml-auto max-w-xs text-[10px] font-medium tracking-widest text-balance text-slate-500 uppercase md:max-w-sm md:text-[12px] dark:text-slate-400">
                {groom.parents}
              </p>
              <a
                href={`https://instagram.com/${groom.instagram}`}
                target="_blank"
                rel="noopener noreferrer"
                className="dark:text-accent/50 hover:text-accentDark inline-flex items-center gap-3 rounded-full border border-slate-100 bg-slate-50 px-6 py-2 text-slate-400 transition-all dark:border-white/5 dark:bg-white/5 dark:hover:text-white"
              >
                <Instagram className="h-3 w-3" />
                <span className="text-[9px] font-bold tracking-widest uppercase">
                  @{groom.instagram}
                </span>
              </a>
            </div>
          </div>
          <div className="group flex flex-col items-center space-y-10 text-center md:items-start md:text-left">
            <div className="relative">
              <div className="border-accent/20 dark:border-accent/10 absolute -inset-4 scale-105 rounded-full border transition-transform duration-1000 group-hover:scale-100 md:-inset-6"></div>
              <img
                src={bride.image}
                className="dark:border-darkSurface relative h-56 w-56 rounded-full border-4 border-slate-50 object-cover shadow-2xl transition-all duration-1000 group-hover:brightness-110 md:h-[24rem] md:w-[24rem]"
                alt={bride.name}
              />
            </div>
            <div className="space-y-6">
              <h3 className="font-serif text-3xl font-medium tracking-tight text-slate-900 md:text-6xl dark:text-white">
                {bride.fullName}
              </h3>
              <p className="max-w-xs text-[10px] font-medium tracking-widest text-balance text-slate-500 uppercase md:max-w-sm md:text-[12px] dark:text-slate-400">
                {bride.parents}
              </p>
              <a
                href={`https://instagram.com/${bride.instagram}`}
                target="_blank"
                rel="noopener noreferrer"
                className="dark:text-accent/50 hover:text-accentDark inline-flex items-center gap-3 rounded-full border border-slate-100 bg-slate-50 px-6 py-2 text-slate-400 transition-all dark:border-white/5 dark:bg-white/5 dark:hover:text-white"
              >
                <Instagram className="h-3 w-3" />
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
