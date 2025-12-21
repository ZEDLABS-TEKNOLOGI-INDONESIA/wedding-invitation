import React from "react";
import { Heart, Sparkles } from "lucide-react";
import { LOVE_STORY } from "../constants";
const LoveStory: React.FC = () => {
  return (
    <section
      id="story"
      className="py-24 md:py-40 bg-slate-50 dark:bg-darkBg relative overflow-hidden transition-colors duration-1000"
    >
      <div className="container mx-auto px-6 max-w-5xl relative z-10">
        <div className="text-center mb-24 md:mb-32 space-y-6">
          <Sparkles className="w-6 h-6 text-accentDark dark:text-accent/30 mx-auto mb-4 animate-pulse" />
          <h2 className="text-5xl md:text-8xl font-serif italic text-slate-900 dark:text-white tracking-tight">
            Kisah Kami
          </h2>
          <div className="w-20 h-[1px] bg-accent/20 mx-auto"></div>
          <p className="text-slate-500 dark:text-slate-400 text-[11px] uppercase tracking-[0.5em] font-bold">
            Perjalanan dua hati menjadi satu tujuan
          </p>
        </div>
        <div className="relative">
          <div className="absolute left-1/2 -translate-x-1/2 h-full w-[1px] bg-slate-200 dark:bg-white/10 hidden md:block"></div>
          <div className="space-y-16 md:space-y-24">
            {LOVE_STORY.map((story, index) => (
              <div
                key={index}
                className={`relative flex flex-col md:flex-row items-center gap-12 ${
                  index % 2 === 0 ? "md:flex-row-reverse" : ""
                }`}
              >
                <div className="absolute left-1/2 -translate-x-1/2 hidden md:flex items-center justify-center w-6 h-6 bg-white dark:bg-darkSurface rounded-full border-2 border-accent/20 dark:border-accent shadow-sm z-10 transition-colors duration-1000">
                  <div className="w-1.5 h-1.5 bg-accentDark dark:bg-accent rounded-full animate-pulse"></div>
                </div>
                <div
                  className={`w-full md:w-[42%] p-10 md:p-14 rounded-[3rem] editorial-card shadow-2xl ${
                    index % 2 === 0 ? "md:text-right" : "md:text-left"
                  }`}
                >
                  <span className="text-[11px] font-bold tracking-[0.4em] text-accentDark dark:text-accent uppercase mb-6 block">
                    {story.date}
                  </span>
                  <h3 className="text-3xl md:text-4xl font-serif font-bold text-slate-800 dark:text-slate-100 mb-5 italic tracking-tight">
                    {story.title}
                  </h3>
                  <p className="text-slate-500 dark:text-slate-400 leading-relaxed font-light text-base md:text-lg italic">
                    {story.desc}
                  </p>
                  <div
                    className={`mt-8 flex ${
                      index % 2 === 0 ? "justify-end" : "justify-start"
                    }`}
                  >
                    <Heart className="w-4 h-4 text-accent/20" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="absolute top-1/2 left-0 -translate-y-1/2 text-[20rem] font-serif italic text-primary/5 dark:text-white/5 whitespace-nowrap pointer-events-none -z-0 -rotate-12 translate-x-[-20%]">
        Our Story Our Story Our Story
      </div>
    </section>
  );
};
export default LoveStory;
