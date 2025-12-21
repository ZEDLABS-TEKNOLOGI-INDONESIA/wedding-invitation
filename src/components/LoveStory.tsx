import React from "react";
import { Heart, Sparkles } from "lucide-react";
import { LOVE_STORY } from "../constants";
const LoveStory: React.FC = () => {
  return (
    <section
      id="story"
      className="dark:bg-darkBg relative overflow-hidden bg-slate-50 py-24 transition-colors duration-1000 md:py-40"
    >
      <div className="relative z-10 container mx-auto max-w-5xl px-6">
        <div className="mb-24 space-y-6 text-center md:mb-32">
          <Sparkles className="text-accentDark dark:text-accent/30 mx-auto mb-4 h-6 w-6 animate-pulse" />
          <h2 className="font-serif text-5xl tracking-tight text-slate-900 italic md:text-8xl dark:text-white">
            Kisah Kami
          </h2>
          <div className="bg-accent/20 mx-auto h-[1px] w-20"></div>
          <p className="text-[11px] font-bold tracking-[0.5em] text-slate-500 uppercase dark:text-slate-400">
            Perjalanan dua hati menjadi satu tujuan
          </p>
        </div>
        <div className="relative">
          <div className="absolute left-1/2 hidden h-full w-[1px] -translate-x-1/2 bg-slate-200 md:block dark:bg-white/10"></div>
          <div className="space-y-16 md:space-y-24">
            {LOVE_STORY.map((story, index) => (
              <div
                key={index}
                className={`relative flex flex-col items-center gap-12 md:flex-row ${
                  index % 2 === 0 ? "md:flex-row-reverse" : ""
                }`}
              >
                <div className="dark:bg-darkSurface border-accent/20 dark:border-accent absolute left-1/2 z-10 hidden h-6 w-6 -translate-x-1/2 items-center justify-center rounded-full border-2 bg-white shadow-sm transition-colors duration-1000 md:flex">
                  <div className="bg-accentDark dark:bg-accent h-1.5 w-1.5 animate-pulse rounded-full"></div>
                </div>
                <div
                  className={`editorial-card w-full rounded-[3rem] p-10 shadow-2xl md:w-[42%] md:p-14 ${
                    index % 2 === 0 ? "md:text-right" : "md:text-left"
                  }`}
                >
                  <span className="text-accentDark dark:text-accent mb-6 block text-[11px] font-bold tracking-[0.4em] uppercase">
                    {story.date}
                  </span>
                  <h3 className="mb-5 font-serif text-3xl font-bold tracking-tight text-slate-800 italic md:text-4xl dark:text-slate-100">
                    {story.title}
                  </h3>
                  <p className="text-base leading-relaxed font-light text-slate-500 italic md:text-lg dark:text-slate-400">
                    {story.desc}
                  </p>
                  <div
                    className={`mt-8 flex ${
                      index % 2 === 0 ? "justify-end" : "justify-start"
                    }`}
                  >
                    <Heart className="text-accent/20 h-4 w-4" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="text-primary/5 pointer-events-none absolute top-1/2 left-0 -z-0 translate-x-[-20%] -translate-y-1/2 -rotate-12 font-serif text-[20rem] whitespace-nowrap italic dark:text-white/5">
        Our Story Our Story Our Story
      </div>
    </section>
  );
};
export default LoveStory;
