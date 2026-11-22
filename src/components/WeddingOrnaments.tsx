import React from "react";

export const SectionDivider: React.FC<{ className?: string }> = ({
  className = "",
}) => (
  <div
    aria-hidden="true"
    className={`flex items-center justify-center gap-3 ${className}`}
  >
    <span className="from-transparent via-accentDark/35 to-accentDark/55 dark:via-accent/35 dark:to-accent/55 h-[1px] w-12 bg-gradient-to-r md:w-20" />
    <svg
      viewBox="0 0 48 16"
      className="text-accentDark/65 dark:text-accent/65 h-3.5 w-10 shrink-0"
      fill="none"
    >
      <path
        d="M24 2 L28 8 L24 14 L20 8 Z"
        fill="currentColor"
        fillOpacity="0.85"
      />
      <path
        d="M16 8 C12 4, 6 4, 2 8 C6 12, 12 12, 16 8 Z"
        stroke="currentColor"
        strokeWidth="1"
        fill="currentColor"
        fillOpacity="0.16"
      />
      <path
        d="M32 8 C36 4, 42 4, 46 8 C42 12, 36 12, 32 8 Z"
        stroke="currentColor"
        strokeWidth="1"
        fill="currentColor"
        fillOpacity="0.16"
      />
    </svg>
    <span className="from-transparent via-accentDark/35 to-accentDark/55 dark:via-accent/35 dark:to-accent/55 h-[1px] w-12 bg-gradient-to-l md:w-20" />
  </div>
);

/** Tanda air botani ultra-halus di tepi seksi agar menyatu tanpa mengganggu teks. */
export const BotanicalWatermark: React.FC<{
  side?: "left" | "right";
  className?: string;
}> = ({ side = "right", className = "" }) => (
  <svg
    aria-hidden="true"
    viewBox="0 0 220 260"
    fill="none"
    className={`text-accentDark/[0.06] dark:text-accent/[0.06] pointer-events-none absolute h-52 w-44 select-none md:h-72 md:w-60 ${
      side === "left"
        ? "top-8 -left-10 -scale-x-100 md:left-0"
        : "bottom-8 -right-10 md:right-0"
    } ${className}`}
  >
    <path
      d="M210 250 C170 200, 140 130, 110 20"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
    />
    <path
      d="M155 170 C115 162, 88 140, 74 114 C108 118, 138 136, 155 170 Z"
      fill="currentColor"
    />
    <path
      d="M168 186 C192 156, 206 126, 210 96 C186 112, 170 144, 168 186 Z"
      fill="currentColor"
      fillOpacity="0.7"
    />
    <path
      d="M134 110 C98 100, 72 78, 60 52 C92 58, 120 78, 134 110 Z"
      fill="currentColor"
      fillOpacity="0.85"
    />
    <path
      d="M142 122 C166 96, 180 68, 184 40 C160 56, 146 86, 142 122 Z"
      fill="currentColor"
      fillOpacity="0.6"
    />
    <path
      d="M118 58 C94 44, 78 24, 72 4 C96 14, 112 34, 118 58 Z"
      fill="currentColor"
      fillOpacity="0.75"
    />
    <circle cx="94" cy="144" r="4" fill="currentColor" />
    <circle cx="84" cy="84" r="3.5" fill="currentColor" />
    <circle cx="154" cy="64" r="3" fill="currentColor" />
  </svg>
);
